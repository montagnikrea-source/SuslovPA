#!/bin/bash

# 🧪 Скрипт для тестирования синхронизации Telegram чата
# Используйте: bash test_telegram_sync.sh

SITE_URL="https://pavell.vercel.app"
API_BASE="$SITE_URL/api"
CHANNEL="@noninput"

echo "═══════════════════════════════════════════════════════════════"
echo "🧪 Тестирование синхронизации Telegram чата"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Тест 1: Проверка API доступности
echo "1️⃣ Проверка доступности API эндпоинтов..."
echo "   GET $API_BASE/telegram/updates"

response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/telegram/updates?limit=10")

if [ "$response" == "200" ]; then
    echo "   ✅ API доступен (статус: $response)"
else
    echo "   ❌ API недоступен (статус: $response)"
fi

echo ""

# Тест 2: Получение истории сообщений
echo "2️⃣ Получение истории сообщений..."
echo "   GET $API_BASE/telegram/updates?limit=50"

history=$(curl -s "$API_BASE/telegram/updates?limit=50")
count=$(echo "$history" | grep -o '"id"' | wc -l)

if [ "$count" -gt 0 ]; then
    echo "   ✅ Получено $count сообщений"
    echo "   Пример последнего сообщения:"
    echo "$history" | tail -200 | head -20
else
    echo "   ℹ️ История пуста или API ошибка"
    echo "$history"
fi

echo ""

# Тест 3: Проверка токена
echo "3️⃣ Проверка получения токена..."
echo "   GET $SITE_URL/api/auth/telegram-token"

token_response=$(curl -s "$SITE_URL/api/auth/telegram-token")

if echo "$token_response" | grep -q '"token"'; then
    echo "   ✅ Токен получен"
else
    echo "   ❌ Токен не получен"
    echo "$token_response"
fi

echo ""

# Тест 4: Отправка тестового сообщения
echo "4️⃣ Попытка отправки тестового сообщения..."

timestamp=$(date +%s%N | cut -b1-13)
message="🧪 Тест синхронизации - $(date +'%H:%M:%S')"

send_response=$(curl -s -X POST "$API_BASE/telegram" \
  -H "Content-Type: application/json" \
  -d "{\"method\":\"sendMessage\",\"params\":{\"chat_id\":\"$CHANNEL\",\"text\":\"$message\"}}")

if echo "$send_response" | grep -q '"ok":true'; then
    echo "   ✅ Сообщение отправлено"
    echo "   Message: $message"
    
    # Небольшая задержка для обработки
    echo "   ⏳ Ожидание 3 секунды..."
    sleep 3
    
    # Тест 5: Проверка что сообщение появилось в истории
    echo ""
    echo "5️⃣ Проверка что сообщение синхронизировалось..."
    
    new_history=$(curl -s "$API_BASE/telegram/updates?limit=5")
    
    if echo "$new_history" | grep -q "$(echo "$message" | cut -c1-30)"; then
        echo "   ✅ Сообщение синхронизировалось!"
    else
        echo "   ⏳ Сообщение еще не в истории (может потребоваться больше времени)"
    fi
else
    echo "   ❌ Ошибка отправки"
    echo "$send_response"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Тестирование завершено!"
echo ""
echo "💡 Рекомендации:"
echo "   • Откройте https://pavell.vercel.app/noninput.html в браузере"
echo "   • Нажмите F12 → Console для просмотра логов"
echo "   • Проверьте канал t.me/noninput в Telegram"
echo "   • Попробуйте написать сообщение на сайте и в канале"
echo ""
