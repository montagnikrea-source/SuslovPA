const puppeteer = require('puppeteer');

(async ()=>{
  const url = process.argv[2] || 'https://montagnikrea-source.github.io/SuslovPA/noninput.html';
  console.log('Testing remote URL:', url);
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg=> console.log('PAGE:', msg.type(), msg.text()));
  page.on('pageerror', err=> console.log('PAGE_ERROR', err && err.stack || err));
  try{
    const resp = await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    console.log('Response status:', resp && resp.status());
    // look for Start
    const hasStart = await page.$('#btnStartAlgo') !== null;
    console.log('Has start button:', hasStart);
    if(!hasStart) throw new Error('Start button not found on remote page');
    // click Start and wait for telemetry or status change
    await page.click('#btnStartAlgo');
    await page.waitForFunction(()=>{
      const s = document.getElementById('startStatus');
      const f = document.getElementById('freqValue');
      return (s && /Запущено|Запуск|Инициализаци/i.test(s.textContent)) || (f && f.textContent.trim().length>0 && Number(f.textContent)!=0);
    }, {timeout:20000});
    const telemetry = await page.evaluate(()=>({ freq: document.getElementById('freqValue') ? document.getElementById('freqValue').textContent.trim() : '', conf: document.getElementById('confValue') ? document.getElementById('confValue').textContent.trim() : '', inertia: document.getElementById('inertiaValue') ? document.getElementById('inertiaValue').textContent.trim() : '', startStatus: document.getElementById('startStatus') ? document.getElementById('startStatus').textContent.trim() : '' }));
    console.log('Telemetry after start:', telemetry);
    console.log('Remote check OK');
    await browser.close(); process.exit(0);
  }catch(err){ console.error('ERROR remote check:', err && err.message || err); await browser.close(); process.exit(2); }
})();
