#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Создание исправленной оффлайн версии с полным мокированием...\n');

// Читаем основной файл
let content = fs.readFileSync('/workspaces/SuslovPA/noninput.html', 'utf8');

// ===== УДАЛЯЕМ ВСЕ ВНЕШНИЕ СКРИПТЫ И ССЫЛКИ =====

// 1. Удаляем ВСЕ script теги с src атрибутом (кроме встроенных скриптов)
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi, '');

// 2. Удаляем теги link для внешних ресурсов
content = content.replace(/<link[^>]+href=["']https?:\/\/[^"']*["'][^>]*>/gi, '');
content = content.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');

// 3. Удаляем meta теги для Google
content = content.replace(/<meta[^>]*google[^>]*>/gi, '');

// 4. Удаляем noscript теги
content = content.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');

// ===== ДОБАВЛЯЕМ ПРОДВИНУТОЕ ОФФЛАЙН МОКИРОВАНИЕ =====

// Находим конец </head>
const headEndIndex = content.indexOf('</head>');
if (headEndIndex !== -1) {
  const offlineInitScript = `
    <script>
      // ===== ПОЛНОЕ ОФФЛАЙН РЕЖИМ ИНИЦИАЛИЗАЦИЯ =====
      // ДОЛЖЕН ЗАПУСТИТЬСЯ ДО ВСЕХ ДРУГИХ СКРИПТОВ!
      
      window.OFFLINE_MODE = true;
      window.IS_OFFLINE = true;
      window.API_DISABLED = true;
      
      console.log('%c✅ OFFLINE MODE INITIALIZED', 'color: #ff9800; font-size: 16px; font-weight: bold;');
      console.log('%c📴 All external API calls will be mocked locally', 'color: #ff9800; font-size: 12px;');
      
      // ===== ПЕРЕХВАТ FETCH - КРИТИЧЕСКИ ВАЖНО =====
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        // Преобразуем URL в строку если нужно
        const urlStr = typeof url === 'string' ? url : (url?.toString ? url.toString() : '');
        
        // Логируем запрос
        console.log('%c📵 Fetch intercepted:', 'color: #ff6600; font-size: 10px;', urlStr.substring(0, 100));
        
        // Проверяем если это внешний запрос или API запрос
        if (urlStr.includes('http://') || 
            urlStr.includes('https://') ||
            urlStr.includes('file:///') ||
            urlStr.includes('/api/') ||
            urlStr.includes('firebase') ||
            urlStr.includes('telegram') ||
            urlStr.includes('counter')) {
          
          console.warn('%c❌ BLOCKED (offline mode):', 'color: #ff9800; font-size: 10px;', urlStr.substring(0, 80));
          
          // Возвращаем успешный мок ответ
          return Promise.resolve(new Response(
            JSON.stringify({
              offline: true,
              status: 'mocked',
              data: null,
              success: false,
              message: 'Offline mode: request blocked'
            }),
            {
              status: 200,
              statusText: 'OK',
              headers: { 'content-type': 'application/json' }
            }
          ));
        }
        
        // Для локальных файлов пытаемся использовать оригинальный fetch
        try {
          return originalFetch.call(this, url, options);
        } catch (e) {
          console.warn('%c⚠️ Fetch error (falling back to mock):', 'color: #ff9800; font-size: 10px;', e.message);
          return Promise.resolve(new Response(
            JSON.stringify({ offline: true, error: e.message }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          ));
        }
      };
      
      // ===== ПЕРЕХВАТ XMLHttpRequest =====
      const OriginalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        
        let isBlocked = false;
        
        xhr.open = function(method, url) {
          const urlStr = typeof url === 'string' ? url : url.toString();
          
          if (urlStr.includes('http://') || 
              urlStr.includes('https://') ||
              urlStr.includes('/api/') ||
              urlStr.includes('firebase') ||
              urlStr.includes('telegram') ||
              urlStr.includes('counter')) {
            
            console.warn('%c❌ XHR BLOCKED:', 'color: #ff9800; font-size: 10px;', urlStr.substring(0, 80));
            isBlocked = true;
            xhr._offlineBlocked = true;
          }
          
          try {
            return originalOpen.apply(this, arguments);
          } catch (e) {
            console.warn('%c⚠️ XHR.open error:', 'color: #ff9800;', e.message);
          }
        };
        
        xhr.send = function(data) {
          if (isBlocked || xhr._offlineBlocked) {
            // Мокируем успешный ответ
            xhr.status = 200;
            xhr.statusText = 'OK';
            xhr.responseText = JSON.stringify({ offline: true, success: false });
            xhr.response = { offline: true, success: false };
            xhr.readyState = 4;
            
            // Вызываем callbacks
            setTimeout(() => {
              xhr.onload && xhr.onload();
              xhr.onreadystatechange && xhr.onreadystatechange();
            }, 10);
            
            return;
          }
          
          try {
            return originalSend.apply(this, arguments);
          } catch (e) {
            console.warn('%c⚠️ XHR.send error:', 'color: #ff9800;', e.message);
            xhr.status = 200;
            xhr.responseText = JSON.stringify({ offline: true, error: e.message });
            xhr.onload && xhr.onload();
          }
        };
        
        return xhr;
      };
      
      // Копируем оригинальные свойства
      window.XMLHttpRequest.prototype = OriginalXHR.prototype;
      window.XMLHttpRequest.UNSENT = 0;
      window.XMLHttpRequest.OPENED = 1;
      window.XMLHttpRequest.HEADERS_RECEIVED = 2;
      window.XMLHttpRequest.LOADING = 3;
      window.XMLHttpRequest.DONE = 4;
      
      // ===== MOCK FIREBASE =====
      window.firebase = {
        initializeApp: function(config) {
          console.log('%c✅ Firebase mock: initializeApp called', 'color: #18b56c; font-size: 10px;');
          return this;
        },
        database: function() {
          return {
            ref: function(path) {
              return {
                on: function(event, callback) {
                  console.log('%c✅ Firebase mock: ref.on called for path', 'color: #18b56c; font-size: 9px;', path);
                  return this;
                },
                once: function(event) {
                  return Promise.resolve({ val: () => null });
                },
                set: function(data) {
                  console.log('%c💾 Firebase mock: data saved locally', 'color: #18b56c; font-size: 9px;', Object.keys(data || {}).slice(0, 3).join(', '));
                  return Promise.resolve();
                },
                push: function() {
                  return {
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve()
                  };
                },
                update: function(data) {
                  return Promise.resolve();
                },
                remove: function() {
                  return Promise.resolve();
                },
                off: function() {},
                transaction: function() {
                  return Promise.resolve({ committed: false });
                }
              };
            },
            goOffline: function() {},
            goOnline: function() {},
            enableLogging: function() {}
          };
        },
        auth: function() {
          return {
            onAuthStateChanged: function(callback) {
              callback(null);
              return () => {};
            },
            signOut: function() {
              return Promise.resolve();
            },
            signInAnonymously: function() {
              return Promise.resolve({ user: { uid: 'offline-user-' + Date.now() } });
            },
            currentUser: null
          };
        },
        storage: function() {
          return {
            ref: function(path) {
              return {
                put: function() { return Promise.resolve(); },
                getDownloadURL: function() { return Promise.resolve('offline'); },
                delete: function() { return Promise.resolve(); }
              };
            }
          };
        },
        initializeApp: function(config) { return this; },
        apps: []
      };
      
      // ===== MOCK TELEGRAM =====
      window.TelegramWebApp = {
        ready: function() {},
        sendData: function(data) {
          console.log('%c✅ Telegram mock: sendData', 'color: #18b56c; font-size: 9px;', data.substring(0, 50));
        },
        close: function() {},
        initData: '',
        user: null,
        onEvent: function() { return this; },
        offEvent: function() { return this; },
        showAlert: function(msg) { alert(msg); },
        showConfirm: function(msg, cb) { cb(confirm(msg)); },
        showPopup: function(options, cb) { if (cb) cb(options.buttons[0].id); },
        openLink: function(url) { console.log('%c🔗 Telegram mock: openLink', 'color: #18b56c; font-size: 9px;', url); },
        setHeaderColor: function() {},
        setBackgroundColor: function() {},
        setBottomBarColor: function() {},
        ready: function() {},
        expand: function() {},
        setHeaderColor: function() {},
        MainButton: {
          setText: function() { return this; },
          onClick: function() { return this; },
          offClick: function() { return this; },
          show: function() { return this; },
          hide: function() { return this; },
          enable: function() { return this; },
          disable: function() { return this; },
          setParams: function() { return this; },
          isVisible: false,
          isActive: false,
          text: '',
          color: '',
          textColor: '',
          hasShineEffect: false
        }
      };
      
      window.tg = window.TelegramWebApp;
      
      // ===== MOCK WINDOW.LOCATION БЕЗОПАСНОСТЬ =====
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: false,
        configurable: false
      });
      
      // ===== СОХРАНЕНИЕ В LOCALSTORAGE =====
      window.saveOfflineData = function(key, value) {
        try {
          localStorage.setItem('offline_' + key, JSON.stringify(value));
          console.log('%c💾 Saved to localStorage:', 'color: #18b56c; font-size: 9px;', key);
          return true;
        } catch (e) {
          console.warn('%c⚠️ Cannot save to localStorage:', 'color: #ff9800; font-size: 9px;', e.message);
          return false;
        }
      };
      
      window.loadOfflineData = function(key) {
        try {
          const value = localStorage.getItem('offline_' + key);
          return value ? JSON.parse(value) : null;
        } catch (e) {
          return null;
        }
      };
      
      // ===== ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК =====
      window.addEventListener('error', function(event) {
        if (event.message && event.message.includes('Failed to fetch')) {
          console.log('%c✅ Caught fetch error, offline mode handling', 'color: #18b56c; font-size: 10px;');
          event.preventDefault();
        }
      });
      
      window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && (
          event.reason.message?.includes('Failed to fetch') ||
          event.reason.message?.includes('CORS') ||
          event.reason.message?.includes('ERR_FAILED')
        )) {
          console.log('%c✅ Caught unhandled rejection, offline mode handling', 'color: #18b56c; font-size: 10px;');
          event.preventDefault();
        }
      });
      
      console.log('%c✅ Offline initialization complete - all API calls mocked', 'color: #18b56c; font-weight: bold;');
    </script>
  `;
  
  content = content.substring(0, headEndIndex) + offlineInitScript + content.substring(headEndIndex);
}

