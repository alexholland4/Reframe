/* LG's early resource loader: one owned record, readonly mounts, precise undo. */
const BASE='/var/lib/reframe/early-cover', VERSION=BASE+'/version';
const PLAN='/var/lib/reframe/early-cover-plan.json';
const DB='/var/palm/data/resourceinstallerutility/packageInstallHistory.db';
const NAME='com.reframe.nativecover', IMAGE=VERSION+'/usr/palm/data/images/'+NAME+'/data.img';
const MOUNT='/media/squashfs/resources/'+NAME+'_'+VERSION;
const TARGETS=['/usr/lib/qml/CoverUI','/etc/hosts'];
const COLUMNS=['name','active','available','previous','activePath','availablePath','previousPath',
 'mountPath','mountPoint','activeVersionVerity','availableVersionVerity','previousVersionVerity','resourceUpdate','resourceName'];
function initialRow(){return {name:NAME,active:'',available:'1.0.0',previous:'',activePath:'',availablePath:VERSION,
 previousPath:'',mountPath:'/usr/palm/packages/'+NAME,mountPoint:'',activeVersionVerity:'',availableVersionVerity:'',
 previousVersionVerity:'',resourceUpdate:'false',resourceName:''};}
function ownedRow(row){
 const before=initialRow(),after={...before,active:'1.0.0',activePath:VERSION,mountPoint:MOUNT};
 return !!row && Object.keys(row).length===COLUMNS.length && [before,after].some(expected=>COLUMNS.every(k=>row[k]===expected[k]));
}
function create(fs,cp,crypto,proc){
 if(proc.getuid()!==0)throw Error('Root required');
 function safe(path){const s=fs.lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe owned file: '+path);return s;}
 function read(path){safe(path);return fs.readFileSync(path);}
 function load(){const p=JSON.parse(read(PLAN));if(p.schema!==1||p.purpose!=='reframe-early-cover'||p.name!==NAME||p.base!==BASE||!Array.isArray(p.files)||p.files.length!==60)throw Error('Unknown early resource plan');return p;}
 function verify(){const p=load();for(const f of p.files){if(!f.path.startsWith(BASE+'/')||f.path.includes('/../')||crypto.createHash('sha256').update(read(f.path)).digest('hex')!==f.sha256)throw Error('Resource source changed');}return p;}
 function sql(query){safe(DB);return cp.execFileSync('/usr/bin/sqlite3',['-cmd','.timeout 3000','-json',DB,query],{encoding:'utf8',timeout:6000}).trim();}
 function rows(){return JSON.parse(sql("SELECT * FROM PackageInfo WHERE name='"+NAME+"';")||'[]');}
 function quote(v){if(typeof v!=='string'||v.includes('\0'))throw Error('Invalid SQL value');return "'"+v.replace(/'/g,"''")+"'";}
 function mounted(){return fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').filter(Boolean).map(line=>{const a=line.split(' '),separator=a.indexOf('-');return {device:a[2],root:a[3],target:a[4],fs:a[separator+1],options:a[5]};}).filter(m=>TARGETS.includes(m.target)||m.target===MOUNT);}
 function isOwnMount(m){if(m.fs!=='squashfs')return false;try{return fs.readFileSync('/sys/dev/block/'+m.device+'/loop/backing_file','utf8').trim()===IMAGE;}catch(e){return false;}}
 function status(){verify();const found=rows();if(found.length>1||found.some(r=>!ownedRow(r)))throw Error('Foreign resource record');return {registered:found.length===1,active:found[0]?.active==='1.0.0',mounts:mounted().map(m=>({target:m.target,owned:isOwnMount(m),readonly:m.options.split(',').includes('ro')})),firmwareFilesChanged:0};}
 function enable(){verify();const found=rows();if(found.length)throw Error('Resource record already exists');const row=initialRow();sql('BEGIN IMMEDIATE; INSERT INTO PackageInfo('+COLUMNS.join(',')+') VALUES('+COLUMNS.map(k=>quote(row[k])).join(',')+'); COMMIT;');return status();}
 function disable(){load();const found=rows();if(found.length>1||found.some(r=>!ownedRow(r)))throw Error('Foreign resource record; preserving it');
  const mounts=mounted();if(mounts.some(m=>!isOwnMount(m)))throw Error('Foreign target mount; preserving it');
  if(found.length){const r=found[0];sql('BEGIN IMMEDIATE; DELETE FROM PackageInfo WHERE '+COLUMNS.map(k=>k+'='+quote(r[k])).join(' AND ')+'; COMMIT;');if(rows().length)throw Error('Resource record changed during rollback');}
  for(const target of [...TARGETS,MOUNT]){const count=mounts.filter(m=>m.target===target).length;if(count>16)throw Error('Unexpected mount stack');for(let i=0;i<count;i++){if(mounted().filter(m=>m.target===target).some(m=>!isOwnMount(m)))throw Error('Target mount changed');cp.execFileSync('/bin/umount',[target],{timeout:6000,stdio:'ignore'});}}
  if(mounted().length)throw Error('Owned mount stack not fully removed');
  return {disabled:true,ownedMountsRemoved:true,restartNeeded:true};
 }
 function trial(){verify();const t=JSON.parse(read(BASE+'/trial.json'));if(!/^[a-f0-9]{32}$/.test(t.nonce||''))throw Error('Invalid trial');return t;}
 function accepted(nonce){try{return read(BASE+'/trial-ok-'+nonce).toString()===nonce;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
 function accept(){const t=trial(),s=status();if(!s.registered||!s.active||new Set(s.mounts.map(m=>m.target)).size!==3||s.mounts.some(m=>!m.owned||!m.readonly)||fs.existsSync(BASE+'/trial-rolled-back-'+t.nonce))throw Error('Early trial is not healthy/active');fs.writeFileSync(BASE+'/trial-ok-'+t.nonce,t.nonce,{flag:'wx',mode:384});return {accepted:true};}
 function watchdog(){const t=trial();if(accepted(t.nonce)||fs.existsSync(BASE+'/trial-rolled-back-'+t.nonce))return {guardNeeded:false};
  try{const pid=read(BASE+'/watchdog.pid').toString().trim();if(/^[1-9][0-9]*$/.test(pid)){const args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');if(args.includes(BASE+'/EarlyResource.cjs')&&args.includes('timer')&&args.includes(t.nonce))return {guardRunning:true};}}catch(e){if(e.code!=='ENOENT')throw e;}
  const child=cp.spawn('/usr/bin/node',[BASE+'/EarlyResource.cjs','timer',t.nonce],{detached:true,stdio:'ignore'});child.unref();fs.writeFileSync(BASE+'/watchdog.pid',String(child.pid),{mode:384});return {guardStarted:true,rollbackAfterSeconds:90};
 }
 function timer(nonce){const t=trial();if(t.nonce!==nonce)throw Error('Stale timer');setTimeout(()=>{try{if(accepted(nonce))return;disable();fs.writeFileSync(BASE+'/trial-rolled-back-'+nonce,'Original resource mounts restored\n',{flag:'wx',mode:384});cp.spawn('/bin/systemctl',['restart','surface-manager-daemon.service'],{detached:true,stdio:'ignore'}).unref();}catch(e){fs.writeFileSync(BASE+'/guard-error.json',JSON.stringify({nonce,error:String(e)}),{mode:384});}},90000);}
 return {status,enable,disable,accept,watchdog,timer};
}
module.exports={create,ownedRow,initialRow,BASE,VERSION,PLAN,DB,NAME,IMAGE,MOUNT,TARGETS,COLUMNS};
if(require.main===module){const api=create(require('fs'),require('child_process'),require('crypto'),process),action=process.argv[2];if(!Object.prototype.hasOwnProperty.call(api,action))throw Error('Invalid action');const result=api[action](process.argv[3]);if(result)console.log(JSON.stringify(result));}
