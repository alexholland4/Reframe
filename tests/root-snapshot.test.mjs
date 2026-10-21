import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../scripts/root-probe/snapshot-state.js", import.meta.url), "utf8");
function capture(items, overrides = {}) {
  const opened = [], closed = [], reads = [];
  const spec = { files: Object.keys(items), metadata: [], virtual: [],
    counterDirectory: "/preferences", maxCounters: 2, maxFileBytes: 16, maxTotalBytes: 32, ...overrides };
  function item(path) {
    if (!items[path]) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    return items[path];
  }
  function stat(path, phase) {
    const value = item(path), type = value.type || "file";
    return { uid: 0, gid: 0, mode: 0o644, dev: 1, ino: 1, mtimeMs: phase === "after" && value.changed ? 2 : 1,
      size: value.size ?? value.data?.length ?? 0,
      isSymbolicLink: () => type === "symlink", isDirectory: () => type === "directory", isFile: () => type === "file" };
  }
  const calls = new Map();
  const fs = {
    constants: { O_RDONLY: 0, O_NOFOLLOW: 131072 },
    lstatSync: path => stat(path), readlinkSync: path => item(path).target,
    openSync(path, flags) { assert.equal(flags, 131072); opened.push(path); return path; },
    fstatSync(fd) { const n = (calls.get(fd) || 0) + 1; calls.set(fd, n); return stat(fd, n > 1 ? "after" : "before"); },
    readSync(fd, buffer, offset, length) {
      reads.push(fd);
      const value = item(fd), position = value.position || 0;
      const bytes = (value.data || Buffer.alloc(0)).subarray(position, position + length);
      bytes.copy(buffer, offset); value.position = position + bytes.length; return bytes.length;
    },
    closeSync(fd) { closed.push(fd); },
    readdirSync(path) { assert.equal(path, "/preferences"); return overrides.counters || []; },
  };
  const context = { Buffer, require(name) { assert.equal(name, "crypto"); return { createHash }; } };
  runInNewContext(source, context);
  return { report: context.captureProtectedState(fs, spec), opened, closed, reads };
}

test("snapshot copies exact binary bytes with hashes and closes descriptors", () => {
  const bytes = Buffer.from([0, 255, 13, 10]);
  const result = capture({ "/original": { data: bytes } });
  assert.equal(result.report.totalBytes, 4);
  assert.equal(result.report.entries[0].base64, bytes.toString("base64"));
  assert.equal(result.report.entries[0].sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(result.opened, ["/original"]);
  assert.deepEqual(result.closed, ["/original"]);
});

test("missing paths and symlinks are recorded without reading targets", () => {
  const result = capture({ "/link": { type: "symlink", target: "/secret" } }, { files: ["/link", "/missing"] });
  assert.equal(result.report.entries[0].target, "/secret");
  assert.equal(result.report.entries[1].exists, false);
  assert.equal(result.report.entries[1].error, "ENOENT");
  assert.deepEqual(result.opened, []);
});

test("oversized and special files are refused before opening", () => {
  const result = capture({ "/big": { size: 17 }, "/device": { type: "special" } });
  assert.match(result.report.entries[0].error, /limit/);
  assert.match(result.report.entries[1].error, /nonregular/);
  assert.deepEqual(result.opened, []);
});

test("a file changing during capture is rejected and closed", () => {
  const result = capture({ "/unstable": { data: Buffer.from("x"), changed: true } });
  assert.match(result.report.entries[0].error, /changed/);
  assert.equal(result.report.totalBytes, 0);
  assert.deepEqual(result.closed, ["/unstable"]);
});

test("virtual files with zero stat size are bounded and oversize data is rejected", () => {
  const result = capture({ "/virtual": { data: Buffer.alloc(17), size: 0 } }, { files: [], virtual: ["/virtual"] });
  assert.match(result.report.entries[0].error, /limit/);
  assert.equal(result.report.totalBytes, 0);
  assert.deepEqual(result.closed, ["/virtual"]);
});

test("aggregate limits stop content capture and all open descriptors close", () => {
  const result = capture({ "/a": { data: Buffer.alloc(16) }, "/b": { data: Buffer.alloc(16) } }, { maxTotalBytes: 20 });
  assert.equal(result.report.totalBytes, 16);
  assert.match(result.report.entries[1].error, /limit/);
  assert.deepEqual(result.closed, ["/a", "/b"]);
});

test("counter discovery is limited to one directory and a bounded dc prefix", () => {
  const result = capture({}, { counters: ["unrelated", "dc1", "dc2", "dc3"] });
  assert.match(result.report.counterListing.error, /Too many/);
  assert.equal(result.report.entries.length, 0);
  assert.deepEqual(result.opened, []);
});
