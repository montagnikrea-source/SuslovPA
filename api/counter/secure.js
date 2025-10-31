/**
 * Vercel API Route - Secure Counter Proxy
 * Проксирует публичные счётчики (CountAPI, CounterAPI) с сервера, обходя CORS.
 * Body: { apiUrl: string, action: 'get' | 'hit' }
 */

const ALLOWED_HOSTS = [
  'api.countapi.xyz',
  'api.counterapi.dev',
  'counter-api.dev'
];

function isAllowedUrl(urlString) {
  try {
    const u = new URL(urlString);
    return (u.protocol === 'https:') && ALLOWED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

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
    const { apiUrl, action } = req.body || {};

    if (!apiUrl || !action) {
      return res.status(400).json({ success: false, error: 'apiUrl and action are required' });
    }

    if (!isAllowedUrl(apiUrl)) {
      return res.status(400).json({ success: false, error: 'apiUrl is not allowed' });
    }

    const u = new URL(apiUrl);
    const host = u.hostname;

    // Выбираем endpoint по сервису
    let url;
    if (host === 'api.countapi.xyz') {
      url = action === 'hit'
        ? `${apiUrl}/hit/frequency-scanner/global`
        : `${apiUrl}/get/frequency-scanner/global`;
    } else if (host === 'api.counterapi.dev') {
      url = action === 'hit'
        ? `${apiUrl}/v1/frequency-scanner/global/up`
        : `${apiUrl}/v1/frequency-scanner/global`;
    } else if (host === 'counter-api.dev') {
      url = action === 'hit'
        ? `${apiUrl}/api/frequency-scanner/global/increment`
        : `${apiUrl}/api/frequency-scanner/global`;
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported counter host' });
    }

    console.log(`[Counter Secure] ${action} → ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const counterRes = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    }).catch(async (err) => {
      // Для некоторых сервисов инкремент требует POST — повторим запрос
      if (action === 'hit') {
        return fetch(url, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          signal: controller.signal
        });
      }
      throw err;
    });

    clearTimeout(timeoutId);

    if (!counterRes || !counterRes.ok) {
      const status = counterRes?.status || 502;
      const text = counterRes ? await counterRes.text().catch(() => '') : '';
      return res.status(status).json({ success: false, error: 'Counter API error', details: text });
    }

    let data;
    try {
      data = await counterRes.json();
    } catch {
      // Некоторые сервисы могут вернуть текст — завернём как есть
      const text = await counterRes.text().catch(() => '');
      data = { raw: text };
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[Counter Secure] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
