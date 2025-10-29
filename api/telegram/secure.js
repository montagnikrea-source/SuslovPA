/**
 * Vercel API Route - Secure Telegram Bot Proxy
 * Только серверный доступ к Telegram Bot API. Токен берётся из env.
 * Body: { method: 'sendMessage' | 'getMe' | ..., params: {...} }
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { method, params } = req.body || {};

    if (!method) {
      return res.status(400).json({ success: false, error: 'method is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ success: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' });
    }

    // Минимальный whitelist методов для безопасности
    const allowedMethods = new Set([
      'getMe',
      'sendMessage',
      'sendPhoto',
      'sendDocument',
      'sendAudio',
      'sendVideo',
      'sendMediaGroup',
      'sendChatAction'
    ]);

    if (!allowedMethods.has(method)) {
      return res.status(400).json({ success: false, error: `Method ${method} is not allowed` });
    }

    // Отправляем запрос к Telegram API
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    console.log(`[Telegram Secure] ${method} → https://api.telegram.org/bot<redacted>/${method}`);

    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
      signal: AbortSignal.timeout(10000)
    });

    const data = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok) {
      return res.status(tgRes.status).json({ success: false, error: data?.description || 'Telegram API error', data });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[Telegram Secure] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
