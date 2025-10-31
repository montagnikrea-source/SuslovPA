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
    const resp = await page.goto(full, {waitUntil: 'load', timeout: 10000}).catch(e=>{ throw new Error('Navigation failed: '+e); });
    console.log('Response status:', resp && resp.status());

    // wait for buildEngine
    await page.waitForFunction('window.buildEngine && typeof window.buildEngine === "function"', {timeout: 10000});
    const res = await page.evaluate(()=>{
      try{
        const eng = window.buildEngine();
        const before = eng.s.sample_count || 0;
        eng.s.sample();
        const after = eng.s.sample_count || 0;
        return {ok:true, before, after};
      }catch(e){ return {ok:false, err: String(e)}; }
    });

    console.log('Eval result:', res);
    if(!res.ok){ console.error('Engine evaluation failed:', res.err); }
    if(res.after > res.before){ console.log('SUCCESS: sample_count incremented', res.before, '->', res.after); }
    else { console.error('FAIL: sample_count did not increment', res); }

    if(consoleMessages.length) console.log('Page console messages:', consoleMessages.slice(0,20));
    if(pageErrors.length) console.log('Page errors:', pageErrors.slice(0,20));

    await browser.close();
    server.close();
    process.exit((res.after>res.before)?0:4);
  }catch(err){
    if(browser) await browser.close().catch(()=>{});
    server.close();
    console.error('ERROR running puppeteer test:', err);
    process.exit(5);
  }
}

run();
