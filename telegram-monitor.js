#!/usr/bin/env node

/**
 * 🔗 TELEGRAM MONITOR & TESTER
 * Полный мониторинг отправки и получения сообщений
 */

const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  switch(type) {
    case 'info':
      console.log(`${colors.blue}${prefix}${colors.reset} ℹ️  ${message}`);
      break;
    case 'success':
      console.log(`${colors.green}${prefix}${colors.reset} ✅ ${message}`);
      break;
    case 'error':
      console.log(`${colors.red}${prefix}${colors.reset} ❌ ${message}`);
      break;
    case 'warn':
      console.log(`${colors.yellow}${prefix}${colors.reset} ⚠️  ${message}`);
      break;
    case 'test':
      console.log(`${colors.cyan}${prefix}${colors.reset} 🧪 ${message}`);
      break;
    case 'header':
      console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
      console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
      break;
  }
}

// Проверяем наличие переменных окружения
function checkEnvironment() {
  log('header', '📋 ENVIRONMENT CHECK');
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    log('error', 'TELEGRAM_BOT_TOKEN не установлен!');
    process.exit(1);
  }
  
  log('success', `Token установлен: ${token.substring(0, 20)}...`);
  
  const siteUrl = process.env.SITE_URL || 'https://pavell.vercel.app';
  log('success', `Site URL: ${siteUrl}`);
  
  return { token, siteUrl };
}

// Проверяем файлы API
async function checkApiFiles() {
  log('header', '📁 API FILES CHECK');
  
  const files = [
    '/workspaces/SuslovPA/api/telegram.js',
    '/workspaces/SuslovPA/api/telegram/secure.js',
    '/workspaces/SuslovPA/api/telegram/updates.js',
    '/workspaces/SuslovPA/noninput.html'
  ];
  
  for (const file of files) {
    try {
      fs.accessSync(file);
      log('success', `File found: ${path.basename(file)}`);
    } catch (err) {
      log('error', `File NOT found: ${file}`);
    }
  }
}

// Проверяем подключение к API
async function testApiConnection(siteUrl) {
  log('header', '🌐 API CONNECTION TEST');
  
  try {
    log('info', `Testing connection to ${siteUrl}/api/telegram`);
    
    const response = await fetch(`${siteUrl}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getMe',
        params: {}
      })
    });
    
    log('info', `Response status: ${response.status}`);
    
    const data = await response.json();
    log('info', `Response: ${JSON.stringify(data).substring(0, 100)}...`);
    
    if (response.status === 200) {
      log('success', 'API connection successful!');
      return true;
    } else if (response.status === 404) {
      log('error', 'API endpoint not found (404). Deployment may still be pending.');
      return false;
    } else {
      log('warn', `Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Connection error: ${error.message}`);
    return false;
  }
}

// Проверяем HTML файл
async function testHtmlFile(siteUrl) {
  log('header', '📄 HTML FILE TEST');
  
  try {
    const response = await fetch(`${siteUrl}/noninput.html`);
    log('success', `HTML file status: ${response.status}`);
    
    const html = await response.text();
    
    // Проверяем наличие ключевых элементов
    const checks = [
      { name: 'multiUserChat class', pattern: /class MultiUserChatSystem/gi },
      { name: 'Telegram config', pattern: /telegramConfig/gi },
      { name: 'API endpoints', pattern: /\/api\/telegram/gi },
      { name: 'DOMContentLoaded handler', pattern: /DOMContentLoaded/gi }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(html)) {
        log('success', `Found: ${check.name}`);
      } else {
        log('warn', `Missing: ${check.name}`);
      }
    }
  } catch (error) {
    log('error', `HTML file error: ${error.message}`);
  }
}

// Тестируем отправку сообщения
async function testSendMessage(siteUrl, botToken) {
  log('header', '📤 SEND MESSAGE TEST');
  
  try {
    const testMessage = `Test message ${new Date().toLocaleTimeString()}`;
    
    log('test', `Sending: "${testMessage}"`);
    
    // Через прокси
    const response = await fetch(`${siteUrl}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'sendMessage',
        params: {
          chat_id: '@noninput',
          text: `🤖 Test: ${testMessage}`
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success || data.ok) {
      log('success', `Message sent successfully!`);
      log('info', `Message ID: ${data.data?.result?.message_id || data.result?.message_id || 'unknown'}`);
      return true;
    } else {
      log('error', `Failed to send: ${data.error || data.description || 'unknown error'}`);
      return false;
    }
  } catch (error) {
    log('error', `Send error: ${error.message}`);
    return false;
  }
}

// Проверяем получение сообщений
async function testGetMessages(siteUrl) {
  log('header', '📥 GET MESSAGES TEST');
  
  try {
    log('test', 'Fetching recent messages...');
    
    const response = await fetch(`${siteUrl}/api/telegram/updates?limit=10`, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (data.success || data.updates) {
      const count = data.updates?.length || 0;
      log('success', `Retrieved ${count} messages`);
      
      if (count > 0) {
        const lastMsg = data.updates[data.updates.length - 1];
        log('info', `Last message: "${lastMsg.text?.substring(0, 50) || '[Media]'}..."`);
        log('info', `From: ${lastMsg.from?.first_name || 'Unknown'}`);
      }
      return true;
    } else {
      log('warn', `No messages or error: ${data.error || 'unknown'}`);
      return false;
    }
  } catch (error) {
    log('error', `Get messages error: ${error.message}`);
    return false;
  }
}

// Полная диагностика
async function runFullDiagnostics() {
  log('header', '🔍 FULL DIAGNOSTICS');
  
  const { token, siteUrl } = checkEnvironment();
  await checkApiFiles();
  
  const htmlOk = await testHtmlFile(siteUrl);
  const apiOk = await testApiConnection(siteUrl);
  const sendOk = await testSendMessage(siteUrl, token);
  const getOk = await testGetMessages(siteUrl);
  
  // Итоги
  log('header', '📊 SUMMARY');
  
  const results = {
    'Environment': !!token,
    'HTML File': htmlOk,
    'API Connection': apiOk,
    'Send Message': sendOk,
    'Get Messages': getOk
  };
  
  let allOk = true;
  for (const [name, result] of Object.entries(results)) {
    if (result) {
      log('success', `${name}: OK`);
    } else {
      log('warn', `${name}: FAILED`);
      allOk = false;
    }
  }
  
  if (allOk) {
    log('success', '✨ All systems operational!');
  } else {
    log('error', '⚠️ Some issues detected. Check logs above.');
  }
}

// Мониторинг в реальном времени
async function startMonitoring(interval = 30000) {
  log('header', '🔔 REAL-TIME MONITORING');
  
  const { token, siteUrl } = checkEnvironment();
  
  let count = 0;
  setInterval(async () => {
    count++;
    log('info', `Monitoring cycle #${count}`);
    
    // Проверяем API
    const apiOk = await testApiConnection(siteUrl);
    
    if (!apiOk) {
      log('error', 'API is down! Attempting recovery...');
    }
    
    // Проверяем новые сообщения
    await testGetMessages(siteUrl);
  }, interval);
}

// Главный код
(async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--monitor')) {
    await startMonitoring(parseInt(args[args.indexOf('--interval') + 1]) || 30000);
  } else if (args.includes('--send')) {
    const { siteUrl, token } = checkEnvironment();
    await testSendMessage(siteUrl, token);
  } else if (args.includes('--get')) {
    const { siteUrl } = checkEnvironment();
    await testGetMessages(siteUrl);
  } else {
    // По умолчанию - полная диагностика
    await runFullDiagnostics();
  }
})().catch(error => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
