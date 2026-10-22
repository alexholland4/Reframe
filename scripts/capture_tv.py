"""Private one-shot native display capture, scoped to a foreground trial app."""
import base64
import json
import secrets
from tv_connection import PROJECT,ssh,luna
from tv_inspector import APPS


def capture(app, output):
    output=output.resolve()
    research=(PROJECT/".research").resolve()
    if app not in APPS or not output.is_relative_to(research):
        raise ValueError("Capture must target a trial app and stay in ignored research storage")
    foreground=luna("luna://com.webos.applicationManager/getForegroundAppInfo",{}).get("appId")
    if foreground!=app:raise RuntimeError("Refusing to capture another foreground app")
    stage="/tmp/reframe-iptv-capture-"+secrets.token_hex(12)
    result=ssh("/usr/bin/node -",input="const fs=require('fs');fs.mkdirSync("+json.dumps(stage)+",{mode:448});")
    result.check_returncode()
    path=stage+"/screen.png"
    try:
        luna("luna://com.webos.service.capture/executeOneShot",{"path":path,"method":"DISPLAY","format":"PNG","width":960,"height":540})
        source="const fs=require('fs'),p="+json.dumps(path)+",s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>4000000)throw Error('Unexpected capture');console.log(JSON.stringify({data:fs.readFileSync(p).toString('base64')}));"
        result=ssh("/usr/bin/node -",input=source);result.check_returncode()
        data=base64.b64decode(json.loads(result.stdout)["data"])
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):raise RuntimeError("Invalid capture format")
        output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(data)
        return {"path":str(output),"bytes":len(data)}
    finally:
        source="const fs=require('fs'),stage="+json.dumps(stage)+",s=fs.lstatSync(stage),names=fs.readdirSync(stage);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||names.some(n=>n!=='screen.png'))throw Error('Unexpected capture stage');for(const n of names){const p=stage+'/'+n,f=fs.lstatSync(p);if(!f.isFile()||f.isSymbolicLink())throw Error('Unexpected capture');fs.unlinkSync(p)}fs.rmdirSync(stage);"
        result=ssh("/usr/bin/node -",input=source);result.check_returncode()
