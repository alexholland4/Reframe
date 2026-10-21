import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../scripts/root-probe/provision-access.js", import.meta.url), "utf8")
  .replace("__PUBLIC_KEY__", JSON.stringify("ssh-ed25519 AAAA owner"));
const hash = "8f5b03abd1075b843eba4b204de380cd30f7cb2940090f7c13276b54aab70f20";
function provision({ badHash = false, existing = false, unsafeParent = false } = {}) {
  const mutations = [], commands = [], binary = Buffer.alloc(227608);
  const fs = {
    lstatSync(path) {
      if (["/var/lib", "/home/root"].includes(path)) return { uid: 0, mode: unsafeParent ? 0o777 : 0o755,
        isDirectory: () => true, isSymbolicLink: () => false };
      if (path.endsWith("reframe-dropbear")) return { size: binary.length, isFile: () => true, isSymbolicLink: () => false };
      if (existing && path === "/var/lib/reframe") return {};
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
    readFileSync() { return binary; },
    mkdirSync(path, options) { assert.equal(options.mode, 0o700); mutations.push(path); },
    openSync(path, flags, mode) { assert.equal(flags, "wx"); assert.ok([0o700, 0o600].includes(mode)); mutations.push(path); return path; },
    writeFileSync() {}, fsyncSync() {}, closeSync() {},
  };
  const context = { Buffer, require(name) {
    if (name === "crypto") return { createHash() { let input; return { update(data) { input = data; return this; },
      digest() { return input === binary ? badHash ? "wrong" : hash : createHash("sha256").update(input).digest("hex"); } }; } };
    if (name === "child_process") return { execFileSync(...args) { commands.push(args); } };
    throw new Error("Unexpected dependency");
  } };
  runInNewContext(source, context);
  let result, error;
  try { result = context.performOperation(fs); } catch (e) { error = e; }
  return { result, error, mutations, commands };
}
test("root access uses exclusive journaled writes and key-only SSH without startup changes", () => {
  const result = provision();
  assert.equal(result.error, undefined);
  assert.equal(result.mutations[1], "/var/lib/reframe/access-journal.json");
  assert.equal(result.commands.length, 1);
  const [binary, args] = result.commands[0];
  assert.equal(binary, "/var/lib/reframe/dropbear");
  for (const option of ["-s", "-j", "-k", "-G", "root", "192.168.40.124:2222"]) assert.ok(args.includes(option));
  assert.equal(result.result.bootChanges, false);
  assert.equal(result.result.developerModeChanges, false);
});
for (const option of ["badHash", "existing", "unsafeParent"]) {
  test("access refuses " + option + " before any mutation or server launch", () => {
    const result = provision({ [option]: true });
    assert.ok(result.error);
    assert.deepEqual(result.mutations, []);
    assert.deepEqual(result.commands, []);
  });
}
