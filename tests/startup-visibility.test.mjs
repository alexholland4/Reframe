import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {posix, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

// Generate the actual remote payload without making any TV connection.
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const generated=spawnSync('python',['-c',`import importlib.util,json,sys;sys.path.insert(0,'scripts');s=importlib.util.spec_from_file_location('visibility','scripts/manage-startup-visibility.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);print(json.dumps({a:m.source(a) for a in ['install','remove','status']}))`],{cwd:project,encoding:'utf8',windowsHide:true});
assert.equal(generated.status,0,generated.stderr);
const sources=JSON.parse(generated.stdout);
const client='/var/luna-service2-dev/client-permissions.d/com.reframe.home.app.json';
const manifest='/var/luna-service2/manifests.d/com.reframe.startup-observer.json';
const plan='/var/lib/reframe/visibility-plan.json';
const original=Buffer.from('{ "com.reframe.home-*": ["public"] }\n');

function machine(){
 const nodes=new Map(),writes=[],commands=[],output=[],exit=Symbol('exit');
 for(const p of [posix.dirname(client),posix.dirname(manifest),posix.dirname(plan)])nodes.set(p,{directory:true,mode:0o755});
 nodes.set(client,{data:Buffer.from(original),mode:0o644});
 function get(p){if(!nodes.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return nodes.get(p)}
 const fs={
  lstatSync(p){const n=get(p);return {uid:0,mode:n.mode,isDirectory:()=>!!n.directory,isFile:()=>!n.directory,isSymbolicLink:()=>!!n.symlink}},
  statSync(p){return this.lstatSync(p)},
  readFileSync(p,encoding){const data=get(p).data;return encoding?data.toString(encoding):Buffer.from(data)},
  openSync(p,flags,mode){assert.equal(flags,'wx');if(nodes.has(p))throw Object.assign(Error('exists'),{code:'EEXIST'});nodes.set(p,{data:Buffer.alloc(0),mode});return p},
  writeFileSync(p,data){get(p).data=Buffer.from(data);writes.push(p)},
  fsyncSync(){},closeSync(){},
  renameSync(a,b){nodes.set(b,get(a));nodes.delete(a)},
  unlinkSync(p){get(p);nodes.delete(p);writes.push('remove:'+p)},
 };
 function run(action){try{runInNewContext(sources[action],{Buffer,Set,JSON,require:name=>({fs,path:posix,crypto,child_process:{execFileSync:(...args)=>commands.push(args)}}[name]),process:{getuid:()=>0,exit:()=>{throw exit}},console:{log:s=>output.push(JSON.parse(s))}})}catch(e){if(e!==exit)throw e}}
 return {nodes,writes,commands,output,run};
}

test('visibility permission journals first, grants only status to Reframe and undoes exact original bytes',()=>{
 const m=machine();m.run('install');
 assert.equal(m.writes[0],plan);
 assert.deepEqual(JSON.parse(m.nodes.get(client).data),{'com.reframe.home-*':['public','surfaces.status']});
 assert.deepEqual(JSON.parse(m.nodes.get(manifest).data).clientPermissionFiles,[client]);
 m.run('remove');
 assert.deepEqual(m.nodes.get(client).data,original);
 assert.equal(m.nodes.get(client).mode,0o644);
 assert.equal(m.nodes.has(plan),false);assert.equal(m.nodes.has(manifest),false);
 assert.equal(m.commands.length,2);
 assert.ok(m.commands.every(c=>c[0]==='/usr/sbin/ls-control'&&c[1][0]==='scan-services'));
});
test('visibility install preserves an unexpected existing manifest before any write',()=>{
 const m=machine();m.nodes.set(manifest,{data:Buffer.from('foreign'),mode:0o644});
 assert.throws(()=>m.run('install'),/Destination exists/);assert.equal(m.writes.length,0);
});
test('visibility removal refuses a changed app profile before restoring or removing anything',()=>{
 const m=machine();m.run('install');m.nodes.get(client).data=Buffer.from('{"com.reframe.home-*":["all"]}');
 const count=m.writes.length;assert.throws(()=>m.run('remove'),/outside this controller/);assert.equal(m.writes.length,count);
});
test('visibility reapply repairs an app reinstall without extending permissions to other apps',()=>{
 const m=machine();m.run('install');m.nodes.get(client).data=Buffer.from(original);
 m.run('status');assert.equal(m.output.at(-1).installed,false);
 m.run('install');m.run('status');assert.equal(m.output.at(-1).installed,true);
 m.run('remove');assert.deepEqual(m.nodes.get(client).data,original);
});
test('visibility install refuses a symlinked app permission profile before any write',()=>{
 const m=machine();m.nodes.get(client).symlink=true;
 assert.throws(()=>m.run('install'),/Unsafe managed file/);assert.equal(m.writes.length,0);
});
