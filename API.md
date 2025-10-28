# API Documentation

## 🚀 API Endpoints

### Base URL
- **Development**: `http://localhost/api`
- **Production**: `https://yourdomain.com/api`

### Authentication
Все запросы к защищенным endpoints требуют API ключ в заголовке:
```
X-API-Key: your_api_secret_from_env
```

## 📨 Telegram API Proxy

### Send Message
Отправка сообщения в Telegram чат.

```http
POST /api/telegram/sendMessage
Content-Type: application/json
X-API-Key: your_api_secret

{
    "chat_id": "@your_channel_or_chat_id",
    "text": "Hello from SuslovPA!",
    "parse_mode": "HTML"
}
```

**Response:**
```json
{
    "ok": true,
    "result": {
        "message_id": 123,
        "date": 1703534400,
        "text": "Hello from SuslovPA!"
    }
}
```

### Get Bot Info
Получение информации о боте.

```http
GET /api/telegram/getMe
X-API-Key: your_api_secret
```

**Response:**
```json
{
    "ok": true,
    "result": {
        "id": 123456789,
        "is_bot": true,
        "first_name": "SuslovPA Bot",
        "username": "suslovpa_bot"
    }
}
```

### Forward Message
Пересылка сообщения.

```http
POST /api/telegram/forwardMessage
Content-Type: application/json
X-API-Key: your_api_secret

{
    "chat_id": "@destination_chat",
    "from_chat_id": "@source_chat",
    "message_id": 123
}
```

## 📊 Counter API Proxy

### Increment Counter
Увеличение счетчика на 1.

```http
GET /api/counter/increment/:key
```

**Example:**
```http
GET /api/counter/increment/page_views
```

**Response:**
```json
{
    "value": 42,
    "success": true,
    "source": "counterapi"
}
```

### Get Counter Value
Получение текущего значения счетчика.

```http
GET /api/counter/get/:key
```

**Example:**
```http
GET /api/counter/get/page_views
```

**Response:**
```json
{
    "value": 41,
    "success": true,
    "source": "countapi"
}
```

### Set Counter Value
Установка значения счетчика.

```http
POST /api/counter/set/:key
Content-Type: application/json

{
    "value": 100
}
```

**Response:**
```json
{
    "value": 100,
    "success": true,
    "source": "counterapi"
}
```

## 🌍 Geolocation API

### IP-based Location
Получение геолокации по IP адресу.

```http
GET /api/location/ip
```

**Response:**
```json
{
    "ip": "192.168.1.1",
    "country": "Russia",
    "region": "Moscow",
    "city": "Moscow",
    "latitude": 55.7558,
    "longitude": 37.6176,
    "timezone": "Europe/Moscow",
    "success": true
}
```

### Precise Location
Точная геолокация (требует разрешения пользователя).

```http
POST /api/location/precise
Content-Type: application/json

{
    "latitude": 55.7558,
    "longitude": 37.6176,
    "accuracy": 10
}
```

**Response:**
```json
{
    "latitude": 55.7558,
    "longitude": 37.6176,
    "accuracy": 10,
    "address": {
        "country": "Russia",
        "region": "Moscow",
        "city": "Moscow",
        "street": "Red Square"
    },
    "success": true
}
```

## 🔧 System API

### Health Check
Проверка состояния сервиса.

