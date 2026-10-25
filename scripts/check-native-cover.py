"""Capture the enabled native cover's draw/final/home frames; defaults to no TV action."""
import argparse
import base64
import importlib.util
import json
import secrets
from tv_connection import PROJECT, ssh


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--early", action="store_true", help="Validate the early resource mounts instead of the compositor environment")
    args = parser.parse_args()
    if not args.execute:
        print("Prepared native-cover capture trial; no TV connection without --execute")
        return
    spec = importlib.util.spec_from_file_location("native_cover", PROJECT / ("scripts/manage-early-cover.py" if args.early else "scripts/manage-native-cover.py"))
    manager = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(manager)
    state = manager.control("status") if args.early else manager.manage("status")
    enabled = state.get("registered") and state.get("active") and len(state.get("mounts", [])) >= 3 if args.early else state["enabled"]
    if not enabled:
        raise RuntimeError("Native cover override must be enabled before this trial")
    nonce = secrets.token_hex(12)
    source = "const nonce=" + json.dumps(nonce) + r""";
const fs=require('fs'),cp=require('child_process');
function luna(uri,p){return new Promise((resolve,reject)=>{const child=cp.spawn('/usr/bin/luna-send',['-i','-n','1','-w','4000',uri,JSON.stringify(p)]);let data='',done=false;const timer=setTimeout(()=>finish(Error('No reply: '+uri)),5000);function finish(error,value){if(done)return;done=true;clearTimeout(timer);child.stdin.end();child.kill();error?reject(error):resolve(value)}child.on('error',finish);child.stdout.on('data',chunk=>{data+=chunk;let r;try{r=JSON.parse(data)}catch(e){return}finish(r.returnValue===true?null:Error(JSON.stringify(r)),r)});child.on('exit',()=>{if(!done)finish(Error('Incomplete reply: '+uri))});})}
const app='com.reframe.home';
const images=[],paths=[];let opened=false;
async function capture(name){const p='/tmp/reframe-cover-'+nonce+'-'+name+'.png';try{fs.lstatSync(p);throw Error('Destination exists')}catch(e){if(e.code!=='ENOENT')throw e}
paths.push(p);const r=await luna('luna://com.webos.surfacemanager/captureCompositorOutput',{output:p,format:'PNG'});const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||s.size>8000000)throw Error('Unexpected capture');images.push({name,base64:fs.readFileSync(p).toString('base64'),resolution:r.resolution})}
function cleanup(){for(const p of paths){try{const s=fs.lstatSync(p);if(s.isFile()&&!s.isSymbolicLink()&&s.uid===0)fs.unlinkSync(p)}catch(e){if(e.code!=='ENOENT')throw e}}}
(async()=>{try{
 if((await luna('luna://com.webos.applicationManager/getForegroundAppInfo',{})).appId!==app)throw Error('Leave active app alone');
 await luna('luna://com.webos.coverUI/open',{firstApp:{id:app},fallback:{id:app}});opened=true;
 const start=Date.now();for(const [name,at] of [['middle',1000],['final',1950],['home',3200]]){await new Promise(r=>setTimeout(r,Math.max(0,start+at-Date.now())));await capture(name)}
 const foreground=(await luna('luna://com.webos.applicationManager/getForegroundAppInfo',{})).appId;
 console.log(JSON.stringify({images,foreground}));
}catch(e){console.error(String(e));process.exitCode=1}finally{if(opened){try{await luna('luna://com.webos.coverUI/close',{})}catch(e){}}cleanup()}})();"""
    result = ssh("/usr/bin/node -", input=source, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    data = json.loads(result.stdout)
    destination = PROJECT / ".research/native-cover-trial" / nonce
    destination.mkdir(parents=True)
    for entry in data["images"]:
        if entry["name"] not in {"middle", "final", "home"}:
            raise ValueError("Unexpected capture name")
        image = base64.b64decode(entry["base64"])
        if not image.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Capture is not a PNG")
        (destination / (entry["name"] + ".png")).write_bytes(image)
    print("Native frames saved:", destination)
    print("Foreground after sequence:", data["foreground"])


if __name__ == "__main__":
    main()
