"""Private native CoverUI import override; no firmware writes, explicit enable/undo."""
import argparse
import base64
import hashlib
import importlib.util
import json
import re
import secrets
from pathlib import Path
from tv_connection import PROJECT, ssh

ORIGINAL = "/usr/lib/qml/CoverUI/"
BASE = "/var/lib/reframe/native-cover"
IMPORTS = BASE + "/imports"
ENV = "/var/systemd/system/env/surface-manager.env"
PLAN = "/var/lib/reframe/native-cover-plan.json"
ENV_DATA = "# Reframe personal startup cover\nQML2_IMPORT_PATH=" + IMPORTS + ":/usr/lib/qml\n"


def node(source):
    result = ssh("/usr/bin/node -", input=source, timeout=35)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


def install():
    original = node(r"""const fs=require('fs'),path=require('path'),crypto=require('crypto');
if(process.getuid()!==0||fs.existsSync('/var/lib/reframe/native-cover-plan.json'))throw Error('Existing plan/root preflight');
const files=[];function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n),s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('Unexpected source symlink');if(s.isDirectory())walk(p);else{if(!s.isFile()||s.size>200000)throw Error('Unexpected module file');const data=fs.readFileSync(p);files.push({name:p.slice('/usr/lib/qml/CoverUI/'.length),base64:data.toString('base64'),sha256:crypto.createHash('sha256').update(data).digest('hex')})}}}walk('/usr/lib/qml/CoverUI');
if(files.length>128||files.reduce((a,f)=>a+Buffer.from(f.base64,'base64').length,0)>2000000)throw Error('Module too large');
let env=null;try{const p='/var/systemd/system/env/surface-manager.env',s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe environment');env={base64:fs.readFileSync(p).toString('base64'),mode:s.mode&511}}catch(e){if(e.code!=='ENOENT')throw e}
console.log(JSON.stringify({files,env}));""")
    backup = PROJECT / "backups/native-cover/original.json"
    if backup.exists():
        raise RuntimeError("Private original snapshot already exists; archive it before another install")
    backup.parent.mkdir(parents=True, exist_ok=True)
    backup.write_text(json.dumps(original, indent=2), encoding="utf-8")
    spec = importlib.util.spec_from_file_location("cover_patch", PROJECT / "scripts/native-cover/patch-cover.py")
    patcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patcher)
    entries = []
    for entry in original["files"]:
        name = entry["name"]
        if name.startswith("/") or ".." in name.split("/"):
            raise ValueError("Unexpected module path")
        data = base64.b64decode(entry["base64"])
        if name == "UserInterfaceLayer/Containers/MainView.qml":
            data = patcher.patch(data.decode("utf-8")).encode("utf-8")
        entries.append({"path": IMPORTS + "/CoverUI/" + name, "base64": base64.b64encode(data).decode(),
                        "sha256": hashlib.sha256(data).hexdigest()})
    for local, relative in [("PersonalMark.qml", "UserInterfaceLayer/Containers/PersonalMark.qml"),
                            ("TrialWatchdog.cjs", "TrialWatchdog.cjs")]:
        data = (PROJECT / "scripts/native-cover" / local).read_bytes()
        entries.append({"path": IMPORTS + "/CoverUI/" + relative,
                        "base64": base64.b64encode(data).decode(), "sha256": hashlib.sha256(data).hexdigest()})
    if original["env"]:
        raise RuntimeError("Existing compositor environment requires review; preserving it")
    plan = {"schema": 1, "purpose": "reframe-native-cover", "environmentBefore": None,
            "environment": ENV, "environmentSha256": hashlib.sha256(ENV_DATA.encode()).hexdigest(),
            "files": [{"path": e["path"], "sha256": e["sha256"]} for e in entries]}
    source = r"""const fs=require('fs'),path=require('path'),crypto=require('crypto'),files=FILES,plan=PLAN;
function absent(p){try{fs.lstatSync(p);return false}catch(e){if(e.code==='ENOENT')return true;throw e}}
if(process.getuid()!==0||!absent(PLANPATH)||!absent(BASE)||!absent(ENVPATH))throw Error('Destination exists/root preflight');
function parent(p){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe parent');}
parent('/var');parent('/var/lib/reframe');const dirs=new Set();
for(const p of files.map(f=>path.dirname(f.path)).concat(path.dirname(ENVPATH))){let d=p;while(absent(d)){dirs.add(d);d=path.dirname(d)}parent(d)}
plan.createdDirs=[...dirs].sort((a,b)=>a.length-b.length);
function write(p,data,mode){const fd=fs.openSync(p,'wx',mode);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
write(PLANPATH,JSON.stringify(plan),384);
for(const d of plan.createdDirs)fs.mkdirSync(d,{mode:493});
for(const f of files){write(f.path,Buffer.from(f.base64,'base64'),420);if(crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Copy changed');}
write(ENVPATH,ENVDATA,420);
console.log(JSON.stringify({installed:true,files:files.length,firmwareFilesChanged:0,restartRequested:false}));"""
    replacements = {"FILES": json.dumps(entries), "PLAN": json.dumps(plan), "PLANPATH": json.dumps(PLAN),
                    "BASE": json.dumps(BASE), "ENVPATH": json.dumps(ENV), "ENVDATA": json.dumps(ENV_DATA)}
    source = re.sub(r"\b(" + "|".join(replacements) + r")\b",
                    lambda match: replacements[match[0]], source)
    result = node(source)
    print(result)
    return result


