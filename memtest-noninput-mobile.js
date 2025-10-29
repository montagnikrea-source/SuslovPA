#!/usr/bin/env node

/**
 * 🧪 Memory Smoke Test for noninput-mobile.html
 * 
 * This script uses Playwright to run automated memory leak detection tests
 * on the noninput-mobile.html page across Chromium and Firefox browsers.
 * 
 * Features:
 * - Measures RSS (Resident Set Size) via pidusage
 * - Measures JS Heap Size via performance.memory (Chromium only)
 * - Performs user interactions: open chat, send messages, toggle theme, scroll
 * - Runs multiple iterations to detect memory growth trends
 * - Outputs results to JSON file for analysis
 * 
 * Usage:
 *   node memtest-noninput-mobile.js --url="URL" --iterations=40 --messages=20
 */

const { chromium, firefox } = require('playwright');
const pidusage = require('pidusage');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const parseArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const config = {
  url: parseArg('url', 'https://montagnikrea-source.github.io/SuslovPA/noninput-mobile.html'),
  iterations: parseInt(parseArg('iterations', '40'), 10),
  messages: parseInt(parseArg('messages', '20'), 10),
  outputFile: parseArg('output', 'memtest-noninput-mobile-results.json')
};

console.log('🚀 Memory Smoke Test Configuration:');
console.log(`   URL: ${config.url}`);
console.log(`   Iterations: ${config.iterations}`);
console.log(`   Messages per iteration: ${config.messages}`);
console.log(`   Output file: ${config.outputFile}`);
console.log('');

/**
 * Get memory metrics for a browser process
 */
async function getMemoryMetrics(browserProcess, page) {
  const metrics = {};
  
  try {
    // Get RSS from pidusage
    const stats = await pidusage(browserProcess.pid);
    metrics.rss = stats.memory;
    metrics.cpu = stats.cpu;
  } catch (error) {
    console.warn(`   ⚠️  Could not get pidusage stats: ${error.message}`);
    metrics.rss = null;
  }
  
  try {
    // Get JS Heap Size (Chromium only)
    const heapSize = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    if (heapSize) {
      metrics.jsHeap = heapSize;
    }
  } catch (error) {
    // performance.memory not available (Firefox)
    metrics.jsHeap = null;
  }
  
  return metrics;
}

/**
 * Perform user interactions on the page
 */
async function performInteractions(page, iteration, messagesCount) {
  try {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Try to open chat if there's a button
    const chatButtons = await page.locator('button:has-text("Чат"), button:has-text("Chat"), #openChatBtn, .open-chat').all();
    if (chatButtons.length > 0) {
      await chatButtons[0].click({ timeout: 5000 });
      await page.waitForTimeout(500);
    }
    
    // Send messages
    const messageInput = await page.locator('input[type="text"], textarea, #messageInput, .message-input').first();
    if (await messageInput.count() > 0) {
      for (let i = 0; i < messagesCount; i++) {
        await messageInput.fill(`Test message ${iteration}-${i} with some content`);
        await page.waitForTimeout(100);
        
        // Try to find send button
        const sendButtons = await page.locator('button:has-text("Отправить"), button:has-text("Send"), #sendBtn, .send-button').all();
        if (sendButtons.length > 0) {
          await sendButtons[0].click({ timeout: 2000 });
          await page.waitForTimeout(200);
        }
      }
    }
    
    // Toggle theme if available
    const themeButtons = await page.locator('button:has-text("Тема"), button:has-text("Theme"), #themeToggle, .theme-toggle').all();
    if (themeButtons.length > 0) {
      await themeButtons[0].click({ timeout: 2000 });
      await page.waitForTimeout(300);
    }
    
    // Scroll the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(200);
    
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(200);
    
  } catch (error) {
    console.warn(`   ⚠️  Interaction error: ${error.message}`);
  }
}

/**
 * Run memory test for a specific browser
 */
