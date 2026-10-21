import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../scripts/root-probe/resume-access.js", import.meta.url), "utf8");
function recover({ changed = false, unsafe = false, nonroot = false } = {}) {
  const commands = [], bytes = Buffer.from("reviewed startup");
  const path = "/var/lib/reframe/startup.cjs";
  const plan = {schema:1, purpose:"reframe-minimal-startup", files:[{path,
    sha256:createHash("sha256").update(bytes).digest("hex")}]};
  const fs = {
    lstatSync() { return {uid:unsafe ? 6349 : 0, mode:0o600, isFile:()=>true, isSymbolicLink:()=>false}; },
    readFileSync(p) { return p.endsWith("startup-plan.json") ? JSON.stringify(plan) : changed ? Buffer.from("changed") : bytes; },
  };
  const cp = {execFileSync(...args) { commands.push(args); return JSON.stringify({uid:nonroot ? 6349 : 0, ssh:true, bootId:"boot"}); }};
  const context = { Buffer, require(name) {
    if (name === "crypto") return {createHash};
    if (name === "child_process") return cp;
    throw new Error("Forbidden dependency");
  } };
  runInNewContext(source, context);
  let result, error;
  try { result = context.performOperation(fs); } catch (e) { error = e; }
  return {commands, result, error};
}
test("recovery resumes only the hash-verified existing startup without provisioning keys", () => {
  const r = recover(); assert.equal(r.error, undefined); assert.equal(r.commands.length, 1);
  assert.equal(r.commands[0][0], "/usr/bin/node");
  assert.deepEqual(Array.from(r.commands[0][1]), ["/var/lib/reframe/startup.cjs"]);
  assert.equal(r.result.uid, 0);
});
for (const option of ["changed", "unsafe"]) test("recovery refuses " + option + " before executing startup", () => {
  const r = recover({[option]:true}); assert.ok(r.error); assert.deepEqual(r.commands, []);
});
test("recovery never reports an unprivileged startup as recovered root", () => {
  const r = recover({nonroot:true}); assert.ok(r.error);
});
