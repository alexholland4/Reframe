import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../scripts/native-cover/TrialWatchdog.cjs',import.meta.url),'utf8');
function trial({accepted=false,foreign=false}={}){
 const env='/var/systemd/system/env/surface-manager.env',nonce='a'.repeat(32),body=Buffer.from('owned override');
 const actions=[];let timer;
 const fs={
  lstatSync(p){if(p.includes('trial-ok-')&&!accepted)throw Object.assign(Error('missing'),{code:'ENOENT'});return {isFile:()=>true,isSymbolicLink:()=>false,uid:0,mode:0o644}},
  readFileSync(p){if(p.endsWith('native-cover-plan.json'))return JSON.stringify({purpose:'reframe-native-cover',environment:env,environmentBefore:null,environmentSha256:crypto.createHash('sha256').update(body).digest('hex')});if(p.includes('trial-ok-'))return nonce;return foreign?Buffer.from('foreign config'):body},
  unlinkSync:p=>actions.push(['unlink',p]),writeFileSync:p=>actions.push(['write',p]),
 };
 runInNewContext(source,{require:n=>({fs,crypto,child_process:{spawn:(...a)=>{actions.push(['spawn',...a]);return {unref(){}}}}}[n]),process:{getuid:()=>0,argv:['node','watchdog',nonce]},setTimeout:(fn,ms)=>{assert.equal(ms,90000);timer=fn}});
 timer();return actions;
}
test('unconfirmed native trial restores only its exact environment and restarts only the UI daemon',()=>{
 const actions=trial();assert.equal(actions.length,3);
 assert.deepEqual(actions[0],['unlink','/var/systemd/system/env/surface-manager.env']);
 assert.equal(actions[2][1],'/bin/systemctl');assert.equal(JSON.stringify(actions[2][2]),JSON.stringify(['restart','surface-manager-daemon.service']));
});
test('confirmed native trial performs no rollback',()=>assert.deepEqual(trial({accepted:true}),[]));
test('native watchdog preserves a compositor config changed outside the trial',()=>assert.deepEqual(trial({foreign:true}),[]));
