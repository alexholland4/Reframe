/* Event-driven boot/wake launch. No Home interception or foreground polling. */
const fs = require("fs"), cp = require("child_process");
const makePolicy = require("./launch-policy.cjs");
const decoder = require("./luna-stream.cjs");
const base = "/var/lib/reframe", pidPath = "/var/run/reframe-launch.pid";
if (process.getuid() !== 0) throw new Error("Root required");
const state = makePolicy(), children = new Set();
let timer, stopping = false;

function enabled() {
  try {
    const s = fs.lstatSync(base + "/launcher-enabled");
    return s.isFile() && !s.isSymbolicLink() && s.uid === 0 && !(s.mode & 18);
  } catch { return false; }
}
function status(value) {
  const tmp = base + "/launcher-status." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({...value, pid:process.pid, at:new Date().toISOString()}), {flag:"wx", mode:384});
  fs.renameSync(tmp, base + "/launcher-status.json");
}
function stop(reason) {
  if (stopping) return;
  stopping = true; clearTimeout(timer);
  for (const child of children) child.kill("SIGTERM");
  try { if (fs.readFileSync(pidPath, "utf8").trim() === String(process.pid)) fs.unlinkSync(pidPath); } catch {}
  status({state:"stopped", reason});
  process.exit(0);
}
function stream(uri, payload, subscription, receive) {
  const child = cp.spawn("/usr/bin/luna-send", ["-i", ...(subscription ? [] : ["-n", "1", "-w", "4000"]),
    "-f", uri, JSON.stringify(payload)], {stdio:["pipe", "pipe", "pipe"]});
  children.add(child);
  const push = decoder(reply => {
    if (reply.returnValue === false) { stop("native subscription/request rejected"); return; }
    receive(reply);
  });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", text => {
    try { push(text); } catch { stop("invalid native reply"); }
  });
  child.stderr.resume();
  child.on("error", () => stop("native transport error"));
  child.on("close", () => { children.delete(child); if (subscription) stop("native subscription ended"); });
  return child;
}
function consider(decision) {
  if (!decision || !enabled()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!enabled() || !state.armed(Date.now()) || state.currentApp() !== decision.from) return;
    let replied = false;
    const check = stream("luna://com.webos.applicationManager/getForegroundAppInfo", {}, false, reply => {
      replied = true;
      if (!enabled() || !state.armed(Date.now()) || reply.appId !== decision.from || state.currentApp() !== decision.from) return;
      state.commit();
      stream("luna://com.webos.applicationManager/launch", {id:"com.reframe.home"}, false, result => {
        status({state:result.returnValue === true ? "launched" : "skipped", from:decision.from});
      });
    });
    setTimeout(() => { if (!replied) check.kill("SIGTERM"); }, 5000).unref();
  }, 350);
}

// Claim only our PID file, preserving an unexpected live process or foreign file.
try {
  fs.writeFileSync(pidPath, String(process.pid), {flag:"wx", mode:384});
} catch (e) {
  if (e.code !== "EEXIST") throw e;
  const s = fs.lstatSync(pidPath), old = fs.readFileSync(pidPath, "utf8").trim();
  if (!s.isFile() || s.isSymbolicLink() || s.uid !== 0 || !/^[1-9][0-9]*$/.test(old)) throw new Error("Unsafe launcher PID");
  try {
    const args = fs.readFileSync("/proc/" + old + "/cmdline", "utf8").split("\0");
    if (args.includes(base + "/boot-launcher.cjs")) process.exit(0);
    throw new Error("Launcher PID belongs to another process");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  fs.unlinkSync(pidPath); fs.writeFileSync(pidPath, String(process.pid), {flag:"wx", mode:384});
}
process.on("SIGTERM", () => stop("disabled"));
process.on("SIGINT", () => stop("interrupted"));
status({state:"watching"});
stream("luna://com.webos.applicationManager/getForegroundAppInfo", {subscribe:true}, true,
  reply => { if (enabled()) consider(state.foreground(reply.appId, Date.now())); });
stream("luna://com.webos.bootManager/getBootStatus", {subscribe:true}, true,
  reply => { if (enabled()) consider(state.power(reply.powerStatus, Date.now())); });
