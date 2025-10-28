/**
 * Vercel API Route - Telegram Bot Proxy
 * Обходит CORS ограничения путём перенаправления запросов через сервер
 * 
 * Использование:
 * POST /api/telegram?method=sendMessage
 * Body: { chat_id: "@noninput", text: "message" }
 */

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  
  try {
    const { method, params } = req.body;
    
    if (!method) {
      return res.status(400).json({ ok: false, error: 'method parameter required' });
    }
    
    // Получаем токен из переменной окружения или используем fallback
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8223995698:AAFAsZsKgoBo8ews88ug64r418WqQP8i29I';
    
    // Формируем URL для Telegram API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
    
    console.log(`[Telegram Proxy] ${method} to ${telegramUrl}`);
    
    // Делаем запрос к Telegram API
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuslovPA-Telegram-Proxy/1.0'
      },
      body: JSON.stringify(params || {}),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await response.json();
    
    // Логируем результат
    if (data.ok) {
      console.log(`[Telegram Proxy] ✅ Success: ${method}`);
    } else {
      console.log(`[Telegram Proxy] ❌ Error: ${data.description}`);
    }
    
    // Возвращаем ответ с CORS заголовками
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
