#!/usr/bin/env node
// memtest-noninput-mobile.js
// Usage:
//   node memtest-noninput-mobile.js --url="https://montagnikrea-source.github.io/SuslovPA/noninput-mobile.html" --iterations=30 --delay=1000 --messages=20
//
// The script launches Chromium and Firefox via Playwright, simulates interactions specific to this page,
// samples process RSS via pidusage and (when available) performance.memory.usedJSHeapSize,
// and prints a simple analysis.

const { chromium, firefox } = require('playwright');
const pidusage = require('pidusage');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('url', { type: 'string', demandOption: true })
  .option('iterations', { type: 'number', default: 30 })
  .option('delay', { type: 'number', default: 1000 })
  .option('headless', { type: 'boolean', default: true })
  .option('operaExecutable', { type: 'string' })
  .option('messages', { type: 'number', default: 10, describe: 'Number of messages to send each iteration' })
  .option('clearChat', { type: 'boolean', default: false, describe: 'Clear chat messages between iterations (set false to stress accumulation)' })
  .argv;

async function samplePidMemory(pid) {
  try {
    const stat = await pidusage(pid);
    return { rssBytes: stat.memory, cpu: stat.cpu };
  } catch (e) {
    return { rssBytes: null, cpu: null, error: String(e) };
  }
}

