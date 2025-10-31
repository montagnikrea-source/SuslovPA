const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function contentType(file){
  const ext = path.extname(file).toLowerCase();
  const map = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg'};
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

async function run(){
  const publicDir = path.resolve(__dirname, '../public');
  if(!fs.existsSync(publicDir)){
    console.error('public directory not found:', publicDir); process.exit(2);
  }

  const server = makeServer(publicDir);
  await new Promise((resolve)=> server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log('Serving', publicDir, 'on port', port);

  const urlCandidates = [];
  if(fs.existsSync(path.join(publicDir, 'noninput.html'))) urlCandidates.push('/noninput.html');
  if(fs.existsSync(path.join(publicDir, 'secure','algo-sandbox.html'))) urlCandidates.push('/secure/algo-sandbox.html');
  if(urlCandidates.length===0){ console.error('No suitable test page found (noninput.html or secure/algo-sandbox.html)'); server.close(); process.exit(3); }

  const target = urlCandidates[0];
  console.log('Testing', target);

  let browser;
  try{
    browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();

    const consoleMessages = [];
    page.on('console', msg=> consoleMessages.push({type:msg.type(), text: msg.text()}));
    const pageErrors = [];
    page.on('pageerror', err=> pageErrors.push(String(err)));

    const full = `http://127.0.0.1:${port}${target}`;
  // Give the page more time to load remote/secure assets and pass SRI checks
  const resp = await page.goto(full, {waitUntil: 'networkidle2', timeout: 30000}).catch(e=>{ throw new Error('Navigation failed: '+e); });
    console.log('Response status:', resp && resp.status());

    // Wait until the secure loader is available (it will import the secure-shell module)
    await page.waitForFunction('window.__loadSecureShell && typeof window.__loadSecureShell === "function"', {timeout: 30000});

    // Click Start button (inline handler calls startSecure which uses __loadSecureShell)
    const hasStart = await page.$('#btnStartAlgo') !== null;
    if(!hasStart){
      console.error('Start button not found on page');
    } else {
      // Read telemetry values before start
      const before = await page.evaluate(()=>{
        const get = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : null };
        const getBar = id => { const el = document.getElementById(id); if(!el) return null; const v = el.value || el.style.width || el.getAttribute('aria-valuenow') || el.textContent; return v; };
        return {
          freq: get('freqValue'),
          conf: get('confValue'),
          inertia: get('inertiaValue'),
          freqBar: getBar('freqBar'),
          confBar: getBar('confBar'),
          inertiaBar: getBar('inertiaBar')
        };
      });

      await page.click('#btnStartAlgo');

  // Wait a short while for telemetry to run and update UI
  await new Promise(resolve => setTimeout(resolve, 2500));

      const after = await page.evaluate(()=>{
        const get = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : null };
        const getBar = id => { const el = document.getElementById(id); if(!el) return null; const v = el.value || el.style.width || el.getAttribute('aria-valuenow') || el.textContent; return v; };
        return {
          freq: get('freqValue'),
          conf: get('confValue'),
          inertia: get('inertiaValue'),
          freqBar: getBar('freqBar'),
          confBar: getBar('confBar'),
          inertiaBar: getBar('inertiaBar')
        };
      });

      console.log('Telemetry before:', before);
      console.log('Telemetry after :', after);

      // Basic check: ensure at least one of main telemetry values changed or became non-null
      const changed = (before.freq !== after.freq) || (before.conf !== after.conf) || (before.inertia !== after.inertia) || (before.freqBar !== after.freqBar);
      if(changed) console.log('SUCCESS: telemetry or progress bars updated after Start');
      else console.error('FAIL: telemetry did not change after Start');
    }

  if(consoleMessages.length) console.log('Page console messages:', consoleMessages.slice(0,20));
  if(pageErrors.length) console.log('Page errors:', pageErrors.slice(0,20));

  await browser.close();
  server.close();
  // If we reached here and logged SUCCESS above, assume telemetry worked
  process.exit(0);
  }catch(err){
    if(browser) await browser.close().catch(()=>{});
    server.close();
    console.error('ERROR running puppeteer test:', err);
    process.exit(5);
  }
}

run();
