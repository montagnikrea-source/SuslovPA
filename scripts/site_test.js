#!/usr/bin/env node
/*
 Full site + UI smoke test for GitHub Pages site.
 - HTTP status checks for key URLs
 - raw GH files presence check
 - Launch Playwright Chromium, load /noninput.html, collect console errors
 - Verify presence of window.buildEngine and secure runtime
 - Save JSON report to ./site-test-report.json
 Usage: node scripts/site_test.js
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'https://montagnikrea-source.github.io/SuslovPA';
const REQUIRED_URLS = ['/', '/noninput.html', '/secure/algorithm-core.js', '/algorithm-core.js', '/favicon.ico', '/about.html', '/contact.html', '/privacy-policy.html'];

async function fetchStatus(url, method = 'HEAD'){
  try{
    const res = await fetch(url, { method, redirect: 'follow' });
    return res.status;
  }catch(e){
    // fallback to GET for servers that don't support HEAD
    try{ const r2 = await fetch(url, { method: 'GET', redirect: 'follow' }); return r2.status; }catch(_){ return 0; }
  }
}

async function checkRawGh(pathRel){
  const url = `https://raw.githubusercontent.com/montagnikrea-source/SuslovPA/gh-pages/${pathRel.replace(/^\//,'')}`;
  try{ const r = await fetch(url, { method: 'HEAD' }); return r.status; }catch(e){ return 0; }
}

async function run(){
  const report = { base: BASE, checkedAt: new Date().toISOString(), http: {}, raw: {}, playwright: { console: [], errors: [], checks: {} } };

  console.log('Checking HTTP statuses...');
  for(const p of REQUIRED_URLS){
    const url = (p === '/') ? `${BASE}/` : `${BASE}${p}`;
    const code = await fetchStatus(url);
    report.http[url] = code;
    console.log(`${code}  ${url}`);
  }

  // check raw GH files for presence on gh-pages branch
  console.log('\nChecking raw.githubusercontent.com for expected files...');
  const rawPaths = ['algorithm-core.js','favicon.ico','about.html','contact.html','privacy-policy.html','secure/algorithm-core.js'];
  for(const rp of rawPaths){
    const code = await checkRawGh(rp);
    report.raw[rp] = code;
    console.log(`${code}  raw/${rp}`);
  }

  // Playwright: load noninput.html and capture console/errors
  console.log('\nLaunching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = `${msg.type().toUpperCase()}: ${msg.text()}`;
    report.playwright.console.push(text);
    if(msg.type() === 'error') report.playwright.errors.push(text);
    console.log('PAGE LOG>', text);
  });
  page.on('pageerror', err => {
    const text = `PAGEERROR: ${err.message}`;
    report.playwright.errors.push(text);
    console.error('PAGE ERROR>', text);
  });

  const testUrl = `${BASE}/noninput.html`;
  console.log('Opening', testUrl);
  try{
    const resp = await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    report.playwright.gotoStatus = resp && resp.status();
    // Evaluate presence of runtime
    const checks = await page.evaluate(() => {
      const out = { hasBuildEngine: false, buildEngineType: null, hasLoadSecureShell: false, integrityAttributes: [] };
      try{ out.hasBuildEngine = typeof window.buildEngine === 'function'; out.buildEngineType = typeof window.buildEngine; }catch(e){}
      try{ out.hasLoadSecureShell = typeof window.__loadSecureShell === 'function'; }catch(e){}
      try{
        const nodes = Array.from(document.querySelectorAll('script[integrity],link[integrity]'));
        out.integrityAttributes = nodes.map(n => ({ tag: n.tagName.toLowerCase(), src: n.src || n.href, integrity: n.getAttribute('integrity') }));
      }catch(e){}
      return out;
    });
    report.playwright.checks = checks;
    console.log('Runtime checks (initial):', checks);

    // If runtime not initialized immediately, attempt to press common Start controls
    if(!checks.hasBuildEngine){
      const startSelectors = ['#startBtn', 'button#start', 'button:has-text("Start")', 'button:has-text("Запустить")', 'text=Start', 'text=Запустить', 'button.start', 'input[type=button][value="Start"]'];
      for(const sel of startSelectors){
        try{
          const locator = page.locator(sel);
          const count = await locator.count();
          if(count>0){
            console.log('Attempting click on selector:', sel);
            await locator.first().click({ timeout: 2000 }).catch(()=>{});
            break;
          }
        }catch(e){ /* ignore */ }
      }

      // wait briefly for runtime to initialize
      try{
        await page.waitForFunction(() => typeof window.buildEngine === 'function', { timeout: 10000 });
        const post = await page.evaluate(() => ({ hasBuildEngine: typeof window.buildEngine === 'function', buildEngineType: typeof window.buildEngine }));
        report.playwright.checks = Object.assign(report.playwright.checks || {}, post);
        console.log('Runtime checks (after click):', post);
      }catch(e){ console.log('Runtime did not initialize after clicking start controls'); }
    }
  }catch(e){
    console.error('Error loading page:', e && e.message);
    report.playwright.gotoError = String(e && e.message);
  }

  // Inspect secure/algorithm-core.js content via HTTP fetch
  try{
    const algoUrl = `${BASE}/secure/algorithm-core.js`;
    const r = await fetch(algoUrl);
    const text = await r.text();
    report.playwright.secure_algo_status = r.status;
    report.playwright.secure_algo_has_buildEngine = /function\s+buildEngine\s*\(/.test(text) || /buildEngine\s*=\s*function/.test(text);
    console.log(`secure/algorithm-core.js status ${r.status}, buildEngine found: ${report.playwright.secure_algo_has_buildEngine}`);
  }catch(e){ report.playwright.secure_algo_status = 0; }

  await browser.close();

  // Aggregate result: fail if any critical issues
  const failures = [];
  const must200 = [`${BASE}/noninput.html`, `${BASE}/secure/algorithm-core.js`];
  for(const m of must200){ if(report.http[m] !== 200) failures.push(`HTTP ${m} -> ${report.http[m]}`); }
  if(!report.playwright.checks || !report.playwright.checks.hasBuildEngine) failures.push('window.buildEngine not available on page');
  if(report.playwright.errors && report.playwright.errors.length) failures.push(`page errors: ${report.playwright.errors.length}`);

  report.passed = failures.length === 0;
  report.failures = failures;

  const outPath = path.join(process.cwd(), 'site-test-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\nSite test finished. Report saved to', outPath);
  if(report.passed) console.log('RESULT: PASS'); else { console.error('RESULT: FAIL', failures); process.exitCode = 2; }
}

run().catch(err => { console.error(err); process.exit(3); });
