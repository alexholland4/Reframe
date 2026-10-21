"""Manage Reframe's minimal HBC boot callback; mutations require --execute."""
import argparse
import base64
import hashlib
import json
from tv_connection import PROJECT, ssh, luna

ACTIVITY = "org.webosbrew.hbchannel.service.autostart"
BASE = "/var/lib/reframe"


def node(source):
    result = ssh("/usr/bin/node -", input=source)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


def activities():
    reply = luna("luna://com.palm.activitymanager/list", {
        "details": False, "subscribers": False, "current": False, "internal": False})
    matches = [item for item in reply["activities"] if item.get("name") == ACTIVITY]
    return [luna("luna://com.palm.activitymanager/getDetails", {
        "activityId": item["activityId"], "current": False, "internal": False})["activity"]
        for item in matches]


def verify_files():
    return node("""const fs=require('fs'),crypto=require('crypto');
const path='/var/lib/reframe/startup-plan.json';
function safe(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe managed file: '+p);}
safe(path);const plan=JSON.parse(fs.readFileSync(path,'utf8'));
if(plan.schema!==1||plan.purpose!=='reframe-minimal-startup'||plan.files.length!==2)throw Error('Invalid startup plan');
const expected=['/var/lib/reframe/startup.cjs','/var/lib/webosbrew/startup.sh'];
for(const f of plan.files){if(!expected.includes(f.path))throw Error('Unexpected path');safe(f.path);if(crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Managed startup file changed');}
console.log(JSON.stringify(plan));""")


def install():
    if activities():
        raise RuntimeError("Boot activity already exists; inspect before installation")
    sources = [(BASE + "/startup.cjs", "minimal-startup.cjs", 0o644),
               ("/var/lib/webosbrew/startup.sh", "minimal-startup.sh", 0o755)]
    files = []
    for path, name, mode in sources:
        data = (PROJECT / "scripts/root-probe" / name).read_bytes()
        files.append({"path": path, "mode": mode, "sha256": hashlib.sha256(data).hexdigest(),
                      "base64": base64.b64encode(data).decode("ascii")})
    plan = {"schema": 1, "purpose": "reframe-minimal-startup", "originalActivityAbsent": True,
            "files": [{key: value for key, value in f.items() if key != "base64"} for f in files]}
    source = """const fs=require('fs');const files=FILES,plan=PLAN;
if(process.getuid()!==0)throw Error('Root required');
for(const p of ['/var/lib/reframe','/var/lib/webosbrew']){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe parent');}
for(const p of files.map(f=>f.path).concat('/var/lib/reframe/startup-plan.json')){try{fs.lstatSync(p);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Destination exists: '+p);}
function write(path,data,mode){const fd=fs.openSync(path,'wx',mode);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
write('/var/lib/reframe/startup-plan.json',JSON.stringify(plan,null,2),384);
for(const f of files)write(f.path,Buffer.from(f.base64,'base64'),f.mode);
console.log(JSON.stringify({installed:files.length,bootActivity:false}));"""
    print(node(source.replace("FILES", json.dumps(files)).replace("PLAN", json.dumps(plan))))
    verify_files()


def verify_callback():
    verify_files()
    # Both the HBC callback and the independent developer SSH route remain available.
    result = ssh("id -u", root=False)
    if result.returncode or result.stdout.strip() != "6349":
        raise RuntimeError("Developer fallback must be working before this access restart test")
    print(luna("luna://org.webosbrew.hbchannel.service/checkRoot", {}, root=False))
    print(luna("luna://org.webosbrew.hbchannel.service/autostart", {"reason": "activity"}, root=False))
    print(node("""const fs=require('fs');const text=fs.readFileSync('/var/run/reframe-sshd.pid','utf8').trim();
if(!/^[1-9][0-9]*$/.test(text))throw Error('Invalid PID');const args=fs.readFileSync('/proc/'+text+'/cmdline','utf8').split('\\0');
if(args[0]!=='/var/lib/reframe/dropbear')throw Error('Unexpected daemon');process.kill(Number(text),'SIGTERM');console.log(JSON.stringify({stoppedOwnListener:true}));"""))
    print(luna("luna://org.webosbrew.hbchannel.service/autostart", {"reason": "activity"}, root=False))
    status = node("console.log(require('fs').readFileSync('/var/lib/reframe/boot-status.json','utf8'));")
    if status.get("uid") != 0 or status.get("ssh") is not True:
        raise RuntimeError("Callback did not report actual root startup")
    print("Callback restarted authenticated root SSH:", json.dumps(status))


def register():
    verify_files()
    if activities():
        raise RuntimeError("Boot activity already exists; inspect before replacing")
    print(luna("luna://org.webosbrew.hbchannel.service/registerActivity", {}))
    found = activities()
    if len(found) != 1:
        raise RuntimeError("Expected exactly one boot activity")
    item = found[0]
    if (item.get("type", {}).get("persist") is not True or
            item.get("callback", {}).get("method") != "luna://org.webosbrew.hbchannel.service/autostart"):
        raise RuntimeError("Unexpected boot activity definition")
    print("Verified persistent root callback activity:", item["activityId"])


def remove():
    plan = verify_files()
    for item in activities():
        if item.get("callback", {}).get("method") != "luna://org.webosbrew.hbchannel.service/autostart":
            raise RuntimeError("Unexpected activity callback; preserving it")
        print(luna("luna://com.palm.activitymanager/cancel", {"activityId": item["activityId"]}))
    if activities():
        raise RuntimeError("Activity still exists; preserving startup files")
    source = """const fs=require('fs');const files=FILES;
for(const f of files)fs.unlinkSync(f.path);
try{const p='/var/lib/reframe/boot-status.json',s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0)throw Error('Unsafe status file');fs.unlinkSync(p);}catch(e){if(e.code!=='ENOENT')throw e;}
fs.unlinkSync('/var/lib/reframe/startup-plan.json');console.log(JSON.stringify({removed:files.length,sshStillRunning:true}));"""
    print(node(source.replace("FILES", json.dumps(plan["files"]))))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "verify-callback", "register", "remove", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared action:", args.action, "(no TV connection; --execute is required)")
        return
    if args.action == "status":
        print(json.dumps({"plan": verify_files(), "activities": activities()}, indent=2))
    else:
        {"install": install, "verify-callback": verify_callback, "register": register, "remove": remove}[args.action]()


if __name__ == "__main__":
    main()
