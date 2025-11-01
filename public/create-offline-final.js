#!/usr/bin/env node

/**
 * Create Final Offline Version - Simple and Reliable
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔨 Creating offline version...\n');

const html = fs.readFileSync('./noninput.html', 'utf-8');

// Step 1: Remove all external CDN scripts
let result = html;

// Remove Google AdSense
result = result.replace(/<script[\s\S]*?pagead2\.googlesyndication[\s\S]*?<\/script>/gi, '');

// Remove Firebase CDN
result = result.replace(/<script[\s\S]*?gstatic\.com[\s\S]*?<\/script>/gi, '');

// Remove JSZip
result = result.replace(/<script[\s\S]*?cdnjs\.cloudflare[\s\S]*?<\/script>/gi, '');

// Remove analytics and tracking
result = result.replace(/<script[\s\S]*?gtag[\s\S]*?<\/script>/gi, '');
result = result.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

// Remove redirect/detection scripts
result = result.replace(/<script>[\s\S]*?Mobile Redirect[\s\S]*?<\/script>/gi, '');
result = result.replace(/<script>[\s\S]*?window\.location\.href.*?<\/script>/gi, '');

console.log('✅ Removed external dependencies');

// Step 2: Add offline mode script before </head>
const offlineScript = `<script>
window.OFFLINE_MODE = true;
window.API_DISABLED = true;
console.log('%c📴 OFFLINE MODE ENABLED', 'color: #ff9800; font-size: 14px; font-weight: bold;');

// Firebase mock
window.firebase = {
  database: () => ({
    ref: () => ({
      on: () => {}, once: () => Promise.resolve({ val: () => null }),
      set: (d) => Promise.resolve(), update: (d) => Promise.resolve(), off: () => {}
    }),
    goOffline: () => {}, goOnline: () => {}
  }),
  auth: () => ({
    onAuthStateChanged: (cb) => {  cb(null); return () => {}; },
    signInAnonymously: () => Promise.resolve(),
    currentUser: null
  }),
  apps: []
};

window.telegramBotAPI = {
  sendMessage: async () => { console.log('📴 Telegram unavailable'); return {}; },
  getUpdates: async () => ({ ok: true, result: [] })
};

// Intercept fetch
const origFetch = window.fetch;
window.fetch = function(url) {
  const s = String(url);
  if (s.includes('http') || s.includes('api') || s.includes('firebase') || s.includes('telegram')) {
    console.log('📴 Blocked:', s);
    return Promise.resolve(new Response('{"error":"offline"}', {status: 200}));
  }
  return origFetch(...arguments);
};

console.log('%c✅ Offline mode ready', 'color: green; font-size: 12px;');
</script>`;

const headEnd = result.lastIndexOf('</head>');
if (headEnd > -1) {
  result = result.substring(0, headEnd) + offlineScript + result.substring(headEnd);
  console.log('✅ Added offline mode script');
}

// Step 3: Add banner after <body>
const banner = `<div id="offline-indicator" style="position:fixed;top:0;left:0;right:0;background:linear-gradient(90deg,#ff9800,#ffa500);color:#000;padding:12px 16px;text-align:center;font-weight:bold;z-index:10000;font-size:14px;box-shadow:0 3px 10px rgba(0,0,0,0.3)">📴 OFFLINE MODE • Все функции работают • Синхронизация отключена</div>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) document.body.style.marginTop = '56px';
  });
  window.addEventListener('load', () => {
    if (document.body) document.body.style.marginTop = '56px';
  });
</script>`;

const bodyStart = result.indexOf('<body');
const bodyEnd = result.indexOf('>', bodyStart);
if (bodyEnd > -1) {
  result = result.substring(0, bodyEnd + 1) + '\n' + banner + result.substring(bodyEnd + 1);
  console.log('✅ Added offline banner');
}

// Step 4: Write file
fs.writeFileSync('SuslovPA-Offline.html', result);
const size = fs.statSync('SuslovPA-Offline.html').size / (1024 * 1024);
console.log(`✅ Saved: SuslovPA-Offline.html (${size.toFixed(2)} MB)\n`);

console.log(`
✨ OFFLINE VERSION CREATED!

🚀 How to use:
1. Open SuslovPA-Offline.html in your browser
2. See orange banner at top
3. Use algorithm completely offline!

✅ Works offline:
   • Algorithm & calculations  
   • Theme switching
   • Data saving (localStorage)

❌ Doesn't work (no internet):
   • Sync/Firebase
   • Telegram notifications
   • Multi-user chat

Ready? Open the file now! 🎉
`);
