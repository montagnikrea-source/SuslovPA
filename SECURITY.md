# 🔒 РУКОВОДСТВО ПО БЕЗОПАСНОСТИ САЙТА

## Документирование мер безопасности SuslovPA

Дата: October 28, 2025
Версия: 1.0

---

## 📋 ТАБЛИЦА СОДЕРЖАНИЯ

1. [Защита от взлома](#защита-от-взлома)
2. [Защита от утечки кода](#защита-от-утечки-кода)
3. [Защита от XSS](#защита-от-xss)
4. [Мониторинг безопасности](#мониторинг-безопасности)
5. [Best Practices](#best-practices)
6. [Инцидент-менеджмент](#инцидент-менеджмент)

---

## 🛡️ ЗАЩИТА ОТ ВЗЛОМА

### 1. Content Security Policy (CSP)

**Файл:** `noninput.html` (meta tag)

**Конфигурация:**
```
default-src 'self' 'unsafe-inline' 'unsafe-eval'
connect-src: Ограничен белым списком доменов
script-src: Только одобренные источники
style-src: Локальные стили + Google
```

**Защита от:**
- ✅ Инъекции вредоносного кода
- ✅ Загрузка неверифицированных скриптов
- ✅ Man-in-the-Middle атаки

### 2. HTTPS + Vercel SSL

**Статус:** Обязательный на всех страницах

**Преимущества:**
- ✅ Шифрование данных в пути
- ✅ Автоматическое обновление сертификата
- ✅ HSTS заголовки

### 3. robots.txt + Security Headers

**Файл:** `/robots.txt`

**Защита:**
- ✅ Контроль доступа поисковиков
- ✅ Предотвращение индексации приватных данных
- ✅ Правила Crawl-delay

---

## 🔐 ЗАЩИТА ОТ УТЕЧКИ КОДА

### 1. DevTools Blocker

**Механизм:** Обнаружение открытого инспектора

**Как работает:**
```javascript
if (window.outerHeight - window.innerHeight > 160) {
  // DevTools открыты!
  debugger; // Попытка остановить выполнение
  console.clear();
}
```

**Ограничения:**
- ⚠️ Может быть обойдено опытным пользователем
- ✅ Достаточно для стандартного скопирования

### 2. Right-click Blocker

**Отключено:** Контекстное меню (правая кнопка)

```javascript
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

**Защита от:**
- ❌ "Сохранить как" / "Просмотр кода"
- ✅ Базовая защита от случайного копирования

### 3. Горячие клавиши Blocker

**Заблокированные комбинации:**
- F12 - DevTools
- Ctrl+Shift+I - Developer Inspector
- Ctrl+Shift+C - Element Inspector
- Ctrl+Shift+J - Console
- Ctrl+Shift+K - Console (Alt)
- Ctrl+S - Save Page
- Ctrl+U - View Source

### 4. Выделение текста - Selective

**Политика:** Зависит от класса элемента

```javascript
if (e.target.className.includes('protected')) {
  e.preventDefault(); // Запрещить выделение
}
```

---

## 🚫 ЗАЩИТА ОТ XSS

### 1. HTML Escaping

**Функция:** `window.escapeHtml()`

```javascript
// Преобразует опасные символы
'<script>' → '&lt;script&gt;'
```

**Использование:** Все данные из пользователя

### 2. localStorage Sanitation

**Проверка:** При загрузке приложения

```javascript
// Удаляет подозрительные ключи
if (key.match(/script|eval|function|constructor/gi)) {
  localStorage.removeItem(key);
}
```

### 3. Event Handler Protection

**Механизм:** Перехват опасных событий

```javascript
window.addEventListener('error', (e) => {
  if (e.message.includes('eval')) {
    console.error('🚨 ОБНАРУЖЕНА ПОПЫТКА ИНЪЕКЦИИ КОДА');
  }
});
```

---

## 📊 МОНИТОРИНГ БЕЗОПАСНОСТИ

### 1. Console Logging

**При запуске приложения:**
```
✅ СИСТЕМА ЗАЩИТЫ АКТИВИРОВАНА
Защита от:
  • Копирования исходного кода
  • Доступа через DevTools
  • XSS атак и инъекций
  • Несанкционированного доступа
```

### 2. Event Logging

**Логируются события:**
- ✅ Попытки открыть DevTools
- ✅ Попытки выделить защищенный текст
- ✅ Попытки нажать запрещенные клавиши
- ✅ Попытки инъекции кода

### 3. Security Headers

**Автоматически отправляются Vercel:**

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
```

---

## 💡 BEST PRACTICES

### 1. Переменные окружения

**НИКОГДА:**
```javascript
❌ const token = 'YOUR_TOKEN_HERE'; // Видно в коде
❌ fetch(url + token); // Логируется в Network
```

**ВСЕГДА:**
```javascript
✅ const token = process.env.TELEGRAM_BOT_TOKEN; // Server-only
✅ fetch('/api/telegram', {method: 'POST'}); // Proxy на сервер
```

### 2. Чувствительные данные

**Никогда не хранить в:**
- ❌ HTML коде
- ❌ JavaScript переменных
- ❌ localStorage
- ❌ sessionStorage

**Хранить только в:**
- ✅ Vercel Environment Variables
- ✅ Серверные функции (serverless)
- ✅ HTTPS запросы

### 3. API Endpoints

**Защита:**
```javascript
// ✅ На сервере (api/telegram.js)
const token = process.env.TELEGRAM_BOT_TOKEN;
const response = await fetch(`https://api.telegram.org/bot${token}/...`);

// ❌ На клиенте (никогда!)
// const token = 'YOUR_TOKEN'; // ОПАСНО!
```

### 4. Validation & Sanitization

**Все входные данные:**
```javascript
// ✅ Проверяем тип
if (typeof input !== 'string') return;

// ✅ Проверяем длину
if (input.length > 4096) return;

// ✅ Санитизируем HTML
const safe = escapeHtml(input);
```

### 5. CORS Configuration

**Настроено в vercel.json:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {"key": "Access-Control-Allow-Credentials", "value": "true"},
        {"key": "Access-Control-Allow-Origin", "value": "*"},
        {"key": "Access-Control-Allow-Methods", "value": "GET,POST"}
      ]
    }
  ]
}
```

---

## 🚨 ИНЦИДЕНТ-МЕНЕДЖМЕНТ

### Если заметили нарушение безопасности:

1. **Немедленные действия:**
   ```bash
   # Регенерируем токены
   git remote set-url origin [NEW_URL]
   
   # Проверяем логи
   git log --oneline --all
   
   # Пересоздаем секреты в Vercel
   ```

2. **Уведомление:**
   - 📧 Email администратору
   - 🔔 Webhook на Discord/Slack
   - 📝 Issue на GitHub

3. **Анализ:**
   - 🔍 Проверка Access Logs
   - 🔐 Аудит изменений
   - 📋 Документирование инцидента

### Шаг за шагом реакция на утечку:

```bash
# 1. ОСТАНОВИТЬ компрометацию
git log --grep="token" # Найти коммиты с токеном
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch ./api/telegram.js' \
  -- --all

# 2. PURGE историю GitHub
git push --force-with-lease origin main

# 3. ROTATE токены
# На https://t.me/BotFather
# /mybots → @YourBot → Edit → Revoke current token

# 4. UPDATE окружение Vercel
vercel env add TELEGRAM_BOT_TOKEN [NEW_TOKEN]

# 5. VERIFY изменения
git log --grep="secret\|token\|password"
```

---

## 📈 SECURITY CHECKLIST

### Перед каждым деплою:

- [ ] Нет токенов в коде
- [ ] Нет паролей в коде
- [ ] Все секреты в Vercel Environment Variables
- [ ] CSP заголовок правильный
- [ ] HTTPS включен
- [ ] robots.txt актуален
- [ ] Нет debug кода
- [ ] Нет console.log() с данными

### Еженедельно:

- [ ] Проверить Access Logs
- [ ] Проверить GitHub Activity
- [ ] Обновить зависимости
- [ ] Проверить CVE (Common Vulnerabilities)

### Ежемесячно:

- [ ] Провести security audit
- [ ] Обновить документацию
- [ ] Ротация ключей
- [ ] Резервное копирование

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

**OWASP Top 10:** https://owasp.org/www-project-top-ten/

**CSP Справочник:** https://content-security-policy.com/

**Vercel Security:** https://vercel.com/security

**GitHub Security:** https://github.com/settings/security

---

## 📞 КОНТАКТЫ БЕЗОПАСНОСТИ

**Если вы нашли уязвимость:**

1. **НЕ** создавайте публичный Issue
2. **НЕ** делитесь подробностями в соцсетях
3. **СВЯЖИТЕСЬ** с администратором приватно
4. Дайте время на исправление (обычно 48 часов)

---

## 📄 ВЕРСИЯ И ИСТОРИЯ

| Дата | Версия | Изменения |
|------|--------|-----------|
| 28.10.2025 | 1.0 | Первая версия документации |
| | | Добавлена защита от DevTools |
| | | Добавлена защита от XSS |
| | | Добавлены Best Practices |

---

**Документ подготовлен:** GitHub Copilot
**Статус:** Активный
**Последнее обновление:** October 28, 2025
