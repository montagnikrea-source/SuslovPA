#!/usr/bin/env node

/**
 * Telegram Chat Validation Script
 * 
 * This script validates that the Telegram chat configuration is correct
 * and checks for common issues.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Telegram Chat Configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Verify API files exist
console.log('📁 Checking API files...');
const apiFiles = [
  'api/index.js',
  'api/telegram.js',
  'api/telegram/updates.js',
  'api/telegram/secure.js',
  'api/auth/telegram-token.js'
];

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check 2: Verify vercel.json configuration
console.log('\n📄 Checking vercel.json...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
  
  // Check rewrites
  const requiredRewrites = [
    '/api/auth/telegram-token',
    '/api/telegram/secure',
    '/api/telegram/updates',
    '/api/telegram'
  ];
  
  const rewrites = vercelConfig.rewrites || [];
  requiredRewrites.forEach(rewrite => {
    const found = rewrites.find(r => r.source.includes(rewrite.replace('/api/', '')));
    if (found) {
      console.log(`  ✅ Rewrite for ${rewrite}`);
    } else {
      console.log(`  ⚠️  Rewrite for ${rewrite} - NOT FOUND`);
      hasWarnings = true;
    }
  });
  
  // Check CORS headers
  const apiHeaders = vercelConfig.headers?.find(h => h.source === '/api/(.*)');
  if (apiHeaders) {
    const corsOrigin = apiHeaders.headers.find(h => h.key === 'Access-Control-Allow-Origin');
    if (corsOrigin) {
      console.log(`  ✅ CORS headers configured (${corsOrigin.value})`);
    } else {
      console.log(`  ❌ CORS headers missing`);
      hasErrors = true;
    }
  }
  
} catch (error) {
  console.log(`  ❌ Error reading vercel.json: ${error.message}`);
  hasErrors = true;
}

// Check 3: Verify API response format in index.js
console.log('\n🔄 Checking API response format...');
try {
  const indexJs = fs.readFileSync(path.join(__dirname, 'api/index.js'), 'utf8');
  
  if (indexJs.includes('success: true') && indexJs.includes('updates:')) {
    console.log('  ✅ API transforms response to frontend format');
  } else {
    console.log('  ⚠️  API might not transform response correctly');
    hasWarnings = true;
  }
  
  if (indexJs.includes('update.message')) {
    console.log('  ✅ API processes Telegram message structure');
  } else {
    console.log('  ⚠️  API might not process messages correctly');
    hasWarnings = true;
  }
  
} catch (error) {
  console.log(`  ❌ Error reading api/index.js: ${error.message}`);
  hasErrors = true;
}

// Check 4: Verify telegram-token.js CORS configuration
console.log('\n🔐 Checking telegram-token endpoint...');
try {
  const tokenJs = fs.readFileSync(path.join(__dirname, 'api/auth/telegram-token.js'), 'utf8');
  
  if (tokenJs.includes('montagnikrea-source.github.io')) {
    console.log('  ✅ GitHub Pages domain in allowed origins');
  } else {
    console.log('  ❌ GitHub Pages domain NOT in allowed origins');
    hasErrors = true;
  }
  
  if (tokenJs.includes('Access-Control-Allow-Credentials')) {
    console.log('  ✅ Credentials header configured');
  } else {
    console.log('  ⚠️  Credentials header not set');
    hasWarnings = true;
  }
  
  if (tokenJs.includes('request.headers.origin')) {
    console.log('  ✅ Dynamic origin handling');
  } else {
    console.log('  ⚠️  Static origin only');
    hasWarnings = true;
  }
  
} catch (error) {
  console.log(`  ❌ Error reading api/auth/telegram-token.js: ${error.message}`);
  hasErrors = true;
}

// Check 5: Verify HTML file configuration
console.log('\n🌐 Checking HTML configuration...');
try {
  const htmlContent = fs.readFileSync(path.join(__dirname, 'noninput.html'), 'utf8');
  
  if (htmlContent.includes('pavell.vercel.app/api/telegram')) {
    console.log('  ✅ Vercel API endpoints configured');
  } else {
    console.log('  ⚠️  Vercel API endpoints not found');
    hasWarnings = true;
  }
  
  if (htmlContent.includes('pollInterval: 5000')) {
    console.log('  ✅ Poll interval set to 5 seconds');
  } else {
    console.log('  ⚠️  Poll interval might not be 5 seconds');
    hasWarnings = true;
  }
  
  if (htmlContent.includes('@noninput')) {
    console.log('  ✅ Telegram channel configured (@noninput)');
  } else {
    console.log('  ⚠️  Telegram channel not configured');
    hasWarnings = true;
  }
  
} catch (error) {
  console.log(`  ❌ Error reading noninput.html: ${error.message}`);
  hasErrors = true;
}

// Check 6: Environment variable documentation
console.log('\n📚 Checking documentation...');
const docs = [
  'VERCEL_DEPLOYMENT_GUIDE.md',
  'TELEGRAM_CHAT_QUICK_FIX.md'
];

docs.forEach(doc => {
  const docPath = path.join(__dirname, doc);
  if (fs.existsSync(docPath)) {
    const content = fs.readFileSync(docPath, 'utf8');
    if (content.includes('TELEGRAM_BOT_TOKEN')) {
      console.log(`  ✅ ${doc} includes token setup instructions`);
    } else {
      console.log(`  ⚠️  ${doc} missing token instructions`);
      hasWarnings = true;
    }
  } else {
    console.log(`  ⚠️  ${doc} not found`);
    hasWarnings = true;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
if (!hasErrors && !hasWarnings) {
  console.log('✅ All checks passed! Configuration looks good.');
  console.log('\n📝 Next steps:');
  console.log('   1. Deploy to Vercel');
  console.log('   2. Set TELEGRAM_BOT_TOKEN in Vercel environment variables');
  console.log('   3. Test the endpoints');
  console.log('   4. Verify chat functionality');
  process.exit(0);
} else if (hasErrors) {
  console.log('❌ Configuration has ERRORS that must be fixed!');
  process.exit(1);
} else {
  console.log('⚠️  Configuration has warnings. Review and address if needed.');
  console.log('\n📝 Next steps:');
  console.log('   1. Review warnings above');
  console.log('   2. Deploy to Vercel');
  console.log('   3. Set TELEGRAM_BOT_TOKEN in Vercel environment variables');
  console.log('   4. Test the endpoints');
  process.exit(0);
}
