// Получение обновлений Telegram с поддержкой кэширования
// Этот эндпоинт безопасно получает новые сообщения из Telegram

let lastUpdateId = 0;
const messageCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' 
      });
    }

    // Получаем параметры запроса
    const { lastId = 0, limit = 100, timeout = 5 } = req.query;

    // Запрашиваем обновления с offset
    const offset = parseInt(lastId) + 1;
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?` +
      `offset=${offset}&limit=${limit}&allowed_updates=message`;

    console.log(`📨 Получение обновлений Telegram (offset=${offset})`);

    const response = await fetch(url, {
      method: 'GET',
      timeout: (timeout + 5) * 1000
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      console.warn('⚠️ Telegram API error:', data.description);
      return res.status(200).json({
        success: false,
        updates: [],
        error: data.description
      });
    }

    // Обновляем lastUpdateId
    if (data.result.length > 0) {
      lastUpdateId = data.result[data.result.length - 1].update_id;
      
      // Кэшируем сообщения
      for (const update of data.result) {
        if (update.message) {
          messageCache.set(update.update_id, {
            id: update.update_id,
            timestamp: update.message.date,
            from: {
              id: update.message.from.id,
              first_name: update.message.from.first_name,
              username: update.message.from.username
            },
            text: update.message.text || update.message.caption || '',
            chat: {
              id: update.message.chat.id,
              type: update.message.chat.type,
              title: update.message.chat.title
            }
          });
        }
      }
      
      console.log(`✅ Получено ${data.result.length} обновлений`);
    }

    // Возвращаем сообщения в удобном формате
    const messages = data.result
      .filter(u => u.message)
      .map(u => ({
        id: u.update_id,
        timestamp: u.message.date,
        from: {
          id: u.message.from.id,
          first_name: u.message.from.first_name,
          username: u.message.from.username
        },
        text: u.message.text || u.message.caption || '',
        chat: {
          id: u.message.chat.id,
          type: u.message.chat.type,
          title: u.message.chat.title
        }
      }));

    return res.status(200).json({
      success: true,
      updates: messages,
      lastId: lastUpdateId,
      count: messages.length
    });

  } catch (error) {
    console.error('❌ Ошибка при получении обновлений:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
