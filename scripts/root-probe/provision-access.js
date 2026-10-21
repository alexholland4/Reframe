/* Provision only authenticated SSH access. No boot, HBC, or Developer Mode changes. */
function performOperation(fs) {
  var crypto = require("crypto"), cp = require("child_process");
  var publicKey = __PUBLIC_KEY__;
  var expected = "8f5b03abd1075b843eba4b204de380cd30f7cb2940090f7c13276b54aab70f20";
  function digest(data) { return crypto.createHash("sha256").update(data).digest("hex"); }
  function absent(path) {
    try { fs.lstatSync(path); } catch (e) { if (e.code === "ENOENT") return; throw e; }
    throw new Error("Refusing pre-existing path: " + path);
  }
  function parent(path) {
    var st = fs.lstatSync(path);
    if (!st.isDirectory() || st.isSymbolicLink() || st.uid !== 0 || (st.mode & 18)) {
      throw new Error("Unsafe parent: " + path);
    }
  }
  function write(path, bytes, mode) {
    var fd = fs.openSync(path, "wx", mode);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  parent("/var/lib"); parent("/home/root");
  ["/var/lib/reframe", "/var/lib/webosbrew", "/home/root/.ssh", "/var/run/reframe-sshd.pid"].forEach(absent);
  var source = "/media/developer/temp/reframe-dropbear";
  var st = fs.lstatSync(source);
  if (!st.isFile() || st.isSymbolicLink() || st.size !== 227608) throw new Error("Unexpected SSH binary");
  var binary = fs.readFileSync(source);
  if (digest(binary) !== expected) throw new Error("SSH binary checksum mismatch");
  if (!/^ssh-ed25519 [A-Za-z0-9+/=]+(?: [A-Za-z0-9@_.-]+)?$/.test(publicKey || "")) throw new Error("Invalid public key");
  fs.mkdirSync("/var/lib/reframe", {mode: 448});
  write("/var/lib/reframe/access-journal.json", JSON.stringify({schema:1, purpose:"reframe-key-only-access",
    originalsAbsent:["/var/lib/reframe", "/var/lib/webosbrew", "/home/root/.ssh"],
    binarySha256:expected, authorizedKeySha256:digest(Buffer.from(publicKey + "\n")), port:2222}, null, 2), 384);
  write("/var/lib/reframe/dropbear", binary, 448);
  fs.mkdirSync("/var/lib/webosbrew", {mode:448});
  fs.mkdirSync("/var/lib/webosbrew/sshd", {mode:448});
  fs.mkdirSync("/home/root/.ssh", {mode:448});
  write("/home/root/.ssh/authorized_keys", publicKey + "\n", 384);
  var args = ["-R", "-s", "-j", "-k", "-G", "root", "-p", "192.168.40.124:2222",
    "-P", "/var/run/reframe-sshd.pid", "-I", "600", "-K", "30", "-m"];
  cp.execFileSync("/var/lib/reframe/dropbear", args, {timeout:5000, stdio:"ignore", env:{PATH:"/usr/sbin:/usr/bin:/sbin:/bin", LD_PRELOAD:""}});
  return {kind:"key-only-access", binarySha256:expected, port:2222,
    passwordAuthentication:false, forwarding:false, bootChanges:false, developerModeChanges:false};
}
