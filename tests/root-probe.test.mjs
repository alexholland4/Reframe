import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext, Script } from "node:vm";

const template = readFileSync(new URL("../scripts/root-probe/identity-service.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../scripts/root-probe/probe.html", import.meta.url), "utf8");
const runId = "1234567890abcdef12345678";
const stage = "/media/internal/downloads/reframe-uid-" + runId;
const base = "http://192.168.40.1:12345/" + runId + "/";
const constants = { __SNAPSHOT_ENABLED__: false, __SNAPSHOT_SPEC__: null, __RUN_ID__: runId, __STAGE_DIR__: stage, __REPORT_URL__: base + "result",
  __BASE_URL__: base, __APP_ID__: "com.webos.app.adoverlayex" };
function expand(source) {
  for (const [marker, value] of Object.entries(constants)) source = source.replaceAll(marker, JSON.stringify(value));
  return source;
}
function service({ uid = 0, markerMismatch = false, stageSymlink = false,
                   fileSymlink = false, extraFile = false, sharedProcess = false,
                   networkError = false } = {}) {
  const removed = [], exits = [], timers = new Map();
  let report, sequence = 0;
  const stat = (directory, symlink = false) => ({ uid: 0, gid: 0, mode: 493,
    isDirectory: () => directory, isFile: () => !directory, isSymbolicLink: () => symlink });
  const fs = {
    lstatSync(path) {
      if (path === stage) return stat(true, stageSymlink);
      if (path === stage + "/main.js") return stat(false, fileSymlink);
      if (path === stage + "/package.json") return stat(false);
      if (["/var/luna/preferences/devmode_enabled", "/etc/init/devmode.conf",
           "/lib/systemd/system/scripts/devmode.sh", "/var/lib/webosbrew"].includes(path)) return stat(false);
      throw new Error("Unexpected filesystem inspection: " + path);
    },
    readFileSync(path) {
      if (path === "/proc/self/status") return `Uid:\t${uid}\t${uid}\t${uid}\t${uid}\nCapEff:\t00000000\n`;
      if (path === stage + "/package.json") return JSON.stringify({ name: "com.webos.service.jsserver",
        main: "main.js", reframeProbe: markerMismatch ? "another-probe" : runId });
      throw new Error("Unexpected filesystem read: " + path);
    },
    unlinkSync(path) { assert.ok([stage + "/main.js", stage + "/package.json"].includes(path)); removed.push(path); },
    rmdirSync(path) {
      assert.equal(path, stage);
      if (extraFile) throw Object.assign(new Error("not empty"), { code: "ENOTEMPTY" });
      removed.push(path);
    },
  };
  const http = { request(url, options, callback) {
    assert.equal(url, base + "result");
    assert.equal(options.method, "POST");
    const handlers = {};
    return {
      on(name, handler) { handlers[name] = handler; }, destroy() {},
      end(body) {
        report = JSON.parse(body);
        if (networkError) { handlers.error(new Error("offline")); return; }
        const responseHandlers = {};
        callback({ on(name, handler) { responseHandlers[name] = handler; },
          resume() { responseHandlers.end(); } });
      },
    };
  } };
  const module = { exports: {} };
  runInNewContext(expand(template), {
    __dirname: stage, module, Buffer,
    require(name) {
      if (name === "fs") return fs;
      if (name === "http") return http;
      throw new Error("Forbidden module: " + name);
    },
    process: { getuid: () => uid, geteuid: () => uid, getgid: () => uid,
      pid: 1234, ppid: 100, execPath: "/usr/bin/node", exit: (code) => exits.push(code),
      argv: sharedProcess ? ["/usr/bin/node", "/usr/palm/services/shared/main.js"] : ["/usr/bin/node", stage + "/main.js"] },
    setTimeout(callback) { timers.set(++sequence, callback); return sequence; },
    clearTimeout(id) { timers.delete(id); },
  });
  module.exports.run();
  return { report, removed, exits, timers };
}

