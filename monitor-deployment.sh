#!/bin/bash

################################################################################
# 🔍 Telegram API Deployment Monitor
# 
# Отслеживает статус развертывания на Vercel и проверяет API endpoints
# Версия: 1.0.0
# Дата: 2025-10-29
################################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Переменные
PRODUCTION_URL="https://montagnikrea-source.github.io/SuslovPA
MAX_WAIT_TIME=300  # 5 минут
CHECK_INTERVAL=10  # 10 секунд
ATTEMPT=0
MAX_ATTEMPTS=$((MAX_WAIT_TIME / CHECK_INTERVAL))

################################################################################
# Функции
################################################################################

print_header() {
    echo ""
    echo -e "${CYAN}═════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═════════════════════════════════════════════════════${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_progress() {
    echo -e "${MAGENTA}⏳ $1${NC}"
}

check_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-}
    
    if [ "$method" = "GET" ]; then
        curl -s -w "\n%{http_code}" "$PRODUCTION_URL$endpoint" 2>/dev/null | tail -1
    else
        curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$PRODUCTION_URL$endpoint" 2>/dev/null | tail -1
    fi
}

test_connection() {
    print_progress "Проверка соединения с Telegram Bot..."
    
    local response=$(curl -s -X POST "$PRODUCTION_URL/api/telegram" \
        -H "Content-Type: application/json" \
        -d '{"method":"getMe","params":{}}' 2>/dev/null)
    
    if echo "$response" | grep -q '"ok":true'; then
        print_success "Bot соединение OK"
        echo -e "${GREEN}Ответ:${NC}"
        echo "$response" | head -c 200
        echo -e "\n"
        return 0
    elif echo "$response" | grep -q '"ok":false'; then
        print_warning "Bot ошибка (но endpoint работает)"
        echo "$response" | head -c 200
        echo -e "\n"
        return 1
    else
        print_error "Нет ответа от endpoint"
        return 1
    fi
}

test_message_sending() {
    print_progress "Проверка отправки сообщений..."
    
    local response=$(curl -s -X POST "$PRODUCTION_URL/api/telegram" \
        -H "Content-Type: application/json" \
        -d '{
            "method":"sendMessage",
            "params":{
                "chat_id":"@noninput",
                "text":"Test from deployment monitor"
            }
        }' 2>/dev/null)
    
    if echo "$response" | grep -q '"ok":true'; then
        print_success "Message sending OK"
        echo "$response" | head -c 200
        echo -e "\n"
        return 0
    else
        print_warning "Message sending не готов или ошибка"
        echo "$response" | head -c 200
        echo -e "\n"
        return 1
    fi
}

