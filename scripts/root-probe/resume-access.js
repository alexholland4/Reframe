/* Recover existing key-only access; never provision new keys or change boot state. */
function performOperation(fs) {
  var crypto = require("crypto"), cp = require("child_process");
  function safe(path) {
    var st = fs.lstatSync(path);
    if (!st.isFile() || st.isSymbolicLink() || st.uid !== 0 || (st.mode & 18)) throw new Error("Unsafe recovery file");
    return fs.readFileSync(path);
  }
  var plan = JSON.parse(safe("/var/lib/reframe/startup-plan.json"));
  var path = "/var/lib/reframe/startup.cjs";
  var entry = plan.files.filter(function (item) { return item.path === path; })[0];
  if (plan.schema !== 1 || plan.purpose !== "reframe-minimal-startup" || !entry ||
      crypto.createHash("sha256").update(safe(path)).digest("hex") !== entry.sha256) throw new Error("Startup recovery hash mismatch");
  var status = JSON.parse(cp.execFileSync("/usr/bin/node", [path], {timeout:10000, encoding:"utf8"}));
  if (status.uid !== 0 || status.ssh !== true) throw new Error("Root access was not restored");
  return {kind:"resume-existing-access", uid:status.uid, bootId:status.bootId};
}
