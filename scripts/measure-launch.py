"""Measure a fresh Reframe launch while it is foreground; no TV action without --execute."""
import argparse
import json
from tv_connection import PROJECT, ssh
from tv_inspector import evaluate


def measure():
    source = r"""const fs=require('fs'),cp=require('child_process');
const app='com.reframe.home',pause=ms=>new Promise(r=>setTimeout(r,ms));
function luna(uri,p){return new Promise((resolve,reject)=>{const child=cp.spawn('/usr/bin/luna-send',['-i','-n','1','-w','4000',uri,JSON.stringify(p)]);let data='',done=false;const timer=setTimeout(()=>finish(Error('No reply: '+uri)),5000);function finish(error,value){if(done)return;done=true;clearTimeout(timer);child.stdin.end();child.kill();error?reject(error):resolve(value)}child.stdin.on('error',()=>{});child.on('error',finish);child.stdout.on('data',chunk=>{data+=chunk;let r;try{r=JSON.parse(data)}catch(e){return}finish(r.returnValue===true?null:Error(JSON.stringify(r)),r)});child.on('exit',()=>{if(!done)finish(Error('Incomplete reply: '+uri))});})}
function uptime(){return Number(fs.readFileSync('/proc/uptime','utf8').split(' ')[0])}
(async()=>{
if((await luna('luna://com.webos.applicationManager/getForegroundAppInfo',{})).appId!==app)throw Error('Leave active app alone; Reframe must be foreground');
const before=JSON.parse(fs.readFileSync('/media/developer/apps/usr/palm/applications/'+app+'/appinfo.json','utf8'));
await luna('luna://com.webos.applicationManager/dev/closeByAppId',{id:app,subscribe:false});
let closed=false;
try{
 for(let i=0;i<20;i++){
  const running=await luna('luna://com.webos.applicationManager/running',{});
  if(!running.running.some(a=>a.id===app)){closed=true;break}await pause(100);
 }
 if(!closed)throw Error('Reframe did not close; refusing ambiguous measurement');
 const start=uptime();await luna('luna://com.webos.applicationManager/launch',{id:app});
 let visible=false;
 for(let i=0;i<100;i++){
  if((await luna('luna://com.webos.applicationManager/getForegroundAppInfo',{})).appId===app){visible=true;break}
  await pause(100);
 }
 if(!visible)throw Error('Reframe did not become foreground');
 console.log(JSON.stringify({version:before.version,launchAt:start,foregroundAt:uptime(),launchToForeground:uptime()-start,meminfo:fs.readFileSync('/proc/meminfo','utf8'),pressure:fs.readFileSync('/proc/pressure/memory','utf8')}));
}catch(error){await luna('luna://com.webos.applicationManager/launch',{id:app});throw error}
})().catch(e=>{console.error(String(e));process.exitCode=1});"""
    result = ssh("/usr/bin/node -", input=source, timeout=45)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    data = json.loads(result.stdout)
    data["browser"] = evaluate("com.reframe.home", """new Promise(resolve=>{
      function collect(){if(document.readyState!=='complete'){setTimeout(collect,100);return}
        requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({
          navigation:performance.getEntriesByType('navigation').map(n=>({domInteractive:n.domInteractive,loadEventEnd:n.loadEventEnd})),
          paints:performance.getEntriesByType('paint').map(p=>({name:p.name,at:p.startTime})),
          wallpaper:{width:document.querySelector('.landscape').naturalWidth,height:document.querySelector('.landscape').naturalHeight},
          tiles:document.querySelectorAll('.tile').length,visibility:document.visibilityState})));
      }collect();})""")
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--label", default="sample")
    args = parser.parse_args()
    if not args.execute:
        print("Prepared Reframe-only fresh-launch measurement; --execute required")
        return
    if not args.label or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in args.label):
        raise ValueError("Use a simple sample label")
    folder = PROJECT / ".research/startup-performance"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (args.label + ".json")
    if path.exists():
        raise ValueError("Preserve the existing sample; choose a new label before any TV action")
    result = measure()
    with path.open("x", encoding="utf8") as stream:
        stream.write(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key not in ("meminfo", "pressure")}, indent=2))


if __name__ == "__main__":
    main()
