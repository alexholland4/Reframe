import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import marker from "../scripts/root-probe/session-marker.cjs";

function fixture() {
  const files = new Map(), writes = [];
  const pref = "/var/luna/preferences", original = pref + "/devmode_enabled";
  const digest = data => createHash("sha256").update(data).digest("hex");
  const add = (path, data, directory = false, uid = 0, gid = 0, mode = directory ? 0o755 : 0o600) =>
    files.set(path, {data:Buffer.from(data), directory, uid, gid, mode});
  for (const p of [pref, "/var/lib/reframe"]) add(p, "", true);
  add(original, "a".repeat(64), false, 5850, 5000, 0o644);
  add("/etc/init/devmode.conf", "signed LG init");
  add("/LG/start-devmode.sh", "signed LG script");
  const expected = {markerSha256:digest(files.get(original).data), originals:
    ["/etc/init/devmode.conf", "/LG/start-devmode.sh"].map(path => ({path,sha256:digest(files.get(path).data)}))};
  const get = p => { if (!files.has(p)) throw Object.assign(Error("absent"), {code:"ENOENT"}); return files.get(p); };
  const children = p => [...files.keys()].filter(k => k.startsWith(p + "/") && !k.slice(p.length + 1).includes("/"));
  const fs = {
    lstatSync(p) { const s=get(p); return {...s,isFile:()=>!s.directory,isDirectory:()=>s.directory,isSymbolicLink:()=>false}; },
    readFileSync:p=>get(p).data,
    readdirSync:p=>children(p).map(k=>k.slice(p.length+1)),
    mkdirSync(p, opts) { assert.ok(!files.has(p)); add(p,"",true,0,0,opts.mode); writes.push(p); },
    openSync(p,flag,mode) { assert.equal(flag,"wx"); assert.ok(!files.has(p)); add(p,"",false,0,0,mode); writes.push(p); return p; },
    writeFileSync(p,data) { get(p).data=Buffer.from(data); }, fsyncSync() {}, closeSync() {},
    unlinkSync(p) { assert.ok(!get(p).directory); files.delete(p); writes.push(p); },
    rmdirSync(p) { assert.ok(get(p).directory); assert.deepEqual(children(p),[]); files.delete(p); writes.push(p); },
    renameSync(a,b) { assert.ok(!files.has(b)); files.set(b,get(a)); files.delete(a); writes.push(b); },
    chownSync(p,uid,gid) { Object.assign(get(p),{uid,gid}); },
    chmodSync(p,mode) { get(p).mode=mode; },
  };
  return {files,writes,expected,fs,original,run:action=>marker(fs,{getuid:()=>0},expected,action)};
}

test("session marker conversion journals original first and targeted undo restores exact bytes/metadata", () => {
  const f=fixture(), before={...f.files.get(f.original)};
  assert.equal(f.run("convert").converted,true);
  assert.equal(f.files.get(f.original).directory,true);
  const backup=f.files.get("/var/lib/reframe/devmode-transition/session-marker.original");
  assert.deepEqual(backup.data,before.data); assert.equal(backup.mode,0o600); assert.equal(backup.uid,0);
  assert.ok(f.writes.indexOf("/var/lib/reframe/devmode-transition/session-marker.original") < f.writes.indexOf(f.original));
  assert.equal(f.run("restore").restored,true);
  assert.deepEqual(f.files.get(f.original),before);
  assert.ok(!f.files.has("/var/lib/reframe/devmode-transition"));
});

for (const fault of ["counter","changedMarker","changedLG","changedMetadata"]) test("session transition refuses " + fault + " before writes", () => {
  const f=fixture();
  if (fault === "counter") f.files.set("/var/luna/preferences/dc1",{});
  if (fault === "changedMarker") f.files.get(f.original).data=Buffer.from("b".repeat(64));
  if (fault === "changedLG") f.files.get("/LG/start-devmode.sh").data=Buffer.from("changed");
  if (fault === "changedMetadata") f.files.get(f.original).mode=0o666;
  assert.throws(()=>f.run("convert")); assert.deepEqual(f.writes,[]);
});

test("session undo preserves an unexpected marker entry instead of recursive deletion", () => {
  const f=fixture(); f.run("convert"); f.files.set(f.original + "/unexpected",{});
  const count=f.writes.length; assert.throws(()=>f.run("restore"),/directory changed/);
  assert.equal(f.writes.length,count); assert.ok(f.files.has(f.original + "/unexpected"));
});
