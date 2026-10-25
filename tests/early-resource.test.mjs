import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import resource from '../scripts/native-cover/EarlyResource.cjs';

const {BASE,VERSION,PLAN,DB,IMAGE,MOUNT,NAME,initialRow,ownedRow}=resource;
const active=()=>({...initialRow(),active:'1.0.0',activePath:VERSION,mountPoint:MOUNT});
function fixture({foreignRow=false,foreignMount=false,accepted=false,stack=1}={}){
 const actions=[],body=Buffer.from('owned file'),digest=crypto.createHash('sha256').update(body).digest('hex');let record=foreignRow?{...active(),availablePath:'/foreign'}:active();let timeout;
 const plan={schema:1,purpose:'reframe-early-cover',name:NAME,base:BASE,files:Array.from({length:60},()=>({path:BASE+'/owned',sha256:digest}))};
 let mounts=Array.from({length:stack},()=>[['/usr/lib/qml/CoverUI','/usr/lib/qml/CoverUI'],['/etc/hosts','/etc/hosts'],['/',MOUNT]]).flat();
 const fs={
  lstatSync(p){if(p.includes('trial-ok-')&&!accepted)throw Object.assign(Error('absent'),{code:'ENOENT'});return {isFile:()=>true,isSymbolicLink:()=>false,uid:0,mode:0o644}},
  readFileSync(p){if(p===PLAN)return JSON.stringify(plan);if(p.endsWith('/trial.json'))return JSON.stringify({nonce:'a'.repeat(32)});if(p.includes('/trial-ok-'))return 'a'.repeat(32);
   if(p==='/proc/self/mountinfo')return mounts.map(([root,target])=>`42 1 7:9 ${root} ${target} ro - squashfs /dev/loop9 ro`).join('\n');
   if(p.includes('/loop/backing_file'))return foreignMount?'/foreign/image':IMAGE;return body;},
  existsSync:()=>false,writeFileSync:(...a)=>actions.push(['write',...a]),
 };
 const cp={execFileSync(file,args){if(file==='/usr/bin/sqlite3'){const query=args.at(-1);if(query.startsWith('SELECT'))return JSON.stringify(record?[record]:[]);actions.push(['sql',query]);if(query.includes('DELETE'))record=null;return '';}if(file==='/bin/umount'){const index=mounts.findIndex(m=>m[1]===args[0]);if(index<0)throw Error('Not mounted');mounts.splice(index,1);}actions.push([file,...args]);return '';},
  spawn:(...args)=>{actions.push(['spawn',...args]);return {unref(){}}}};
 const module={exports:{}};
 runInNewContext(readFileSync(new URL('../scripts/native-cover/EarlyResource.cjs',import.meta.url),'utf8'),{module,require:Object.assign(()=>{}, {main:null}),setTimeout:(fn,ms)=>{assert.equal(ms,90000);timeout=fn}});
 return {api:module.exports.create(fs,cp,crypto,{getuid:()=>0}),actions,expire:()=>timeout()};
}
test('early resource ownership accepts only the exact pre/post activation records',()=>{
 assert.equal(ownedRow(initialRow()),true);assert.equal(ownedRow(active()),true);
 for(const [key,value]of [['name','other'],['mountPath','/usr'],['availablePath','/foreign'],['mountPoint','/media/foreign'],['resourceUpdate','true']])assert.equal(ownedRow({...active(),[key]:value}),false);
 assert.equal(ownedRow({...active(),unexpected:'field'}),false);
});
test('early rollback deletes only the exact owned record and unmounts only its three readonly mounts',()=>{
 const f=fixture();f.api.disable();assert.equal(f.actions[0][0],'sql');assert.match(f.actions[0][1],/DELETE FROM PackageInfo WHERE name='com.reframe.nativecover' AND/);
 assert.deepEqual(f.actions.slice(1),[['/bin/umount','/usr/lib/qml/CoverUI'],['/bin/umount','/etc/hosts'],['/bin/umount',MOUNT]]);
});
test('early rollback preserves a changed record',()=>{const f=fixture({foreignRow:true});assert.throws(()=>f.api.disable(),/Foreign resource/);assert.equal(f.actions.length,0)});
test('repeated native setup is fully undone, including stacked readonly mounts',()=>{const f=fixture({stack:2});f.api.disable();assert.equal(f.actions.filter(a=>a[0]==='/bin/umount').length,6);assert.equal(f.api.status().mounts.length,0)});
test('early rollback preserves another owner’s target mount',()=>{const f=fixture({foreignMount:true});assert.throws(()=>f.api.disable(),/Foreign target mount/);assert.equal(f.actions.length,0)});
test('unconfirmed early boot restores resource record/mounts and restarts only the UI',()=>{
 const f=fixture();f.api.timer('a'.repeat(32));f.expire();assert.equal(f.actions[0][0],'sql');assert.equal(f.actions.at(-1)[1],'/bin/systemctl');assert.equal(JSON.stringify(f.actions.at(-1)[2]),JSON.stringify(['restart','surface-manager-daemon.service']));
});
test('confirmed early boot makes no rollback changes',()=>{const f=fixture({accepted:true});f.api.timer('a'.repeat(32));f.expire();assert.equal(f.actions.length,0)});
