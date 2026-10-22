"""App-scoped TV inspector commands over existing pinned SSH, without forwarding."""
import json
from tv_connection import ssh

APPS = {"com.reframe.home", "com.lennylxx.iptv"}
METHODS = {"Runtime.evaluate", "Input.dispatchKeyEvent", "Input.dispatchMouseEvent", "Page.captureScreenshot"}


def command(app, method, params=None):
    if app not in APPS or method not in METHODS:
        raise ValueError("Inspector target/method outside the launcher/IPTV trial")
    request = {"id":1,"method":method,"params":params or {}}
    source = r"""const http=require('http'),net=require('net'),crypto=require('crypto');
const app=APP,request=REQUEST;
let finished=false,socket,timer;
function done(error,result){if(finished)return;finished=true;clearTimeout(timer);if(socket)socket.destroy();if(error){console.error(String(error));process.exitCode=1;}else console.log(JSON.stringify(result));}
timer=setTimeout(()=>done('Inspector timed out'),35000);
const listing=http.get({host:'127.0.0.1',port:9998,path:'/json/list',timeout:3000},r=>{let data='';r.on('data',c=>data+=c);r.on('end',()=>{
try{
 if(data.length>1000000)throw Error('Inspector target list too large');
 const prefix='file:///media/developer/apps/usr/palm/applications/'+app+'/';
 const page=JSON.parse(data).find(p=>p.url.startsWith(prefix));
 if(!page)throw Error('Requested app is not an inspector target');
 const url=new URL(page.webSocketDebuggerUrl);
 if(url.protocol!=='ws:'||url.hostname!=='127.0.0.1'||url.port!=='9998')throw Error('Unexpected inspector endpoint');
 const key=crypto.randomBytes(16).toString('base64');
 let buffer=Buffer.alloc(0),upgraded=false,fragments=[],fragmentBytes=0;
 function send(payload,opcode=1){const data=Buffer.from(payload),mask=crypto.randomBytes(4);let head;if(data.length<126){head=Buffer.from([128|opcode,128|data.length]);}else if(data.length<65536){head=Buffer.alloc(4);head[0]=128|opcode;head[1]=254;head.writeUInt16BE(data.length,2);}else{head=Buffer.alloc(10);head[0]=128|opcode;head[1]=255;head.writeUInt32BE(data.length,6);}const body=Buffer.from(data);for(let i=0;i<body.length;i++)body[i]^=mask[i%4];socket.write(Buffer.concat([head,mask,body]));}
 socket=net.connect({host:'127.0.0.1',port:9998},()=>socket.write('GET '+url.pathname+' HTTP/1.1\r\nHost: 127.0.0.1:9998\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: '+key+'\r\nSec-WebSocket-Version: 13\r\n\r\n'));
 socket.on('error',e=>done(e));socket.on('close',()=>{if(!finished)done('Inspector closed before reply')});
 socket.on('data',chunk=>{try{buffer=Buffer.concat([buffer,chunk]);if(buffer.length>12*1024*1024)throw Error('Inspector reply too large');
 if(!upgraded){const end=buffer.indexOf('\r\n\r\n');if(end<0)return;const header=buffer.subarray(0,end).toString();const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');if(!header.startsWith('HTTP/1.1 101 ')||!header.toLowerCase().includes('sec-websocket-accept: '+accept.toLowerCase()))throw Error('Invalid inspector handshake');buffer=buffer.subarray(end+4);upgraded=true;send(JSON.stringify(request));}
 while(buffer.length>=2){let length=buffer[1]&127,offset=2;const opcode=buffer[0]&15,fin=buffer[0]&128,masked=buffer[1]&128;if(masked)throw Error('Unexpected masked server frame');if(length===126){if(buffer.length<4)return;length=buffer.readUInt16BE(2);offset=4;}else if(length===127){if(buffer.length<10)return;if(buffer.readUInt32BE(2)!==0)throw Error('Frame too large');length=buffer.readUInt32BE(6);offset=10;}if(length>12*1024*1024)throw Error('Frame too large');if(buffer.length<offset+length)return;const body=buffer.subarray(offset,offset+length);buffer=buffer.subarray(offset+length);if(opcode===8)throw Error('Inspector closed');if(opcode===9){send(body,10);continue;}if(opcode===10)continue;if(opcode!==0&&opcode!==1)throw Error('Unexpected frame opcode');fragments.push(body);fragmentBytes+=body.length;if(fragmentBytes>12*1024*1024)throw Error('Message too large');if(fin){const message=JSON.parse(Buffer.concat(fragments).toString());fragments=[];fragmentBytes=0;if(message.id===1){if(message.error)done(JSON.stringify(message.error));else done(null,message.result);return;}}}
 }catch(e){done(e)}});
}catch(e){done(e)}})});listing.on('error',e=>done(e));listing.on('timeout',()=>listing.destroy(new Error('Target list timed out')));
"""
    # Template literals and expressions travel on stdin, never through shell interpolation.
    source = source.replace("APP",json.dumps(app)).replace("REQUEST",json.dumps(request))
    result=ssh("/usr/bin/node -",input=source,timeout=45)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "Inspector command failed")
    return json.loads(result.stdout)


def evaluate(app, expression):
    result=command(app,"Runtime.evaluate",{"expression":expression,"returnByValue":True,"awaitPromise":True})
    if result.get("exceptionDetails"):
        raise RuntimeError(json.dumps(result["exceptionDetails"]))
    return result["result"].get("value")
