# Используем официальный Node.js образ
FROM node:18-alpine

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY server-proxy.js ./

# Создаем пользователя без root привилегий
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Создаем директорию для логов
RUN mkdir -p /app/logs && chown -R nodeuser:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nodeuser

# Открываем порт
EXPOSE 3001

# Добавляем healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Запускаем приложение
CMD ["node", "server-proxy.js"]