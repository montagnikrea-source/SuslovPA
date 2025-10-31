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

module.exports = async function handler(request, response) {
  // Определяем допустимые источники и корректно выставляем CORS
  const allowedOrigins = [
    'https://montagnikrea-source.github.io/SuslovPA
    'https://montagnikrea-source.github.io',
    'http://localhost:3000',
    'http://localhost:8000'
  ];

  const reqOrigin = request.headers.origin || request.headers.referer || '';
  // Если origin присутствует и входит в allowed -> отражаем его в заголовке, иначе ставим '*'
  const acao = allowedOrigins.some(o => reqOrigin.startsWith(o)) && request.headers.origin ? request.headers.origin : '*';
  response.setHeader('Access-Control-Allow-Origin', acao);
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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
    const referer = request.headers.referer || '';
    const isAllowedOrigin = allowedOrigins.some(origin => referer.startsWith(origin));
    
    if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Попытка доступа к токену с неизвестного источника:', referer);
      return response.status(403).json({ 
        ok: false, 
        error: 'Unauthorized origin' 
      });
    }
    
    // Логируем успешный доступ
    console.log('✅ Токен успешно отправлен клиенту');
    
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
