#!/usr/bin/env node

/**
 * 🚀 TELEGRAM VERCEL TESTER
 * Тестирует отправку и получение сообщений на Vercel
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const SITE_URL = 'https://montagnikrea-source.github.io/SuslovPA;

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  const typeMap = {
    'info': `${colors.blue}${prefix}${colors.reset} ℹ️ `,
    'success': `${colors.green}${prefix}${colors.reset} ✅ `,
    'error': `${colors.red}${prefix}${colors.reset} ❌ `,
    'warn': `${colors.yellow}${prefix}${colors.reset} ⚠️ `,
    'test': `${colors.cyan}${prefix}${colors.reset} 🧪 `,
    'header': ''
  };
  
  if (type === 'header') {
    console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'═'.repeat(50)}${colors.reset}\n`);
  } else {
    console.log(`${typeMap[type] || ''}${message}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConnection() {
  log('header', '🌐 Testing Connection to Vercel');
  
  try {
    log('test', `Pinging ${SITE_URL}/noninput.html`);
    const response = await fetch(`${SITE_URL}/noninput.html`);
    log('success', `✓ Site is reachable (${response.status})`);
    return true;
  } catch (error) {
    log('error', `Site is not reachable: ${error.message}`);
    return false;
  }
}

async function testApiEndpoint(endpoint, method = 'POST', body = null) {
  try {
    const url = `${SITE_URL}${endpoint}`;
    log('test', `Testing ${method} ${endpoint}`);
    
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    log('info', `Status: ${response.status}`);
    
    if (response.status === 200 || (data.ok || data.success)) {
      log('success', `✓ Endpoint is working`);
      return { ok: true, data };
    } else if (response.status === 404) {
      log('error', `Endpoint not found (404) - Deployment may be pending`);
      return { ok: false, status: 404 };
    } else {
      log('warn', `Endpoint returned: ${response.status}`);
      return { ok: false, status: response.status, data };
    }
  } catch (error) {
    log('error', `API error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function testSendMessage() {
  log('header', '📤 Testing Send Message');
  
  const testMsg = `🤖 Test message: ${new Date().toLocaleTimeString()}`;
  log('test', `Sending message via /api/telegram`);
  
  const result = await testApiEndpoint('/api/telegram', 'POST', {
    method: 'sendMessage',
    params: {
      chat_id: '@noninput',
      text: testMsg
    }
  });
  
  if (result.ok) {
    const msgId = result.data.result?.message_id || result.data.data?.result?.message_id;
    log('success', `✓ Message sent! ID: ${msgId}`);
    return true;
  } else if (result.status === 404) {
    log('error', `API endpoint not found. Waiting for deployment...`);
    return false;
  } else {
    log('error', `Failed: ${result.data?.error || result.data?.description || 'Unknown error'}`);
    return false;
  }
}

async function testGetMessages() {
  log('header', '📥 Testing Get Messages');
  
  log('test', `Fetching messages via /api/telegram/updates`);
  
  const result = await testApiEndpoint('/api/telegram/updates?limit=5', 'GET');
  
  if (result.ok) {
    const count = result.data.updates?.length || result.data.count || 0;
    log('success', `✓ Retrieved ${count} messages`);
    
    if (count > 0) {
      const msg = result.data.updates[result.data.updates.length - 1];
      log('info', `Last: "${msg.text?.substring(0, 40) || '[Media]'}..."`);
    }
    return true;
  } else if (result.status === 404) {
    log('error', `API endpoint not found. Waiting for deployment...`);
    return false;
  } else {
    log('error', `Failed: ${result.data?.error || 'Unknown error'}`);
    return false;
  }
}

async function testSecureEndpoint() {
  log('header', '🔒 Testing /api/telegram (Secure)');
  
  log('test', `Testing secure endpoint with getMe`);
  
  const result = await testApiEndpoint('/api/telegram', 'POST', {
    method: 'getMe',
    params: {}
  });
  
  if (result.ok) {
    const botName = result.data.result?.username || result.data.data?.result?.username;
    log('success', `✓ Bot is connected: @${botName}`);
    return true;
  } else if (result.status === 404) {
    log('error', `Endpoint not found (404). Vercel is still deploying...`);
    log('warn', `Waiting 10 seconds before retry...`);
    return false;
  } else {
    log('error', `Failed: ${result.data?.error || result.data?.description || 'Unknown'}`);
    return false;
  }
}

async function runFullTest() {
  log('header', '🔍 FULL TELEGRAM SYSTEM TEST');
  
  // Проверяем соединение
  const siteOk = await testConnection();
  if (!siteOk) {
    log('error', 'Cannot proceed - site is unreachable');
    return;
  }
  
  await delay(1000);
  
  // Проверяем secure endpoint
  const secureOk = await testSecureEndpoint();
  await delay(1000);
  
  if (!secureOk) {
    log('warn', 'Secure endpoint not responding. Waiting for deployment...');
    await delay(5000);
    log('test', 'Retrying...');
    const retry = await testSecureEndpoint();
    if (!retry) {
      log('error', 'Deployment taking longer than expected.');
      log('info', 'Please check: https://vercel.com/dashboard');
      return;
    }
  }
  
  // Проверяем отправку сообщения
  const sendOk = await testSendMessage();
  await delay(1000);
  
  // Проверяем получение сообщения
  const getOk = await testGetMessages();
  
  // Итоги
  log('header', '📊 TEST RESULTS');
  
  const results = {
    'Site Reachable': siteOk,
    'Secure Endpoint': secureOk,
    'Send Message': sendOk,
    'Get Messages': getOk
  };
  
  let passCount = 0;
  for (const [name, passed] of Object.entries(results)) {
    if (passed) {
      log('success', `${name}: PASS`);
      passCount++;
    } else {
      log('error', `${name}: FAIL`);
    }
  }
  
  console.log('');
  if (passCount === Object.keys(results).length) {
    log('success', `🎉 ALL TESTS PASSED! (${passCount}/${Object.keys(results).length})`);
    log('success', 'Telegram integration is working correctly!');
  } else {
    log('warn', `⚠️ Some tests failed: ${passCount}/${Object.keys(results).length}`);
    log('warn', 'Possible reasons:');
    log('warn', '- Vercel deployment still in progress');
    log('warn', '- API routes not deployed yet');
    log('warn', '- Environment variables not set on Vercel');
  }
}

async function continuousMonitor(interval = 30000) {
  log('header', '🔔 CONTINUOUS MONITORING MODE');
  log('info', `Checking every ${interval / 1000} seconds. Press Ctrl+C to stop.\n`);
  
  let cycle = 0;
  setInterval(async () => {
    cycle++;
    log('header', `Monitor Cycle #${cycle}`);
    
    const siteOk = await testConnection();
    if (siteOk) {
      const secureOk = await testSecureEndpoint();
      if (secureOk) {
        log('success', '✓ All systems operational');
      }
    }
  }, interval);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--monitor')) {
  const interval = parseInt(args[args.indexOf('--interval') + 1] || '30000');
  continuousMonitor(interval);
} else {
  runFullTest().catch(error => {
    log('error', `Fatal error: ${error.message}`);
    process.exit(1);
  });
}
