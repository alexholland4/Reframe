/* HBC boot callback payload: key-only SSH, separately enabled launcher. */
function startup(fs, cp, process) {
  const crypto = require("crypto");
  if (process.getuid() !== 0) throw new Error("Root startup requires UID 0");
  const base = "/var/lib/reframe";
  function file(path) {
    const s = fs.lstatSync(path);
    if (!s.isFile() || s.isSymbolicLink() || s.uid !== 0 || (s.mode & 18)) throw new Error("Unsafe startup file: " + path);
    return fs.readFileSync(path);
  }
  const journal = JSON.parse(file(base + "/access-journal.json"));
  const binary = file(base + "/dropbear");
  if (crypto.createHash("sha256").update(binary).digest("hex") !== journal.binarySha256) throw new Error("SSH binary changed");
  file("/home/root/.ssh/authorized_keys");
  let running = false;
  try {
    const pid = file("/var/run/reframe-sshd.pid").toString().trim();
    if (!/^[1-9][0-9]*$/.test(pid)) throw new Error("Invalid SSH PID");
    const args = fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").split("\0");
    running = args[0] === base + "/dropbear" && args.includes("-s") && args.includes("-G") && args.includes("root");
    if (!running) throw new Error("SSH PID belongs to another process");
  } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (!running) {
    cp.execFileSync(base + "/dropbear", ["-R", "-s", "-j", "-k", "-G", "root",
      "-p", "0.0.0.0:2222", "-P", "/var/run/reframe-sshd.pid", "-I", "600", "-K", "30", "-m"],
      {timeout:5000, stdio:"ignore", env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin", HOME:"/home/root", LD_PRELOAD:""}});
  }
  const status = {schema:1, uid:process.getuid(), bootId:fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
    at:new Date().toISOString(), ssh:true, passwordAuthentication:false};
  const temp = base + "/boot-status." + process.pid + ".tmp";
  const fd = fs.openSync(temp, "wx", 384);
  try { fs.writeFileSync(fd, JSON.stringify(status)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, base + "/boot-status.json");
  return status;
}
module.exports = startup;
if (require.main === module) console.log(JSON.stringify(startup(require("fs"), require("child_process"), process)));
