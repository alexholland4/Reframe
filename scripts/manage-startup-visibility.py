"""Manage Reframe's read-only surface-status permission; mutations require --execute."""
import argparse
import hashlib
import json
from tv_connection import ssh

BASE = "/var/luna-service2/"
NAME = "com.reframe.startup-observer"
PLAN = "/var/lib/reframe/visibility-plan.json"
CLIENT = "/var/luna-service2-dev/client-permissions.d/com.reframe.home.app.json"
MANIFEST = BASE + "manifests.d/" + NAME + ".json"


def files():
    payloads = {
        MANIFEST: {"id": NAME, "version": "1.0.0",
                   "clientPermissionFiles": [CLIENT]},
    }
    return [{"path": path, "content": json.dumps(data, separators=(",", ":")) + "\n"}
            for path, data in payloads.items()]


def source(action):
    entries = files()
    for entry in entries:
        entry["sha256"] = hashlib.sha256(entry["content"].encode()).hexdigest()
    # Ownership/hash checks run before every mutation, including targeted removal.
    return "const action=" + json.dumps(action) + ",files=" + json.dumps(entries) + ",planPath=" + json.dumps(PLAN) + ",clientPath=" + json.dumps(CLIENT) + r""";
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
if(process.getuid()!==0)throw Error('Root required');
function absent(p){try{fs.lstatSync(p);return false}catch(e){if(e.code==='ENOENT')return true;throw e}}
function safeFile(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe managed file');}
function hash(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
for(const p of new Set(files.map(f=>path.dirname(f.path)).concat(path.dirname(planPath),path.dirname(clientPath)))){
 const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe parent');
}
function clientData(p){const original=JSON.parse(Buffer.from(p.clientBefore,'base64').toString('utf8'));
 if(JSON.stringify(original)!=='{"com.reframe.home-*":["public"]}'||p.clientMode!==420)throw Error('Unexpected original app profile');
 original['com.reframe.home-*'].push('surfaces.status');return JSON.stringify(original)+'\n';}
function verifyPlan(){safeFile(planPath);const p=JSON.parse(fs.readFileSync(planPath,'utf8'));
 if(p.schema!==1||p.purpose!=='reframe-startup-visibility'||JSON.stringify(p.files)!==JSON.stringify(files.map(f=>({path:f.path,sha256:f.sha256}))))throw Error('Unexpected ownership plan');
 for(const f of files)if(!absent(f.path)){safeFile(f.path);if(hash(f.path)!==f.sha256)throw Error('Managed policy changed');}
 safeFile(clientPath);const current=fs.readFileSync(clientPath,'utf8'),before=Buffer.from(p.clientBefore,'base64').toString('utf8');
 if(current!==before&&current!==clientData(p))throw Error('App profile changed outside this controller');return p;
}
function write(p,data,mode){const fd=fs.openSync(p,'wx',mode);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
function replaceClient(data,mode){const temp=clientPath+'.reframe-tmp';write(temp,data,mode);fs.renameSync(temp,clientPath)}
if(action==='install'){
 if(!absent(planPath)){const p=verifyPlan();if(!files.every(f=>!absent(f.path)))throw Error('Partial install; use remove before reinstall');
  if(fs.readFileSync(clientPath,'utf8')!==clientData(p))replaceClient(clientData(p),p.clientMode);
  cp.execFileSync('/usr/sbin/ls-control',['scan-services'],{timeout:10000});console.log(JSON.stringify({installed:true,reapplied:true}));process.exit(0);}
 if(files.some(f=>!absent(f.path)))throw Error('Destination exists; preserving it');
 safeFile(clientPath);const plan={schema:1,purpose:'reframe-startup-visibility',files:files.map(f=>({path:f.path,sha256:f.sha256})),clientBefore:fs.readFileSync(clientPath).toString('base64'),clientMode:fs.statSync(clientPath).mode&511};
 const managed=clientData(plan);write(planPath,JSON.stringify(plan),384);
 replaceClient(managed,plan.clientMode);
 for(const f of files)write(f.path,f.content,420);
 verifyPlan();
 cp.execFileSync('/usr/sbin/ls-control',['scan-services'],{timeout:10000});
 console.log(JSON.stringify({installed:true,api:'getForegroundWindowInfo',readOnly:true}));
}else if(action==='remove'){
 const p=verifyPlan();
 replaceClient(Buffer.from(p.clientBefore,'base64'),p.clientMode);
 for(const f of [...files].reverse())if(!absent(f.path))fs.unlinkSync(f.path);
 cp.execFileSync('/usr/sbin/ls-control',['scan-services'],{timeout:10000});
 fs.unlinkSync(planPath);console.log(JSON.stringify({removedOwnPolicy:true}));
}else{
 if(absent(planPath)){console.log(JSON.stringify({installed:false}));process.exit(0)}
 const p=verifyPlan();console.log(JSON.stringify({installed:files.every(f=>!absent(f.path))&&fs.readFileSync(clientPath,'utf8')===clientData(p),readOnly:true}));
}
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "remove", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared:", args.action, "(no TV connection; --execute required)")
        return
    result = ssh("/usr/bin/node -", input=source(args.action))
    result.check_returncode()
    print(result.stdout.strip())


if __name__ == "__main__":
    main()
