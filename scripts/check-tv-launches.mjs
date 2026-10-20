#!/usr/bin/env node
/** Manual TV smoke check: opens Settings, YouTube, HDMI 1/2, then restores Reframe.
 * Uses the Developer Mode inspector through a loopback SSH tunnel. No root.
 * Run only when the TV is available. Logs stay in ignored fingerprint files.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: {
  host: { type: "string", default: "192.168.40.124" },
  only: { type: "string", default: "all" },
  key: { type: "string", default: join(homedir(), ".ssh", "reframe-tv_dec") },
} });
if (!/^192\.168\.(?:\d{1,3})\.(?:\d{1,3})$/.test(values.host) ||
    values.host.split(".").some((part) => Number(part) > 255)) {
  throw new Error("This TV check requires its 192.168.x.x LAN IPv4 address");
}
const sshOptions = ["-T", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
  "-o", "UserKnownHostsFile=" + join(project, "docs", "fingerprint-ssh-known-hosts.txt"),
  "-o", "HostKeyAlgorithms=+ssh-rsa", "-o", "PubkeyAcceptedAlgorithms=+ssh-rsa",
  "-o", "ConnectTimeout=10", "-i", values.key, "-p", "9922"];
const targets = [
  ["settings", "Settings", "com.palm.app.settings"],
  ["youtube", "YouTube", "youtube.leanback.v4"],
  ["hdmi1", "HDMI 1", "com.webos.app.hdmi1"],
  ["hdmi2", "HDMI 2", "com.webos.app.hdmi2"],
].filter(([key]) => values.only === "all" || values.only === key);
if (!targets.length) throw new Error("--only must be all, settings, youtube, hdmi1, or hdmi2");
const destination = "prisoner@" + values.host;
const quote = (value) => "'" + value.replace(/'/g, "'\"'\"'") + "'";
const results = { version: null, initial: null, cases: [], restored: false };

function remote(command) {
  const result = spawnSync("ssh", [...sshOptions, destination, command], {
    encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "SSH command failed");
  return result.stdout.trim();
}
function restore() {
  // Keep stdin alive for this single Luna call; EOF otherwise ends its event loop.
  const reply = remote("(sleep 7) | /usr/bin/luna-send-pub -i -n 1 -w 6000 -f " +
    "luna://com.webos.applicationManager/launch " + quote('{"id":"com.reframe.home"}'));
  if (!reply) throw new Error("No launch response while restoring Reframe; inspect TV state before retrying");
  if (JSON.parse(reply).returnValue !== true) throw new Error("Could not restore Reframe");
  results.restored = true;
}

async function freePort() {
  const server = createServer();
  await new Promise((yes, no) => { server.once("error", no); server.listen(0, "127.0.0.1", yes); });
  const port = server.address().port;
  await new Promise((yes) => server.close(yes));
  return port;
}

class Inspector {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const item = this.pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timer);
      this.pending.delete(message.id);
      if (message.error) item.no(new Error(message.error.message));
      else item.yes(message.result);
    });
    socket.addEventListener("close", () => {
      for (const item of this.pending.values()) {
        clearTimeout(item.timer);
        item.no(new Error("Reframe inspector disconnected"));
      }
      this.pending.clear();
    });
  }
  static async connect(port) {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(3000),
    })).json();
    const page = pages.find((entry) => entry.url.includes("/com.reframe.home/"));
    if (!page?.webSocketDebuggerUrl) throw new Error("Reframe inspector target is unavailable");
    const url = new URL(page.webSocketDebuggerUrl);
    if (url.protocol !== "ws:") throw new Error("Unexpected inspector protocol");
    url.hostname = "127.0.0.1";
    url.port = String(port);
    const socket = new WebSocket(url);
    await new Promise((yes, no) => {
      const timer = setTimeout(() => { socket.close(); no(new Error("Inspector connection timed out")); }, 5000);
      socket.addEventListener("open", () => { clearTimeout(timer); yes(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); no(new Error("Inspector connection failed")); }, { once: true });
    });
    return new Inspector(socket);
  }
  command(method, params) {
    return new Promise((yes, no) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.pending.delete(id); no(new Error(method + " timed out")); }, 10000);
      this.pending.set(id, { yes, no, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const reply = await this.command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  }
  close() { this.socket.close(); }
}

const observe = `(() => {
  if (window.__reframeLaunchCheck) {
    window.PalmServiceBridge = window.__reframeLaunchCheck.Original;
    delete window.__reframeLaunchCheck;
  }
  const Original = window.PalmServiceBridge;
  if (typeof Original !== 'function') throw new Error('Native PalmServiceBridge missing');
  const state = { Original, records: [] };
  window.__reframeLaunchCheck = state;
  window.PalmServiceBridge = function () {
    const native = new Original();
    let callback = function () {};
    let record;
    native.onservicecallback = function (raw) {
      if (record) {
        try { record.response = JSON.parse(raw); } catch (error) { record.invalid = true; }
      }
      callback(raw);
    };
    return {
      set onservicecallback(value) { callback = value; },
      call(uri, parameters) {
        if (uri === 'luna://com.webos.applicationManager/launch') {
          record = { uri, parameters: JSON.parse(parameters) };
          state.records.push(record);
        }
        native.call(uri, parameters);
      },
      cancel() { native.cancel(); }
    };
  };
  return { footer: document.querySelector('.hint')?.textContent.trim(),
    tiles: Array.from(document.querySelectorAll('.tile-label'), node => node.textContent) };
})()`;
const cleanup = `(() => {
  const state = window.__reframeLaunchCheck;
  if (state) { window.PalmServiceBridge = state.Original; delete window.__reframeLaunchCheck; }
  return true;
})()`;

let tunnel, inspector;
try {
  results.version = JSON.parse(remote("cat /media/developer/apps/usr/palm/applications/com.reframe.home/appinfo.json")).version;
  const expectedVersion = JSON.parse(readFileSync(join(project, "public", "appinfo.json"), "utf8")).version;
  if (results.version !== expectedVersion) throw new Error("Installed Reframe differs from the source version");
  const port = await freePort();
  tunnel = spawn("ssh", [...sshOptions, "-N", "-o", "ExitOnForwardFailure=yes",
    "-L", `127.0.0.1:${port}:127.0.0.1:9998`, destination], { stdio: "ignore", windowsHide: true });
  await delay(700);
  if (tunnel.exitCode !== null) throw new Error("Inspector SSH tunnel failed");
  restore();
  for (const [, label, id] of targets) {
    inspector = await Inspector.connect(port);
    const before = await inspector.evaluate(observe);
    results.initial ??= before;
    if (!before.footer.startsWith("webOS")) throw new Error("Reframe still reports preview mode");
    results.restored = false;
    await inspector.evaluate(`(() => {
      window.__reframeLaunchCheck.records.length = 0;
      const tile = Array.from(document.querySelectorAll('.tile')).find(node => node.querySelector('.tile-label').textContent === ${JSON.stringify(label)});
      if (!tile) throw new Error('Required tile is missing');
      tile.click(); return true;
    })()`);
    await delay(1800);
    const records = await inspector.evaluate("window.__reframeLaunchCheck.records");
    const record = records.find((entry) => entry.parameters.id === id);
    results.cases.push({ label, id, record });
    console.log(label + ": " + JSON.stringify(record?.response || { error: "No native launch reply recorded" }));
    if (record?.response?.returnValue !== true) throw new Error(label + " did not report launch success");
    // Remove the temporary observer before foreground restoration can replace the page.
    await inspector.evaluate(cleanup);
    inspector.close();
    inspector = undefined;
    restore();
  }

} finally {
  try {
    if (inspector) {
      try { await inspector.evaluate(cleanup); }
      catch { results.observerCleanup = "Inspector context unavailable; observation lives only in that page"; }
    }
  }
  finally {
    inspector?.close();
    try { if (results.version) restore(); }
    finally {
      if (tunnel && tunnel.exitCode === null) tunnel.kill();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      writeFileSync(join(project, "docs", `fingerprint-launches-${stamp}.txt`), JSON.stringify(results, null, 2) + "\n");
    }
  }
}

console.log(`PASS: ${targets.length} selected Reframe tile(s) returned native launch success; Reframe restored.`);
console.log("Playback, HDMI signal, physical remote keys, and iPhone casting still require manual checks.");
