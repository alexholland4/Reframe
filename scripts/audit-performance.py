"""Read-only process, preload and service audit; raw device evidence stays private."""
import argparse
import json
from tv_connection import PROJECT, ssh

SOURCE = r"""const fs=require('fs'),cp=require('child_process');
function read(p){try{return fs.readFileSync(p,'utf8')}catch(e){return ''}}
function run(p,a){try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:15000,maxBuffer:4000000})}catch(e){return {error:String(e)}}}
function processes(){const result={};for(const pid of fs.readdirSync('/proc').filter(p=>/^[0-9]+$/.test(p))){
 try{const raw=read('/proc/'+pid+'/stat'),at=raw.lastIndexOf(')'),s=raw.slice(at+2).split(' '),cmd=read('/proc/'+pid+'/cmdline').split('\0').filter(Boolean);
 if(!cmd.length)continue;const memory=read('/proc/'+pid+'/smaps_rollup');
 const fields={};for(const k of ['Rss','Pss','Private_Clean','Private_Dirty','SwapPss']){const m=memory.match(new RegExp('^'+k+':\\s+(\\d+)','m'));fields[k]=m?Number(m[1]):null}
 result[pid]={pid:Number(pid),name:raw.slice(raw.indexOf('(')+1,at),cmd,ppid:Number(s[1]),start:Number(s[19]),ticks:Number(s[11])+Number(s[12]),memory:fields};
 }catch(e){}}
 return result}
function luna(uri,p){return new Promise(resolve=>{const c=cp.spawn('/usr/bin/luna-send',['-i','-n','1','-w','4000',uri,JSON.stringify(p)]);let text='',done=false;
 const timer=setTimeout(()=>finish({error:'timeout'}),5000);function finish(r){if(done)return;done=true;clearTimeout(timer);c.stdin.end();c.kill();resolve(r)}
 c.stdin.on('error',()=>{});c.on('error',e=>finish({error:String(e)}));c.stdout.on('data',b=>{text+=b;try{finish(JSON.parse(text))}catch(e){}});c.on('exit',()=>{if(!done)finish({error:'incomplete'})});})}
(async()=>{const start=processes(),cpu=read('/proc/stat');await new Promise(r=>setTimeout(r,2000));const end=processes();
 const apps=await luna('luna://com.webos.applicationManager/listApps',{});
 const result={uptime:read('/proc/uptime'),meminfo:read('/proc/meminfo'),pressure:read('/proc/pressure/memory'),cpuBefore:cpu,cpuAfter:read('/proc/stat'),
 processes:Object.values(end).map(p=>({...p,tickDelta:start[p.pid]?.start===p.start?p.ticks-start[p.pid].ticks:null})),
 foreground:await luna('luna://com.webos.applicationManager/getForegroundAppInfo',{}),running:await luna('luna://com.webos.applicationManager/running',{}),
 preload:await luna('luna://com.webos.service.preloadmanager/getPreloadPolicy',{}),
 apps:apps.apps?.map(a=>({id:a.id,title:a.title,folderPath:a.folderPath,removable:a.removable,systemApp:a.systemApp})),
 units:run('/bin/systemctl',['list-units','--all','--no-pager','--plain']),unitFiles:run('/bin/systemctl',['list-unit-files','--no-pager']),
 preloadConfig:read('/var/preferences/webos-preload-manager-conf.json'),
 bootlog:read('/var/log/bootd.log'),mounts:read('/proc/mounts'),
 storage:run('/bin/df',['-k','/var','/media/developer'])};
 console.log(JSON.stringify(result));})().catch(e=>{console.error(String(e));process.exitCode=1});"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--label", required=True)
    args = parser.parse_args()
    if not args.label or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in args.label):
        raise ValueError("Use a simple unique label")
    path = PROJECT / ".research/startup-performance" / (args.label + ".json")
    if path.exists():
        raise ValueError("Preserve the existing audit")
    result = ssh("/usr/bin/node -", input=SOURCE, timeout=90)
    result.check_returncode()
    data = json.loads(result.stdout)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf8")
    print("Private audit:", path)
    print("Foreground:", data["foreground"].get("appId"))
    print("Processes:", len(data["processes"]))
    for p in sorted(data["processes"], key=lambda p: p["memory"]["Pss"] or 0, reverse=True)[:22]:
        print(p["pid"], p["name"], "PSS KiB:", p["memory"]["Pss"], "CPU ticks/2s:", p["tickDelta"])


if __name__ == "__main__":
    main()
