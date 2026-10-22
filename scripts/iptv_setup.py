"""Use the installed IPTV app's authenticated setup API over existing SSH."""
import json
import re
from tv_connection import ssh
from tv_inspector import evaluate

APP="com.lennylxx.iptv"


def request(route, method="GET", body=None):
    if not re.fullmatch(r"/(?:uploads|setup-actions(?:/[0-9]+)?|setup-state)",route) or method not in {"GET","POST","DELETE"}:
        raise ValueError("Unsupported IPTV setup operation")
    heartbeat=evaluate(APP,"new Promise((resolve,reject)=>{const b=new PalmServiceBridge();const timer=setTimeout(()=>reject(Error('service timeout')),5000);b.onservicecallback=raw=>{clearTimeout(timer);resolve(JSON.parse(raw))};b.call('luna://com.lennylxx.iptv.service/heartbeat','{}')})")
    port=heartbeat.get("port")
    if not heartbeat.get("running") or not isinstance(port,int) or not 1024<=port<=65535:
        raise RuntimeError("IPTV must be foreground with its setup service running")
    source=r"""const http=require('http'),port=PORT,route=ROUTE,method=METHOD,payload=PAYLOAD;
function call(path,method,body){return new Promise((resolve,reject)=>{const data=body===null?null:Buffer.from(typeof body==='string'?body:JSON.stringify(body));const req=http.request({host:'127.0.0.1',port,path,method,headers:data?{'Content-Type':typeof body==='string'?'audio/x-mpegurl':'application/json','Content-Length':data.length}:{},timeout:7000},res=>{let text='';res.on('data',c=>{text+=c;if(text.length>2000000)req.destroy(Error('Reply too large'))});res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(Error('Setup HTTP '+res.statusCode));try{resolve(JSON.parse(text))}catch(e){reject(e)}})});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('Setup timed out')));if(data)req.write(data);req.end()})}
(async()=>{const info=await call('/info','GET',null);const token=new URL(info.setupUrl).searchParams.get('token');if(!/^[a-f0-9]{12}$/.test(token))throw Error('Unexpected setup token');const path=route+'?token='+encodeURIComponent(token)+(method==='POST'&&route==='/uploads'?'&name=Reframe%20trial.m3u':'');const result=await call(path,method,payload);console.log(JSON.stringify(result))})().catch(e=>{console.error(String(e));process.exitCode=1});
"""
    source=source.replace("PORT",str(port)).replace("ROUTE",json.dumps(route)).replace("METHOD",json.dumps(method)).replace("PAYLOAD",json.dumps(body))
    result=ssh("/usr/bin/node -",input=source,timeout=25)
    if result.returncode:raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)
