const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;
const userData = require('os').tmpdir() + '\\lb-cdp-' + Date.now();
fs.mkdirSync(userData, { recursive: true });
const child = spawn(chrome, [
  '--headless=new','--disable-gpu','--no-sandbox',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  'http://localhost:8081'
], { stdio: ['ignore','ignore','ignore'] });

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function get(path){
  return new Promise((resolve,reject)=>{
    http.get({hostname:'127.0.0.1', port, path}, res=>{
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:d}));
    }).on('error', reject);
  });
}
(async()=>{
  let pages;
  for (let i=0;i<40;i++){
    try {
      const v = await get('/json/list');
      if (v.status===200) {
        pages = JSON.parse(v.body).filter(p => p.type==='page' && p.webSocketDebuggerUrl);
        if (pages.length) break;
      }
    } catch {}
    await sleep(500);
  }
  if (!pages || !pages.length) { console.log('NO_PAGES'); process.exit(1); }
  const target = pages.find(p => (p.url||'').includes('8081')) || pages[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const mid=++id; pending.set(mid,{resolve,reject});
    ws.send(JSON.stringify({id:mid,method,params}));
    setTimeout(()=>{ if(pending.has(mid)){ pending.delete(mid); reject(new Error('timeout '+method)); }}, 30000);
  });
  const logs=[];
  await new Promise((resolve,reject)=>{
    ws.onopen=resolve; ws.onerror=e=>reject(e); setTimeout(()=>reject(new Error('ws timeout')),15000);
  });
  ws.onmessage=(ev)=>{
    const msg=JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const {resolve}=pending.get(msg.id); pending.delete(msg.id); resolve(msg); }
    if (msg.method==='Runtime.consoleAPICalled') {
      const args=(msg.params.args||[]).map(a=>a.value||a.description||JSON.stringify(a)).join(' ');
      logs.push({type: msg.params.type, text: String(args).slice(0,900)});
    }
    if (msg.method==='Runtime.exceptionThrown') {
      logs.push({type:'exception', text: String(msg.params.exceptionDetails?.exception?.description||msg.params.exceptionDetails?.text||'').slice(0,1500)});
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  // wait for react
  for (let i=0;i<40;i++){
    await sleep(1000);
    const evalRes = await send('Runtime.evaluate', {expression:`(() => {
      const root = document.getElementById('root');
      const text = (document.body && document.body.innerText || '');
      return {
        title: document.title,
        childCount: root ? root.childElementCount : -1,
        text: text.slice(0,1200),
        ready: !!(root && root.childElementCount > 0)
      };
    })()`, returnByValue:true});
    const val = evalRes.result?.result?.value;
    if (val && val.ready) {
      console.log(JSON.stringify({result: val, logs: logs.slice(0,50)}, null, 2));
      try { ws.close(); } catch {}
      try { child.kill(); } catch {}
      process.exit(0);
    }
    if (i === 39) {
      console.log(JSON.stringify({result: val, logs: logs.slice(0,50), note:'timeout waiting for root children'}, null, 2));
    }
  }
  try { ws.close(); } catch {}
  try { child.kill(); } catch {}
  process.exit(0);
})().catch(e=>{ console.error('FAIL', e); try{child.kill()}catch{}; process.exit(1); });
