/* Session-independent marker with protected original and a targeted undo. */
function marker(fs, process, expected, action) {
  if (process.getuid() !== 0) throw Error("Root required");
  const crypto = require("crypto"), pref = "/var/luna/preferences";
  const path = pref + "/devmode_enabled", dir = "/var/lib/reframe/devmode-transition";
  const journalPath = dir + "/journal.json", backup = dir + "/session-marker.original";
  const digest = data => crypto.createHash("sha256").update(data).digest("hex");
  function stat(p, directory = false) {
    const s = fs.lstatSync(p);
    if (s.isSymbolicLink() || !(directory ? s.isDirectory() : s.isFile())) throw Error("Unsafe marker path: " + p);
    return s;
  }
  function trusted(p) { const s = stat(p); if (s.uid !== 0 || (s.mode & 18)) throw Error("Unsafe protected original"); return fs.readFileSync(p); }
  function write(p, data, mode = 384) {
    const fd = fs.openSync(p, "wx", mode);
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  for (const parent of [pref, "/var/lib/reframe"]) {
    const s = stat(parent, true); if (s.uid !== 0 || (s.mode & 18)) throw Error("Unsafe marker parent");
  }
  // A restored normal LG setup requires the original signed startup to be present.
  for (const f of expected.originals) {
    if (digest(trusted(f.path)) !== f.sha256) throw Error("LG startup differs from the captured original");
  }
  if (action === "convert") {
    if (fs.readdirSync(pref).some(n => /^dc/.test(n))) throw Error("Unexpected session counter; capture/review before transition");
    const s = stat(path), data = fs.readFileSync(path);
    if (s.uid !== 5850 || s.gid !== 5000 || (s.mode & 511) !== 420) throw Error("Session marker metadata changed");
    if (digest(data) !== expected.markerSha256 || data.length !== 64) throw Error("Session marker changed");
    try { fs.lstatSync(dir); throw Error("Transition state already exists"); }
    catch (e) { if (e.code !== "ENOENT") throw e; }
    fs.mkdirSync(dir, {mode:448});
    const journal = {schema:1, purpose:"reframe-session-marker", sha256:digest(data),
      uid:s.uid, gid:s.gid, mode:s.mode & 511, originals:expected.originals};
    write(journalPath, JSON.stringify(journal));
    write(backup, data);
    // Originals are fully journaled before the brief file-to-directory change.
    fs.unlinkSync(path);
    try { fs.mkdirSync(path, {mode:493}); }
    catch (e) {
      write(path, data); fs.chownSync(path, s.uid, s.gid); fs.chmodSync(path, s.mode & 511); throw e;
    }
    return {converted:true, markerType:"directory", protectedOriginal:true};
  }
  if (action !== "restore") throw Error("Unknown marker action");
  const ds = stat(dir, true); if (ds.uid !== 0 || (ds.mode & 63)) throw Error("Unsafe transition directory");
  const j = JSON.parse(trusted(journalPath)), data = trusted(backup);
  if (j.schema !== 1 || j.purpose !== "reframe-session-marker" || digest(data) !== j.sha256 ||
      j.sha256 !== expected.markerSha256 || j.uid !== 5850 || j.gid !== 5000 || j.mode !== 420 ||
      JSON.stringify(j.originals) !== JSON.stringify(expected.originals)) throw Error("Unexpected marker journal");
  if (fs.readdirSync(dir).some(n => !["journal.json", "session-marker.original"].includes(n))) throw Error("Unknown transition state");
  const s = stat(path, true);
  if (s.uid !== 0 || (s.mode & 511) !== 493 || fs.readdirSync(path).length) throw Error("Marker directory changed");
  const temp = pref + "/.reframe-devmode-restore";
  write(temp, data); fs.chownSync(temp, j.uid, j.gid); fs.chmodSync(temp, j.mode);
  fs.rmdirSync(path);
  try { fs.renameSync(temp, path); }
  catch (e) { fs.mkdirSync(path, {mode:493}); throw e; }
  fs.unlinkSync(backup); fs.unlinkSync(journalPath); fs.rmdirSync(dir);
  return {restored:true, markerType:"file", originalHashVerified:true};
}
module.exports = marker;
