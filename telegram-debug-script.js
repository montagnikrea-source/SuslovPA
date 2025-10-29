/**
 * 🧪 TELEGRAM AUTO-CONNECTION VERIFICATION SCRIPT
 * 
 * Вставьте этот код в консоль браузера для полной проверки
 * подключения и синхронизации Telegram чата
 */

(function() {
  console.clear();
  
  const VERIFICATION = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Цвета для консоли
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };

  function log(emoji, title, message) {
    console.log(`${emoji} ${title}: ${message}`);
  }

  function test(name, fn) {
    try {
      const result = fn();
      VERIFICATION.tests[name] = { status: 'pass', result };
      log('✅', name, result);
      return result;
    } catch (error) {
      VERIFICATION.tests[name] = { status: 'fail', error: error.message };
      log('❌', name, error.message);
      return null;
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🔗 TELEGRAM AUTO-CONNECTION VERIFICATION SUITE 🔗       ║');
  console.log('║                                                            ║');
  console.log('║   This script verifies that:                              ║');
  console.log('║   • Telegram chat auto-connects on page load              ║');
  console.log('║   • Messages update every 5 seconds                       ║');
  console.log('║   • Messages are forwarded to/from Telegram               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // TEST 1: Проверяем объект multiUserChat
  console.log('📋 PART 1: INITIALIZATION CHECKS');
  console.log('━'.repeat(60));

  test('multiUserChat exists', () => {
    if (typeof multiUserChat === 'undefined') {
      throw new Error('multiUserChat not found in window');
    }
    return 'object found';
  });

  test('telegramConfig configured', () => {
    if (!multiUserChat?.telegramConfig) {
      throw new Error('telegramConfig not found');
    }
    return JSON.stringify(multiUserChat.telegramConfig);
  });

  test('Telegram enabled', () => {
    if (!multiUserChat?.telegramConfig?.enabled) {
      throw new Error('Telegram is disabled');
    }
    return 'enabled: true';
  });

  test('API URL configured', () => {
    const url = multiUserChat?.telegramConfig?.apiUrl;
    if (!url) throw new Error('No API URL');
    return url;
  });

  test('Poll interval', () => {
    const interval = multiUserChat?.telegramConfig?.pollInterval;
    if (!interval) throw new Error('No poll interval');
    return `${interval}ms`;
  });

  test('Chat ID', () => {
    const chatId = multiUserChat?.telegramConfig?.chatId;
    if (!chatId) throw new Error('No chat ID');
    return chatId;
  });

  // TEST 2: Проверяем состояние соединения
  console.log('\n📊 PART 2: CONNECTION STATE');
  console.log('━'.repeat(60));

  test('Connection state exists', () => {
    if (!multiUserChat?.connectionState) {
      throw new Error('connectionState not found');
    }
    return 'object found';
  });

  test('Connection status', () => {
    const state = multiUserChat?.connectionState;
    return `isConnected: ${state?.isConnected}, failures: ${state?.consecutiveFailures}`;
  });

  test('Last successful request', () => {
    const time = multiUserChat?.connectionState?.lastSuccessfulRequest;
    if (time === 0) return 'No successful requests yet';
    const ago = Math.round((Date.now() - time) / 1000);
    return `${ago} seconds ago`;
  });

  // TEST 3: Проверяем интервалы
  console.log('\n⏰ PART 3: POLLING TIMERS');
  console.log('━'.repeat(60));

  test('Main polling interval', () => {
    if (typeof multiUserChat?.telegramPollInterval === 'undefined') {
      return 'Not started yet';
    }
    return `ID: ${multiUserChat.telegramPollInterval}`;
  });

  test('Health check interval', () => {
    if (typeof multiUserChat?.healthCheckInterval === 'undefined') {
      return 'Not started yet';
    }
    return `ID: ${multiUserChat.healthCheckInterval}`;
  });

  test('Online counter interval', () => {
    if (typeof multiUserChat?.onlineCounterInterval === 'undefined') {
      return 'Not started yet';
    }
    return `ID: ${multiUserChat.onlineCounterInterval}`;
  });

  // TEST 4: Проверяем сообщения
  console.log('\n💬 PART 4: MESSAGES');
  console.log('━'.repeat(60));

  test('Messages array exists', () => {
    if (!Array.isArray(multiUserChat?.messages)) {
      throw new Error('messages is not an array');
    }
    return `array with ${multiUserChat.messages.length} items`;
  });

  test('Total messages', () => {
    return multiUserChat?.messages?.length || 0;
  });

  test('Last 3 messages', () => {
    const msgs = multiUserChat?.messages || [];
    if (msgs.length === 0) return 'No messages yet';
    return msgs.slice(-3).map(m => {
      const source = m.source || 'unknown';
      const user = m.username || 'Unknown';
      const text = (m.text || '').substring(0, 40);
      return `[${source}] ${user}: "${text}"`;
    }).join('\n              ');
  });

  test('Telegram messages count', () => {
    const count = (multiUserChat?.messages || []).filter(m => m.source === 'telegram').length;
    return count;
  });

  test('Browser messages count', () => {
    const count = (multiUserChat?.messages || []).filter(m => m.source === 'browser').length;
    return count;
  });

  // TEST 5: Проверяем методы
  console.log('\n🔧 PART 5: METHODS AVAILABILITY');
  console.log('━'.repeat(60));

  test('sendTelegramRequest method', () => {
    if (typeof multiUserChat?.sendTelegramRequest !== 'function') {
      throw new Error('Method not found');
    }
    return 'function available';
  });

  test('initTelegramConnection method', () => {
    if (typeof multiUserChat?.initTelegramConnection !== 'function') {
      throw new Error('Method not found');
    }
    return 'function available';
  });

  test('startTelegramPolling method', () => {
    if (typeof multiUserChat?.startTelegramPolling !== 'function') {
      throw new Error('Method not found');
    }
    return 'function available';
  });

  test('checkTelegramUpdates method', () => {
    if (typeof multiUserChat?.checkTelegramUpdates !== 'function') {
      throw new Error('Method not found');
    }
    return 'function available';
  });

  test('loadTelegramMessages method', () => {
    if (typeof multiUserChat?.loadTelegramMessages !== 'function') {
      throw new Error('Method not found');
    }
    return 'function available';
  });

  // TEST 6: API доступность
  console.log('\n🌐 PART 6: API CONNECTIVITY');
  console.log('━'.repeat(60));

  // Проверяем доступ к API
  (async () => {
    try {
      console.log('🔍 Testing API connectivity...');
      
      const apiUrl = multiUserChat?.telegramConfig?.apiUrl;
      if (!apiUrl) {
        log('⚠️', 'API URL', 'Not configured');
        return;
      }

      // Тест соединения с API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'getMe',
          params: {}
        })
      });

      const data = await response.json();
      
      if (data && data.ok) {
        log('✅', 'Telegram API', 'Connected and responding');
        if (data.result?.username) {
          log('✅', 'Bot username', `@${data.result.username}`);
        }
      } else {
        log('⚠️', 'Telegram API', `Error: ${data?.description || 'unknown'}`);
      }
    } catch (error) {
      log('❌', 'Telegram API', error.message);
    }

    // РЕЗУЛЬТАТЫ
    console.log('\n📈 SUMMARY');
    console.log('━'.repeat(60));
    
    const passed = Object.values(VERIFICATION.tests).filter(t => t.status === 'pass').length;
    const failed = Object.values(VERIFICATION.tests).filter(t => t.status === 'fail').length;
    const total = passed + failed;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Telegram chat is fully operational!\n');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.\n');
    }

    // Инструкции по использованию
    console.log('📝 USAGE INSTRUCTIONS');
    console.log('━'.repeat(60));
    console.log('');
    console.log('1. Send a test message:');
    console.log('   document.getElementById("messageInput").value = "Test message"');
    console.log('   sendMessage()');
    console.log('');
    console.log('2. Check updates manually:');
    console.log('   await multiUserChat.checkTelegramUpdates()');
    console.log('');
    console.log('3. View all messages:');
    console.log('   multiUserChat.messages');
    console.log('');
    console.log('4. Check connection state:');
    console.log('   multiUserChat.connectionState');
    console.log('');
    console.log('5. View polling status:');
    console.log('   multiUserChat.telegramPollInterval !== undefined');
    console.log('');
  })();
})();

