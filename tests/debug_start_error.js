const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function contentType(file){
  const ext = path.extname(file).toLowerCase();
  const map = {'.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg'};
  return map[ext] || 'application/octet-stream';
}
function makeServer(root){
  return http.createServer((req,res)=>{
    try{
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = path.join(root, urlPath);
      if(file.endsWith('/')) file = path.join(file, 'index.html');
      if(!file.startsWith(root)){
        res.statusCode=403; res.end('Forbidden'); return;
      }
      if(!fs.existsSync(file)){
        res.statusCode=404; res.end('Not found: '+file); return;
      }
      const ct = contentType(file);
      res.setHeader('Content-Type', ct);
      fs.createReadStream(file).pipe(res);
    }catch(err){ res.statusCode=500; res.end(String(err)); }
  });
}

(async ()=>{
  const publicDir = path.resolve(__dirname, '../public');
  const server = makeServer(publicDir);
  await new Promise(r=> server.listen(0,'127.0.0.1', r));
  const port = server.address().port;
  console.log('Serving', publicDir, 'on', port);
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const captured = [];
  page.on('console', async msg=>{
    try{
      const type = msg.type();
      let text = msg.text();
      // If this is an error and has args, try to extract stack/message from args
      if(type === 'error'){
        try{
          const args = msg.args();
          for(const a of args){
            try{
              const stackHandle = await a.getProperty('stack');
              const stack = stackHandle ? await stackHandle.jsonValue().catch(()=>null) : null;
              const msgHandle = await a.getProperty('message');
              const message = msgHandle ? await msgHandle.jsonValue().catch(()=>null) : null;
              if(stack || message){
                captured.push({ type, text, message, stack });
              }
            }catch(_){ }
          }
        }catch(_){ }
      }
      console.log('PAGE_CONSOLE', type, text);
    }catch(e){ console.log('PAGE_CONSOLE', msg.type()); }
  });
  page.on('pageerror', err=> console.log('PAGE_ERROR', err.stack || err.message || err));

  const url = `http://127.0.0.1:${port}/noninput.html`;
  await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
  console.log('Loaded', url);
  // Wait for start button (we will click it; startSecure may or may not be present as a global)
  await page.waitForSelector('#btnStartAlgo', {timeout:10000});

  // Wrap startSecure to log stack traces as plain strings so we can capture them reliably
  await page.evaluate(()=>{
    try{
      if(typeof window.startSecure === 'function'){
        const orig = window.startSecure;
        window.startSecure = async function(){
          try{ return await orig.apply(this, arguments); }
          catch(e){ try{ console.error('START_ERROR_STACK:', (e && e.stack) ? e.stack : String(e)); }catch(_){ console.error('START_ERROR_STACK:', String(e)); } throw e; }
        };
      }
    }catch(_){ }
  });

  // Click the button to invoke the normal start path and capture result
  await page.click('#btnStartAlgo');

  // Wait a short while for errors/logs to appear
  await new Promise(r=>setTimeout(r, 3000));

  // Try to read last console error lines from page by returning window.__lastConsoleErrors if present
  const lastErrors = await page.evaluate(()=>{
    try{ return window.__lastConsoleErrors || null; }catch(_){ return null; }
  });

  const result = { ok: false, note: 'clicked start; inspect console for START_ERROR_STACK', lastErrors };
  console.log('startSecure result:', result);
  if(captured.length) console.log('Captured console error details:', JSON.stringify(captured, null, 2));
  await browser.close(); server.close();
})();
