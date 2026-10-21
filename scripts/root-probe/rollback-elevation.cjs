/* Stage-specific undo: HBC elevation only, before any startup registration. */
function restore(plan, fs, cp, process, execute) {
  const crypto = require("crypto");
  const hash = data => crypto.createHash("sha256").update(data).digest("hex");
  if (process.getuid() !== 0) throw new Error("Root required");
  if (plan.schema !== 1 || !Array.isArray(plan.changes) || plan.changes.length !== 5) throw new Error("Unexpected plan");
  try { fs.lstatSync("/var/lib/webosbrew/startup.sh"); throw new Error("Undo startup stage first"); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  const suffixes = [
    "services.d/org.webosbrew.hbchannel.service.service",
    "client-permissions.d/org.webosbrew.hbchannel.service.root.json",
    "api-permissions.d/org.webosbrew.hbchannel.service.api.public.json",
    "roles.d/org.webosbrew.hbchannel.service.service.json",
    "manifests.d/org.webosbrew.hbchannel.json",
  ];
  const allowed = new Set(suffixes.map(s => "/var/luna-service2-dev/" + s));
  const actions = [];
  for (const change of plan.changes) {
    if (!allowed.delete(change.path)) throw new Error("Unexpected or duplicate profile");
    const item = fs.lstatSync(change.path);
    if (!item.isFile() || item.isSymbolicLink()) throw new Error("Unsafe profile");
    if (hash(fs.readFileSync(change.path)) !== hash(Buffer.from(change.proposed))) throw new Error("Profile changed since elevation");
    const original = plan.profiles.find(p => p.path === change.path);
    if (!original) throw new Error("Original profile missing from plan");
    let data;
    if (original.exists) {
      data = Buffer.from(original.base64, "base64");
      if (hash(data) !== original.sha256) throw new Error("Original checksum mismatch");
    }
    actions.push({path:change.path, original, data});
  }
  if (!execute) return {execute:false, profiles:actions.length};
  // No boot activity is created during elevation. Stop only this service's
  // matching JS runner before restoring its original launch/permission files.
  const service = "/media/developer/apps/usr/palm/services/org.webosbrew.hbchannel.service";
  for (const name of fs.readdirSync("/proc")) {
    if (!/^[1-9][0-9]*$/.test(name)) continue;
    try {
      const args = fs.readFileSync("/proc/" + name + "/cmdline", "utf8").split("\0");
      if (args.includes(service) || args.includes(service + "/service.js")) process.kill(Number(name), "SIGTERM");
    } catch (e) { if (!["ENOENT", "ESRCH", "EACCES"].includes(e.code)) throw e; }
  }
  for (const action of actions) {
    if (!action.original.exists) { fs.unlinkSync(action.path); continue; }
    const fd = fs.openSync(action.path, fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW | fs.constants.O_TRUNC);
    try {
      fs.writeFileSync(fd, action.data);
      fs.fchmodSync(fd, action.original.mode);
      fs.fchownSync(fd, action.original.uid, action.original.gid);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
  }
  cp.execFileSync("/usr/sbin/ls-control", ["scan-services"], {timeout:10000});
  return {execute:true, profiles:actions.length};
}
module.exports = restore;
if (require.main === module) {
  const fs = require("fs");
  const path = "/var/lib/reframe/elevation-plan.json";
  const st = fs.lstatSync(path);
  if (!st.isFile() || st.isSymbolicLink() || st.uid !== 0 || (st.mode & 18)) throw new Error("Unsafe plan file");
  console.log(JSON.stringify(restore(JSON.parse(fs.readFileSync(path, "utf8")), fs,
    require("child_process"), process, process.argv.includes("--execute"))));
}
