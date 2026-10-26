/* Guard a presentation-only revision of our existing readonly resource. */
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const BASE='/var/lib/reframe/early-cover', PLAN='/var/lib/reframe/early-cover-plan.json';
const MAIN=BASE+'/version/usr/lib/qml/CoverUI/UserInterfaceLayer/Containers/MainView.qml';
const IMAGE=BASE+'/version/usr/palm/data/images/com.reframe.nativecover/data.img';
function digest(b){return crypto.createHash('sha256').update(b).digest('hex')}
function safe(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe revision file');return fs.readFileSync(p)}
function load(folder){
 if(process.getuid()!==0||!/^\/var\/lib\/reframe\/early-cover\/revisions\/[a-f0-9]{24}$/.test(folder))throw Error('Unknown revision folder');
 const dir=fs.lstatSync(folder);if(!dir.isDirectory()||dir.isSymbolicLink()||dir.uid!==0||(dir.mode&18))throw Error('Unsafe revision folder');
 const m=JSON.parse(safe(folder+'/revision.json'));
 if(m.schema!==1||m.purpose!=='reframe-direct-cover-revision'||m.folder!==folder||m.files.length!==2||m.files[0].target!==MAIN||m.files[1].target!==IMAGE)throw Error('Unexpected revision scope');
 const before=JSON.parse(safe(folder+'/before-plan.json')),after=JSON.parse(safe(folder+'/after-plan.json'));
 if(digest(safe(folder+'/before-plan.json'))!==m.beforePlanSha256||digest(safe(folder+'/after-plan.json'))!==m.afterPlanSha256)throw Error('Revision plan changed');
 for(const p of [before,after])if(p.schema!==1||p.purpose!=='reframe-early-cover'||p.base!==BASE||p.name!=='com.reframe.nativecover'||p.files.length!==60)throw Error('Unexpected resource plan');
 if(before.hostsBeforeSha256!==after.hostsBeforeSha256||JSON.stringify({...before,files:[]})!==JSON.stringify({...after,files:[]}))throw Error('Foreign plan change');
 for(let i=0;i<before.files.length;i++){
  const a=before.files[i],b=after.files[i],entry=m.files.find(f=>f.target===a.path);
  if(a.path!==b.path||a.sha256!==(entry?entry.beforeSha256:b.sha256)||(entry&&b.sha256!==entry.afterSha256))throw Error('Unexpected file change');
 }
 for(let i=0;i<2;i++)for(const kind of ['before','after'])if(digest(safe(folder+'/'+kind+'-'+i))!==m.files[i][kind+'Sha256'])throw Error('Revision payload changed');
 return m;
}
function replace(p,data){const tmp=p+'.reframe-revision-new';const fd=fs.openSync(tmp,'wx',0o600);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}fs.chmodSync(tmp,p===PLAN?0o600:0o644);fs.renameSync(tmp,p)}
function api(){return require(BASE+'/EarlyResource.cjs').create(fs,cp,crypto,process)}
function checkCurrent(folder,m){
 const sha=digest(safe(PLAN));if(![m.beforePlanSha256,m.afterPlanSha256].includes(sha))throw Error('Foreign resource plan; preserving it');
 for(const f of m.files)if(![f.beforeSha256,f.afterSha256].includes(digest(safe(f.target))))throw Error('Foreign resource bytes; preserving them');
 // All untouched files must still match their original owner hashes.
 const before=JSON.parse(safe(folder+'/before-plan.json'));
 for(const f of before.files)if(!m.files.some(e=>e.target===f.path)&&digest(safe(f.path))!==f.sha256)throw Error('Foreign resource source');
}
function swap(folder,kind){const m=load(folder);checkCurrent(folder,m);api().disable();
 for(let i=0;i<m.files.length;i++)replace(m.files[i].target,safe(folder+'/'+kind+'-'+i));
 replace(PLAN,safe(folder+'/'+kind+'-plan.json'));api().enable();
 cp.execFileSync('/usr/bin/ResourceInstallerUtility',['-c','setup'],{timeout:20000,stdio:'ignore'});
 const s=api().status();if(!s.active||s.mounts.length!==3||s.mounts.some(m=>!m.owned||!m.readonly))throw Error('Revised resource not active');return s;
}
function accepted(folder){try{return safe(folder+'/accepted').toString()===folder}catch(e){if(e.code==='ENOENT')return false;throw e}}
function restartUI(){cp.spawn('/bin/systemctl',['restart','surface-manager-daemon.service'],{detached:true,stdio:'ignore'}).unref()}
function rollback(folder){load(folder);const result=swap(folder,'before');fs.writeFileSync(folder+'/rolled-back','Restored previous presentation\n',{mode:0o600});restartUI();return result}
function watchdog(folder){load(folder);if(accepted(folder)||fs.existsSync(folder+'/rolled-back'))return {guardNeeded:false};
 const pidfile=folder+'/guard.pid';try{const pid=safe(pidfile).toString().trim();if(/^[1-9][0-9]*$/.test(pid)){const args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');if(args.includes(folder+'/CoverRevision.cjs')&&args.includes('timer')&&args.includes(folder))return {guardRunning:true}}}catch(e){if(e.code!=='ENOENT')throw e}
 const c=cp.spawn('/usr/bin/node',[folder+'/CoverRevision.cjs','timer',folder],{detached:true,stdio:'ignore'});c.unref();fs.writeFileSync(pidfile,String(c.pid),{mode:0o600});return {guardStarted:true,seconds:90};
}
function timer(folder){load(folder);setTimeout(()=>{try{if(!accepted(folder)&&!fs.existsSync(folder+'/rolled-back'))rollback(folder)}catch(e){fs.writeFileSync(folder+'/guard-error.json',JSON.stringify({error:String(e)}),{mode:0o600})}},90000)}
function apply(folder){load(folder);if(accepted(folder)||fs.existsSync(folder+'/rolled-back'))throw Error('Completed trial cannot be reused');watchdog(folder);const result=swap(folder,'after');restartUI();return result}
function accept(folder){const m=load(folder);checkCurrent(folder,m);const s=api().status();if(digest(safe(PLAN))!==m.afterPlanSha256||!s.active||s.mounts.length!==3||s.mounts.some(m=>!m.owned||!m.readonly)||fs.existsSync(folder+'/rolled-back'))throw Error('Revision is not healthy');fs.writeFileSync(folder+'/accepted',folder,{flag:'wx',mode:0o600});return {accepted:true}}
const actions={watchdog,timer,apply,rollback,accept};
module.exports={load,checkCurrent,swap,accepted,watchdog,timer,accept,rollback};
if(require.main===module){const action=process.argv[2];if(!Object.hasOwn(actions,action))throw Error('Unknown revision action');const r=actions[action](process.argv[3]);if(r)console.log(JSON.stringify(r))}
