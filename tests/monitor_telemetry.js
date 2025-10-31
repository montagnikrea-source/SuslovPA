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
      // Allow local API requests during tests (so page can contact http://localhost:3000)
      const csp = "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'self' http://localhost:3000 https://api.telegram.org https://api.countapi.xyz https://api.counterapi.dev https://counter-api.dev https://api.allorigins.win https://cors.bridged.cc https://yacdn.org https://api.ipify.org https://ipapi.co https://ipinfo.io https://freegeoip.app https://api.db-ip.com https://httpbin.org https://api.github.com https://jsonplaceholder.typicode.com https://1.1.1.1 https://www.google.com https://mozilla.org;"
      res.setHeader('Content-Security-Policy', csp);
      if(file.endsWith('noninput.html')){
        try{
          let content = fs.readFileSync(file,'utf8');
          content = content.replace(/connect-src\s+'self'/, "connect-src 'self' http://localhost:3000");
          res.end(content);
          return;
        }catch(e){}
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
    page.on('console', msg=> console.log(new Date().toISOString(),'PAGE_CONSOLE', msg.type(), msg.text()));
    page.on('pageerror', err=> console.log(new Date().toISOString(),'PAGE_ERROR', err && err.message ? err.message : err));

    const url = `http://127.0.0.1:${port}/noninput.html`;
    const resp = await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    console.log('Response status:', resp && resp.status());

    // Click Start (like ui_start_check)
    const hasStart = await page.$('#btnStartAlgo') !== null;
    if(!hasStart) throw new Error('Start button not found');
    await page.click('#btnStartAlgo');

    // wait for running indicator (up to 15s)
    await page.waitForFunction(()=>{
      const s = document.getElementById('startStatus');
      const f = document.getElementById('freqValue');
      return (s && /Запущено|Запуск|Инициализаци/i.test(s.textContent)) || (f && f.textContent.trim().length>0 && Number(f.textContent)!=0);
    }, {timeout:15000});

    console.log('Start detected, beginning 60s telemetry sampling...');

    const samples = [];
    const startMs = Date.now();
    const durationMs = 60*1000; // 60s

    while(Date.now() - startMs < durationMs){
      // sample telemetry values
      const snap = await page.evaluate(()=>{
        const get = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : '' };
        return {
          t: Date.now(),
          freq: get('freqValue'),
          freqBar: get('freqBar'),
          conf: get('confValue'),
          inertia: get('inertiaValue'),
          startStatus: get('startStatus')
        };
      });
      const ts = new Date().toISOString();
      console.log(ts,'SAMPLE', JSON.stringify(snap));
      samples.push(snap);
      // also check for page console errors captured above
      await new Promise(r=>setTimeout(r,1000));
    }

    console.log('Telemetry sampling finished. Summary:');
    // compute simple stats
    const numericFreq = samples.map(s=>{ const v = parseFloat(s.freq.replace(/[^0-9.\-]/g,'')); return isNaN(v)?null:v }).filter(Boolean);
    const first = samples[0] || {};
    const last = samples[samples.length-1] || {};
    console.log('Samples collected:', samples.length);
    console.log('First sample:', first);
    console.log('Last sample:', last);
    if(numericFreq.length){
      const avg = numericFreq.reduce((a,b)=>a+b,0)/numericFreq.length;
      console.log('freq avg ≈', avg.toFixed(3));
    } else console.log('No numeric freq samples found');

    await browser.close(); server.close(); process.exit(0);
  }catch(err){
    if(browser) await browser.close().catch(()=>{});
    server.close();
    console.error('ERROR:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