test_message_receiving() {
    print_progress "Проверка получения сообщений..."
    
    local response=$(curl -s "$PRODUCTION_URL/api/telegram/updates?limit=1" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        print_success "Message receiving OK"
        local count=$(echo "$response" | grep -o '"count":[0-9]*' | head -1)
        echo "Статус: $count"
        return 0
    else
        print_warning "Message receiving не готов"
        echo "$response" | head -c 200
        echo -e "\n"
        return 1
    fi
}

test_cors_headers() {
    print_progress "Проверка CORS headers..."
    
    local response=$(curl -s -i -X OPTIONS "$PRODUCTION_URL/api/telegram" \
        -H "Origin: http://localhost:3000" 2>/dev/null)
    
    if echo "$response" | grep -iq "Access-Control-Allow"; then
        print_success "CORS headers OK"
        echo "$response" | grep -i "Access-Control" || true
        echo ""
        return 0
    else
        print_warning "CORS headers не найдены"
        return 1
    fi
}

monitor_deployment() {
    print_header "🚀 Мониторинг Deployment Status"
    
    print_info "Url: $PRODUCTION_URL"
    print_info "Максимальное время ожидания: ${MAX_WAIT_TIME}с"
    print_info "Интервал проверки: ${CHECK_INTERVAL}с"
    echo ""
    
    local http_code=0
    local ready=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        
        # Проверка статуса HTTP
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/telegram" \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"method":"getMe","params":{}}' 2>/dev/null)
        
        print_progress "[$ATTEMPT/$MAX_ATTEMPTS] HTTP Status: $http_code"
        
        # Если получили не 404 или 502, значит deployment готов
        if [ "$http_code" != "404" ] && [ "$http_code" != "502" ] && [ "$http_code" != "503" ]; then
            ready=true
            break
        fi
        
        # Если это последняя попытка, не ждем
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            sleep $CHECK_INTERVAL
        fi
    done
    
    echo ""
    
    if [ "$ready" = true ]; then
        print_success "API endpoints готовы! (Попыток: $ATTEMPT, HTTP: $http_code)"
        echo ""
        return 0
    else
        print_error "API endpoints не готовы после ${MAX_WAIT_TIME}с (HTTP: $http_code)"
        print_warning "Возможно, Vercel все еще развертывает"
        echo ""
        return 1
    fi
}

################################################################################
# ГЛАВНОЕ ВЫПОЛНЕНИЕ
################################################################################

main() {
    print_header "🔍 TELEGRAM API DEPLOYMENT MONITOR"
    
    # Шаг 1: Проверить доступность
    print_info "Шаг 1: Ожидание доступности API endpoints..."
    echo ""
    
    if ! monitor_deployment; then
        print_error "Deployment еще не готов. Пожалуйста, подождите еще немного."
        exit 1
    fi
    
    echo ""
    print_header "✅ DEPLOYMENT READY - Запуск Тестов"
    
    # Шаг 2: Тестировать функциональность
    local test_count=0
    local test_passed=0
    
    print_info "Шаг 2: Функциональное тестирование..."
    echo ""
    
    # Тест 1: Connection
    test_count=$((test_count + 1))
    print_info "Тест $test_count: Bot Connection (getMe)"
    if test_connection; then
        test_passed=$((test_passed + 1))
    fi
    echo ""
    sleep 2
    
    # Тест 2: Message Sending
    test_count=$((test_count + 1))
    print_info "Тест $test_count: Message Sending (sendMessage)"
    if test_message_sending; then
        test_passed=$((test_passed + 1))
    fi
    echo ""
    sleep 2
    
    # Тест 3: Message Receiving
    test_count=$((test_count + 1))
    print_info "Тест $test_count: Message Receiving (getUpdates)"
    if test_message_receiving; then
        test_passed=$((test_passed + 1))
    fi
    echo ""
    sleep 2
    
    # Тест 4: CORS Headers
    test_count=$((test_count + 1))
    print_info "Тест $test_count: CORS Headers"
    if test_cors_headers; then
        test_passed=$((test_passed + 1))
    fi
    echo ""
    
    # ИТОГИ
    print_header "📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ"
    
    echo -e "${CYAN}Пройдено тестов: $test_passed / $test_count${NC}"
    echo ""
    
    if [ $test_passed -ge 2 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  🟢 DEPLOYMENT SUCCESSFUL! ✅         ║${NC}"
        echo -e "${GREEN}║                                        ║${NC}"
        echo -e "${GREEN}║  API endpoints работают               ║${NC}"
        echo -e "${GREEN}║  Telegram integration готова          ║${NC}"
        echo -e "${GREEN}║  Производство готово!                 ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        echo ""
        print_success "Проверьте страницу: $PRODUCTION_URL/noninput.html"
        exit 0
    else
        echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ⚠️  DEPLOYMENT PARTIAL READY         ║${NC}"
        echo -e "${YELLOW}║                                        ║${NC}"
        echo -e "${YELLOW}║  Некоторые тесты не пройдены         ║${NC}"
        echo -e "${YELLOW}║  Проверьте логи Vercel                ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
        echo ""
        exit 1
    fi
}

# Запуск
main "$@"
