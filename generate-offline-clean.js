#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Создание полностью автономной оффлайн версии...\n');

// Читаем основной файл
let content = fs.readFileSync('/workspaces/SuslovPA/noninput.html', 'utf8');

// ===== УДАЛЯЕМ ВСЕ ВНЕШНИЕ СКРИПТЫ И ССЫЛКИ =====

// 1. Удаляем ВСЕ script теги с src атрибутом (кроме встроенных скриптов)
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
content = content.replace(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi, '');

// 2. Удаляем теги link для внешних ресурсов (кроме стилей, которые обычно встроены)
content = content.replace(/<link[^>]+href=["']https?:\/\/[^"']*["'][^>]*>/gi, '');
content = content.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');

// 3. Удаляем meta теги для Google
content = content.replace(/<meta[^>]*google[^>]*>/gi, '');

// 4. Удаляем noscript теги
content = content.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');

// ===== ДОБАВЛЯЕМ ИНИЦИАЛИЗАЦИЮ ОФФЛАЙН РЕЖИМА =====

// Находим конец </head>
const headEndIndex = content.indexOf('</head>');
if (headEndIndex !== -1) {
  const offlineInitScript = `
    <script>
      // ===== ОФФЛАЙН РЕЖИМ ИНИЦИАЛИЗАЦИЯ =====
      window.OFFLINE_MODE = true;
      window.IS_OFFLINE = true;
      console.log('%c✅ OFFLINE MODE ACTIVE', 'color: #ff9800; font-size: 14px; font-weight: bold;');
      
      // Mock Firebase полностью
      window.firebase = window.firebase || {
        initializeApp: () => window.firebase,
        database: () => ({
          ref: () => ({
            on: () => {},
            once: () => Promise.resolve({ val: () => null }),
            set: () => Promise.resolve(),
            push: () => ({ set: () => Promise.resolve() }),
            remove: () => Promise.resolve(),
            update: () => Promise.resolve()
          }),
          goOffline: () => {},
          goOnline: () => {}
        }),
        auth: () => ({
          onAuthStateChanged: (cb) => cb(null),
          signOut: () => Promise.resolve(),
          signInAnonymously: () => Promise.resolve()
        }),
        storage: () => ({
          ref: () => ({
            put: () => Promise.resolve(),
            getDownloadURL: () => Promise.resolve('offline')
          })
        })
      };
      
      // Mock Telegram
      window.TelegramWebApp = {
        ready: () => {},
        sendData: () => {},
        close: () => {},
        initData: '',
        user: null,
        onEvent: () => {},
        offEvent: () => {},
        showAlert: (msg) => alert(msg),
        showConfirm: (msg, cb) => cb(confirm(msg))
      };
      
      window.tg = window.TelegramWebApp;
      
      // Перехват fetch
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string' && url.startsWith('http')) {
          console.log('%c📵 Offline: blocking external fetch', 'color: #666; font-size: 10px;', url);
          return Promise.resolve(new Response(JSON.stringify({offline: true}), {
            status: 200,
            headers: {'content-type': 'application/json'}
          }));
        }
        try {
          return originalFetch(url, options);
        } catch (e) {
          return Promise.resolve(new Response(JSON.stringify({offline: true}), {
            status: 200,
            headers: {'content-type': 'application/json'}
          }));
        }
      };
      
      // Перехват XHR
      const XHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new XHR();
        const open = xhr.open;
        xhr.open = function(method, url) {
          if (url && url.startsWith('http')) {
            console.log('%c📵 Offline: blocking external XHR', 'color: #666; font-size: 10px;', url);
            xhr._offline = true;
          }
          return open.apply(this, arguments);
        };
        const send = xhr.send;
        xhr.send = function(data) {
          if (xhr._offline) {
            xhr.status = 200;
            xhr.responseText = JSON.stringify({offline: true});
            setTimeout(() => {
              xhr.onload && xhr.onload();
              xhr.onreadystatechange && xhr.onreadystatechange();
            }, 10);
            return;
          }
          return send.apply(this, arguments);
        };
        return xhr;
      };
      
      // Сохраняем данные в localStorage вместо Firebase
      window.saveToLocalStorage = (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.warn('Cannot save to localStorage:', e);
        }
      };
      
      window.loadFromLocalStorage = (key) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (e) {
          return null;
        }
      };
      
      console.log('%c✅ Offline initialization complete', 'color: #18b56c; font-weight: bold;');
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
      🟠 OFFLINE MODE - Приложение работает полностью без интернета | Данные сохраняются локально
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
  'localStorage': content.includes('localStorage')
};

console.log('📋 Проверка компонентов:');
Object.entries(checks).forEach(([name, value]) => {
  console.log(`   ${value ? '✅' : '❌'} ${name}`);
});

// Проверяем размер
if (content.length < 300000) {
  console.warn('\n⚠️  Предупреждение: размер файла может быть слишком мал');
}

if (content.length > 1000000) {
  console.warn('\n⚠️  Предупреждение: размер файла может быть слишком велик');
}

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

console.log('\n🎉 Готово! Откройте файл в браузере как "file://..." для тестирования.');
