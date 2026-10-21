import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import startup from "../scripts/root-probe/minimal-startup.cjs";

function run({ running = false, unsafe = false, wrongProcess = false, badBinary = false, existingGuard = false } = {}) {
  const commands = [], writes = [], guards = [], binary = Buffer.from("pinned binary");
  const journal = {binarySha256:createHash("sha256").update(binary).digest("hex")};
  const fs = {
    lstatSync() { return {uid:0, mode:unsafe ? 0o777 : 0o600, isFile:()=>true, isSymbolicLink:()=>false}; },
    readFileSync(path) {
      if (path.endsWith("access-journal.json")) return Buffer.from(JSON.stringify(journal));
      if (path.endsWith("/dropbear")) return badBinary ? Buffer.from("changed") : binary;
      if (path.endsWith("authorized_keys")) return Buffer.from("public key");
      if (path.endsWith("reframe-sshd.pid")) {
        if (!running && !wrongProcess) throw Object.assign(new Error("missing"), {code:"ENOENT"});
        return Buffer.from("424");
      }
      if (path.endsWith("/cmdline")) return wrongProcess ? "another-process\0" : "/var/lib/reframe/dropbear\0-s\0-G\0root\0";
      if (path.endsWith("/boot_id")) return "boot-identifier\n";
      throw new Error("Unexpected read: " + path);
    },
    openSync(path, flags, mode) { assert.equal(flags, "wx"); assert.equal(mode, 0o600); return path; },
    writeFileSync(path, text, options) {
      if (path === "/tmp/webosbrew_startup") { assert.equal(options.flag, "wx"); assert.equal(options.mode, 0o600);
        if (existingGuard) throw Object.assign(new Error("exists"), {code:"EEXIST"});
        guards.push(path); return; }
      writes.push(JSON.parse(text));
    }, fsyncSync() {}, closeSync() {},
    renameSync(from, to) { assert.equal(to, "/var/lib/reframe/boot-status.json"); },
  };
  const cp = {execFileSync(...args) { commands.push(args); }};
  let result, error;
  try { result = startup(fs, cp, {getuid:()=>0, pid:123}); } catch (e) { error = e; }
  return {commands, writes, guards, result, error};
}
test("minimal startup starts only the key-only SSH daemon and records actual boot identity", () => {
  const r = run(); assert.equal(r.error, undefined); assert.equal(r.commands.length, 1);
  assert.equal(r.commands[0][0], "/var/lib/reframe/dropbear");
  for (const flag of ["-s", "-j", "-k", "-G", "root", "0.0.0.0:2222"]) assert.ok(r.commands[0][1].includes(flag));
  assert.equal(r.result.uid, 0); assert.equal(r.result.bootId, "boot-identifier");
  assert.equal(r.writes.length, 1); assert.deepEqual(r.guards, ["/tmp/webosbrew_startup"]);
});
test("minimal startup leaves an existing matching key-only server running", () => {
  const r = run({running:true}); assert.equal(r.error, undefined); assert.equal(r.commands.length, 0);
});
for (const option of ["unsafe", "wrongProcess", "badBinary"]) test("minimal startup refuses " + option + " without side effects", () => {
  const r = run({[option]:true}); assert.ok(r.error); assert.deepEqual(r.commands, []); assert.deepEqual(r.writes, []); assert.deepEqual(r.guards, []);
});

test("a valid existing once-per-boot guard still permits direct access recovery", () => {
  const r = run({existingGuard:true}); assert.equal(r.error, undefined);
  assert.equal(r.commands.length, 1); assert.deepEqual(r.guards, []);
});