```http
GET /health
```

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2024-12-25T12:00:00.000Z",
    "uptime": 3600,
    "services": {
        "telegram": "operational",
        "counter": "operational",
        "geolocation": "operational"
    },
    "version": "1.0.0"
}
```

### Metrics
Получение метрик производительности.

```http
GET /api/metrics
X-API-Key: your_api_secret
```

**Response:**
```json
{
    "requests_total": 1234,
    "requests_per_minute": 20,
    "error_rate": 0.01,
    "response_time_avg": 150,
    "memory_usage": "45MB",
    "uptime": 86400
}
```

## 🛡️ Error Handling

### Standard Error Response
```json
{
    "error": true,
    "message": "Description of the error",
    "code": "ERROR_CODE",
    "timestamp": "2024-12-25T12:00:00.000Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | API key required |
| `INVALID_API_KEY` | 403 | Invalid API key |
| `RATE_LIMITED` | 429 | Too many requests |
| `TELEGRAM_ERROR` | 400 | Telegram API error |
| `COUNTER_ERROR` | 503 | Counter service unavailable |
| `LOCATION_ERROR` | 400 | Geolocation error |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## 📝 Usage Examples

### JavaScript (Frontend)

```javascript
class SuslovPAAPI {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // Telegram
    async sendMessage(chatId, text, parseMode = 'HTML') {
        return this.request('/api/telegram/sendMessage', {
            method: 'POST',
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode
            })
        });
    }

    // Counter
    async incrementCounter(key) {
        return this.request(`/api/counter/increment/${key}`);
    }

    async getCounter(key) {
        return this.request(`/api/counter/get/${key}`);
    }

    // Location
    async getLocation() {
        return this.request('/api/location/ip');
    }

    // Health
    async getHealth() {
        return this.request('/health');
    }
}

// Usage
const api = new SuslovPAAPI('http://localhost', 'your_api_secret');

// Send message
api.sendMessage('@mychannel', 'Hello World!')
    .then(result => console.log('Message sent:', result))
    .catch(error => console.error('Error:', error));

// Increment counter
api.incrementCounter('page_views')
    .then(result => console.log('Counter:', result.value))
    .catch(error => console.error('Error:', error));
```

### Python (Backend)

```python
import requests
import json

class SuslovPAAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        })

    def send_message(self, chat_id, text, parse_mode='HTML'):
        url = f"{self.base_url}/api/telegram/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode
        }
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def increment_counter(self, key):
        url = f"{self.base_url}/api/counter/increment/{key}"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

    def get_health(self):
        url = f"{self.base_url}/health"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()

# Usage
api = SuslovPAAPI('http://localhost', 'your_api_secret')

# Send message
try:
    result = api.send_message('@mychannel', 'Hello from Python!')
    print('Message sent:', result)
except requests.exceptions.RequestException as e:
    print('Error:', e)
```

### cURL Examples

```bash
# Send Telegram message
curl -X POST http://localhost/api/telegram/sendMessage \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_secret" \
  -d '{
    "chat_id": "@mychannel",
    "text": "Hello from cURL!",
    "parse_mode": "HTML"
  }'

# Increment counter
curl -X GET http://localhost/api/counter/increment/api_calls \
  -H "X-API-Key: your_api_secret"

# Get location
curl -X GET http://localhost/api/location/ip

# Health check
curl -X GET http://localhost/health
```

## 🔄 Webhook Integration

### Telegram Webhook Setup

```javascript
// Set webhook
const webhook = await api.request('/api/telegram/setWebhook', {
    method: 'POST',
    body: JSON.stringify({
        url: 'https://yourdomain.com/api/telegram/webhook',
        allowed_updates: ['message', 'callback_query']
    })
});
```

### Webhook Handler Example

```javascript
// Express.js webhook handler
app.post('/api/telegram/webhook', (req, res) => {
    const update = req.body;
    
    if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const text = message.text;
        
        // Process message
        processMessage(chatId, text);
    }
    
    res.status(200).send('OK');
});
```

## 📊 Best Practices

### 1. Error Handling
```javascript
async function safeAPICall(apiFunction) {
    try {
        return await apiFunction();
    } catch (error) {
        if (error.status === 429) {
            // Rate limited - wait and retry
            await new Promise(resolve => setTimeout(resolve, 60000));
            return safeAPICall(apiFunction);
        }
        console.error('API Error:', error);
        throw error;
    }
}
```

### 2. Rate Limiting
```javascript
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.windowMs - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
        return true;
    }
}
```

### 3. Retry Logic
```javascript
async function retryableRequest(requestFn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

## 📋 Testing

### Unit Tests Example

```javascript
// Jest test example
describe('SuslovPA API', () => {
    const api = new SuslovPAAPI('http://localhost:3001', 'test_key');

    test('should get health status', async () => {
        const health = await api.getHealth();
        expect(health.status).toBe('healthy');
    });

    test('should increment counter', async () => {
        const result = await api.incrementCounter('test_counter');
        expect(result.success).toBe(true);
        expect(typeof result.value).toBe('number');
    });
});
```

---

**📚 Этот документ описывает все доступные API endpoints и примеры их использования. Для получения дополнительной информации обратитесь к основной документации.**