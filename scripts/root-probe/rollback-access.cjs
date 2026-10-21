/* Remove only the dedicated access stage. This refuses later integration state. */
function rollback(fs, process, execute) {
  if (process.getuid() !== 0) throw new Error("Root is required");
  const base = "/var/lib/reframe";
  function safe(path, directory) {
    const st = fs.lstatSync(path);
    if (st.isSymbolicLink() || st.uid !== 0 || (directory ? !st.isDirectory() : !st.isFile())) {
      throw new Error("Unsafe rollback path: " + path);
    }
  }
  safe(base, true);
  safe(base + "/access-journal.json", false);
  const journal = JSON.parse(fs.readFileSync(base + "/access-journal.json", "utf8"));
  if (journal.schema !== 1 || journal.purpose !== "reframe-key-only-access" || journal.port !== 2222) {
    throw new Error("Unknown access journal");
  }
  const ownFiles = ["dropbear", "access-journal.json"];
  if (fs.readdirSync(base).some(name => !ownFiles.includes(name))) throw new Error("Later integration exists; use its rollback first");
  safe(base + "/dropbear", false);
  const crypto = require("crypto");
  function digest(path) { return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex"); }
  if (digest(base + "/dropbear") !== journal.binarySha256) throw new Error("SSH binary has changed");
  safe("/home/root/.ssh", true);
  safe("/home/root/.ssh/authorized_keys", false);
  if (digest("/home/root/.ssh/authorized_keys") !== journal.authorizedKeySha256) throw new Error("Authorized keys have changed");
  safe("/var/lib/webosbrew", true);
  safe("/var/lib/webosbrew/sshd", true);
  if (fs.readdirSync("/var/lib/webosbrew").some(name => name !== "sshd")) throw new Error("Other homebrew state exists");
  const keyDirectory = "/var/lib/webosbrew/sshd/";
  const hostKeys = fs.readdirSync(keyDirectory);
  for (const name of hostKeys) {
    if (!/^dropbear_(rsa|dss|ecdsa|ed25519)_host_key$/.test(name)) throw new Error("Unknown host-key state");
    safe(keyDirectory + name, false);
  }
  let pid;
  try {
    safe("/var/run/reframe-sshd.pid", false);
    const text = fs.readFileSync("/var/run/reframe-sshd.pid", "utf8").trim();
    if (!/^[1-9][0-9]*$/.test(text)) throw new Error("Invalid daemon PID");
    pid = Number(text);
    const args = fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").split("\0");
    if (args[0] !== base + "/dropbear" ||
        !["192.168.40.124:2222", "0.0.0.0:2222"].includes(args[args.indexOf("-p") + 1]) ||
        !["-s", "-j", "-k", "-G", "root"].every(flag => args.includes(flag))) throw new Error("Unexpected daemon process");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const result = {execute: Boolean(execute), daemonPid: pid || null, keys: hostKeys.length};
  if (!execute) return result;
  // Validate everything above before the first mutation; preserve unexpected files.
  fs.unlinkSync("/home/root/.ssh/authorized_keys");
  try { fs.rmdirSync("/home/root/.ssh"); } catch (e) { if (e.code !== "ENOTEMPTY") throw e; }
  for (const name of hostKeys) fs.unlinkSync(keyDirectory + name);
  fs.rmdirSync(keyDirectory);
  fs.rmdirSync("/var/lib/webosbrew");
  fs.unlinkSync(base + "/dropbear");
  fs.unlinkSync(base + "/access-journal.json");
  fs.rmdirSync(base);
  try { fs.unlinkSync("/var/run/reframe-sshd.pid"); } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (pid) process.kill(pid, "SIGTERM");
  return result;
}
module.exports = rollback;
if (require.main === module) console.log(JSON.stringify(rollback(require("fs"), process, process.argv.includes("--execute"))));