def manage(action):
    source = r"""const fs=require('fs'),crypto=require('crypto'),cp=require('child_process'),action=ACTION;
function safe(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe owned file');}
safe(PLANPATH);const plan=JSON.parse(fs.readFileSync(PLANPATH,'utf8'));
if(plan.schema!==1||plan.purpose!=='reframe-native-cover'||plan.environment!==ENVPATH||plan.environmentBefore!==null||!Array.isArray(plan.files)||plan.files.length>128)throw Error('Unexpected plan');
let enabled=false;try{safe(ENVPATH);if(crypto.createHash('sha256').update(fs.readFileSync(ENVPATH)).digest('hex')!==plan.environmentSha256)throw Error('Foreign compositor environment');enabled=true}catch(e){if(e.code!=='ENOENT')throw e}
if(action==='disable'){if(enabled)fs.unlinkSync(ENVPATH);console.log(JSON.stringify({disabled:true,restartNeeded:true}));process.exit(0)}
for(const f of plan.files){if(!f.path.startsWith(BASE+'/imports/CoverUI/')||f.path.includes('/../'))throw Error('Unexpected module path');safe(f.path);if(crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Module changed');}
if(action==='enable'&&!enabled){const body=ENVDATA;if(crypto.createHash('sha256').update(body).digest('hex')!==plan.environmentSha256)throw Error('Environment differs from plan');fs.writeFileSync(ENVPATH,body,{flag:'wx',mode:420});enabled=true;}
console.log(JSON.stringify({enabled,verifiedFiles:plan.files.length,firmwareFilesChanged:0}));"""
    for key, value in {"PLANPATH": PLAN, "ENVPATH": ENV, "ACTION": action, "BASE": BASE, "ENVDATA": ENV_DATA}.items():
        source = source.replace(key, json.dumps(value))
    result = node(source)
    print(result)
    return result


def trial():
    if not manage("status")["enabled"]:
        raise RuntimeError("Native override is disabled")
    nonce = secrets.token_hex(16)
    source = "const nonce=" + json.dumps(nonce) + r""";
const fs=require('fs'),cp=require('child_process'),base='/var/lib/reframe/native-cover';
if(process.getuid()!==0)throw Error('Root required');
const child=cp.spawn('/usr/bin/node',[base+'/imports/CoverUI/TrialWatchdog.cjs',nonce],{detached:true,stdio:'ignore'});child.unref();
const restart=cp.spawn('/bin/systemctl',['restart','surface-manager-daemon.service'],{detached:true,stdio:'ignore'});restart.unref();
console.log(JSON.stringify({trial:nonce,watchdog:child.pid,restartRequested:true,rollbackAfterSeconds:90}));"""
    result = node(source)
    (PROJECT / "backups/native-cover/trial.json").write_text(json.dumps(result), encoding="utf-8")
    print(result)


def accept():
    if not manage("status")["enabled"]:
        raise RuntimeError("Cannot accept a disabled or rolled-back native trial")
    trial = json.loads((PROJECT / "backups/native-cover/trial.json").read_text())
    nonce = trial["trial"]
    if len(nonce) != 32 or any(c not in "0123456789abcdef" for c in nonce):
        raise ValueError("Invalid trial marker")
    print(node("const fs=require('fs'),nonce=" + json.dumps(nonce) + ";const base='/var/lib/reframe/native-cover/';if(fs.existsSync(base+'trial-rolled-back-'+nonce))throw Error('Trial already rolled back');const p=base+'trial-ok-'+nonce;fs.writeFileSync(p,nonce,{flag:'wx',mode:384});console.log(JSON.stringify({accepted:true}));"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "enable", "disable", "status", "trial", "accept"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared:", args.action, "(no TV connection; --execute required)")
        return
    if args.action == "install":
        install()
    elif args.action == "trial":
        trial()
    elif args.action == "accept":
        accept()
    else:
        manage(args.action)


if __name__ == "__main__":
    main()
