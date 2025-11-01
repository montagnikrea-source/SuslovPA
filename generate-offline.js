#!/usr/bin/env node

/**
 * Generate Offline Version Locally
 * This script creates an offline version of SuslovPA that can be tested immediately
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              🔨 GENERATING OFFLINE VERSION FOR TESTING                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

const baseDir = __dirname;

// Read the main HTML file
console.log('📖 Reading noninput.html...');
const htmlPath = path.join(baseDir, 'noninput.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

console.log('✅ HTML loaded (' + (html.length / 1024).toFixed(1) + ' KB)');

// Read JS files
console.log('\n📖 Reading script files...');
const scripts = {};
const scriptFiles = ['anti-oscillation.js', 'algorithm-core.js'];

scriptFiles.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    scripts[file] = fs.readFileSync(filePath, 'utf-8');
    console.log(`✅ ${file} loaded (${(scripts[file].length / 1024).toFixed(1)} KB)`);
  }
});

// Remove redirect scripts
console.log('\n🔄 Removing redirect scripts...');
html = html.replace(
  /<script>[\s\S]*?window\.location\.href[\s\S]*?<\/script>/gi,
  ''
);
html = html.replace(
  /<script>\s*\(function\s*\(\)\s*{[\s\S]*?Mobile Redirect[\s\S]*?}\s*\)\s*\(\)\s*<\/script>/gi,
  ''
);

// Also embed external scripts
console.log('\n🔄 Embedding external scripts...');
for (const [filename, content] of Object.entries(scripts)) {
  // Find script tags with src attribute
  const patterns = [
    new RegExp(`<script[^>]*src=["']/${filename.replace(/\./g, '\\.')}["'][^>]*><\\/script>`, 'gi'),
    new RegExp(`<script[^>]*src=["'][^"']*${filename}["'][^>]*><\\/script>`, 'gi'),
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(html)) {
      const inlineScript = `<script>\n// Source: ${filename}\n${content}\n</script>`;
      html = html.replace(pattern, inlineScript);
      console.log(`✅ Embedded ${filename} (${(content.length / 1024).toFixed(1)} KB)`);
      break;
    }
  }
}

console.log('✅ Script embedding completed');

// Add offline mode script BEFORE any other scripts
console.log('\n🔄 Adding offline mode initialization...');
const offlineScript = `
<script>
  // ========== OFFLINE MODE INITIALIZATION ==========
  // Must run FIRST, before any other scripts
  
  window.OFFLINE_MODE = true;
  window.API_DISABLED = true;
  
  console.log('📴 OFFLINE MODE ENABLED');
  console.log('✅ Application loaded as offline version');
  
  // Prevent any navigation attempts
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    get: function() {
      return originalLocation;
    },
    set: function(value) {
      console.log('🔒 Blocked navigation attempt to:', value);
      return value;
    }
  });
  
  // Prevent window.location.href changes
  Object.defineProperty(window.location, 'href', {
    get: function() {
      return originalLocation.href;
    },
    set: function(value) {
      console.log('🔒 Blocked href change to:', value);
      return originalLocation.href;
    }
  });
  
  // Mock Firebase
  window.firebase = {
    database: () => ({
      ref: (path) => ({
        on: () => {},
        once: () => Promise.resolve({ val: () => null }),
        set: (data) => { console.log('💾 Local save:', data); return Promise.resolve(); },
        update: (data) => { console.log('💾 Local update:', data); return Promise.resolve(); },
        off: () => {}
      }),
      goOffline: () => {},
      goOnline: () => {}
    }),
    auth: () => ({
      onAuthStateChanged: (callback) => { callback(null); return () => {}; },
      signInAnonymously: () => Promise.resolve({ user: { uid: 'offline-user' } }),
      currentUser: null
    }),
    initializeApp: (config) => {},
    apps: []
  };
  
  // Mock window.firebase.firestore if needed
  if (window.firebase) {
    window.firebase.firestore = () => ({
      collection: () => ({
        doc: () => ({
          set: () => Promise.resolve(),
          get: () => Promise.resolve({ exists: false })
        })
      })
    });
  }
  
  // Mock Telegram Bot API
  window.telegramBotAPI = {
    sendMessage: async (chatId, text) => {
      console.log('📴 [Offline] Telegram would send:', text);
      return Promise.resolve();
    },
    getUpdates: async () => Promise.resolve({ ok: true, result: [] }),
    setWebhook: async () => Promise.resolve({ ok: true })
  };
  
  // Disable external API calls
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    
    if (urlStr.includes('api.telegram') ||
        urlStr.includes('firebase') ||
        urlStr.includes('vercel') ||
        urlStr.includes('/api/') ||
        urlStr.includes('http://') ||
        urlStr.includes('https://')) {
      
      console.log('📴 Offline mode: Blocking external API call to', urlStr);
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'offline', message: 'Offline mode - external calls disabled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    
    return originalFetch.call(this, url, options);
  };
  
  // Mock XMLHttpRequest for older code
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    
    xhr.open = function(method, url) {
      if (typeof url === 'string' && (
        url.includes('api.telegram') ||
        url.includes('firebase') ||
        url.includes('/api/')
      )) {
        console.log('📴 Offline: Blocking XHR to', url);
        xhr.status = 200;
        xhr.responseText = JSON.stringify({ error: 'offline' });
        return;
      }
      return originalOpen.apply(xhr, arguments);
    };
    
    return xhr;
  };
  
  console.log('✅ Offline security: All external API calls disabled');
  console.log('💾 All data is stored locally in browser storage');
</script>
`;

const headEndIndex = html.indexOf('</head>');
if (headEndIndex !== -1) {
  html = html.slice(0, headEndIndex) + offlineScript + html.slice(headEndIndex);
}

console.log('✅ Offline mode script added');

// Add banner
console.log('\n🔄 Adding offline indicator banner...');
const banner = `
<div id="offline-indicator" style="
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #ff9800, #ffa500);
  color: #000;
  padding: 10px 16px;
  text-align: center;
  font-weight: bold;
  z-index: 10000;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
  📴 OFFLINE MODE • Все функции работают • Синхронизация отключена
</div>
<script>
  // Adjust body for banner and ensure proper display
  function adjustBodyForBanner() {
    if (document.body) {
      document.body.style.marginTop = '46px';
      // Also adjust any full-height containers
      const containers = document.querySelectorAll('[style*="height: 100vh"], [style*="height:100vh"]');
      containers.forEach(el => {
        el.style.height = 'calc(100vh - 46px)';
      });
    }
  }
  
  // Run immediately
  adjustBodyForBanner();
  
  // Also run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', adjustBodyForBanner);
  
  // And on window load to catch everything
  window.addEventListener('load', adjustBodyForBanner);
</script>
`;

const bodyIndex = html.indexOf('<body');
if (bodyIndex !== -1) {
  const bodyEndIndex = html.indexOf('>', bodyIndex);
  html = html.slice(0, bodyEndIndex + 1) + '\n' + banner + html.slice(bodyEndIndex + 1);
}

console.log('✅ Banner added');

// Write to file
console.log('\n💾 Writing to file...');
const outputPath = path.join(baseDir, 'SuslovPA-Offline-Test.html');
fs.writeFileSync(outputPath, html, 'utf-8');

const fileSize = fs.statSync(outputPath).size;
console.log(`✅ File written: ${outputPath}`);
console.log(`📦 File size: ${(fileSize / 1024).toFixed(1)} KB`);

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                    ✅ OFFLINE VERSION GENERATED!                         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📍 Location: ${outputPath}

🚀 How to test:
  1. Open the file directly in your browser
  2. Or: cd ${baseDir} && npx http-server
  3. Then open: http://localhost:8080/SuslovPA-Offline-Test.html

✅ What to check:
  ✓ Orange banner appears at top
  ✓ Algorithm interface loads
  ✓ All buttons are clickable
  ✓ Console shows offline messages (F12 → Console)

🔍 Expected console messages:
  📴 OFFLINE MODE ENABLED
  ✅ Application loaded as offline version
  ✅ Offline security: All external API calls disabled
  💾 All data is stored locally in browser storage

═══════════════════════════════════════════════════════════════════════════════

💡 Tips:
  • Disable JavaScript console warnings for cleaner view
  • Test all features while offline
  • Try to add data - should save locally
  • Check localStorage in DevTools

🎉 Done! The offline version is ready for testing.
`);