async function runBrowserTest(browserType, browserName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Testing ${browserName}...`);
  console.log('='.repeat(60));
  
  const results = {
    browser: browserName,
    iterations: [],
    timestamp: new Date().toISOString(),
    config: config
  };
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Launch browser
    browser = await browserType.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const browserProcess = browser.process();
    if (!browserProcess) {
      throw new Error('Could not get browser process');
    }
    
    context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // Mobile viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    page = await context.newPage();
    
    // Navigate to the page
    console.log(`   🌐 Navigating to ${config.url}...`);
    await page.goto(config.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    console.log(`   ✅ Page loaded successfully`);
    console.log('');
    
    // Run iterations
    for (let i = 0; i < config.iterations; i++) {
      console.log(`   📍 Iteration ${i + 1}/${config.iterations}...`);
      
      // Get initial memory
      const memoryBefore = await getMemoryMetrics(browserProcess, page);
      
      // Perform interactions
      await performInteractions(page, i + 1, config.messages);
      
      // Get memory after interactions
      const memoryAfter = await getMemoryMetrics(browserProcess, page);
      
      const iterationResult = {
        iteration: i + 1,
        memoryBefore,
        memoryAfter,
        timestamp: new Date().toISOString()
      };
      
      results.iterations.push(iterationResult);
      
      // Log memory info
      if (memoryAfter.rss) {
        const rssMB = (memoryAfter.rss / 1024 / 1024).toFixed(2);
        console.log(`      RSS: ${rssMB} MB`);
      }
      if (memoryAfter.jsHeap) {
        const heapMB = (memoryAfter.jsHeap.usedJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`      JS Heap: ${heapMB} MB`);
      }
      
      // Small delay between iterations
      await page.waitForTimeout(500);
    }
    
    console.log('');
    console.log(`   ✅ ${browserName} test completed successfully`);
    
  } catch (error) {
    console.error(`   ❌ Error in ${browserName} test:`, error.message);
    results.error = error.message;
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  const allResults = {
    timestamp: new Date().toISOString(),
    config: config,
    tests: []
  };
  
  try {
    // Test Chromium
    const chromiumResults = await runBrowserTest(chromium, 'Chromium');
    allResults.tests.push(chromiumResults);
    
    // Test Firefox
    const firefoxResults = await runBrowserTest(firefox, 'Firefox');
    allResults.tests.push(firefoxResults);
    
    // Save results to file
    const outputPath = path.resolve(config.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ All tests completed!`);
    console.log(`📄 Results saved to: ${outputPath}`);
    console.log('='.repeat(60));
    
    // Print summary
    console.log('\n📊 Memory Test Summary:\n');
    
    for (const test of allResults.tests) {
      if (test.error) {
        console.log(`   ${test.browser}: ❌ Failed - ${test.error}`);
        continue;
      }
      
      const iterations = test.iterations;
      if (iterations.length === 0) {
        console.log(`   ${test.browser}: ⚠️  No data collected`);
        continue;
      }
      
      // Calculate memory trends
      const firstIter = iterations[0];
      const lastIter = iterations[iterations.length - 1];
      
      if (firstIter.memoryAfter.rss && lastIter.memoryAfter.rss) {
        const rssFirst = firstIter.memoryAfter.rss / 1024 / 1024;
        const rssLast = lastIter.memoryAfter.rss / 1024 / 1024;
        const rssGrowth = rssLast - rssFirst;
        const rssGrowthPct = ((rssGrowth / rssFirst) * 100).toFixed(2);
        
        console.log(`   ${test.browser} RSS Memory:`);
        console.log(`      First: ${rssFirst.toFixed(2)} MB`);
        console.log(`      Last: ${rssLast.toFixed(2)} MB`);
        console.log(`      Growth: ${rssGrowth.toFixed(2)} MB (${rssGrowthPct}%)`);
      }
      
      if (firstIter.memoryAfter.jsHeap && lastIter.memoryAfter.jsHeap) {
        const heapFirst = firstIter.memoryAfter.jsHeap.usedJSHeapSize / 1024 / 1024;
        const heapLast = lastIter.memoryAfter.jsHeap.usedJSHeapSize / 1024 / 1024;
        const heapGrowth = heapLast - heapFirst;
        const heapGrowthPct = ((heapGrowth / heapFirst) * 100).toFixed(2);
        
        console.log(`   ${test.browser} JS Heap:`);
        console.log(`      First: ${heapFirst.toFixed(2)} MB`);
        console.log(`      Last: ${heapLast.toFixed(2)} MB`);
        console.log(`      Growth: ${heapGrowth.toFixed(2)} MB (${heapGrowthPct}%)`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
