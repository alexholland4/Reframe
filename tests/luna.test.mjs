import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/core/luna.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;

function runtime({ native = true, alternate = false, userAgent = "Chrome", palmSystem,
                   constructError, callError, cancelError } = {}) {
  const instances = [];
  const timers = new Map();
  const previews = [];
  let nextTimer = 0;
  class Bridge {
    constructor() {
      if (constructError) throw constructError;
      this.cancelled = 0;
      instances.push(this);
    }
    call(uri, parameters) {
      this.uri = uri;
      this.parameters = parameters;
      if (callError) throw callError;
    }
    cancel() {
      this.cancelled++;
      if (cancelError) throw cancelError;
    }
    reply(response) { this.onservicecallback(JSON.stringify(response)); }
  }
  const window = { navigator: { userAgent }, PalmSystem: palmSystem };
  if (native) window[alternate ? "webOSServiceBridge" : "PalmServiceBridge"] = Bridge;
  const exports = {};
  runInNewContext(compiled, {
    exports, window,
    console: { info: (...args) => previews.push(args) },
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
  });
  return { ...exports, instances, timers, previews, expire() {
    for (const callback of [...timers.values()]) callback();
  } };
}

const request = (r, parameters = {}) => r.luna("com.webos.applicationManager", {
  method: "launch", parameters,
});

test("desktop previews simulate without a native call", async () => {
  const r = runtime({ native: false });
  assert.equal(r.isOnTV(), false);
  assert.equal((await request(r)).returnValue, true);
  assert.equal(r.previews.length, 1);
  assert.equal(r.instances.length, 0);
});

for (const marker of [{ palmSystem: {} }, { userAgent: "Mozilla/5.0 (Web0S; Linux/SmartTV)" }]) {
  test("a detected TV without a bridge fails instead of simulating success: " + JSON.stringify(marker), async () => {
    const r = runtime({ native: false, ...marker });
    assert.equal(r.isOnTV(), true);
    await assert.rejects(request(r), /bridge is unavailable/);
    assert.equal(r.previews.length, 0);
  });
}

for (const alternate of [false, true]) {
  test("native launch sends the target and params, then releases its request: " + alternate, async () => {
    const r = runtime({ alternate });
    const parameters = { id: "youtube.leanback.v4", params: { value: "quotes \" & spaces" } };
    const pending = request(r, parameters);
    const bridge = r.instances[0];
    assert.equal(r.isOnTV(), true);
    assert.equal(bridge.uri, "luna://com.webos.applicationManager/launch");
    assert.deepEqual(JSON.parse(bridge.parameters), parameters);
    bridge.reply({ returnValue: true, id: parameters.id });
    assert.equal((await pending).id, parameters.id);
    assert.equal(bridge.cancelled, 1);
    assert.equal(r.timers.size, 0);
    assert.equal(r.previews.length, 0);
  });
}

test("denied or missing apps retain the TV's error and do not report success", async () => {
  const r = runtime();
  const pending = request(r, { id: "missing.app" });
  r.instances[0].reply({ returnValue: false, errorCode: -101, errorText: "The app was not found" });
  await assert.rejects(pending, /The app was not found \(-101\)/);
  assert.equal(r.instances[0].cancelled, 1);
  assert.equal(r.timers.size, 0);
});

test("an error code cannot be hidden by a contradictory success flag", async () => {
  const r = runtime();
  const pending = request(r);
  r.instances[0].reply({ returnValue: true, errorCode: -103, errorText: "Security check failed" });
  await assert.rejects(pending, /Security check failed/);
});

for (const raw of ["not JSON", "null", "[]", "{}", '{"returnValue":"true"}']) {
  test("malformed replies reject and release the request: " + raw, async () => {
    const r = runtime();
    const pending = request(r);
    r.instances[0].onservicecallback(raw);
    await assert.rejects(pending, /Invalid|did not report success/);
    assert.equal(r.instances[0].cancelled, 1);
    assert.equal(r.timers.size, 0);
  });
}

test("timeout cancels the native request and ignores a late callback", async () => {
  const r = runtime();
  const pending = request(r);
  r.expire();
  await assert.rejects(pending, /timed out/);
  r.instances[0].reply({ returnValue: true });
  assert.equal(r.instances[0].cancelled, 1);
  assert.equal(r.timers.size, 0);
});

for (const option of ["constructError", "callError"]) {
  test("native exceptions reject without leaving a timeout: " + option, async () => {
    const r = runtime({ [option]: new Error("native failure") });
    await assert.rejects(request(r), /native failure/);
    assert.equal(r.timers.size, 0);
    if (option === "callError") assert.equal(r.instances[0].cancelled, 1);
  });
}

test("a cancellation exception does not overwrite a successful response", async () => {
  const r = runtime({ cancelError: new Error("already cancelled") });
  const pending = request(r);
  r.instances[0].reply({ returnValue: true });
  assert.equal((await pending).returnValue, true);
  assert.equal(r.timers.size, 0);
});

test("overlapping requests settle independently even when replies arrive in reverse", async () => {
  const r = runtime();
  const first = request(r, { id: "first.app" });
  const second = request(r, { id: "second.app" });
  r.instances[1].reply({ returnValue: true, id: "second.app" });
  assert.equal((await second).id, "second.app");
  assert.equal(r.instances[0].cancelled, 0);
  assert.equal(r.timers.size, 1);
  r.instances[0].reply({ returnValue: false, errorText: "first failed" });
  await assert.rejects(first, /first failed/);
  assert.equal(r.timers.size, 0);
});
