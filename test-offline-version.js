#!/usr/bin/env node

/**
 * Test Offline HTML Version
 * Verifies that the offline version will work correctly
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                  🧪 OFFLINE VERSION VALIDATION TEST                      ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

class OfflineVersionTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.tests = {
      passed: 0,
      failed: 0
    };
  }

  log(message) {
    console.log(message);
  }

  pass(test) {
    console.log(`  ✅ ${test}`);
    this.tests.passed++;
  }

  fail(test, reason) {
    console.log(`  ❌ ${test}`);
    console.log(`     Reason: ${reason}`);
    this.errors.push({ test, reason });
    this.tests.failed++;
  }

  warn(test, reason) {
    console.log(`  ⚠️  ${test}`);
    console.log(`     Warning: ${reason}`);
    this.warnings.push({ test, reason });
  }

  testRedirects(htmlContent) {
    this.log('\n📋 Test 1: Check for problematic redirects');
    
    const redirectPatterns = [
      /window\.location\.href\s*=\s*['"].*noninput\.html/i,
      /window\.location\.href\s*=\s*['"].*index\.html/i,
    ];

    let hasRedirect = false;
    for (const pattern of redirectPatterns) {
      if (pattern.test(htmlContent)) {
        hasRedirect = true;
        break;
      }
    }

    if (hasRedirect) {
      this.warn('Redirect detection', 'Found window.location.href - may cause issues');
    } else {
      this.pass('No problematic redirects found');
    }
  }

  testOfflineMode(htmlContent) {
    this.log('\n📋 Test 2: Check for offline mode detection');
    
    if (htmlContent.includes('window.OFFLINE_MODE')) {
      this.pass('OFFLINE_MODE flag detected');
    } else {
      this.fail('OFFLINE_MODE detection', 'Missing window.OFFLINE_MODE flag');
    }

    if (htmlContent.includes('API_DISABLED')) {
      this.pass('API_DISABLED flag detected');
    } else {
      this.fail('API disable flag', 'Missing API_DISABLED flag');
    }
  }

  testMocking(htmlContent) {
    this.log('\n📋 Test 3: Check for API mocking');
    
    if (htmlContent.includes('window.firebase')) {
      this.pass('Firebase mock detected');
    } else {
      this.fail('Firebase mock', 'Missing Firebase mock');
    }

    if (htmlContent.includes('telegramBotAPI') || htmlContent.includes('telegram')) {
      this.pass('Telegram mock detected');
    } else {
      this.fail('Telegram mock', 'Missing Telegram mock');
    }

    if (htmlContent.includes('window.fetch')) {
      this.pass('Fetch interception detected');
    } else {
      this.fail('Fetch interception', 'Missing fetch interception');
    }
  }

  testBanner(htmlContent) {
    this.log('\n📋 Test 4: Check for offline indicator banner');
    
    if (htmlContent.includes('offline-indicator')) {
      this.pass('Offline banner HTML detected');
    } else {
      this.fail('Offline banner', 'Missing offline-indicator div');
    }

    if (htmlContent.includes('OFFLINE MODE')) {
      this.pass('Offline mode text present');
    } else {
      this.fail('Offline text', 'Missing "OFFLINE MODE" text');
    }
  }

  testScripts(htmlContent) {
    this.log('\n📋 Test 5: Check for embedded scripts');
    
    const scriptCount = (htmlContent.match(/<script>/gi) || []).length;
    if (scriptCount > 5) {
      this.pass(`Multiple scripts embedded (${scriptCount} found)`);
    } else if (scriptCount > 0) {
      this.warn('Limited scripts', `Only ${scriptCount} scripts found - may need more`);
    } else {
      this.fail('Script embedding', 'No embedded scripts found');
    }
  }

  testStructure(htmlContent) {
    this.log('\n📋 Test 6: Check HTML structure');
    
    if (htmlContent.includes('<!DOCTYPE html>')) {
      this.pass('DOCTYPE declaration present');
    } else {
      this.warn('DOCTYPE', 'Missing DOCTYPE - may work but not ideal');
    }

    if (htmlContent.includes('<html')) {
      this.pass('HTML tag present');
    } else {
      this.fail('HTML structure', 'Missing <html> tag');
    }

    if (htmlContent.includes('<head')) {
      this.pass('Head tag present');
    } else {
      this.fail('HTML structure', 'Missing <head> tag');
    }

    if (htmlContent.includes('<body')) {
      this.pass('Body tag present');
    } else {
      this.fail('HTML structure', 'Missing <body> tag');
    }

    if (htmlContent.includes('</html>')) {
      this.pass('HTML tag properly closed');
    } else {
      this.fail('HTML structure', 'Missing closing </html> tag');
    }
  }

  testSize(htmlContent) {
    this.log('\n📋 Test 7: Check file size');
    
    const sizeKB = htmlContent.length / 1024;
    const sizeMB = sizeKB / 1024;

    if (sizeMB < 1) {
      this.pass(`File size acceptable: ${sizeKB.toFixed(1)} KB`);
    } else if (sizeMB < 10) {
      this.pass(`File size good: ${sizeMB.toFixed(1)} MB`);
    } else {
      this.warn('Large file size', `${sizeMB.toFixed(1)} MB - may be slow on older connections`);
    }
  }

  testContent(htmlContent) {
    this.log('\n📋 Test 8: Check essential content');
    
    if (htmlContent.includes('neuroHomeostasis') || htmlContent.includes('NeuroHomeostasis')) {
      this.pass('Algorithm code present');
    } else {
      this.fail('Algorithm', 'Missing NeuroHomeostasis algorithm');
    }

    if (htmlContent.includes('oscillation') || htmlContent.includes('Oscillation')) {
      this.pass('Anti-oscillation system present');
    } else {
      this.fail('Protection', 'Missing oscillation protection');
    }

    if (htmlContent.includes('theme') || htmlContent.includes('dark') || htmlContent.includes('light')) {
      this.pass('Theme support detected');
    } else {
      this.warn('Theme', 'May be missing theme functionality');
    }
  }

  testConsoleLogging(htmlContent) {
    this.log('\n📋 Test 9: Check for helpful console messages');
    
    if (htmlContent.includes('console.log')) {
      this.pass('Console logging present');
    } else {
      this.warn('Logging', 'No console logging for debugging');
    }

    if (htmlContent.includes('OFFLINE MODE ENABLED') || htmlContent.includes('offline')) {
      this.pass('Offline mode messages detected');
    } else {
      this.fail('Messages', 'No offline mode messages for user feedback');
    }
  }

  testForBadPatterns(htmlContent) {
    this.log('\n📋 Test 10: Check for problematic patterns');
    
    // Check for external API calls that can't be mocked
    const externalAPIs = [
      { pattern: /https?:\/\/[^'"\s)]+firebase/i, name: 'Direct Firebase URL' },
      { pattern: /https?:\/\/[^'"\s)]+telegram/i, name: 'Direct Telegram URL' },
      { pattern: /https?:\/\/[^'"\s)]+vercel/i, name: 'Direct Vercel URL' },
    ];

    for (const api of externalAPIs) {
      if (api.pattern.test(htmlContent)) {
        this.warn(`External API: ${api.name}`, 'May fail in offline mode - ensure mocked');
      }
    }

    if (!htmlContent.includes('originalFetch') && htmlContent.includes('window.fetch')) {
      this.warn('Fetch override', 'Check that originalFetch is properly defined');
    } else {
      this.pass('Fetch override pattern correct');
    }
  }

  async run() {
    try {
      // Try to find offline version
      let htmlContent = null;
      const possiblePaths = [
        '/workspaces/SuslovPA/SuslovPA-Offline.html',
        '/workspaces/SuslovPA/public/SuslovPA-Offline.html',
        './SuslovPA-Offline.html',
      ];

      for (const testPath of possiblePaths) {
        try {
          if (fs.existsSync(testPath)) {
            htmlContent = fs.readFileSync(testPath, 'utf-8');
            this.log(`✅ Found offline file: ${testPath}`);
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }

      if (!htmlContent) {
        this.log(`
⚠️  WARNING: Could not find offline HTML file
   
Searched in:
${possiblePaths.map(p => `  - ${p}`).join('\n')}

The offline version needs to be generated first!
To generate it:
  1. Open https://suslovpa.vercel.app
  2. Click "📥 Скачать офлайн"
  3. Download "📄 HTML File"
        `);
        this.fail('Offline file', 'Offline HTML file not found - needs to be generated');
        this.printSummary();
        return;
      }

      this.log('\n📊 Running validation tests...\n');

      // Run all tests
      this.testRedirects(htmlContent);
      this.testOfflineMode(htmlContent);
      this.testMocking(htmlContent);
      this.testBanner(htmlContent);
      this.testScripts(htmlContent);
      this.testStructure(htmlContent);
      this.testSize(htmlContent);
      this.testContent(htmlContent);
      this.testConsoleLogging(htmlContent);
      this.testForBadPatterns(htmlContent);

      this.printSummary();

    } catch (error) {
      this.log(`\n❌ Test error: ${error.message}`);
      this.fail('Test execution', error.message);
      this.printSummary();
    }
  }

  printSummary() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                         📋 TEST RESULTS SUMMARY                          ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 Overall Results:
  ✅ Passed:  ${this.tests.passed}
  ❌ Failed:  ${this.tests.failed}
  ⚠️  Warnings: ${this.warnings.length}

${this.tests.failed > 0 ? `
❌ FAILURES:
${this.errors.map(e => `  - ${e.test}: ${e.reason}`).join('\n')}
` : ''}

${this.warnings.length > 0 ? `
⚠️  WARNINGS:
${this.warnings.map(w => `  - ${w.test}: ${w.reason}`).join('\n')}
` : ''}

${this.tests.failed === 0 ? `
✅ VERDICT: Offline version is valid and should work!

What to do next:
  1. Open the HTML file in your browser
  2. Verify that the application loads
  3. Check the browser console (F12 → Console)
  4. Look for "OFFLINE MODE ENABLED" message
  5. Test some features to confirm they work

Happy offline usage! 📴✨
` : `
❌ VERDICT: There are issues that need to be fixed!

What to do:
  1. Review the failures above
  2. Check the offline-download.js script
  3. Regenerate the offline version
  4. Re-run this test

Need help? Check OFFLINE_VERSION_FIXED.md
`}

═══════════════════════════════════════════════════════════════════════════════
    `);
  }
}

// Run the tester
const tester = new OfflineVersionTester();
tester.run().catch(console.error);
