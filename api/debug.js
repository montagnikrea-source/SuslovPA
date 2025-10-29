/**
 * Debug endpoint - Check environment and token status
 * GET /api/debug.js
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check if token exists
  const tokenExists = !!process.env.TELEGRAM_BOT_TOKEN;
  const tokenLength = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0;
  const tokenStart = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) : 'NOT_SET';
  
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      vercel_region: process.env.VERCEL_REGION,
    },
    telegram: {
      token_exists: tokenExists,
      token_length: tokenLength,
      token_prefix: tokenStart,
      test_call: 'Will attempt getMe()'
    }
  };
  
  // If token exists, try to call getMe()
  if (tokenExists) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      debug.telegram.getMe_result = data;
      debug.telegram.test_passed = data.ok === true;
      
    } catch (err) {
      debug.telegram.test_error = err.message;
    }
  }
  
  res.status(200).json(debug);
};
