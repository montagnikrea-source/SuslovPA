// Получение обновлений Telegram с поддержкой кэширования и истории
// Этот эндпоинт безопасно получает новые сообщения и полную историю из Telegram
// ВАЖНО: Telegram Bot API getUpdates() возвращает только новые сообщения!
// Мы сохраняем ВСЕ сообщения в памяти для истории

let lastUpdateId = 0;
let allMessages = [];
let lastKnownOffset = 0;

// Хранилище для сохранения всех сообщений по группе
const messageStore = {
  '@noninput': []
};

module.exports = async function handler(req, res) {
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

    // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Всегда получаем с lastKnownOffset
    // Это позволяет аккумулировать ВСЕ сообщения, а не только новые
    let offset = lastKnownOffset; // Начинаем с последнего известного offset
    let finalLimit = parseInt(limit);
    
    console.log(`� Получение сообщений (offset=${offset}, limit=${finalLimit})`);
    
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
        error: data.description,
        cached: allMessages.length
      });
    }

    // Обновляем lastUpdateId и lastKnownOffset
    if (data.result.length > 0) {
      lastUpdateId = data.result[data.result.length - 1].update_id;
      lastKnownOffset = lastUpdateId + 1; // Следующий offset
      console.log(`✅ Обновлен lastKnownOffset = ${lastKnownOffset}`);
    }

    // Фильтруем сообщения из канала @noninput (id: -1002360087823)
    const newMessages = data.result
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

    // Добавляем новые сообщения в историю (дедублируем по ID)
    if (newMessages.length > 0) {
      newMessages.forEach(msg => {
        if (!allMessages.find(m => m.id === msg.id)) {
          allMessages.push(msg);
          console.log(`➕ Добавлено сообщение ID ${msg.id}: ${msg.text.substring(0, 50)}...`);
        }
      });
      
      // Сортируем по времени
      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Хранимем все сообщения (не обрезаем!)
      // Но ограничиваем до 500 для памяти
      if (allMessages.length > 500) {
        allMessages = allMessages.slice(-500);
        console.log(`⚠️ Обрезали до 500 последних сообщений`);
      }
      
      console.log(`📚 Всего в истории: ${allMessages.length} сообщений`);
    }

    // Возвращаем результат
    const result = {
      success: true,
      updates: allMessages, // Возвращаем ВСЕ накопленные сообщения
      lastId: lastUpdateId,
      count: allMessages.length,
      cached: allMessages.length,
      offset: lastKnownOffset
    };
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Ошибка при получении обновлений:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};