# Руководство по развертыванию SuslovPA

## 🚀 Быстрый старт

### Автоматическое развертывание

```bash
# Клонирование репозитория
git clone <your-repo-url>
cd SuslovPA

# Запуск автоматического развертывания
./deploy.sh
```

### Ручное развертывание

1. **Подготовка окружения**
```bash
# Создание необходимых директорий
mkdir -p logs/nginx logs/app ssl html

# Копирование конфигурационного файла
cp .env.example .env
```

2. **Настройка переменных окружения**
Отредактируйте файл `.env`:
```env
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_CHAT_ID=your_admin_chat_id_here
API_SECRET=your_api_secret_key_here
```

3. **Подготовка HTML**
```bash
cp noninput.html html/index.html
```

4. **Генерация SSL сертификатов (для разработки)**
```bash
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=SuslovPA/OU=Development/CN=localhost"
```

5. **Запуск сервисов**
```bash
docker-compose up -d
```

## 📋 Структура проекта

```
SuslovPA/
├── docker-compose.yml      # Конфигурация Docker Compose
├── Dockerfile             # Образ Node.js приложения
├── nginx.conf             # Конфигурация Nginx
├── server-proxy.js        # CORS прокси сервер
├── package.json           # Зависимости Node.js
├── deploy.sh              # Скрипт автоматического развертывания
├── .env.example           # Пример переменных окружения
├── .env                   # Переменные окружения (создается пользователем)
├── noninput.html          # Основное приложение
├── html/                  # Статические файлы для Nginx
│   └── index.html         # Главная страница
├── ssl/                   # SSL сертификаты
│   ├── cert.pem
│   └── key.pem
├── logs/                  # Логи
│   ├── nginx/
│   └── app/
└── docs/                  # Документация
    ├── CORS_SECURITY_FIXES.md
    └── DEPLOYMENT.md
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|-------------|
| `BOT_TOKEN` | Токен Telegram бота | ✅ |
| `ADMIN_CHAT_ID` | ID чата администратора | ✅ |
| `API_SECRET` | Секретный ключ для API | ✅ |
| `NODE_ENV` | Окружение (production/development) | ❌ |
| `PORT` | Порт приложения (по умолчанию 3001) | ❌ |
| `RATE_LIMIT_WINDOW_MS` | Окно лимита запросов (мс) | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Максимум запросов в окне | ❌ |

### Порты

- **80** - HTTP (редирект на HTTPS)
- **443** - HTTPS (основной трафик)
- **3001** - Node.js приложение (внутренний)

## 🔐 Безопасность

### Реализованные меры безопасности

1. **HTTPS принудительный редирект**
2. **HSTS заголовки**
3. **Content Security Policy**
4. **Rate limiting**
5. **Защита от XSS и CSRF**
6. **Валидация входных данных**
7. **Безопасное хранение токенов**

### Рекомендации для продакшена

1. **Используйте реальные SSL сертификаты**
   - Let's Encrypt (бесплатно)
   - Коммерческие сертификаты

2. **Настройте домен**
   - Обновите `server_name` в nginx.conf
   - Настройте DNS записи

3. **Мониторинг**
   - Настройте логирование
   - Используйте системы мониторинга (Prometheus, Grafana)

4. **Резервное копирование**
   - Регулярные бэкапы конфигурации
   - Бэкап переменных окружения

## 🛠️ Управление сервисами

### Основные команды

```bash
# Запуск сервисов
docker-compose up -d

# Остановка сервисов
docker-compose down

# Перезапуск сервисов
docker-compose restart

# Просмотр логов
docker-compose logs -f

# Просмотр статуса
docker-compose ps

# Обновление образов
docker-compose pull
docker-compose up -d
```

### Мониторинг

```bash
# Проверка health check
curl http://localhost/health

# Просмотр метрик
curl http://localhost/api/metrics

# Проверка логов Nginx
tail -f logs/nginx/access.log

# Проверка логов приложения
tail -f logs/app/app.log
```

## 🔍 Диагностика проблем

### Общие проблемы

1. **Сервис не отвечает**
   ```bash
   # Проверка статуса контейнеров
   docker-compose ps
   
   # Просмотр логов
   docker-compose logs cors-proxy
   docker-compose logs nginx
   ```

2. **CORS ошибки**
   - Проверьте конфигурацию Nginx
   - Убедитесь что прокси работает
   - Проверьте переменные окружения

3. **SSL проблемы**
   - Проверьте сертификаты в ssl/
   - Для продакшена используйте реальные сертификаты

4. **Rate limiting**
   - Проверьте настройки в .env
   - Увеличьте лимиты при необходимости

### Логи

- **Nginx**: `logs/nginx/access.log`, `logs/nginx/error.log`
- **Приложение**: `logs/app/app.log`
- **Docker**: `docker-compose logs`

## 📈 Производительность

### Оптимизация

1. **Nginx**
   - Включено gzip сжатие
   - Кэширование статических файлов
   - Keep-alive соединения

2. **Node.js**
   - Rate limiting
   - Efficient memory usage
   - Connection pooling

3. **Docker**
   - Multi-stage builds
   - Минимальные образы
   - Health checks

### Мониторинг производительности

```bash
# Использование ресурсов
docker stats

# Проверка соединений
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## 🔄 Обновления

### Обновление приложения

1. **Остановка сервисов**
   ```bash
   docker-compose down
   ```

2. **Обновление кода**
   ```bash
   git pull origin main
   ```

3. **Пересборка и запуск**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Откат изменений

```bash
# Откат к предыдущей версии
git checkout HEAD~1

# Пересборка
docker-compose build --no-cache
docker-compose up -d
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи
2. Убедитесь в правильности конфигурации
3. Проверьте переменные окружения
4. Используйте health check endpoints

Для получения помощи создайте issue с:
- Описанием проблемы
- Логами ошибок
- Конфигурацией (без секретных данных)
- Шагами для воспроизведения