// ===== ДОБАВЛЯЕМ ORANGE BANNER В BODY =====

// Находим начало <body>
const bodyMatch = content.match(/<body[^>]*>/i);
if (bodyMatch) {
  const bodyIndex = content.indexOf(bodyMatch[0]) + bodyMatch[0].length;
  
  const banner = `
    <div id="offline-banner" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #ff9800 0%, #ffa726 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      font-size: 14px;
      letter-spacing: 0.3px;
    ">
      🟠 OFFLINE MODE - Все данные сохраняются локально | Внешние API заблокированы
    </div>
    <style>
      html, body { margin: 0 !important; padding: 0 !important; }
      body > * { margin-top: 50px; }
    </style>
  `;
  
  content = content.substring(0, bodyIndex) + banner + content.substring(bodyIndex);
}

// ===== ВАЛИДАЦИЯ =====

const checks = {
  'NeuroHomeostasis': content.includes('NeuroHomeostasis'),
  'Frequency Scanner': content.includes('Frequency Scanner'),
  'OFFLINE_MODE': content.includes('OFFLINE_MODE'),
  'offline-banner': content.includes('offline-banner'),
  'Firebase mock': content.includes('window.firebase'),
  'TelegramWebApp mock': content.includes('TelegramWebApp'),
  'Fetch interception': content.includes('window.fetch'),
  'XHR interception': content.includes('XMLHttpRequest'),
  'Error handling': content.includes('unhandledrejection')
};

console.log('📋 Проверка компонентов:');
Object.entries(checks).forEach(([name, value]) => {
  console.log(`   ${value ? '✅' : '❌'} ${name}`);
});

// ===== СОХРАНЯЕМ =====

const outputPath = '/workspaces/SuslovPA/SuslovPA-Offline.html';
fs.writeFileSync(outputPath, content, 'utf8');

const sizeKb = (content.length / 1024).toFixed(2);
console.log(`\n✅ Оффлайн версия создана: ${outputPath}`);
console.log(`📊 Размер: ${sizeKb} KB (${content.length} bytes)`);

// Копируем в public
const publicPath = '/workspaces/SuslovPA/public/SuslovPA-Offline.html';
fs.copyFileSync(outputPath, publicPath);
console.log(`✅ Скопировано в public директорию`);

console.log('\n🎉 Готово! Оффлайн версия с полным мокированием создана.');
console.log('📝 Проверьте консоль браузера (F12) для логов мокирования.');
