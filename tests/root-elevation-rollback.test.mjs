import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import restore from "../scripts/root-probe/rollback-elevation.cjs";

const paths = ["services.d/org.webosbrew.hbchannel.service.service",
  "client-permissions.d/org.webosbrew.hbchannel.service.root.json",
  "api-permissions.d/org.webosbrew.hbchannel.service.api.public.json",
  "roles.d/org.webosbrew.hbchannel.service.service.json", "manifests.d/org.webosbrew.hbchannel.json"]
  .map(s => "/var/luna-service2-dev/" + s);
function simulation({ corrupt = false, unsafePath = false, startupExists = false, execute = false } = {}) {
  const writes = [], deleted = [], commands = [], killed = [];
  const plan = { schema: 1, changes: paths.map((path, i) => ({path, proposed:"new" + i})),
    profiles: paths.map((path, i) => ({path, exists:![1, 2].includes(i), uid:0, gid:0, mode:0o644,
      base64:Buffer.from("old" + i).toString("base64"), sha256:createHash("sha256").update("old" + i).digest("hex")})) };
  if (unsafePath) plan.changes[0].path = "/etc/shadow";
  const fs = {
    constants:{ O_WRONLY:1, O_NOFOLLOW:131072, O_TRUNC:512 },
    lstatSync(path) {
      if (path.endsWith("startup.sh")) {
        if (startupExists) return {};
        throw Object.assign(new Error("missing"), {code:"ENOENT"});
      }
      return {isFile:()=>true, isSymbolicLink:()=>false};
    },
    readFileSync(path) {
      if (path.startsWith("/proc/")) return path.includes("/424/") ?
        "/usr/bin/node\0/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service\0" : "/usr/bin/other\0";
      return Buffer.from((corrupt ? "changed" : "new") + paths.indexOf(path));
    },
    readdirSync(path) { assert.equal(path, "/proc"); return ["424", "425", "self"]; },
    openSync(path, flags) { assert.equal(flags, 131585); return path; },
    writeFileSync(path, bytes) { writes.push([path, bytes.toString()]); },
    fchmodSync() {}, fchownSync() {}, fsyncSync() {}, closeSync() {},
    unlinkSync(path) { deleted.push(path); },
  };
  const cp = {execFileSync(...args) { commands.push(args); }};
  const process = {getuid:()=>0, kill(pid, signal) { killed.push([pid, signal]); }};
  let result, error;
  try { result = restore(plan, fs, cp, process, execute); } catch (e) { error = e; }
  return {result, error, writes, deleted, commands, killed};
}
test("elevation undo dry-run validates all five profiles without mutation", () => {
  const r = simulation(); assert.equal(r.error, undefined);
  assert.equal(r.result.profiles, 5);
  for (const field of ["writes", "deleted", "commands", "killed"]) assert.deepEqual(r[field], []);
});
test("elevation undo restores three originals, removes two additions, and stops only HBC", () => {
  const r = simulation({execute:true}); assert.equal(r.error, undefined);
  assert.deepEqual(r.writes, [[paths[0], "old0"], [paths[3], "old3"], [paths[4], "old4"]]);
  assert.deepEqual(r.deleted, [paths[1], paths[2]]);
  assert.deepEqual(r.killed, [[424, "SIGTERM"]]);
  assert.equal(r.commands.length, 1);
  assert.equal(r.commands[0][0], "/usr/sbin/ls-control");
});
for (const option of ["corrupt", "unsafePath", "startupExists"]) test("elevation undo refuses " + option + " before mutation", () => {
  const r = simulation({[option]:true, execute:true}); assert.ok(r.error);
  for (const field of ["writes", "deleted", "commands", "killed"]) assert.deepEqual(r[field], []);
});
