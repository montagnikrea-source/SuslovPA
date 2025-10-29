module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Parse URL path
  const path = req.url || '';
  
  // Health check
  if (path === '/' || path === '') {
    return res.status(200).json({ ok: true, message: 'API работает!' });
  }
  
  // Route to Telegram proxy
  if (path.startsWith('/telegram')) {
    try {
      const proxyHandler = require('./proxy.js');
      return await proxyHandler(req, res);
    } catch (error) {
      console.error('Proxy error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Route to Telegram updates
  if (path.startsWith('/telegram/updates')) {
    try {
      const updatesHandler = require('./telegram/updates.js');
      return await updatesHandler(req, res);
    } catch (error) {
      console.error('Updates error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Route to Telegram secure
  if (path.startsWith('/telegram/secure')) {
    try {
      const secureHandler = require('./telegram/secure.js');
      return await secureHandler(req, res);
    } catch (error) {
      console.error('Secure error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(404).json({ error: 'Not found', path });
};
