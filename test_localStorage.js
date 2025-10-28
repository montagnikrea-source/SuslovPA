// Тестирование localStorage для сообщений чата

// Симулируем сообщения
const testMessages = [
  {
    id: 'test_1',
    text: 'Первое тестовое сообщение',
    username: 'Пользователь 1',
    userId: 'user_1',
    timestamp: Date.now() - 30000,
    isCurrentUser: false,
    wasFiltered: false,
    source: 'test'
  },
  {
    id: 'test_2',
    text: 'Второе тестовое сообщение',
    username: 'Пользователь 2',
    userId: 'user_2',
    timestamp: Date.now() - 20000,
    isCurrentUser: false,
    wasFiltered: false,
    source: 'test'
  },
  {
    id: 'test_3',
    text: 'Третье тестовое сообщение',
    username: 'Пользователь 3',
    userId: 'user_3',
    timestamp: Date.now() - 10000,
    isCurrentUser: true,
    wasFiltered: false,
    source: 'test'
  }
];

console.log('=== ТЕСТ localStorage ===');
console.log('1️⃣ Сохраняю тестовые сообщения...');

// Сохраняем
localStorage.setItem('chatMessages', JSON.stringify(testMessages));
console.log(`✅ Сохранено ${testMessages.length} сообщений`);
console.log(`📦 Размер: ${new Blob([localStorage.getItem('chatMessages')]).size} bytes`);

// Загружаем
console.log('\n2️⃣ Загружаю сообщения...');
const loaded = JSON.parse(localStorage.getItem('chatMessages'));
console.log(`✅ Загружено ${loaded.length} сообщений`);
loaded.forEach(msg => {
  console.log(`  - ${msg.username}: ${msg.text}`);
});

// Проверяем, что данные не потеряны
console.log('\n3️⃣ Проверка целостности...');
const allMatch = testMessages.every((original, idx) => {
  return loaded[idx].id === original.id && loaded[idx].text === original.text;
});
console.log(allMatch ? '✅ Все данные сохранились корректно' : '❌ Данные повреждены!');

console.log('\n4️⃣ Проверка localStorage после очистки...');
localStorage.clear();
const afterClear = localStorage.getItem('chatMessages');
console.log(afterClear === null ? '✅ localStorage очищен корректно' : '❌ Данные не очищены!');

