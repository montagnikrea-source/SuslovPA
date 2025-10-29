/**
 * API маршрут для безопасной передачи Telegram токена
 * 
 * ВАЖНО: Этот эндпоинт отправляет токен ТОЛЬКО при определенных условиях:
 * 1. Запрос должен быть от одного из разрешенных источников (referer)
 * 2. Можно добавить дополнительную проверку IP или других параметров
 * 3. Токен всегда берется из переменных окружения (TELEGRAM_BOT_TOKEN)
 * 
 * БЕЗОПАСНОСТЬ:
 * - Никогда не храните токен в коде!
 * - Используйте только переменные окружения
 * - Логируйте все попытки доступа
 * - Рассмотрите добавление rate limiting
 */

export default async function handler(request, response) {
  // Определяем разрешенные источники
  const allowedOrigins = [
    'https://pavell.vercel.app',
    'https://montagnikrea-source.github.io',
    'http://localhost:3000',
    'http://localhost:8000'
  ];
  
  // Получаем origin из заголовка запроса
  const origin = request.headers.origin || request.headers.referer || '';
  const isAllowedOrigin = allowedOrigins.some(allowed => origin.startsWith(allowed));
  
  // Устанавливаем CORS заголовки для безопасности
  // Разрешаем все допустимые источники вместо жесткого кодирования одного
  if (isAllowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', origin.match(/^https?:\/\/[^\/]+/)?.[0] || allowedOrigins[0]);
  } else {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Обработка preflight запроса
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  // Только GET запросы разрешены
  if (request.method !== 'GET') {
    return response.status(405).json({ 
      ok: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Проверяем что токен установлен в переменных окружения
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
      return response.status(500).json({ 
        ok: false, 
        error: 'Token not configured on server' 
      });
    }
    
    // Проверяем что это запрос с разрешенного источника
    if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Попытка доступа к токену с неизвестного источника:', origin);
      return response.status(403).json({ 
        ok: false, 
        error: 'Unauthorized origin' 
      });
    }
    
    // Логируем успешный доступ
    console.log('✅ Токен успешно отправлен клиенту от источника:', origin);
    
    // Отправляем токен клиенту
    response.status(200).json({ 
      ok: true, 
      token: token 
    });
    
  } catch (error) {
    console.error('🚨 Ошибка в маршруте /api/auth/telegram-token:', error);
    response.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    });
  }
}
