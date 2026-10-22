"""Install/remove only the reviewed IPTV 1.17.0 release; default validates locally."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import secrets
import tarfile
import time
from tv_connection import PROJECT, ssh, luna

APP = "com.lennylxx.iptv"
VERSION = "1.17.0"
SHA256 = "7f38a23df46fedc6381a660b280ce3e8abdeb88aff519f3a41ee3a5c15391299"
ROOTS = ["usr/palm/applications/" + APP, "usr/palm/services/" + APP + ".service", "usr/palm/packages/" + APP]
BASE = "/media/developer/apps/"


def package_info(path):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != SHA256 or len(data) > 5_000_000 or data[:8] != b"!<arch>\n":
        raise ValueError("Only the reviewed, SHA-256-pinned IPTV release is allowed")
    members, offset = {}, 8
    while offset < len(data):
        h = data[offset:offset+60]
        if len(h) != 60 or h[58:] != b"`\n":
            raise ValueError("Invalid package header")
        name, size = h[:16].decode().strip().rstrip("/"), int(h[48:58])
        if size < 0 or offset+60+size > len(data) or name in members:
            raise ValueError("Invalid package member")
        members[name] = data[offset+60:offset+60+size]
        offset += 60+size+size%2
    if set(members) != {"debian-binary", "control.tar.gz", "data.tar.gz"}:
        raise ValueError("Unexpected package members")
    with tarfile.open(fileobj=io.BytesIO(members["control.tar.gz"]), mode="r:gz") as archive:
        entries = archive.getmembers()
        if len(entries) != 1 or entries[0].name.removeprefix("./") != "control" or not entries[0].isfile():
            raise ValueError("Unexpected control script")
        control = dict(line.split(": ",1) for line in archive.extractfile(entries[0]).read().decode().splitlines() if ": " in line)
        if control.get("Package") != APP or control.get("Version") != VERSION:
            raise ValueError("Unexpected package identity")
    files, contents, seen = {}, {}, set()
    with tarfile.open(fileobj=io.BytesIO(members["data.tar.gz"]), mode="r:gz") as archive:
        entries = archive.getmembers()
        if len(entries) > 256 or sum(e.size for e in entries) > 10_000_000:
            raise ValueError("Package too large")
        for e in entries:
            name = e.name.removeprefix("./").rstrip("/")
            if name.startswith("/") or ".." in name.split("/") or name in seen or e.mode & 0o6000:
                raise ValueError("Unsafe or duplicate entry")
            seen.add(name)
            owned = any(name == root or name.startswith(root+"/") for root in ROOTS)
            ancestor = e.isdir() and (name in ["", "."] or any(root.startswith(name+"/") for root in ROOTS))
            if not owned and not ancestor:
                raise ValueError("Entry outside IPTV app/service/package")
            if e.isdir():
                continue
            if not e.isfile():
                raise ValueError("Non-file package entry")
            content = archive.extractfile(e).read()
            files[name] = {"sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
            if name.endswith(".json"):
                contents[name] = json.loads(content)
    app = contents[ROOTS[0]+"/appinfo.json"]
    package = contents[ROOTS[2]+"/packageinfo.json"]
    service = contents[ROOTS[1]+"/services.json"]
    if app.get("id") != APP or app.get("version") != VERSION or app.get("type") != "web":
        raise ValueError("Unexpected app manifest")
    if package != {"id":APP,"version":VERSION,"app":APP,"services":[APP+".service"]}:
        raise ValueError("Unexpected package registration")
    if service.get("id") != APP+".service" or service.get("services") != [{"name":APP+".service"}]:
        raise ValueError("Unexpected service registration")
    return data, files


def node(source):
    result = ssh("/usr/bin/node -", input=source)
    result.check_returncode()
    return json.loads(result.stdout)


def verify(files):
    return node("const fs=require('fs'),crypto=require('crypto'),files="+json.dumps(files)+";for(const [name,e]of Object.entries(files)){const p="+json.dumps(BASE)+"+name,s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==e.sha256)throw Error('Installed file differs: '+name)}console.log(JSON.stringify({uid:process.getuid(),verifiedFiles:Object.keys(files).length}));")


def install(path, data, files):
    before = node("const fs=require('fs');console.log(JSON.stringify({uid:process.getuid(),existing:"+json.dumps(ROOTS)+".filter(p=>fs.existsSync("+json.dumps(BASE)+"+p)),reframe:JSON.parse(fs.readFileSync('/media/developer/apps/usr/palm/applications/com.reframe.home/appinfo.json')).version,marker:fs.lstatSync('/var/luna/preferences/devmode_enabled').isDirectory()}));")
    if before["uid"] != 0 or before["existing"] or not before["marker"]:
        raise RuntimeError("Expected new app and existing session-independent root baseline")
    run = secrets.token_hex(12)
    backup = PROJECT/"backups"/("iptv-trial-"+run)
    backup.mkdir(parents=True)
    (backup/"install.json").write_text(json.dumps({"before":before,"sha256":SHA256,"version":VERSION,"files":files},indent=2),encoding="utf-8")
    stage = "/media/developer/temp/reframe-iptv-"+run
    upload = "const fs=require('fs'),crypto=require('crypto'),stage="+json.dumps(stage)+",data=Buffer.from("+json.dumps(base64.b64encode(data).decode())+",'base64');const p=fs.lstatSync('/media/developer/temp');if(process.getuid()!==0||!p.isDirectory()||p.isSymbolicLink())throw Error('Unsafe upload parent');fs.mkdirSync(stage,{mode:448});fs.writeFileSync(stage+'/package.ipk',data,{flag:'wx',mode:384});console.log(JSON.stringify({sha256:crypto.createHash('sha256').update(fs.readFileSync(stage+'/package.ipk')).digest('hex')}));"
    if node(upload)["sha256"] != SHA256:
        raise RuntimeError("Upload hash mismatch; preserving stage")
    try:
        print("Install accepted:",luna("luna://com.webos.appInstallService/dev/install",{"id":APP,"ipkUrl":stage+"/package.ipk","subscribe":False},seconds=8),flush=True)
        for _ in range(20):
            if node("const fs=require('fs'),p="+json.dumps(BASE+ROOTS[0]+"/appinfo.json")+";console.log(JSON.stringify({version:fs.existsSync(p)?JSON.parse(fs.readFileSync(p)).version:null}));")["version"] == VERSION:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Installed version not observed")
        print("Installed files:",verify(files),flush=True)
        print("Launch:",luna("luna://com.webos.applicationManager/launch",{"id":APP}),flush=True)
        print("Foreground:",luna("luna://com.webos.applicationManager/getForegroundAppInfo",{}).get("appId"),flush=True)
    finally:
        cleanup = "const fs=require('fs'),crypto=require('crypto'),stage="+json.dumps(stage)+";const s=fs.lstatSync(stage),names=fs.readdirSync(stage),p=stage+'/package.ipk',f=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||names.length!==1||names[0]!=='package.ipk'||!f.isFile()||f.isSymbolicLink()||f.uid!==0||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!=="+json.dumps(SHA256)+")throw Error('Unexpected stage; preserving');fs.unlinkSync(p);fs.rmdirSync(stage);console.log(JSON.stringify({removedOwnStage:true}));"
        print("Cleanup:",node(cleanup),flush=True)
    print("Installed reviewed IPTV",VERSION,flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package",type=Path)
    parser.add_argument("--execute",action="store_true")
    parser.add_argument("--uninstall",action="store_true")
    args=parser.parse_args()
    data,files=package_info(args.package)
    if not args.execute:
        print("Validated pinned IPTV package:",VERSION,len(files),"files; --execute required for TV access")
    elif args.uninstall:
        print("Before removal:",verify(files),flush=True)
        print("Restore Reframe:",luna("luna://com.webos.applicationManager/launch",{"id":"com.reframe.home"}),flush=True)
        print("Remove IPTV only:",luna("luna://com.webos.appInstallService/remove",{"id":APP,"subscribe":False}),flush=True)
    else:
        install(args.package,data,files)


if __name__ == "__main__":
    main()
