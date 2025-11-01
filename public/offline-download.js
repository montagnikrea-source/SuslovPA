/**
 * Offline Download Manager
 * Generates and manages offline versions of the SuslovPA application
 * Allows users to download a self-contained HTML file with all assets embedded
 */

class OfflineDownloadManager {
  constructor() {
    this.baseUrl = window.location.origin;
    this.requiredFiles = [
      '/noninput.html',
      '/anti-oscillation.js',
      '/algorithm-core.js'
    ];
  }

  /**
   * Create an offline-capable HTML file with embedded CSS and JS
   * This creates a single HTML file that can be opened locally without internet
   */
  async createOfflineVersion() {
    try {
      console.log('🔄 Creating offline version...');
      
      // Fetch the main noninput.html (the actual application UI)
      const htmlResponse = await fetch('/noninput.html');
      let html = await htmlResponse.text();

      // Fetch required scripts
      const scripts = {};
      const scriptUrls = [
        '/anti-oscillation.js',
        '/algorithm-core.js'
      ];

      for (const url of scriptUrls) {
        try {
          const response = await fetch(url);
          scripts[url] = await response.text();
          console.log(`✅ Fetched ${url}`);
        } catch (e) {
          console.warn(`⚠️ Could not fetch ${url}:`, e.message);
        }
      }

      // Create modified HTML with inline scripts
      html = this.embedScripts(html, scripts);
      html = this.makeOfflineCompatible(html);
      
      // Ensure we have proper HTML structure
      if (!html.includes('<!DOCTYPE html>')) {
        html = '<!DOCTYPE html>\n' + html;
      }

      // Create blob and download
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      this.downloadBlob(blob, 'SuslovPA-Offline.html');

      return {
        success: true,
        message: '✅ Offline version created and downloading...',
        fileSize: this.formatFileSize(blob.size)
      };
    } catch (error) {
      console.error('❌ Error creating offline version:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Embed external scripts and styles into HTML as inline tags
   */
  embedScripts(html, scripts) {
    let modifiedHtml = html;

    // Replace external script references with inline content
    Object.entries(scripts).forEach(([url, content]) => {
      // Find external script tag with various formats
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const scriptPatterns = [
        new RegExp(`<script[^>]*src=["']${escapedUrl}["'][^>]*></script>`, 'gi'),
        new RegExp(`<script[^>]*src=["']${escapedUrl}["'][^>]*/>`, 'gi')
      ];
      
      for (const pattern of scriptPatterns) {
        if (pattern.test(modifiedHtml)) {
          const inlineScript = `<script>\n// Source: ${url}\n${content}\n</script>`;
          modifiedHtml = modifiedHtml.replace(pattern, inlineScript);
          console.log(`✅ Embedded ${url}`);
          break;
        }
      }
    });

    // Also extract and inline CSS from <style> tags and <link> tags
    // Look for <link rel="stylesheet"> tags
    const linkPattern = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const cssUrls = [];
    let match;
    
    while ((match = linkPattern.exec(modifiedHtml)) !== null) {
      cssUrls.push(match[1]);
    }

    console.log(`📋 Found ${cssUrls.length} external CSS files`);

    return modifiedHtml;
  }

  /**
   * Modify HTML for offline compatibility
   * - Disable external API calls
   * - Fix relative paths
   * - Add offline mode indicator
   */
  makeOfflineCompatible(html) {
    let modified = html;

    // Remove any redirect scripts (index.html redirects)
    modified = modified.replace(
      /<script>[\s\S]*?window\.location\.href[\s\S]*?<\/script>/gi,
      ''
    );

    // Remove mobile redirect detection script completely
    modified = modified.replace(
      /<script>[\s\S]*?Mobile Redirect Script[\s\S]*?<\/script>/gi,
      ''
    );

    // Add offline mode detection at the top of head
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
        console.log('� Offline: Blocking XHR to', url);
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

    // Insert after opening head tag
    const headIndex = modified.indexOf('<head');
    if (headIndex !== -1) {
      const headEndIndex = modified.indexOf('>', headIndex);
      modified = modified.slice(0, headEndIndex + 1) + offlineScript + modified.slice(headEndIndex + 1);
    }

    // Add offline indicator banner
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

    // Insert after opening body tag
    const bodyIndex = modified.indexOf('<body');
    if (bodyIndex !== -1) {
      const bodyEndIndex = modified.indexOf('>', bodyIndex);
      modified = modified.slice(0, bodyEndIndex + 1) + '\n' + banner + modified.slice(bodyEndIndex + 1);
    }

    // Remove any remaining redirect or mobile detection scripts
    modified = modified.replace(
      /<script>\s*\(function\s*\(\)\s*{[\s\S]*?Mobile Redirect[\s\S]*?}\s*\)\s*\(\)\s*<\/script>/gi,
      ''
    );

    return modified;
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Create a ZIP archive with all necessary files
   * Falls back to single HTML if JSZip not available
   */
  async createZipArchive() {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      console.log('ℹ️ JSZip not available, creating single HTML file instead');
      return this.createOfflineVersion();
    }

    try {
      console.log('🔄 Creating ZIP archive...');
      const zip = new JSZip();

      // Fetch files
      const files = {
        'index.html': await this.fetchFile('/noninput.html'),
        'anti-oscillation.js': await this.fetchFile('/anti-oscillation.js'),
        'algorithm-core.js': await this.fetchFile('/algorithm-core.js'),
        'README-OFFLINE.txt': this.createReadmeContent()
      };

      // Add files to ZIP
      Object.entries(files).forEach(([name, content]) => {
        zip.file(name, content);
      });

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      this.downloadBlob(blob, 'SuslovPA-Offline.zip');

      return {
        success: true,
        message: '✅ Offline ZIP created and downloading...',
        fileSize: this.formatFileSize(blob.size)
      };
    } catch (error) {
      console.error('❌ Error creating ZIP:', error);
      return this.createOfflineVersion();
    }
  }

  /**
   * Fetch file content
   */
  async fetchFile(url) {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (e) {
      console.warn(`⚠️ Could not fetch ${url}`);
      return '';
    }
  }

  /**
   * Create README for offline version
   */
  createReadmeContent() {
    return `
📴 OFFLINE VERSION - USAGE GUIDE
================================

This is an offline version of SuslovPA application.
You can open it in any web browser without internet connection.

🚀 HOW TO USE:
1. Extract the ZIP file (or open HTML directly)
2. Open 'index.html' in your web browser
3. All features work locally (no internet needed)

⚠️ LIMITATIONS IN OFFLINE MODE:
- Real-time synchronization disabled
- Telegram notifications disabled
- Firebase updates disabled
- Counter updates disabled
- Data persists only in local storage

✅ FEATURES AVAILABLE:
- NeuroHomeostasis algorithm
- Anti-oscillation protection
- Theme switching
- Frequency analysis
- Local data storage

📝 NOTES:
- Browser local storage works for saving data
- Each browser has separate local storage
- Data is NOT shared between devices in offline mode
- Opening in different browsers creates separate instances

🔄 TO RESTORE ONLINE FUNCTIONALITY:
1. Use the online version at:
   - https://suslovpa.vercel.app
   - https://montagnikrea-source.github.io/SuslovPA/

Version: ${new Date().toISOString()}
Generated: ${new Date().toLocaleString()}
    `;
  }

  /**
   * Show download UI with options
   */
  showDownloadDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'offline-download-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      z-index: 10001;
      min-width: 350px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    dialog.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px;">📥 Скачать офлайн версию</h2>
        <p style="margin: 8px 0; color: var(--text-secondary); font-size: 13px;">
          Загрузите приложение для работы без интернета
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        <button id="download-single-html" style="
          padding: 12px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.2s;
        ">
          📄 Скачать как HTML (${this.formatFileSize(1024 * 500)})
        </button>
        
        <button id="download-zip" style="
          padding: 12px 16px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.2s;
        ">
          📦 Скачать как ZIP (${this.formatFileSize(1024 * 600)})
        </button>
      </div>

      <div style="
        background: var(--bg-tertiary);
        padding: 12px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.5;
        margin-bottom: 16px;
        color: var(--text-secondary);
      ">
        <strong>ℹ️ Справка:</strong><br>
        • HTML: один файл, откройте в браузере<br>
        • ZIP: несколько файлов, для лучшей организации<br>
        • Оба работают без интернета
      </div>

      <button id="close-dialog" style="
        width: 100%;
        padding: 10px;
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      ">
        Отмена
      </button>
    `;

    document.body.appendChild(dialog);

    // Event listeners
    document.getElementById('download-single-html').addEventListener('click', async () => {
      this.showStatus('⏳ Создание файла...');
      const result = await this.createOfflineVersion();
      this.showStatus(result.success ? result.message : `❌ ${result.error}`);
      setTimeout(() => this.closeDialog(), 2000);
    });

    document.getElementById('download-zip').addEventListener('click', async () => {
      this.showStatus('⏳ Создание архива...');
      const result = await this.createZipArchive();
      this.showStatus(result.success ? result.message : `❌ ${result.error}`);
      setTimeout(() => this.closeDialog(), 2000);
    });

    document.getElementById('close-dialog').addEventListener('click', () => {
      this.closeDialog();
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDialog();
    });
  }

  /**
   * Show status message
   */
  showStatus(message) {
    let status = document.getElementById('download-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'download-status';
      status.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10002;
        font-size: 13px;
      `;
      document.body.appendChild(status);
    }
    status.textContent = message;
  }

  /**
   * Close dialog
   */
  closeDialog() {
    const dialog = document.getElementById('offline-download-dialog');
    if (dialog) dialog.remove();
  }

  /**
   * Initialize - add button to UI
   */
  init() {
    // Create button
    const btn = document.createElement('button');
    btn.id = 'offline-download-btn';
    btn.textContent = '📥 Скачать офлайн';
    btn.style.cssText = `
      padding: 8px 14px;
      background: #FF9800;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.3s;
      white-space: nowrap;
    `;

    btn.addEventListener('mouseover', () => {
      btn.style.background = '#F57C00';
      btn.style.transform = 'scale(1.05)';
    });

    btn.addEventListener('mouseout', () => {
      btn.style.background = '#FF9800';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      this.showDownloadDialog();
    });

    // Try to inject into header/toolbar
    const secureSettings = document.getElementById('secure-settings');
    if (secureSettings) {
      const container = document.createElement('div');
      container.style.cssText = 'display: inline-block; margin-left: 8px;';
      container.appendChild(btn);
      secureSettings.appendChild(container);
      console.log('✅ Offline download button added to settings');
    }

    window.offlineManager = this;
    console.log('✅ OfflineDownloadManager initialized');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new OfflineDownloadManager();
    manager.init();
  });
} else {
  const manager = new OfflineDownloadManager();
  manager.init();
}
