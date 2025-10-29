# 🚀 Инструкция: Развёртывание Telegram прокси на Vercel

## Проблема, которую мы решили:

❌ **CORS блокирует** все запросы к `api.telegram.org` из браузера на GitHub Pages  
✅ **Решение:** Backend прокси-сервер на Vercel перенаправляет запросы безопасно

---

## ⚙️ Пошаговая инструкция

### Шаг 1: Подготовка

1. **Убедитесь, что проект загружен на GitHub**
   ```bash
   cd /workspaces/SuslovPA
   git push origin gh-pages
   ```

2. **Файлы прокси уже в проекте:**
   - ✅ `/api/telegram.js` - Node.js функция
   - ✅ `/vercel.json` - конфигурация
   - ✅ `/.env.local` - переменные окружения

---

### Шаг 2: Регистрация на Vercel

1. Откройте [vercel.com](https://vercel.com)
2. Нажмите **"Sign Up"** → выберите **"GitHub"**
3. Авторизуйтесь в GitHub
4. Дайте Vercel доступ к вашему репозиторию

---

### Шаг 3: Импорт проекта в Vercel

1. На Vercel Dashboard нажмите **"New Project"**
2. Выберите репозиторий `montagnikrea-source/SuslovPA`
3. Нажмите **"Import"**

---

### Шаг 4: Конфигурация

1. **Framework Preset:** Выберите **"Other"** (это статический сайт)
2. **Environment Variables:** 
   - Добавьте переменную:
     - **Name**: `TELEGRAM_BOT_TOKEN`
     - **Value**: `REDACTED_FOR_SECURITY` (Замените на ваш реальный токен из @BotFather)
3. Нажмите **"Deploy"**

---

### Шаг 5: Получить URL прокси

После развёртывания:
1. Скопируйте URL вашего проекта Vercel (例: `https://suslvopa-chat-proxy.vercel.app`)
2. Откройте `/api/telegram` - должно быть сообщение об ошибке (это нормально)

---

### Шаг 6: Обновить конфигурацию в HTML

Откройте `noninput.html` и найдите строку:
```javascript
proxyUrl = 'https://suslvopa-chat-proxy.vercel.app/api/telegram';
```

**Замените на ваш URL Vercel:**
```javascript
proxyUrl = 'https://YOUR-VERCEL-URL.vercel.app/api/telegram';
```

Найдите эту строку в методе `sendTelegramRequest`:
```bash
grep -n "suslvopa-chat-proxy.vercel.app" noninput.html
```

Отредактируйте или используйте:
```bash
sed -i 's/suslvopa-chat-proxy.vercel.app/YOUR-VERCEL-URL/g' noninput.html
```

---

## ✅ Проверка работы

### 1. Откройте консоль браузера (F12)

### 2. Откройте страницу
```
https://montagnikrea-source.github.io/SuslovPA/noninput.html
```

### 3. Ищите в Console:
```
✅ Telegram ответ через прокси: успешно
```

или если ошибка:
```
⚠️ Telegram запрос ошибка: ...
```

### 4. Отправьте тестовое сообщение
- Введите сообщение в чат
- Проверьте канал `https://t.me/noninput`
- Должно появиться сообщение вида:
  ```
  💬 YourUsername (14:30):
  Your test message
  📱 Отправлено через Frequency Scanner
  ```

---

## 🔍 Отладка

### Проблема: "Cannot find module '@vercel/node'"

**Решение:**
```bash
npm install @vercel/node
git add package-lock.json
git commit -m "Install Vercel Node"
git push origin gh-pages
```

Затем пересоздайте проект на Vercel.

### Проблема: "Method not allowed"

**Решение:** Убедитесь, что отправляете POST запрос (не GET).

### Проблема: "TELEGRAM_BOT_TOKEN не определен"

**Решение:** 
1. В Vercel Dashboard → Settings → Environment Variables
2. Убедитесь, что переменная добавлена
3. Нажмите "Redeploy"

### Просмотр логов

На Vercel Dashboard:
1. Выберите проект
2. Перейдите в **"Logs"**
3. Отправьте тестовое сообщение
4. Посмотрите результат в логах

---

## 📊 Архитектура

```
GitHub Pages (noninput.html)
         ↓
   CORS блокирует ❌
         ↓
   Vercel прокси ✅
         ↓
   Telegram API ✅
         ↓
   Канал @noninput 🎉
```

---

## 🎯 Итог

После выполнения всех шагов:
- ✅ Telegram чат полностью работает
- ✅ Нет CORS ошибок
- ✅ Сообщения отправляются в реальный Telegram канал
- ✅ Бесплатно (Vercel free tier позволяет достаточно запросов)

**Готово! 🚀**
