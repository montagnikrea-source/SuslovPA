/**
 * Unified Telegram API Handler - All routes consolidated into single endpoint
 * Handles:
 * - GET /api/ → Health check  
 * - POST /api/telegram → Telegram proxy
 * - GET /api/telegram/updates → Telegram updates
 * - POST /api/telegram/secure → Secure Telegram proxy
 */

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const path = req.url || '';
  
  // ============================================================================
  // ROUTE 1: Health Check - GET /api/
  // ============================================================================
  if (path === '/' || path === '') {
    return res.status(200).json({ ok: true, message: 'API работает!' });
  }
  
  // ============================================================================
  // ROUTE 2: Telegram Proxy - POST /api/telegram
  // ============================================================================
  if (path === '/telegram' && req.method === 'POST') {
    try {
      const { method, params } = req.body;
      
      if (!method) {
        return res.status(400).json({ ok: false, error: 'method parameter required' });
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ ok: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' });
      }
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
      
      console.log(`[Telegram Proxy] ${method} → https://api.telegram.org/bot<redacted>/${method}`);
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SuslovPA-Telegram-Proxy/1.0'
        },
        body: JSON.stringify(params || {})
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log(`[Telegram Proxy] ✅ Success: ${method}`);
      } else {
        console.log(`[Telegram Proxy] ❌ Error: ${data.description}`);
      }
      
      return res.status(response.status).json(data);
      
    } catch (error) {
      console.error('[Telegram Proxy] Error:', error.message);
      return res.status(500).json({
        ok: false,
        error_code: 500,
        description: error.message
      });
    }
  }
  
  // ============================================================================
  // ROUTE 3: Telegram Updates - GET /api/telegram/updates
  // ============================================================================
  if ((path === '/telegram/updates' || path.startsWith('/telegram/updates?')) && req.method === 'GET') {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ 
          success: false, 
          error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' 
        });
      }
      
      // Parse query parameters
      const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
      const lastId = url.searchParams.get('lastId') || '-1';
      const limit = url.searchParams.get('limit') || '100';
      const timeout = url.searchParams.get('timeout') || '5';
      
      console.log(`[Telegram Updates] Fetching updates (limit=${limit})`);
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/getUpdates?` +
        `offset=0&limit=${limit}&allowed_updates=message`;
      
      const response = await fetch(telegramUrl, {
        method: 'GET',
        timeout: (parseInt(timeout) + 5) * 1000
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        console.error('[Telegram Updates] Error:', data.description);
      }
      
      return res.status(response.status).json(data);
      
    } catch (error) {
      console.error('[Telegram Updates] Error:', error.message);
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  }
  
  // ============================================================================
  // ROUTE 4: Telegram Secure - POST /api/telegram/secure
  // ============================================================================
  if (path === '/telegram/secure' && req.method === 'POST') {
    try {
      const { method, params } = req.body;
      
      // Whitelist of allowed methods for security
      const allowedMethods = [
        'getMe', 'getChat', 'getChatMember', 'getChatMembersCount',
        'sendMessage', 'sendPhoto', 'sendDocument', 'sendAudio',
        'sendVideo', 'sendVoice', 'sendVideoNote', 'sendMediaGroup',
        'forwardMessage', 'copyMessage', 'editMessageText', 'deleteMessage',
        'pinChatMessage', 'unpinChatMessage', 'leaveChat',
        'getUpdates', 'setWebhook', 'deleteWebhook'
      ];
      
      if (!allowedMethods.includes(method)) {
        return res.status(403).json({ 
          ok: false, 
          error: `Method "${method}" is not allowed for security reasons` 
        });
      }
      
      if (!method) {
        return res.status(400).json({ ok: false, error: 'method parameter required' });
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ ok: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' });
      }
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
      
      console.log(`[Telegram Secure] ${method} → https://api.telegram.org/bot<redacted>/${method}`);
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SuslovPA-Telegram-Secure/1.0'
        },
        body: JSON.stringify(params || {})
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log(`[Telegram Secure] ✅ Success: ${method}`);
      } else {
        console.log(`[Telegram Secure] ❌ Error: ${data.description}`);
      }
      
      return res.status(response.status).json(data);
      
    } catch (error) {
      console.error('[Telegram Secure] Error:', error.message);
      return res.status(500).json({
        ok: false,
        error_code: 500,
        description: error.message
      });
    }
  }
  
  // Default 404
  return res.status(404).json({ 
    error: 'Not found',
    path,
    method: req.method
  });
};
