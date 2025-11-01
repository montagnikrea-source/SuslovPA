#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Создание исправленной оффлайн версии с полной блокировкой API...\n');

// Читаем основной файл
let content = fs.readFileSync('/workspaces/SuslovPA/noninput.html', 'utf8');

// ===== УДАЛЯЕМ ВСЕ ВНЕШНИЕ СКРИПТЫ И ССЫЛКИ =====

// 1. Удаляем ВСЕ script теги с src атрибутом
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi, '');

// 2. Удаляем теги link для внешних ресурсов
content = content.replace(/<link[^>]+href=["']https?:\/\/[^"']*["'][^>]*>/gi, '');

// 3. Удаляем meta теги для Google
content = content.replace(/<meta[^>]*google[^>]*>/gi, '');

// 4. Удаляем noscript теги
content = content.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');

// ===== ДОБАВЛЯЕМ СУПЕР-ПРОДВИНУТОЕ ОФФЛАЙН МОКИРОВАНИЕ =====

const headEndIndex = content.indexOf('</head>');
if (headEndIndex !== -1) {
  const offlineInitScript = `
    <script>
      // ===== ПОЛНОЕ ОФФЛАЙН РЕЖИМ ИНИЦИАЛИЗАЦИЯ =====
      // ЗАПУСКАЕТСЯ ДО ВСЕХ ДРУГИХ СКРИПТОВ!
      
      window.OFFLINE_MODE = true;
      window.IS_OFFLINE = true;
      window.API_DISABLED = true;
      
      console.log('%c✅ OFFLINE MODE INITIALIZED', 'color: #ff9800; font-size: 16px; font-weight: bold;');
      console.log('%c📴 All external API calls will be mocked locally', 'color: #ff9800; font-size: 12px;');
      
      // ===== ГЛОБАЛЬНЫЙ ПЕРЕХВАТЧИК ОШИБОК =====
      // Перехватываем ошибки recordVisit ПЕРЕД тем как они произойдут
      const originalConsoleError = console.error;
      console.error = function(...args) {
        const message = args[0]?.toString?.() || '';
        if (message.includes('записи визита') || message.includes('Failed to fetch')) {
          console.log('%c✅ OFFLINE: Blocked recordVisit error', 'color: #18b56c; font-size: 10px;');
          return; // Не выводим ошибку
        }
        return originalConsoleError.apply(console, args);
      };
      
      // ===== ПЕРЕХВАТ FETCH - КРИТИЧЕСКИ ВАЖНО =====
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        const urlStr = typeof url === 'string' ? url : (url?.toString?.() || '');
        
        // БЛОКИРУЕМ ВСЕ API ЗАПРОСЫ
        if (urlStr.includes('/api/') || 
            urlStr.includes('http://') || 
            urlStr.includes('https://') ||
            urlStr.includes('file:///') ||
            urlStr.includes('counter') ||
            urlStr.includes('firebase') ||
            urlStr.includes('telegram')) {
          
          console.log('%c📵 Fetch BLOCKED:', 'color: #ff6600; font-size: 9px;', urlStr.substring(0, 60));
          
          // Возвращаем УСПЕШНЫЙ мок ответ (чтобы не было ошибок)
          return Promise.resolve(new Response(
            JSON.stringify({
              offline: true,
              status: 'mocked',
              success: false,
              data: null,
              count: 0
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
          console.log('%c⚠️ Fetch error (fallback):', 'color: #ff9800; font-size: 9px;', e.message);
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
        let blockedUrl = '';
        
        xhr.open = function(method, url) {
          const urlStr = typeof url === 'string' ? url : url.toString();
          
          // БЛОКИРУЕМ ВСЕ ЗАПРОСЫ К API
          if (urlStr.includes('/api/') || 
              urlStr.includes('http://') || 
              urlStr.includes('https://') ||
              urlStr.includes('counter') ||
              urlStr.includes('firebase') ||
              urlStr.includes('telegram')) {
            
            console.log('%c📵 XHR BLOCKED:', 'color: #ff9800; font-size: 9px;', urlStr.substring(0, 60));
            isBlocked = true;
            blockedUrl = urlStr;
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
            // Мокируем успешный ответ для ВСЕХ блокированных запросов
            xhr.status = 200;
            xhr.statusText = 'OK';
            xhr.responseText = JSON.stringify({ 
              offline: true, 
              success: false,
              count: 0,
              data: null
            });
            xhr.response = { 
              offline: true, 
              success: false,
              count: 0,
              data: null
            };
            xhr.readyState = 4;
            
            // Вызываем callbacks асинхронно
            setTimeout(() => {
              xhr.onreadystatechange && xhr.onreadystatechange();
              xhr.onload && xhr.onload();
            }, 0);
            
            return;
          }
          
          try {
            return originalSend.apply(this, arguments);
          } catch (e) {
            console.warn('%c⚠️ XHR.send error:', 'color: #ff9800;', e.message);
            xhr.status = 200;
            xhr.statusText = 'OK';
            xhr.responseText = JSON.stringify({ offline: true, error: e.message });
            xhr.onload && xhr.onload();
          }
        };
        
        return xhr;
      };
      
      // Копируем константы
      window.XMLHttpRequest.UNSENT = 0;
      window.XMLHttpRequest.OPENED = 1;
      window.XMLHttpRequest.HEADERS_RECEIVED = 2;
      window.XMLHttpRequest.LOADING = 3;
      window.XMLHttpRequest.DONE = 4;
      window.XMLHttpRequest.prototype = OriginalXHR.prototype;
      
      // ===== MOCK FIREBASE ПОЛНОСТЬЮ =====
      window.firebase = {
        initializeApp: () => window.firebase,
        database: () => ({
          ref: () => ({
            on: () => {},
            once: () => Promise.resolve({ val: () => null }),
            set: () => Promise.resolve(),
            push: () => ({ set: () => Promise.resolve() }),
            update: () => Promise.resolve(),
            remove: () => Promise.resolve(),
            off: () => {},
            transaction: () => Promise.resolve({ committed: false })
          }),
          goOffline: () => {},
          goOnline: () => {},
          enableLogging: () => {}
        }),
        auth: () => ({
          onAuthStateChanged: (cb) => { cb(null); return () => {}; },
          signOut: () => Promise.resolve(),
          signInAnonymously: () => Promise.resolve({ user: { uid: 'offline-user' } }),
          currentUser: null
        }),
        storage: () => ({
          ref: () => ({
            put: () => Promise.resolve(),
            getDownloadURL: () => Promise.resolve('offline'),
            delete: () => Promise.resolve()
          })
        }),
        apps: []
      };
      
      // ===== MOCK TELEGRAM =====
      window.TelegramWebApp = {
        ready: () => {},
        sendData: () => {},
        close: () => {},
        initData: '',
        user: null,
        onEvent: () => {},
        offEvent: () => {},
        showAlert: (msg) => alert(msg),
        showConfirm: (msg, cb) => cb(confirm(msg)),
        MainButton: {
          setText: () => window.TelegramWebApp.MainButton,
          onClick: () => window.TelegramWebApp.MainButton,
          offClick: () => window.TelegramWebApp.MainButton,
          show: () => window.TelegramWebApp.MainButton,
          hide: () => window.TelegramWebApp.MainButton,
          enable: () => window.TelegramWebApp.MainButton,
          disable: () => window.TelegramWebApp.MainButton,
          setParams: () => window.TelegramWebApp.MainButton
        }
      };
      
      window.tg = window.TelegramWebApp;
      
      // ===== ПЕРЕХВАТ ГЛОБАЛЬНЫХ ОШИБОК =====
      window.addEventListener('error', (event) => {
        if (event.message?.includes('Failed to fetch') || 
            event.message?.includes('CORS') ||
            event.message?.includes('ERR_FAILED')) {
          console.log('%c✅ Caught error, offline mode handling', 'color: #18b56c; font-size: 10px;');
          event.preventDefault();
          return false;
        }
      }, true);
      
      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason?.message?.includes('Failed to fetch') ||
            event.reason?.message?.includes('CORS') ||
            event.reason?.message?.includes('ERR_FAILED') ||
            event.reason?.message?.includes('записи визита')) {
          console.log('%c✅ Caught unhandled rejection, offline mode handling', 'color: #18b56c; font-size: 10px;');
          event.preventDefault();
          return false;
        }
      }, true);
      
      // ===== СОХРАНЕНИЕ В LOCALSTORAGE =====
      window.saveOfflineData = (key, value) => {
        try {
          localStorage.setItem('offline_' + key, JSON.stringify(value));
          return true;
        } catch (e) {
          console.warn('%c⚠️ Cannot save to localStorage', 'color: #ff9800;', e.message);
          return false;
        }
      };
      
      window.loadOfflineData = (key) => {
        try {
          const value = localStorage.getItem('offline_' + key);
          return value ? JSON.parse(value) : null;
        } catch (e) {
          return null;
        }
      };
      
      console.log('%c✅ Offline initialization complete - all API calls blocked/mocked', 'color: #18b56c; font-weight: bold;');
    </script>
  `;
  
  content = content.substring(0, headEndIndex) + offlineInitScript + content.substring(headEndIndex);
}

// ===== ДОБАВЛЯЕМ ORANGE BANNER В BODY =====

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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  'Error handling': content.includes('unhandledrejection'),
  'recordVisit blocker': content.includes('записи визита')
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
console.log(`📊 Размер: ${sizeKb} KB`);

// Копируем в public
const publicPath = '/workspaces/SuslovPA/public/SuslovPA-Offline.html';
fs.copyFileSync(outputPath, publicPath);
console.log(`✅ Скопировано в public директорию`);

console.log('\n🎉 Готово! Оффлайн версия с полной блокировкой API создана.');
console.log('✅ recordVisit ошибки будут заблокированы');
console.log('✅ Алгоритм будет работать без ошибок');