test("root probe reports actual identity and deletes only its two marked files and empty folder", () => {
  const result = service();
  assert.equal(result.report.uid, 0);
  assert.equal(result.report.euid, 0);
  assert.equal(result.report.ownsProcess, true);
  assert.equal(result.report.cleanup.removedDirectory, true);
  assert.deepEqual(result.removed, [stage + "/main.js", stage + "/package.json", stage]);
  assert.deepEqual(result.exits, [0]);
  assert.equal(result.timers.size, 0);
});

test("unprivileged execution remains unprivileged in the report", () => {
  const result = service({ uid: 6349 });
  assert.equal(result.report.uid, 6349);
  assert.equal(result.report.euid, 6349);
});

for (const option of ["markerMismatch", "stageSymlink", "fileSymlink"]) {
  test("cleanup refuses uncertain ownership: " + option, () => {
    const result = service({ [option]: true });
    assert.equal(result.report.cleanup.removedOwnFiles, false);
    assert.equal(result.report.cleanup.removedDirectory, false);
    assert.deepEqual(result.removed, []);
  });
}

test("cleanup preserves an unexpected extra file instead of recursively deleting it", () => {
  const result = service({ extraFile: true });
  assert.equal(result.report.cleanup.removedOwnFiles, true);
  assert.equal(result.report.cleanup.removedDirectory, false);
  assert.equal(result.report.cleanup.error, "ENOTEMPTY");
  assert.deepEqual(result.removed, [stage + "/main.js", stage + "/package.json"]);
});

test("a shared or unexpected service process is never exited", () => {
  const result = service({ sharedProcess: true });
  assert.equal(result.report.ownsProcess, false);
  assert.deepEqual(result.exits, []);
});

test("reporting failure releases the owned probe process without installing anything", () => {
  const result = service({ networkError: true });
  assert.deepEqual(result.exits, [0]);
  assert.equal(result.timers.size, 0);
});

function page({ downloadFailure = false } = {}) {
  const calls = [], reports = [];
  const source = expand(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  let count = 0;
  class Bridge {
    cancel() {}
    call(uri, raw) {
      const parameters = JSON.parse(raw);
      calls.push({ uri, parameters });
      if (uri.endsWith("/download")) {
        this.onservicecallback(JSON.stringify({ returnValue: !downloadFailure, errorText: "denied" }));
        if (!downloadFailure) this.onservicecallback(JSON.stringify({ completed: true, httpStatus: 200, aborted: false, interrupted: false }));
      } else this.onservicecallback(JSON.stringify({ returnValue: true }));
    }
  }
  class Request {
    open(method, url) { this.url = url; assert.equal(method, "POST"); }
    setRequestHeader() {}
    send(body) { reports.push(JSON.parse(body)); }
  }
  runInNewContext(source, { window: { PalmServiceBridge: Bridge }, XMLHttpRequest: Request,
    document: { getElementById: () => ({ textContent: "" }) },
    setTimeout: () => ++count, clearTimeout() {} });
  return { calls, reports };
}

test("the page downloads two isolated files and requests the service exactly once", () => {
  const { calls } = page();
  assert.equal(calls.length, 3);
  assert.ok(calls[0].uri.endsWith("/download"));
  assert.ok(calls[1].uri.endsWith("/download"));
  assert.equal(calls[0].parameters.targetDir, stage);
  assert.equal(calls[1].parameters.targetDir, stage);
  assert.equal(calls[0].parameters.targetFilename, "package.json");
  assert.equal(calls[1].parameters.targetFilename, "main.js");
  assert.equal(calls[2].uri, "luna://com.webos.service.jsserver/run");
  assert.ok(calls[2].parameters.inputParams.includes(stage));
});

test("a denied download prevents service execution", () => {
  const { calls, reports } = page({ downloadFailure: true });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].uri.endsWith("/download"));
  assert.equal(reports.at(-1).phase, "failed");
});

test("expanded templates parse as JavaScript without executing real TV operations", () => {
  new Script(expand(template));
  new Script(expand(html.match(/<script>([\s\S]*?)<\/script>/)[1]));
});
