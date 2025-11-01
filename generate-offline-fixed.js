#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Создание исправленной оффлайн версии...\n');

// Читаем основной файл
const mainFile = fs.readFileSync('/workspaces/SuslovPA/noninput.html', 'utf8');

// Находим и сохраняем основной контент (всё между <body> и </body>)
const bodyMatch = mainFile.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const bodyContent = bodyMatch ? bodyMatch[1] : '';

// Удаляем все внешние скрипты CDN и оставляем только локальное содержимое
let offlineContent = mainFile
  // Удаляем Google AdSense
  .replace(/<script[^>]*async[^>]*src=["\']https:\/\/pagead2\.googlesyndication\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/pagead2\.googlesyndication\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  // Удаляем Google Analytics
  .replace(/<script[^>]*src=["\']https:\/\/www\.googletagmanager\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script async src=["\']https:\/\/www\.google-analytics\.com[^"\']*["\']><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/www\.googletagmanager\.com[^"\']*["\'][^>]*>[\s\S]*?<\/script>/gi, '')
  // Удаляем Firebase
  .replace(/<script[^>]*src=["\']https:\/\/www\.gstatic\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/www\.firebaseapp\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/firebase\.google\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/www\.googleapis\.com[^"\']*["\'][^>]*><\/script>/gi, '')
  // Удаляем JSZip
  .replace(/<script[^>]*src=["\']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jszip[^"\']*["\'][^>]*><\/script>/gi, '')
  .replace(/<script[^>]*src=["\']https:\/\/stuk\.github\.io\/jszip[^"\']*["\'][^>]*><\/script>/gi, '')
  // Удаляем Yandex
  .replace(/<script[^>]*src=["\']https:\/\/mc\.yandex\.ru[^"\']*["\'][^>]*><\/script>/gi, '')
  // Удаляем другие CDN скрипты
  .replace(/<script[^>]*src=["\']https:\/\/[^"\']*["\'][^>]*><\/script>/gi, '');

// Убедимся, что head закрывается до body
const headMatch = offlineContent.match(/<\/head>/i);
if (headMatch) {
  const headIndex = offlineContent.indexOf(headMatch[0]);
  
  // Вставляем инициализацию оффлайн режима перед </head>
  const offlineInit = `
    <script>
      // Инициализация оффлайн режима
      window.OFFLINE_MODE = true;
      console.log('✅ Offline mode initialized');
      
      // Mock Firebase
      window.firebase = {
        initializeApp: function() { return this; },
        database: function() { 
          return {
            ref: function() {
              return {
                on: function() {},
                once: function() { return Promise.resolve({ val: () => null }); },
                set: function() { return Promise.resolve(); },
                push: function() { return { set: () => Promise.resolve() }; }
              };
            }
          };
        },
        auth: function() {
          return {
            onAuthStateChanged: function(callback) { callback(null); }
          };
        }
      };
      
      // Mock Telegram
      window.TelegramWebApp = {
        ready: function() {},
        sendData: function() {},
        close: function() {},
        initData: '',
        user: null
      };
      
      // Перехват fetch для оффлайн режима
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('firebase') || url.includes('telegram') || url.includes('http'))) {
          console.warn('📵 Offline mode: blocking external request to', url);
          return Promise.resolve(new Response(JSON.stringify({ offline: true }), { status: 200 }));
        }
        return originalFetch.apply(this, args).catch(() => {
          console.warn('📵 Offline mode: request failed, returning offline response');
          return Promise.resolve(new Response(JSON.stringify({ offline: true }), { status: 200 }));
        });
      };
      
      // Перехват XMLHttpRequest
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        xhr.open = function(method, url, ...rest) {
          if (typeof url === 'string' && (url.includes('firebase') || url.includes('telegram') || url.includes('http'))) {
            console.warn('📵 Offline mode: blocking XHR to', url);
            return;
          }
          return originalOpen.apply(this, [method, url, ...rest]);
        };
        return xhr;
      };
    </script>
  `;
  
  offlineContent = offlineContent.substring(0, headIndex) + offlineInit + offlineContent.substring(headIndex);
}

// Вставляем orange offline banner в начало body
const bodyStartMatch = offlineContent.match(/<body[^>]*>/i);
if (bodyStartMatch) {
  const bodyStartIndex = offlineContent.indexOf(bodyStartMatch[0]) + bodyStartMatch[0].length;
  
  const offlineBanner = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #ff9800 0%, #ffa726 100%);
      color: white;
      padding: 10px 20px;
      text-align: center;
      font-weight: bold;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      🟠 OFFLINE MODE - Приложение работает без интернета
    </div>
    <style>
      body { padding-top: 40px !important; }
    </style>
  `;
  
  offlineContent = offlineContent.substring(0, bodyStartIndex) + offlineBanner + offlineContent.substring(bodyStartIndex);
}

// Убеждаемся, что основной контент на месте
if (!offlineContent.includes('NeuroHomeostasis') && bodyContent.includes('NeuroHomeostasis')) {
  console.log('⚠️  Предупреждение: основной контент может быть повреждён, восстанавливаем...');
  offlineContent = mainFile;
}

// Проверяем, что это не пустой файл
if (offlineContent.length < 100000) {
  console.error('❌ Ошибка: файл слишком мал, используем исходный файл');
  offlineContent = mainFile;
}

// Сохраняем
const outputPath = '/workspaces/SuslovPA/SuslovPA-Offline.html';
fs.writeFileSync(outputPath, offlineContent, 'utf8');

const sizeKb = (offlineContent.length / 1024).toFixed(2);
console.log(`✅ Оффлайн версия создана: ${outputPath}`);
console.log(`📊 Размер: ${sizeKb} KB`);
console.log(`✅ Содержит алгоритм: ${offlineContent.includes('NeuroHomeostasis') ? 'ДА ✓' : 'НЕТ ✗'}`);
console.log(`✅ Оффлайн режим: ${offlineContent.includes('OFFLINE_MODE') ? 'ДА ✓' : 'НЕТ ✗'}`);
console.log(`✅ Firebase mock: ${offlineContent.includes('window.firebase') ? 'ДА ✓' : 'НЕТ ✗'}`);
console.log(`✅ Orange banner: ${offlineContent.includes('ff9800') ? 'ДА ✓' : 'НЕТ ✗'}`);

// Копируем в public
const publicPath = '/workspaces/SuslovPA/public/SuslovPA-Offline.html';
fs.copyFileSync(outputPath, publicPath);
console.log(`✅ Скопировано в public: ${publicPath}`);

console.log('\n🎉 Готово! Оффлайн версия готова к использованию.');
