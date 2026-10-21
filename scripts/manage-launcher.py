"""Install/start/remove the one-decision-per-boot/wake Reframe launcher."""
import argparse
import base64
import hashlib
import json
from tv_connection import PROJECT
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location("root_startup", PROJECT / "scripts/manage-root-startup.py")
root_startup = module_from_spec(spec)
spec.loader.exec_module(root_startup)
node = root_startup.node
BASE = "/var/lib/reframe"


def install():
    plan = root_startup.verify_files()
    expected = hashlib.sha256((PROJECT / "scripts/root-probe/minimal-startup.cjs").read_bytes()).hexdigest()
    if next(f["sha256"] for f in plan["files"] if f["path"] == BASE + "/startup.cjs") != expected:
        raise RuntimeError("Install the current minimal startup before enabling its launcher hook")
    files = []
    for name in ["boot-launcher.cjs", "launch-policy.cjs", "luna-stream.cjs"]:
        data = (PROJECT / "scripts/root-probe" / name).read_bytes()
        files.append({"path": BASE + "/" + name, "sha256": hashlib.sha256(data).hexdigest(),
                      "base64": base64.b64encode(data).decode("ascii")})
    manifest = {"schema": 1, "purpose": "reframe-boot-wake", "files": [
        {k: v for k, v in f.items() if k != "base64"} for f in files],
        "startupTargets": ["com.webos.app.home", "com.webos.app.hdmi2"], "hdmi2": "owner-confirmed soundbar"}
    source = """const fs=require('fs'),files=FILES,plan=PLAN;
for(const p of files.map(f=>f.path).concat('/var/lib/reframe/launcher-plan.json','/var/lib/reframe/launcher-enabled')){try{fs.lstatSync(p);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Destination already exists: '+p);}
function write(path,data,mode){const fd=fs.openSync(path,'wx',mode);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
write('/var/lib/reframe/launcher-plan.json',JSON.stringify(plan,null,2),384);
for(const f of files)write(f.path,Buffer.from(f.base64,'base64'),420);
write('/var/lib/reframe/launcher-enabled','enabled\\n',384);
console.log(JSON.stringify({installed:files.length,enabled:true}));"""
    print(node(source.replace("FILES", json.dumps(files)).replace("PLAN", json.dumps(manifest))))


def start():
    print(node("const fs=require('fs');console.log(JSON.stringify(require('/var/lib/reframe/startup.cjs')(fs,require('child_process'),process)));"))


def status():
    return node("""const fs=require('fs');let pid=null,running=false,status=null;
try{const t=fs.readFileSync('/var/run/reframe-launch.pid','utf8').trim();if(!/^[1-9][0-9]*$/.test(t))throw Error('Invalid PID');pid=Number(t);running=fs.readFileSync('/proc/'+t+'/cmdline','utf8').split('\\0').includes('/var/lib/reframe/boot-launcher.cjs');}catch(e){if(e.code!=='ENOENT')throw e;}
try{status=JSON.parse(fs.readFileSync('/var/lib/reframe/launcher-status.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
console.log(JSON.stringify({enabled:fs.existsSync('/var/lib/reframe/launcher-enabled'),pid,running,status}));""")


def remove():
    source = """const fs=require('fs'),crypto=require('crypto');const base='/var/lib/reframe';
function safe(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe managed launcher file');return fs.readFileSync(p);}
const plan=JSON.parse(safe(base+'/launcher-plan.json'));const names=new Set(['boot-launcher.cjs','launch-policy.cjs','luna-stream.cjs'].map(n=>base+'/'+n));
if(plan.schema!==1||plan.purpose!=='reframe-boot-wake'||plan.files.length!==3)throw Error('Unexpected launcher plan');
for(const f of plan.files)if(!names.delete(f.path)||crypto.createHash('sha256').update(safe(f.path)).digest('hex')!==f.sha256)throw Error('Launcher file changed');
let pid;try{const t=safe('/var/run/reframe-launch.pid').toString().trim();if(!/^[1-9][0-9]*$/.test(t))throw Error('Invalid launcher PID');pid=Number(t);const args=fs.readFileSync('/proc/'+t+'/cmdline','utf8').split('\\0');if(!args.includes(base+'/boot-launcher.cjs'))throw Error('Unexpected process');}catch(e){if(e.code!=='ENOENT')throw e;pid=null;}
try{safe(base+'/launcher-enabled');fs.unlinkSync(base+'/launcher-enabled');}catch(e){if(e.code!=='ENOENT')throw e;}
if(pid)process.kill(pid,'SIGTERM');
setTimeout(()=>{if(pid&&fs.existsSync('/proc/'+pid+'/cmdline'))throw Error('Managed launcher has not stopped; preserving its files');
for(const f of plan.files)fs.unlinkSync(f.path);
for(const p of [base+'/launcher-status.json','/var/run/reframe-launch.pid'])try{safe(p);fs.unlinkSync(p);}catch(e){if(e.code!=='ENOENT')throw e;}
fs.unlinkSync(base+'/launcher-plan.json');console.log(JSON.stringify({removed:plan.files.length,sshUnaffected:true}));},800);"""
    print(node(source))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "start", "remove", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action == "status":
        print(json.dumps(status(), indent=2))
    elif not args.execute:
        print("Prepared launcher action:", args.action, "(no TV connection; --execute required)")
    else:
        {"install": install, "start": start, "remove": remove}[args.action]()


if __name__ == "__main__":
    main()
