"""Install a validated Reframe package through pinned root SSH; default is review-only."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import secrets
import shutil
import tarfile
import time
from tv_connection import PROJECT, ssh, luna

APP = "com.reframe.home"
INSTALLED = "/media/developer/apps/usr/palm/applications/" + APP


def package_info(path):
    data = path.read_bytes()
    if len(data) > 20 * 1024 * 1024 or data[:8] != b"!<arch>\n":
        raise ValueError("Expected a bounded webOS IPK archive")
    members, offset = {}, 8
    while offset < len(data):
        header = data[offset:offset + 60]
        if len(header) != 60 or header[58:] != b"`\n":
            raise ValueError("Invalid IPK header")
        name, size = header[:16].decode("ascii").strip().rstrip("/"), int(header[48:58])
        start = offset + 60
        if size < 0 or start + size > len(data) or name in members:
            raise ValueError("Invalid or duplicate IPK member")
        members[name] = data[start:start + size]
        offset = start + size + size % 2
    if set(members) != {"debian-binary", "control.tar.gz", "data.tar.gz"}:
        raise ValueError("Unexpected IPK members")
    with tarfile.open(fileobj=io.BytesIO(members["control.tar.gz"]), mode="r:gz") as archive:
        entries = archive.getmembers()
        if len(entries) != 1 or entries[0].name.removeprefix("./") != "control" or not entries[0].isfile() or entries[0].size > 8192:
            raise ValueError("Unexpected package control script or metadata")
        control = dict(line.split(": ", 1) for line in archive.extractfile(entries[0]).read().decode().splitlines() if ": " in line)
        if control.get("Package") != APP:
            raise ValueError("Package identity differs from Reframe")
    prefix = "usr/palm/applications/" + APP + "/"
    package_prefix = "usr/palm/packages/" + APP + "/"
    files = {}
    with tarfile.open(fileobj=io.BytesIO(members["data.tar.gz"]), mode="r:gz") as archive:
        entries = archive.getmembers()
        if len(entries) > 256 or sum(e.size for e in entries) > 32 * 1024 * 1024:
            raise ValueError("Package contents exceed app limits")
        for entry in entries:
            name = entry.name.removeprefix("./")
            if name.startswith("/") or ".." in name.split("/"):
                raise ValueError("Package contains a path outside Reframe")
            if entry.isdir():
                if name in ["", "."] or any(p.startswith(name.rstrip("/") + "/") or name.startswith(p) for p in [prefix, package_prefix]):
                    continue
                raise ValueError("Package contains a directory outside Reframe")
            if name == package_prefix + "packageinfo.json" and entry.isfile():
                metadata = json.loads(archive.extractfile(entry).read())
                if metadata != {"id": APP, "app": APP, "version": control["Version"]}:
                    raise ValueError("Unexpected package registration metadata")
                continue
            if not entry.isfile() or not name.startswith(prefix):
                raise ValueError("Unexpected non-file app entry")
            relative = name[len(prefix):]
            if relative in files:
                raise ValueError("Duplicate app file")
            content = archive.extractfile(entry).read()
            files[relative] = {"sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
            if relative == "appinfo.json":
                appinfo = json.loads(content)
    if "appinfo.json" not in files or appinfo.get("id") != APP or appinfo.get("version") != control.get("Version"):
        raise ValueError("Package must contain only the Reframe app")
    return data, appinfo["version"], files


def node(source):
    result = ssh("/usr/bin/node -", input=source)
    result.check_returncode()
    return json.loads(result.stdout)


def deploy(path, data, version, files):
    before = node("const fs=require('fs');console.log(JSON.stringify({uid:process.getuid(),app:JSON.parse(fs.readFileSync(" + json.dumps(INSTALLED + "/appinfo.json") + ",'utf8'))}));")
    if before["uid"] != 0 or before["app"]["id"] != APP:
        raise RuntimeError("Existing Reframe/root preflight failed")
    run_id = secrets.token_hex(12)
    backup = PROJECT / "backups" / ("ui-before-" + version + "-" + run_id)
    backup.mkdir(parents=True)
    old = PROJECT / (APP + "_" + before["app"]["version"] + "_all.ipk")
    if old.exists():
        package_info(old)
        shutil.copy2(old, backup / old.name)
    (backup / "manifest.json").write_text(json.dumps({"before": before, "newVersion": version,
        "packageSha256": hashlib.sha256(data).hexdigest()}, indent=2), encoding="utf-8")
    stage = "/media/developer/temp/reframe-ui-" + run_id
    package_hash = hashlib.sha256(data).hexdigest()
    source = """const fs=require('fs'),crypto=require('crypto'),stage=STAGE,data=Buffer.from(DATA,'base64');
const p=fs.lstatSync('/media/developer/temp');if(!p.isDirectory()||p.isSymbolicLink()||process.getuid()!==0)throw Error('Unsafe upload parent/identity');
fs.mkdirSync(stage,{mode:448});const fd=fs.openSync(stage+'/package.ipk','wx',384);
try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
console.log(JSON.stringify({uid:process.getuid(),sha256:crypto.createHash('sha256').update(fs.readFileSync(stage+'/package.ipk')).digest('hex')}));"""
    result = node(source.replace("STAGE", json.dumps(stage)).replace("DATA", json.dumps(base64.b64encode(data).decode("ascii"))))
    if result != {"uid": 0, "sha256": package_hash}:
        raise RuntimeError("Uploaded package hash mismatch; preserving stage")
    try:
        print("Install accepted:", luna("luna://com.webos.appInstallService/dev/install",
            {"id": APP, "ipkUrl": stage + "/package.ipk", "subscribe": False}, seconds=8), flush=True)
        for _ in range(20):
            installed = node("console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(" + json.dumps(INSTALLED + "/appinfo.json") + ",'utf8'))));")
            if installed.get("version") == version:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Expected installed version not observed")
        verify = """const fs=require('fs'),crypto=require('crypto'),base=BASE,files=FILES;
for(const [name,expected]of Object.entries(files)){const p=base+'/'+name,s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==expected.sha256)throw Error('Installed app differs: '+name);}
console.log(JSON.stringify({uid:process.getuid(),verifiedFiles:Object.keys(files).length}));"""
        print("Installed bytes verified:", node(verify.replace("BASE", json.dumps(INSTALLED)).replace("FILES", json.dumps(files))), flush=True)
        print("Reframe launch:", luna("luna://com.webos.applicationManager/launch", {"id": APP}), flush=True)
        print("Foreground:", luna("luna://com.webos.applicationManager/getForegroundAppInfo", {}).get("appId"), flush=True)
    finally:
        cleanup = """const fs=require('fs'),crypto=require('crypto'),stage=STAGE;
const s=fs.lstatSync(stage),names=fs.readdirSync(stage);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||names.length!==1||names[0]!=='package.ipk')throw Error('Unexpected upload stage; preserving it');
const p=stage+'/package.ipk',f=fs.lstatSync(p);if(!f.isFile()||f.isSymbolicLink()||f.uid!==0||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==HASH)throw Error('Upload changed; preserving it');
fs.unlinkSync(p);fs.rmdirSync(stage);console.log(JSON.stringify({removedOwnStage:true}));"""
        print("Cleanup:", node(cleanup.replace("STAGE", json.dumps(stage)).replace("HASH", json.dumps(package_hash))), flush=True)
    print("Deployed Reframe", version, "from", path.name, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    data, version, files = package_info(args.package)
    if not args.execute:
        print("Validated local Reframe package:", version, len(files), "files; --execute required for TV connection")
        return
    deploy(args.package, data, version, files)


if __name__ == "__main__":
    main()
