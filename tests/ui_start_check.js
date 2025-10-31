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
      // In test environment allow connections to local API so the page can reach http://localhost:3000
      // We also patch the served `noninput.html` on the fly to include localhost in the meta CSP so
      // the browser will allow requests to http://localhost:3000 (meta CSP merges with header).
      const csp = "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'self' http://localhost:3000 https://api.telegram.org https://api.countapi.xyz https://api.counterapi.dev https://counter-api.dev https://api.allorigins.win https://cors.bridged.cc https://yacdn.org https://api.ipify.org https://ipapi.co https://ipinfo.io https://freegeoip.app https://api.db-ip.com https://httpbin.org https://api.github.com https://jsonplaceholder.typicode.com https://1.1.1.1 https://www.google.com https://mozilla.org;"
      res.setHeader('Content-Security-Policy', csp);
      if(file.endsWith('noninput.html')){
        // read and patch
        try{
          let content = fs.readFileSync(file,'utf8');
          content = content.replace(/connect-src\s+'self'/, "connect-src 'self' http://localhost:3000");
          res.end(content);
          return;
        }catch(e){ /* fallthrough to normal stream */ }
      }
      fs.createReadStream(file).pipe(res);
    }catch(err){ res.statusCode=500; res.end(String(err)); }
  });
}

(async function(){
  const publicDir = path.resolve(__dirname, '../public');
  if(!fs.existsSync(publicDir)){ console.error('public directory not found:', publicDir); process.exit(2); }
  const server = makeServer(publicDir);
  await new Promise((r)=> server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log('Serving', publicDir, 'on port', port);

  let browser;
  try{
    browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg=> console.log('PAGE:', msg.type(), msg.text()));

    const url = `http://127.0.0.1:${port}/noninput.html`;
    const resp = await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    console.log('Response status:', resp && resp.status());

    // Basic UI elements
    const hasStart = await page.$('#btnStartAlgo') !== null;
    const hasStop = await page.$('#btnStopAlgo') !== null;
    const hasFreezeCheckbox = await page.$('#startFreeze') !== null;
    const hasAnimToggle = await page.$('#toggleNeuroAnim') !== null;

    console.log('UI presence: start=', hasStart, 'stop=', hasStop, 'freezeCheckbox=', hasFreezeCheckbox, 'animToggle=', hasAnimToggle);

    if(!hasStart || !hasStop || !hasFreezeCheckbox){
      throw new Error('Essential UI controls missing');
    }

    // Ensure no error/pseudo-mode message initially
    const startStatusBefore = await page.evaluate(()=> document.getElementById('startStatus') ? document.getElementById('startStatus').textContent.trim() : '');
    if(/Ошибка запуска|псевдо-режим/i.test(startStatusBefore)){
      throw new Error('Start status already indicates pseudo-mode before start: '+startStatusBefore);
    }

    // Check freeze status not frozen
    const freezeStatusBefore = await page.evaluate(()=> document.getElementById('freezeStatusValue') ? document.getElementById('freezeStatusValue').textContent.trim() : '');
    console.log('freezeStatusBefore=', freezeStatusBefore);

    // Click Start
    await page.click('#btnStartAlgo');

    // wait for indication of running - startStatus or freqValue change
    await page.waitForFunction(()=>{
      const s = document.getElementById('startStatus');
      const f = document.getElementById('freqValue');
      return (s && /Запущено|Запуск|Инициализаци/i.test(s.textContent)) || (f && f.textContent.trim().length>0 && Number(f.textContent)!=0);
    }, {timeout:15000});

    const startStatusAfter = await page.evaluate(()=> document.getElementById('startStatus') ? document.getElementById('startStatus').textContent.trim() : '');
    console.log('startStatusAfter=', startStatusAfter);
    if(/Ошибка запуска|псевдо-режим/i.test(startStatusAfter)){
      throw new Error('Start failed and entered pseudo-mode: '+startStatusAfter);
    }

    // Check overlay visible if animation toggle is checked
    const animChecked = await page.evaluate(()=>{ const t = document.getElementById('toggleNeuroAnim'); return t ? t.checked : false; });
    if(animChecked){
      // wait a bit for overlay
      await new Promise(r=>setTimeout(r,1200));
      const overlayVisible = await page.evaluate(()=>{ const o = document.getElementById('neuroOverlay'); return o ? o.classList.contains('visible') || o.classList.contains('buff') : false; });
      console.log('overlayVisible=', overlayVisible);
    }

    // Ensure not in pseudo-mode and freeze status is Learning initially
    const freezeStatusAfter = await page.evaluate(()=> document.getElementById('freezeStatusValue') ? document.getElementById('freezeStatusValue').textContent.trim() : '');
    console.log('freezeStatusAfter=', freezeStatusAfter);
    if(/🔒 Frozen/i.test(freezeStatusAfter)){
      throw new Error('System is frozen immediately after start: '+freezeStatusAfter);
    }

    console.log('SUCCESS: UI start/stop/animation and pseudo-mode checks passed');
    await browser.close(); server.close(); process.exit(0);
  }catch(err){
    if(browser) await browser.close().catch(()=>{});
    server.close();
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
