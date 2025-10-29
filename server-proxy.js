const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const app = express();

// Безопасность
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.telegram.org", "https://api.countapi.xyz"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS конфигурация
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://suslovpa.github.io',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://codepen.io',
      'https://codesandbox.io'
    ];
    
    // Разрешаем запросы без origin (мобильные приложения)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: {
    error: 'Слишком много запросов с этого IP'
  }
});

const telegramLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 запросов к Telegram API
  message: {
    error: 'Слишком много запросов к Telegram API'
  }
});

// Конфигурация (в продакшене использовать переменные окружения)
const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null, // ❌ ОШИБКА: Токен ОБЯЗАТЕЛЕН! Установите переменную окружения TELEGRAM_BOT_TOKEN
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '@noninput',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
};

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
  // В продакшене здесь должна быть настоящая проверка JWT токенов
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Для демо разрешаем все запросы
    return next();
  }
  next();
}

// Middleware для валидации origin
function validateOrigin(req, res, next) {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    return next(); // Разрешаем запросы без origin
  }
  
  const isAllowed = config.allowedOrigins.some(allowedOrigin => 
    origin.startsWith(allowedOrigin)
  );
  
  if (!isAllowed) {
    return res.status(403).json({
      error: 'Origin not allowed',
      origin: origin
    });
  }
  
  next();
}

// =================================
// TELEGRAM API ПРОКСИ
// =================================

// Безопасный прокси для Telegram API
app.post('/api/telegram/secure', telegramLimiter, requireAuth, validateOrigin, async (req, res) => {
  try {
    const { method, params, timestamp, origin } = req.body;
    
    // Валидация параметров
    if (!method || typeof method !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid method parameter'
      });
    }
    
    // Проверяем временную метку (защита от replay атак)
    const now = Date.now();
    if (!timestamp || Math.abs(now - timestamp) > 300000) { // 5 минут
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired timestamp'
      });
    }
    
    // Формируем URL для Telegram API
    const telegramUrl = `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;
    
    console.log(`📤 Прокси запрос к Telegram: ${method}`);
    
    // Выполняем запрос к Telegram API
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuslovPA-Proxy/1.0'
      },
      body: JSON.stringify(params),
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Telegram API ответ: ${data.ok ? 'успех' : 'ошибка'}`);
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('❌ Ошибка Telegram прокси:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Общий прокси для Telegram API
app.use('/api/telegram/:method', telegramLimiter, async (req, res) => {
  try {
    const { method } = req.params;
    const params = req.method === 'GET' ? req.query : req.body;
    
    const telegramUrl = `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    res.status(500).json({
      ok: false,
      error_code: 500,
      description: error.message
    });
  }
});

// =================================
// СЧЕТЧИКИ API ПРОКСИ
// =================================

// Безопасный прокси для API счетчиков
app.post('/api/counter/secure', apiLimiter, validateOrigin, async (req, res) => {
  try {
    const { apiUrl, action, timestamp, origin } = req.body;
    
    // Валидация параметров
    if (!apiUrl || typeof apiUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid apiUrl parameter'
      });
    }
    
    // Белый список разрешенных API
    const allowedAPIs = [
      'https://api.countapi.xyz',
      'https://api.counterapi.dev',
      'https://counter-api.dev',
      'https://httpbin.org',
      'https://api.github.com',
      'https://jsonplaceholder.typicode.com'
    ];
    
    const isAllowedAPI = allowedAPIs.some(allowed => apiUrl.startsWith(allowed));
    if (!isAllowedAPI) {
      return res.status(403).json({
        success: false,
        error: 'API URL not in whitelist'
      });
    }
    
    // Формируем конечный URL
    let finalUrl;
    if (apiUrl.includes('countapi.xyz')) {
      finalUrl = action === 'hit' ? 
        `${apiUrl}/hit/frequency-scanner/global` : 
        `${apiUrl}/get/frequency-scanner/global`;
    } else if (apiUrl.includes('counterapi.dev')) {
      finalUrl = action === 'hit' ? 
        `${apiUrl}/v1/frequency-scanner/global/up` : 
        `${apiUrl}/v1/frequency-scanner/global`;
    } else {
      finalUrl = `${apiUrl}/frequency-scanner/global`;
    }
    
    console.log(`📤 Прокси запрос к счетчику: ${action} → ${finalUrl}`);
    
    // Выполняем запрос
    const response = await fetch(finalUrl, {
      method: action === 'hit' ? 'POST' : 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SuslovPA-Proxy/1.0'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`API error: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Счетчик API ответ:`, data);
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('❌ Ошибка счетчика прокси:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Общий CORS прокси
app.use('/cors-proxy/*', apiLimiter, async (req, res) => {
  try {
    const targetUrl = req.url.replace('/cors-proxy/', '');
    
    if (!targetUrl.startsWith('http')) {
      return res.status(400).json({
        error: 'Invalid URL'
      });
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SuslovPA-Proxy/1.0'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// =================================
// АВТОРИЗАЦИЯ API
// =================================

// Получение токена для клиента (только для авторизованных)
app.get('/api/auth/telegram-token', requireAuth, (req, res) => {
  // В продакшене здесь должна быть проверка прав пользователя
  res.json({
    token: config.telegramBotToken,
    chatId: config.telegramChatId,
    expires: Date.now() + 3600000 // 1 час
  });
});

// =================================
// HEALTH CHECK
// =================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =================================
// ERROR HANDLERS
// =================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// =================================
// SERVER START
// =================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CORS прокси сервер запущен на порту ${PORT}`);
  console.log(`📋 Конфигурация:`);
  console.log(`   - Telegram Bot: ${config.telegramBotToken ? 'настроен' : 'НЕ настроен'}`);
  console.log(`   - Telegram Chat: ${config.telegramChatId}`);
  console.log(`   - Разрешенные origins: ${config.allowedOrigins.join(', ')}`);
  console.log(`   - Режим: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;