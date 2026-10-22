"""Manual native-TV trial: select the prepared channels and measure media progress."""
import argparse
import json
import time
from urllib.parse import urlparse
from capture_tv import capture
from tv_connection import PROJECT
from tv_inspector import evaluate, commands

APP="com.lennylxx.iptv"
LABELS=[c["label"] for c in json.loads((PROJECT/"docs/iptv-trial-channels.json").read_text(encoding="utf-8"))]


def number(index):
    operations=[]
    for digit in str(index+1):
        for kind in ["keyDown","keyUp"]:
            operations.append({"method":"Input.dispatchKeyEvent","params":{"type":kind,"key":digit,"windowsVirtualKeyCode":48+int(digit),"nativeVirtualKeyCode":48+int(digit)}})
    commands(APP,operations)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute",action="store_true")
    parser.add_argument("--capture",action="store_true")
    parser.add_argument("--indexes",default=",".join(str(i) for i in range(len(LABELS))))
    args=parser.parse_args()
    indexes=[int(n) for n in args.indexes.split(",")]
    if any(n<0 or n>=len(LABELS) for n in indexes):raise ValueError("Index outside prepared trial list")
    if not args.execute:
        print("Prepared native IPTV playback checks:",[LABELS[n] for n in indexes],"--execute required")
        return
    catalog=evaluate(APP,"[...document.querySelectorAll('.channel-item .channel-name')].map(e=>e.textContent)")
    if catalog!=LABELS:raise RuntimeError("Trial list differs; refusing to select unrelated channels")
    urls=[line for line in (PROJECT/".research/iptv-trial/trial.m3u").read_text(encoding="utf-8").splitlines() if line.startswith(("https://","http://"))]
    if len(urls)!=len(LABELS):raise RuntimeError("Trial source count differs")
    results=[]
    try:
        for index in indexes:
            # Number-key channel entry follows the installed app's real remote handler.
            number(index)
            expression=r"""(async()=>{const expected=EXPECTED,expectedHost=HOST;const state=()=>{const v=document.querySelector('video');return ({label:document.querySelector('.osd-channel-name')?.textContent,view:document.querySelector('#view-player').classList.contains('hidden')?'list':'player',paused:v.paused,time:v.currentTime,ready:v.readyState,width:v.videoWidth,height:v.videoHeight,muted:v.muted,volume:v.volume,error:v.error?.code??null,audioTracks:v.audioTracks?Array.from(v.audioTracks).map(t=>({enabled:t.enabled,kind:t.kind})):[],frames:v.getVideoPlaybackQuality?.().totalVideoFrames??null,sourceHost:v.currentSrc?new URL(v.currentSrc).hostname:null})};const pause=ms=>new Promise(r=>setTimeout(r,ms));await pause(1500);const deadline=Date.now()+22000;while(Date.now()<deadline){const s=state();if(s.label===expected&&s.sourceHost===expectedHost&&s.view==='player'&&!s.paused&&s.ready>=2&&s.width>0&&!s.error){const before=s.time,media=document.querySelector('video').mediaId;await pause(4000);const after=state();if(document.querySelector('video').mediaId!==media||after.time-before<=1)continue;return {...after,advance:after.time-before,passed:after.label===expected&&after.sourceHost===expectedHost&&!after.paused&&!after.error&&after.time-before>1}}if(s.label===expected&&s.error)return {...s,advance:0,passed:false};await pause(500)}return {...state(),advance:0,passed:false}})()""".replace("EXPECTED",json.dumps(LABELS[index])).replace("HOST",json.dumps(urlparse(urls[index]).hostname))
            result=evaluate(APP,expression)
            result["requested"]=LABELS[index]
            results.append(result)
            print(json.dumps(result),flush=True)
            if args.capture and result["passed"] and index in [0,1,2,3,4]:
                print("Capture:",capture(APP,PROJECT/(".research/iptv-trial/channel-"+str(index)+".png")),flush=True)
            report=PROJECT/"docs/fingerprint-iptv-playback.json"
            report.write_text(json.dumps({"version":"1.17.0","cases":results},indent=2),encoding="utf-8")
    finally:
        evaluate(APP,"(()=>{const s=window.__reframeIptvTrial,v=document.querySelector('video');if(s?.handler){for(const event of ['loadedmetadata','playing','error','waiting','stalled','pause','emptied'])v.removeEventListener(event,s.handler)}delete window.__reframeIptvTrial;return {temporaryObserverRemoved:true}})()")
    print("Playback checks:",sum(r["passed"] for r in results),"/",len(results),flush=True)


if __name__=="__main__":main()
