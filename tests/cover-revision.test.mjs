import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../scripts/native-cover/CoverRevision.cjs',import.meta.url),'utf8');
const base='/var/lib/reframe/early-cover',folder=base+'/revisions/'+'a'.repeat(24),planPath='/var/lib/reframe/early-cover-plan.json';
const targets=[base+'/version/usr/lib/qml/CoverUI/UserInterfaceLayer/Containers/MainView.qml',base+'/version/usr/palm/data/images/com.reframe.nativecover/data.img'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture({accepted=false,partial=false,foreign=false}={}){
 const files=new Map(),actions=[],before=[],after=[];let timer;
 const put=(p,b)=>files.set(p,Buffer.from(typeof b==='string'?b:JSON.stringify(b)));
 for(let i=0;i<60;i++){
  const path=targets[i]??base+'/unchanged-'+i,old='old-'+i,next=i<2?'new-'+i:old;
  before.push({path,sha256:hash(old)});after.push({path,sha256:hash(next)});put(path,partial&&i===1?old:next);
  if(i<2){put(folder+'/before-'+i,old);put(folder+'/after-'+i,next)}
 }
 const plan=files=>({schema:1,purpose:'reframe-early-cover',base,name:'com.reframe.nativecover',hostsBeforeSha256:'original',files});
 put(folder+'/before-plan.json',plan(before));put(folder+'/after-plan.json',plan(after));put(planPath,plan(after));
 const manifest={schema:1,purpose:'reframe-direct-cover-revision',folder,beforePlanSha256:hash(files.get(folder+'/before-plan.json')),afterPlanSha256:hash(files.get(folder+'/after-plan.json')),files:targets.map((target,i)=>({target,beforeSha256:before[i].sha256,afterSha256:after[i].sha256}))};
 put(folder+'/revision.json',manifest);if(accepted)put(folder+'/accepted',folder);if(foreign)put(targets[0],'foreign');
 const missing=()=>Object.assign(Error('absent'),{code:'ENOENT'});
 const fs={lstatSync(p){if(p!==folder&&!files.has(p))throw missing();return {isFile:()=>p!==folder,isDirectory:()=>p===folder,isSymbolicLink:()=>false,uid:0,mode:0o600}},
  readFileSync(p,encoding){if(!files.has(p))throw missing();return encoding?files.get(p).toString():files.get(p)},
  existsSync:p=>files.has(p),openSync:p=>p,writeFileSync(p,b){put(p,Buffer.isBuffer(b)?b.toString():b);actions.push(['write',p])},fsyncSync(){},closeSync(){},chmodSync(){},
  renameSync(a,b){files.set(b,files.get(a));files.delete(a);actions.push(['rename',b])}};
 const resource={disable(){actions.push(['disable'])},enable(){actions.push(['enable'])},status(){return {active:true,mounts:Array.from({length:3},()=>({owned:true,readonly:true}))}}};
 const cp={execFileSync(...args){actions.push(['exec',...args]);return ''},spawn(...args){actions.push(['spawn',...args]);return {unref(){}}}};
 const module={exports:{}};
 const require=Object.assign(name=>({fs,crypto,child_process:cp,[base+'/EarlyResource.cjs']:{create:()=>resource}}[name]),{main:null});
 runInNewContext(source,{module,require,process:{getuid:()=>0},setTimeout:(f,ms)=>{assert.equal(ms,90000);timer=f},Buffer});
 return {api:module.exports,files,actions,expire:()=>timer()};
}

test('unconfirmed presentation guard restores exact previous files even after a partial swap',()=>{
 const f=fixture({partial:true});f.api.timer(folder);f.expire();
 assert.equal(f.files.get(targets[0]).toString(),'old-0');assert.equal(f.files.get(targets[1]).toString(),'old-1');
 assert.ok(f.files.has(folder+'/rolled-back'));assert.equal(f.actions.at(-1)[1],'/bin/systemctl');
 assert.equal(JSON.stringify(f.actions.at(-1)[2]),JSON.stringify(['restart','surface-manager-daemon.service']));
});
test('accepted presentation guard leaves all files and services alone',()=>{
 const f=fixture({accepted:true});f.api.timer(folder);f.expire();assert.deepEqual(f.actions,[]);
});
test('foreign resource changes prevent any rollback overwrite or UI restart',()=>{
 const f=fixture({foreign:true});assert.throws(()=>f.api.swap(folder,'before'),/Foreign resource bytes/);assert.deepEqual(f.actions,[]);
});
test('revision folder outside the owned nonce directory is refused',()=>{
 const f=fixture();assert.throws(()=>f.api.load('/var/lib/reframe/early-cover/revisions/../other'),/Unknown revision/);assert.deepEqual(f.actions,[]);
});
