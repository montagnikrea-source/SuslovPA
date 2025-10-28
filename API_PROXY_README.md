# Telegram Bot Proxy для SuslovPA Chat

Этот backend прокси-сервер обходит CORS ограничения браузера и позволяет отправлять сообщения в Telegram из веб-приложения на GitHub Pages.

## 🚀 Развёртывание на Vercel

### 1. Создайте аккаунт на Vercel
- Перейдите на [vercel.com](https://vercel.com)
- Зарегистрируйтесь или войдите через GitHub

### 2. Импортируйте проект
```bash
vercel link
```

### 3. Установите переменные окружения
В Vercel Dashboard:
1. Перейдите в Settings → Environment Variables
2. Добавьте переменную:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `8223995698:AAFAsZsKgoBo8ews88ug64r418WqQP8i29I`

### 4. Разверните
```bash
vercel deploy --prod
```

Копируйте URL вашего Vercel приложения (например: `https://your-project.vercel.app`).

## 🔧 Локальное тестирование

### 1. Установите зависимости
```bash
npm install
```

### 2. Запустите локальный сервер Vercel
```bash
vercel dev
```

Сервер запустится на `http://localhost:3000`.

### 3. Откройте `noninput.html` локально
```bash
# В браузере откройте
http://localhost:5500/noninput.html
# (если используете Live Server расширение VS Code)
```

## 📝 Использование API

### Отправить сообщение в Telegram

**Request:**
```bash
POST /api/telegram

{
  "method": "sendMessage",
  "params": {
    "chat_id": "@noninput",
    "text": "Hello from web!",
    "parse_mode": "HTML"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "message_id": 12345,
    "chat": { "id": -1002360087823, "type": "channel" },
    "text": "Hello from web!"
  }
}
```

### Получить информацию о боте

**Request:**
```bash
POST /api/telegram

{
  "method": "getMe",
  "params": {}
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "id": 8223995698,
    "is_bot": true,
    "first_name": "noninput_bot",
    "username": "noninput_bot"
  }
}
```

## 🔐 Безопасность

⚠️ **ВАЖНО:**
- Токен хранится в переменных окружения Vercel (НЕ в коде)
- API включает CORS для всех источников
- Добавьте аутентификацию в production!

## 🐛 Отладка

### Проверить логи Vercel
```bash
vercel logs
```

### Локальные логи
```bash
vercel dev  # Показывает запросы в консоли
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте переменные окружения в Vercel
2. Убедитесь, что токен правильный
3. Проверьте логи: `vercel logs`
4. Убедитесь, что бот добавлен в канал `@noninput` как админ