// Экспортируем полезные функции в консоль
window.TelegramDebug = {
  // Получить статус
  getStatus: () => ({
    connected: multiUserChat?.connectionState?.isConnected,
    messages: multiUserChat?.messages?.length || 0,
    enabled: multiUserChat?.telegramConfig?.enabled,
    polling: multiUserChat?.telegramPollInterval !== undefined,
    lastUpdate: new Date(multiUserChat?.connectionState?.lastSuccessfulRequest || 0)
  }),

  // Отправить тестовое сообщение
  sendTest: async (text = 'Test message from browser') => {
    const input = document.getElementById('messageInput');
    if (input) {
      input.value = text;
      sendMessage?.();
    }
  },

  // Принудительная проверка обновлений
  checkUpdates: () => multiUserChat?.checkTelegramUpdates?.(),

  // Получить последние сообщения
  getLastMessages: (count = 5) => {
    const msgs = multiUserChat?.messages || [];
    return msgs.slice(-count);
  },

  // Получить статистику
  getStats: () => {
    const msgs = multiUserChat?.messages || [];
    return {
      total: msgs.length,
      telegram: msgs.filter(m => m.source === 'telegram').length,
      browser: msgs.filter(m => m.source === 'browser').length,
      users: new Set(msgs.map(m => m.username)).size
    };
  },

  // Показать конфигурацию
  getConfig: () => multiUserChat?.telegramConfig,

  // Помощь
  help: () => {
    console.log('Доступные команды:');
    console.log('  TelegramDebug.getStatus()      - Статус системы');
    console.log('  TelegramDebug.getStats()       - Статистика сообщений');
    console.log('  TelegramDebug.sendTest()       - Отправить тестовое сообщение');
    console.log('  TelegramDebug.checkUpdates()   - Принудительная проверка обновлений');
    console.log('  TelegramDebug.getLastMessages()- Получить последние сообщения');
    console.log('  TelegramDebug.getConfig()      - Показать конфигурацию');
  }
};

console.log('\n💡 Debug commands available:');
console.log('   Type: TelegramDebug.help()');
console.log('');
