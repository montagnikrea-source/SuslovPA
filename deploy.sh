#!/bin/bash

# Скрипт развертывания для SuslovPA проекта
# Автор: GitHub Copilot

set -e

echo "🚀 Начинаем развертывание SuslovPA..."

# Проверка зависимостей
check_dependencies() {
    echo "📋 Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi
    
    echo "✅ Все зависимости установлены"
}

# Создание необходимых директорий
create_directories() {
    echo "📁 Создание директорий..."
    mkdir -p logs/nginx
    mkdir -p logs/app
    mkdir -p ssl
    mkdir -p html
    echo "✅ Директории созданы"
}

# Проверка конфигурации
check_config() {
    echo "⚙️  Проверка конфигурации..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo "⚠️  Файл .env не найден. Создаю из .env.example..."
            cp .env.example .env
            echo "🔧 Отредактируйте файл .env с вашими настройками:"
            echo "   - BOT_TOKEN: токен вашего Telegram бота"
            echo "   - ADMIN_CHAT_ID: ID чата администратора"
            echo "   - API_SECRET: секретный ключ для API"
            echo ""
            read -p "Нажмите Enter после редактирования .env файла..."
        else
            echo "❌ Файл .env.example не найден. Создайте .env файл с необходимыми переменными."
            exit 1
        fi
    fi
    
    # Проверка HTML файла
    if [ ! -f "html/index.html" ]; then
        echo "📄 Копирование HTML файла..."
        if [ -f "noninput.html" ]; then
            cp noninput.html html/index.html
            echo "✅ HTML файл скопирован"
        else
            echo "❌ Файл noninput.html не найден"
            exit 1
        fi
    fi
    
    echo "✅ Конфигурация проверена"
}

# Генерация SSL сертификатов для разработки
generate_ssl() {
    echo "🔐 Проверка SSL сертификатов..."
    
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        echo "🔧 Генерация самоподписанных SSL сертификатов для разработки..."
        
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=SuslovPA/OU=Development/CN=localhost"
        
        echo "⚠️  ВНИМАНИЕ: Созданы самоподписанные сертификаты для разработки!"
        echo "   Для продакшена используйте реальные SSL сертификаты (Let's Encrypt, etc.)"
        echo "✅ SSL сертификаты созданы"
    else
        echo "✅ SSL сертификаты найдены"
    fi
}

# Сборка и запуск контейнеров
deploy_containers() {
    echo "🐳 Сборка и запуск контейнеров..."
    
    # Остановка существующих контейнеров
    docker-compose down --remove-orphans
    
    # Сборка образов
    docker-compose build --no-cache
    
    # Запуск сервисов
    docker-compose up -d
    
    echo "✅ Контейнеры запущены"
}

# Проверка статуса
check_status() {
    echo "📊 Проверка статуса сервисов..."
    
    # Ждем запуска сервисов
    sleep 10
    
    # Проверка статуса контейнеров
    docker-compose ps
    
    # Проверка health check
    echo ""
    echo "🔍 Проверка health check..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost/health > /dev/null 2>&1; then
            echo "✅ Сервис доступен!"
            break
        fi
        
        echo "⏳ Попытка $attempt/$max_attempts - ожидание запуска сервиса..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ Сервис не отвечает после $max_attempts попыток"
        echo "📋 Логи для диагностики:"
        docker-compose logs --tail=20
        exit 1
    fi
}

# Показ информации о развертывании
show_info() {
    echo ""
    echo "🎉 Развертывание завершено успешно!"
    echo ""
    echo "📋 Информация о сервисе:"
    echo "   🌐 Веб-сайт: http://localhost (или https://localhost для SSL)"
    echo "   🔗 API прокси: http://localhost/api/"
    echo "   ❤️  Health check: http://localhost/health"
    echo ""
    echo "📚 Полезные команды:"
    echo "   docker-compose logs -f          # Просмотр логов"
    echo "   docker-compose restart          # Перезапуск сервисов"
    echo "   docker-compose down             # Остановка сервисов"
    echo "   docker-compose pull && docker-compose up -d  # Обновление"
    echo ""
    echo "📁 Структура файлов:"
    echo "   logs/nginx/   - логи Nginx"
    echo "   logs/app/     - логи приложения"
    echo "   ssl/          - SSL сертификаты"
    echo "   html/         - статические файлы"
    echo ""
}

# Главная функция
main() {
    check_dependencies
    create_directories
    check_config
    generate_ssl
    deploy_containers
    check_status
    show_info
}

# Обработка прерывания
trap 'echo "⚠️ Развертывание прервано пользователем"; exit 1' INT

# Запуск
main

echo "✅ Готово! Сервис запущен и готов к работе."