async function interactPageForIteration(page) {
  // Wait page ready
  await page.waitForLoadState('load');

  // Small interactions matching page behavior:
  // 1. Toggle theme
  try {
    await page.click('#themeToggleMobile', { timeout: 2000 });
    await page.waitForTimeout(100);
    await page.click('#themeToggleMobile', { timeout: 2000 });
  } catch (e) {}

  // 2. Open chat
  try {
    await page.click('#chatFab', { timeout: 2000 });
    await page.waitForTimeout(200);
  } catch (e) {}

  // 3. Send multiple messages to grow DOM (simulate user)
  for (let i = 0; i < argv.messages; i++) {
    try {
      await page.fill('#messageInputMobile', `test-message-${Date.now()}-${i}`);
      await page.click('#sendButtonMobile');
      // give page time for simulated response (page code sends a response after 500ms)
      await page.waitForTimeout(300);
    } catch (e) {}
  }

  // 4. Scroll page up and down
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  // 5. Move sliders
  try {
    await page.evaluate(() => {
      const sliders = ['#lrSliderMobile', '#l2SliderMobile', '#mixSliderMobile'];
      sliders.forEach(s => {
        const el = document.querySelector(s);
        if (el) {
          el.value = el.max;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  } catch (e) {}

  // Optionally clear chat (if user asks)
  if (argv.clearChat) {
    await page.evaluate(() => {
      const messagesDiv = document.getElementById('chatMessages');
      if (messagesDiv) messagesDiv.innerHTML = '<div class="message system">Chat cleared</div>';
    });
  }
}

async function runBrowserTest(browserName, launcher, launchOpts = {}) {
  console.log(`
=== Test: ${browserName} ===`);
  const browser = await launcher.launch(launchOpts);
  const browserPid = browser.process() ? browser.process().pid : null;
  if (!browserPid) console.warn('Warning: cannot obtain browser PID - pid sampling disabled.');

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 } // mobile-like viewport
  });
  const page = await context.newPage();

  const samples = [];

  for (let i = 0; i < argv.iterations; i++) {
    const iter = i + 1;
    try {
      await page.goto(argv.url, { waitUntil: 'load', timeout: 60000 });
    } catch (e) {
      console.warn(`[${browserName}] navigate failed: ${e.message}`);
    }

    // run interaction that stresses chat + UI
    await interactPageForIteration(page);

    // wait a bit to let async callbacks execute
    await page.waitForTimeout(argv.delay);

    // sample process RSS
    const pidSample = browserPid ? await samplePidMemory(browserPid) : { rssBytes: null };

    // sample JS heap (Chromium only)
    let jsHeap = null;
    try {
      jsHeap = await page.evaluate(() => {
        try {
          if (performance && performance.memory && performance.memory.usedJSHeapSize) {
            return performance.memory.usedJSHeapSize;
          }
        } catch (e) {}
        return null;
      });
    } catch (e) {
      jsHeap = null;
    }

    samples.push({
      iteration: iter,
      timestamp: Date.now(),
      rssBytes: pidSample.rssBytes,
      cpu: pidSample.cpu,
      jsHeapUsed: jsHeap
    });

    if (iter % Math.max(1, Math.floor(argv.iterations / 10)) === 0) {
      console.log(`[${browserName}] progress ${iter}/${argv.iterations}`);
    }
  }

  await browser.close();

  // Analyze trend
  function avg(arr, key) {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + (b[key] || 0), 0) / arr.length;
  }

  const validRss = samples.filter(s => typeof s.rssBytes === 'number');
  const firstN = Math.min(5, validRss.length);
  const lastN = Math.min(5, validRss.length);
  const firstSlice = validRss.slice(0, firstN);
  const lastSlice = validRss.slice(-lastN);
  const avgFirst = avg(firstSlice, 'rssBytes');
  const avgLast = avg(lastSlice, 'rssBytes');

  console.log(`
[${browserName}] samples: ${samples.length}`);
  if (avgFirst && avgLast) {
    const diff = avgLast - avgFirst;
    const percent = (diff / avgFirst) * 100;
    console.log(`[${browserName}] avg RSS first ${firstN}: ${(avgFirst / 1024 / 1024).toFixed(1)} MB`);
    console.log(`[${browserName}] avg RSS last ${lastN}: ${(avgLast / 1024 / 1024).toFixed(1)} MB`);
    console.log(`[${browserName}] change: ${(diff / 1024 / 1024).toFixed(1)} MB (${percent.toFixed(1)}%)`);
    if (percent > 20 && diff > 20 * 1024 * 1024) {
      console.warn(`[${browserName}] POSSIBLE MEMORY LEAK: RSS increased by ${percent.toFixed(1)}%`);
    } else if (percent > 10) {
      console.warn(`[${browserName}] Noticeable RSS growth (${percent.toFixed(1)}%) — investigate`);
    } else {
      console.log(`[${browserName}] No significant RSS growth detected`);
    }
  } else {
    console.log(`[${browserName}] Not enough RSS samples`);
  }

  const validJs = samples.filter(s => typeof s.jsHeapUsed === 'number');
  if (validJs.length) {
    const avgFirstJs = avg(validJs.slice(0, firstN), 'jsHeapUsed');
    const avgLastJs = avg(validJs.slice(-lastN), 'jsHeapUsed');
    if (avgFirstJs && avgLastJs) {
      const diffJs = avgLastJs - avgFirstJs;
      const percentJs = (diffJs / avgFirstJs) * 100;
      console.log(`[${browserName}] JS heap first ${firstN}: ${(avgFirstJs / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[${browserName}] JS heap last ${lastN}: ${(avgLastJs / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[${browserName}] JS heap change: ${(diffJs / 1024 / 1024).toFixed(2)} MB (${percentJs.toFixed(1)}%)`);
      if (percentJs > 20 && diffJs > 10 * 1024 * 1024) {
        console.warn(`[${browserName}] POSSIBLE JS HEAP LEAK`);
      }
    }
  } else {
    console.log(`[${browserName}] performance.memory samples not available (expected for Firefox)`);
  }

  return { browser: browserName, samples };
}

(async () => {
  try {
    console.log('Starting memory smoke tests for', argv.url);

    const chromiumOpts = { headless: argv.headless };
    if (argv.operaExecutable) chromiumOpts.executablePath = argv.operaExecutable;

    const res1 = await runBrowserTest('Chromium', chromium, chromiumOpts);
    const res2 = await runBrowserTest('Firefox', firefox, { headless: argv.headless });

    const fs = require('fs');
    fs.writeFileSync('memtest-noninput-mobile-results.json', JSON.stringify({ url: argv.url, timestamp: Date.now(), results: [res1, res2] }, null, 2));
    console.log('Results saved to memtest-noninput-mobile-results.json');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
})();
