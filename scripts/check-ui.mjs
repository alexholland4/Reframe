import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
// Run after npm run dev. Uses loopback preview and live Open-Meteo; never contacts the TV.
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const browserPath=process.env.REFRAME_BROWSER ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!browserPath)throw Error('Set REFRAME_BROWSER to a Chromium browser executable');
const portServer=createServer();
const debugPort=await new Promise((resolve,reject)=>{portServer.once('error',reject);portServer.listen(0,'127.0.0.1',()=>{const port=portServer.address().port;portServer.close(()=>resolve(port));});});
const profile=base+'/.research/ui-check-'+randomBytes(6).toString('hex');
const imageDir=base+(process.argv.includes('--capture')?'/docs/images':'/.research/ui-check-results');
const browser=spawn(browserPath,['--headless=new','--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'--window-size=1920,1080','http://127.0.0.1:5173'],{windowsHide:true,stdio:'ignore'});
let socket,call;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let tabs;
 for(let i=0;i<100;i++){try{tabs=await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json();if(tabs.some(t=>t.url.includes('5173')))break;}catch{}await pause(100);}
 socket=new WebSocket(tabs.find(t=>t.url.includes('5173')).webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
 call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 const ready=async()=>{for(let n=0;n<140;n++){if(await evaluate(`document.querySelectorAll('.tile').length===10&&[...document.images].every(i=>i.complete&&i.naturalWidth>0)`))return;await pause(100);}throw Error('UI or artwork failed to load');};
 await ready();
 // The live weather request also checks CORS and the configured city/units.
 for(let n=0;n<120;n++){if(await evaluate(`document.querySelector('.weather')?.dataset.state!=='loading'`))break;await pause(100);}
 const weather=await evaluate(`({state:document.querySelector('.weather').dataset.state,label:document.querySelector('.wx-label').textContent,temp:document.querySelector('.wx-temp').textContent})`);
 if(weather.state!=='ready'||!weather.label.includes('Sheboygan, WI')||!weather.temp.endsWith('F'))throw Error('Live Sheboygan weather failed: '+JSON.stringify(weather));
 if(await evaluate(`!!document.querySelector('.hero,.wordmark,.brand-mark,.hint,#selection-position')`))throw Error('Removed headings/branding/hints are still present');
 const selected=()=>evaluate(`document.querySelector('.tile.focused')?.getAttribute('aria-label')`);
 const expect=async name=>{const got=await selected();if(got!==name)throw Error('Expected focus '+name+', got '+got);};
 const key=async(k,code,repeat=false)=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:k,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,autoRepeat:repeat});await call('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:k,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});};
 const expected=['Netflix','Prime Video','HBO Max','Peacock','Paramount+','Hulu','Apple TV','Disney+','Apple Music','More Apps'];
 const labels=await evaluate(`[...document.querySelectorAll('.tile')].map(e=>e.getAttribute('aria-label'))`);
 if(JSON.stringify(labels)!==JSON.stringify(expected))throw Error('Home order differs: '+JSON.stringify(labels));
 if(await evaluate(`document.querySelector('.tile').getBoundingClientRect().width`)<380)throw Error('Home tiles should be large');
 await expect('Netflix');
 await key('ArrowLeft',37);await expect('Netflix');
 await key('ArrowRight',39);await expect('Prime Video');
 await key('ArrowDown',40);await expect('Prime Video');
 await key('ArrowUp',38);await expect('Prime Video');
 await key('ArrowLeft',37);await expect('Netflix');
 await evaluate(`window.__selectCount=0;document.addEventListener('reframe:select',()=>window.__selectCount++)`);
 await key('Enter',13);await key('Enter',13,true);await key('Enter',13,true);
 if(await evaluate('window.__selectCount')!==1)throw Error('Held OK launched repeatedly');
 await pause(700);
 await pause(270);
 const target=await evaluate(`(()=>{const r=document.querySelector('[data-app-id="com.wbd.stream"]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x,y:target.y});await expect('HBO Max');
 await key('ArrowRight',39);await expect('Peacock');
 await evaluate(`window.__edgeStart=performance.now();window.__frames=0;requestAnimationFrame(function tick(){window.__frames++;requestAnimationFrame(tick)})`);for(let n=0;n<20;n++)await key('ArrowRight',39);
 await expect('More Apps');await pause(650);
 const edge=await evaluate(`(()=>{const e=document.querySelector('.tile.focused'),r=e.getBoundingClientRect(),g=e.closest('[data-focus-group]');return {left:r.left,right:r.right,width:innerWidth,scroll:g.scrollLeft,active:document.activeElement===e,visibility:document.visibilityState,elapsed:performance.now()-window.__edgeStart,frames:window.__frames}})()`);
 if(!edge.active||edge.left<0||edge.right>edge.width||edge.scroll<=0)throw Error('Shelf reveal/focus failed: '+JSON.stringify(edge));
 if(await evaluate(`document.querySelector('.tile.focused').dataset.appId`)!=='com.webos.app.discovery')throw Error('More Apps must target the LG App Store');
 await key('Enter',13);await pause(100);
 if(!await evaluate(`document.querySelector('.toast')?.textContent.includes('com.webos.app.discovery')`))throw Error('More Apps did not launch the native app-store target');
 // Return to the first card, then reverse before a pending animation settles.
 for(let n=0;n<20;n++)await key('ArrowLeft',37);
 await expect('Netflix');await pause(500);
 // Reverse before the pending animation settles; old scroll goals must not hide focus.
 for(let n=0;n<16;n++)await key('ArrowRight',39);
 for(let n=0;n<16;n++)await key('ArrowLeft',37);
 await expect('Netflix');await pause(500);
 const reversed=await evaluate(`(()=>{const r=document.querySelector('.tile.focused').getBoundingClientRect();return {left:r.left,right:r.right}})()`);
 if(reversed.left<45||reversed.right>1920)throw Error('Rapid reversal lost the shelf gutter/focus');
 await evaluate(`document.querySelector('.toast')?.remove()`);
 // Real keydown bursts: no keyup, and a remote that omits the repeat flag.
 const press=async(k,code,repeat=false)=>call('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:k,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,autoRepeat:repeat});
 const release=async(k,code)=>call('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:k,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});
 await press('ArrowRight',39);await expect('Prime Video');
 for(let n=0;n<5;n++)await press('ArrowRight',39);
 await expect('Prime Video');
 await pause(200);await press('ArrowRight',39,true);await expect('Prime Video');
 await pause(190);await press('ArrowRight',39);await expect('HBO Max');
 for(let n=0;n<4;n++)await press('ArrowRight',39,true);
 await expect('HBO Max');
 await pause(190);await press('ArrowRight',39,true);await expect('Peacock');
 await release('ArrowRight',39);await key('ArrowLeft',37);await expect('HBO Max');
 await key('ArrowRight',39);await expect('Peacock');
 // A small pointer movement immediately after D-pad use must not steal focus.
 const jitter=await evaluate(`(()=>{const r=document.querySelector('[data-app-id="netflix"]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:jitter.x,y:jitter.y});await expect('Peacock');
 await press('Enter',13);const count=await evaluate('window.__selectCount');
 for(let n=0;n<4;n++)await press('Enter',13);
 if(await evaluate('window.__selectCount')!==count)throw Error('Unmarked held OK launched repeatedly');
 await release('Enter',13);
 for(let n=0;n<12;n++)await key('ArrowLeft',37);
 await expect('Netflix');await pause(500);await evaluate(`document.querySelector('.toast')?.remove()`);
 // Exercise weather failures and retry independently, without changing the live widget.
 const weatherRecovery=await evaluate(`(async()=>{
   const {mountWeather}=await import('/src/widgets/weather.ts');
   const host=document.createElement('div'),originalFetch=window.fetch,originalInterval=window.setInterval;
   let tick,period,dispose=()=>{},reply={current:{temperature_2m:48.6,weather_code:61,is_day:0}};
   const settle=async()=>{for(let n=0;n<10;n++)await Promise.resolve()};
   try{
     window.fetch=async()=>({ok:true,json:async()=>reply});
     window.setInterval=(fn,ms)=>{tick=fn;period=ms;return originalInterval(()=>{},3600000)};
     dispose=mountWeather(host);await settle();
     if(host.dataset.state!=='ready'||!host.textContent.includes('49')||!host.textContent.includes('Rain'))throw Error('Weather formatting failed');
     reply={current:{temperature_2m:null,weather_code:0}};await tick();await settle();
     if(host.dataset.state!=='unavailable'||host.querySelector('.wx-temp').textContent!=='')throw Error('Invalid weather must not display a fake temperature');
     window.fetch=async()=>{throw Error('offline')};await tick();await settle();
     if(host.dataset.state!=='unavailable')throw Error('Network failure fallback failed');
     window.fetch=async()=>({ok:true,json:async()=>({current:{temperature_2m:50,weather_code:0,is_day:0}})});
     window.dispatchEvent(new Event('online'));await settle();
     if(host.dataset.state!=='ready'||!host.textContent.includes('Clear'))throw Error('Weather reconnect failed');
     if(period!==900000)throw Error('Weather refresh must be every 15 minutes');
     return true;
   }finally{dispose();window.fetch=originalFetch;window.setInterval=originalInterval}
 })()`);
 mkdirSync(imageDir,{recursive:true});
 const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(imageDir+'/reframe-0.3.3.png',Buffer.from(shot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:3840,height:2160,deviceScaleFactor:1,mobile:false});await pause(500);
 const metrics=await evaluate(`JSON.stringify({width:innerWidth,height:innerHeight,pageOverflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,tiles:document.querySelectorAll('.tile').length,loadedImages:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length,shelves:[...document.querySelectorAll('[data-focus-group]')].map(r=>({name:r.dataset.focusGroup,apps:r.querySelectorAll('.tile').length}))})`);
 const layout=await evaluate(`(()=>{const l=document.querySelector('.top-left').getBoundingClientRect(),r=document.querySelector('.top-right').getBoundingClientRect(),t=document.querySelector('.tile.focused').getBoundingClientRect(),style=e=>parseFloat(getComputedStyle(document.querySelector(e)).fontSize);return {overlap:l.right>=r.left,top:t.top,bottom:t.bottom,height:innerHeight,time:style('.clock-time'),date:style('.clock-date'),greeting:style('.greeting')}})()`);
 if(layout.overlap||layout.top<0||layout.bottom>layout.height||layout.time<120||layout.date<38||layout.greeting<78)throw Error('Header/card layout failed '+JSON.stringify(layout));
 const parsed=JSON.parse(metrics);if(parsed.pageOverflow||parsed.tiles!==10||parsed.shelves.length!==1||parsed.loadedImages!==11||errors.length)throw Error('4K/runtime check failed '+metrics+' '+errors.join());
 console.log(JSON.stringify({checks:['exact nine apps plus More Apps in one row','large cards','all artwork loaded','left/right boundaries','no extra rows','pointer/remote focus synchronization','held OK activates once','More Apps targets LG App Store','horizontal reveal','rapid reversal preserves focus','4K no page overflow','removed heading, branding and hints','larger greeting, time and date','unmarked repeat burst advances once','hold delay and controlled repeat','release and reversal respond immediately','pointer jitter after D-pad ignored','unmarked held OK activates once','live Sheboygan weather','weather invalid data, offline and reconnect'],weather,weatherRecovery,metrics:parsed},null,2));
}finally{try{await Promise.race([call?.('Browser.close'),pause(1000)]);}catch{}socket?.close();browser.kill();}
