/* Reframe identity / read-only protected-state service. No installer, shell commands, or startup changes.
 * Launch argument layout: SlopBro 21023d56ca424607bb03d2939609cc658c655fc7.
 * This module reports its own identity and removes only its marked staging files.
 */
var fs = require("fs");
var http = require("http");
var runId = __RUN_ID__;
var stageDir = __STAGE_DIR__;
var reportUrl = __REPORT_URL__;
var snapshotEnabled = __SNAPSHOT_ENABLED__;
var operationEnabled = __OPERATION_ENABLED__;
/* __OPERATION_IMPLEMENTATION__ */
/* __SNAPSHOT_IMPLEMENTATION__ */

function inspect(path) {
  try {
    var item = fs.lstatSync(path);
    return { exists: true, directory: item.isDirectory(), symlink: item.isSymbolicLink(),
      uid: item.uid, gid: item.gid, mode: item.mode & 4095 };
  } catch (error) {
    return { exists: false, error: error.code || String(error) };
  }
}

function cleanup() {
  var removed = [];
  // Never traverse or recursively delete. Require a real directory and our nonce.
  try {
    var directory = fs.lstatSync(stageDir);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error("Unsafe staging directory");
    var marker = JSON.parse(fs.readFileSync(stageDir + "/package.json", "utf8"));
    if (marker.reframeProbe !== runId || marker.main !== "main.js" ||
        marker.name !== "com.webos.service.jsserver") throw new Error("Staging marker mismatch");
    var files = [stageDir + "/main.js", stageDir + "/package.json"];
    for (var i = 0; i < files.length; i++) {
      var item = fs.lstatSync(files[i]);
      if (!item.isFile() || item.isSymbolicLink()) throw new Error("Unsafe staged file");
    }
    for (var j = 0; j < files.length; j++) { fs.unlinkSync(files[j]); removed.push(files[j]); }
    fs.rmdirSync(stageDir); // Fails safely if anything else is in the directory.
    return { removedOwnFiles: true, removedDirectory: true, removedFiles: removed };
  } catch (error) {
    return { removedOwnFiles: removed.length === 2, removedDirectory: false,
      removedFiles: removed, error: error.code || String(error) };
  }
}

function run() {
  var ownsProcess = __dirname === stageDir && process.argv.some(function (arg) {
    return arg === stageDir || arg === stageDir + "/main.js";
  });
  var report = {
    schema: 1, kind: operationEnabled ? "root-operation" : snapshotEnabled ? "protected-snapshot" : "identity-only", runId: runId,
    uid: process.getuid(), euid: process.geteuid(), gid: process.getgid(),
    pid: process.pid, ppid: process.ppid, argv: process.argv, execPath: process.execPath,
    moduleDirectory: __dirname, ownsProcess: ownsProcess,
    hostView: {
      devmodeMarker: inspect("/var/luna/preferences/devmode_enabled"),
      devmodeInit: inspect("/etc/init/devmode.conf"),
      devmodeSystemd: inspect("/lib/systemd/system/scripts/devmode.sh"),
      homebrewState: inspect("/var/lib/webosbrew")
    }
  };
  try {
    report.processStatus = fs.readFileSync("/proc/self/status", "utf8").split("\n").filter(function (line) {
      return /^(Name|Pid|PPid|Uid|Gid|CapEff|NoNewPrivs):/.test(line);
    });
  } catch (error) { report.processStatusError = error.code || String(error); }
  if (snapshotEnabled) {
    try {
      if (report.uid === 0 && report.euid === 0) report.snapshot = captureProtectedState(fs, __SNAPSHOT_SPEC__);
      else report.snapshotError = "Root identity required before protected capture";
    } catch (error) { report.snapshotError = error.code || String(error); }
  }
  if (operationEnabled) {
    try {
      if (report.uid !== 0 || report.euid !== 0 || !ownsProcess) throw new Error("Owned root process required");
      report.operation = performOperation(fs, report);
    } catch (error) { report.operationError = error.code || String(error); }
  }
  report.cleanup = cleanup();
  var body = JSON.stringify(report);
  var finished = false;
  var timer;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    // Exit only when argv and module path identify this newly staged process.
    if (ownsProcess) process.exit(0);
  }
  timer = setTimeout(function () { if (request) request.destroy(); finish(); }, 6000);
  var request;
  try {
    request = http.request(reportUrl, { method: "POST", headers: {
      "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body)
    } }, function (response) {
      response.on("end", finish);
      response.resume();
    });
    request.on("error", finish);
    request.end(body);
  } catch (error) { finish(); }
}
module.exports = { run: run };
