// Получение обновлений Telegram с поддержкой кэширования и истории
// Этот эндпоинт безопасно получает новые сообщения и полную историю из Telegram

let lastUpdateId = 0;
let allMessages = [];

// Хранилище для сохранения всех сообщений по группе
const messageStore = {
  '@noninput': []
};

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
    const { lastId = -1, limit = 100, timeout = 5, history = false } = req.query;

    // Если history=true, получаем ВСЮ доступную историю
    // Иначе получаем новые обновления начиная с offset
    let offset = 0;
    let finalLimit = parseInt(limit);
    
    if (history === 'true') {
      // Для истории запрашиваем со смещением 0 и большим limit
      offset = 0;
      finalLimit = 100;
      console.log(`📚 Получение полной истории сообщений Telegram`);
    } else {
      offset = parseInt(lastId) + 1;
      console.log(`📨 Получение новых обновлений Telegram (offset=${offset})`);
    }
    
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?` +
      `offset=${Math.max(0, offset)}&limit=${finalLimit}&allowed_updates=message`;

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
    }

    // Возвращаем сообщения в удобном формате
    // Фильтруем сообщения из канала @noninput (id: -1002360087823)
    const messages = data.result
      .filter(u => u.message && 
              (u.message.chat.username === 'noninput' || 
               u.message.chat.id === -1002360087823 ||
               u.message.chat.type === 'private'))
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
          title: u.message.chat.title,
          username: u.message.chat.username
        }
      }));

    // Если это запрос истории, добавляем сообщения в хранилище
    if (history === 'true') {
      allMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
      console.log(`📚 Загружена история: ${allMessages.length} сообщений`);
    } else {
      // Для новых обновлений добавляем их в историю
      messages.forEach(msg => {
        if (!allMessages.find(m => m.id === msg.id)) {
          allMessages.push(msg);
          allMessages.sort((a, b) => a.timestamp - b.timestamp);
          allMessages = allMessages.slice(-100); // Держим последние 100
        }
      });
    }

    // Возвращаем либо всю историю, либо новые сообщения
    const resultMessages = history === 'true' ? allMessages : messages;
    
    return res.status(200).json({
      success: true,
      updates: resultMessages,
      lastId: lastUpdateId,
      count: resultMessages.length,
      cached: allMessages.length
    });

  } catch (error) {
    console.error('❌ Ошибка при получении обновлений:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
