/* Fixed read-only checks before provisioning authenticated root access. */
function performOperation(fs) {
  function metadata(path) {
    try {
      var s = fs.lstatSync(path);
      return {path: path, exists: true, uid: s.uid, gid: s.gid, mode: s.mode & 4095,
        directory: s.isDirectory(), symlink: s.isSymbolicLink(), size: s.size};
    } catch (error) { return {path: path, exists: false, error: error.code || String(error)}; }
  }
  function bounded(path) {
    var fd = fs.openSync(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      var bytes = Buffer.alloc(131073), count = fs.readSync(fd, bytes, 0, bytes.length, null);
      if (count > 131072) throw new Error("Read limit exceeded");
      return bytes.slice(0, count).toString("utf8");
    } finally { fs.closeSync(fd); }
  }
  var account = bounded("/etc/passwd").split("\n").filter(function (line) { return line.indexOf("root:") === 0; })[0];
  var fields = account.split(":");
  return {
    mounts: bounded("/proc/self/mounts"),
    rootAccount: {name: fields[0], uid: fields[2], gid: fields[3], home: fields[5], shell: fields[6]},
    paths: ["/var/lib", "/var/lib/reframe", "/var/lib/webosbrew", "/home/root", "/home/root/.ssh",
      "/media/internal", "/media/developer/temp/reframe-dropbear", "/etc/init/devmode.conf",
      "/usr/sbin/ls-control", "/usr/bin/luna-send"].map(metadata)
  };
}
