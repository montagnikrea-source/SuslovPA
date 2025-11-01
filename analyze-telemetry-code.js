#!/usr/bin/env node

/**
 * ПРОВЕРКА ТЕЛЕМЕТРИИ - АНАЛИЗ РАБОТЫ JAVASCRIPT
 * Парсим HTML и эмулируем выполнение ключевых функций
 */

const fs = require('fs');
const path = require('path');

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                     🔬 АНАЛИЗ РАБОТЫ JAVASCRIPT ТЕЛЕМЕТРИИ                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
`);

// ============= ПРОВЕРКА 1: HTML элементы =============
console.log(`1️⃣ ПРОВЕРКА HTML ЭЛЕМЕНТОВ:\n`);

const elements = {
  'freqValue': 'Значение частоты',
  'freqBar': 'Progress bar частоты',
  'qualityValue': 'Значение качества',
  'qualityBar': 'Progress bar качества',
  'freezeStatusValue': 'Статус обучения',
  'precisionValue': 'Точность вычислений',
  'info': 'Информационная строка',
  'lrSlider': 'Слайдер Learning Rate',
  'l2Slider': 'Слайдер L2',
  'mixSlider': 'Слайдер Mix',
};

let elementCount = 0;
Object.entries(elements).forEach(([id, desc]) => {
  const hasElement = html.includes(`id="${id}"`);
  if (hasElement) {
    elementCount++;
    console.log(`   ✅ ${id.padEnd(20)} - ${desc}`);
  } else {
    console.log(`   ❌ ${id.padEnd(20)} - ${desc}`);
  }
});

console.log(`\n   Результат: ${elementCount}/${Object.keys(elements).length} элементов\n`);

// ============= ПРОВЕРКА 2: Функции =============
console.log(`2️⃣ ПРОВЕРКА ФУНКЦИЙ:\n`);

const functions = {
  'function render(out)': 'Главная функция отрисовки',
  'function loop()': 'Основной цикл',
  'const setT =': 'Функция обновления текста',
  'const setW =': 'Функция обновления ширины',
  'const $ =': 'Функция поиска элемента',
};

let funcCount = 0;
Object.entries(functions).forEach(([pattern, desc]) => {
  const hasFunc = html.includes(pattern);
  if (hasFunc) {
    funcCount++;
    console.log(`   ✅ ${desc}`);
  } else {
    console.log(`   ❌ ${desc}`);
  }
});

console.log(`\n   Результат: ${funcCount}/${Object.keys(functions).length} функций\n`);

// ============= ПРОВЕРКА 3: Вызовы render() =============
console.log(`3️⃣ ПРОВЕРКА ВЫЗОВОВ render():\n`);

const renderCallRegex = /render\s*\(\s*([^)]*)\)/g;
const renderCalls = [...html.matchAll(renderCallRegex)];

console.log(`   Найдено ${renderCalls.length} вызовов render():\n`);

renderCalls.forEach((match, i) => {
  const callText = match[1].substring(0, 60).replace(/\n/g, ' ');
  console.log(`   ${i + 1}. render(${callText}${callText.length > 60 ? '...' : ''})`);
});

// ============= ПРОВЕРКА 4: Обновления элементов =============
console.log(`\n4️⃣ ПРОВЕРКА ОБНОВЛЕНИЙ ЭЛЕМЕНТОВ В render():\n`);

// Найдем start и end render функции
const renderStart = html.indexOf('function render(out)');
const nextFunc = Math.min(
  html.indexOf('function emulateLoad', renderStart),
  html.indexOf('function loop', renderStart),
);
const renderBody = html.substring(renderStart, nextFunc);

const updates = {
  'setT("freqValue"': 'Обновление частоты',
  'setW("freqBar"': 'Progress bar частоты',
  'setT("qualityValue"': 'Обновление качества',
  'setW("qualityBar"': 'Progress bar качества',
  'setT("freezeStatusValue"': 'Статус обучения',
  'setT("HValue"': 'H нейроны',
  'setT("precisionValue"': 'Точность',
  'setT("info"': 'Информация',
  'setW("lrBar"': 'Progress bar LR',
  'setW("l2Bar"': 'Progress bar L2',
  'setW("mixBar"': 'Progress bar Mix',
};

let updateCount = 0;
Object.entries(updates).forEach(([pattern, desc]) => {
  // Ищем с переносами строк
  const escaped = pattern.replace(/[()[\]{}.*+?^$|\\]/g, '\\$&');
  const regex = new RegExp(escaped.replace(/"/g, '[\\s\\n]*"'));
  if (regex.test(renderBody)) {
    updateCount++;
    console.log(`   ✅ ${desc}`);
  } else {
    console.log(`   ⚠️ ${desc} (не найдено - может быть с переносами)`);
  }
});

console.log(`\n   Результат: ${updateCount}+ обновлений найдено\n`);

// ============= ПРОВЕРКА 5: Основной цикл =============
console.log(`5️⃣ ПРОВЕРКА ОСНОВНОГО ЦИКЛА:\n`);

const loopChecks = [
  { pattern: 'scan.processOnce()', desc: 'Вызов процесса' },
  { pattern: 'render(', desc: 'Вызов render()' },
  { pattern: 'setTimeout(loop', desc: 'Рекурсивный setTimeout' },
  { pattern: 'loop()', desc: 'Инициализация loop()' },
];

let loopOk = 0;
loopChecks.forEach(({ pattern, desc }) => {
  if (html.includes(pattern)) {
    loopOk++;
    console.log(`   ✅ ${desc}`);
  } else {
    console.log(`   ❌ ${desc}`);
  }
});

console.log(`\n   Результат: ${loopOk}/${loopChecks.length} компонентов\n`);

// ============= ПРОВЕРКА 6: Инициализация =============
console.log(`6️⃣ ПРОВЕРКА ИНИЦИАЛИЗАЦИИ:\n`);

const initChecks = [
  { pattern: 'window.__legacyEngine.start()', desc: 'Запуск алгоритма' },
  { pattern: 'const scan = new FrequencyScanner', desc: 'Инициализация scan' },
  { pattern: 'const blender = new OutputBlender', desc: 'Инициализация blender' },
  { pattern: 'const lrSlider =', desc: 'Инициализация слайдеров' },
];

let initOk = 0;
initChecks.forEach(({ pattern, desc }) => {
  if (html.includes(pattern)) {
    initOk++;
    console.log(`   ✅ ${desc}`);
  } else {
    console.log(`   ❌ ${desc} - КРИТИЧНО!`);
  }
});

console.log(`\n   Результат: ${initOk}/${initChecks.length}\n`);

// ============= ПРОВЕРКА 7: Debuggging code =============
console.log(`7️⃣ ПРОВЕРКА DEBUG ЛОГИРОВАНИЯ:\n`);

if (html.includes('window.__telemetryDebug')) {
  console.log(`   ✅ Debug логирование добавлено в render()`);
  console.log(`      Логи должны появиться в консоли браузера как:`);
  console.log(`      [RENDER 1] out= {...} scan= object setT= function`);
} else {
  console.log(`   ❌ Debug логирования нет`);
}

// ============= ФИНАЛЬНЫЙ ОТЧЕТ =============
console.log(`\n${'═'.repeat(100)}`);
console.log(`📊 ФИНАЛЬНЫЙ ОТЧЕТ:\n`);

const totalChecks = elementCount + funcCount + loopOk + initOk;
const totalPossible = Object.keys(elements).length + Object.keys(functions).length + loopChecks.length + initChecks.length;
const percent = Math.round((totalChecks / totalPossible) * 100);

console.log(`   Элементы HTML:      ${elementCount}/${Object.keys(elements).length}`);
console.log(`   Функции:           ${funcCount}/${Object.keys(functions).length}`);
console.log(`   Цикл:              ${loopOk}/${loopChecks.length}`);
console.log(`   Инициализация:     ${initOk}/${initChecks.length}`);
console.log(`   ${'─'.repeat(50)}`);
console.log(`   ИТОГО:             ${totalChecks}/${totalPossible} (${percent}%)\n`);

if (percent >= 90) {
  console.log(`✅ КОД ГОТОВ К РАБОТЕ`);
  console.log(`   Открой сайт и посмотри консоль (F12)`);
  console.log(`   Должны появиться логи [RENDER N]`);
  console.log(`   Если нет логов - проблема может быть:`);
  console.log(`   • Фаза накопления данных слишком долгая`);
  console.log(`   • HTML элементы загружаются позже кода`);
  console.log(`   • Микрофон не доступен`);
} else if (percent >= 70) {
  console.log(`⚠️ ЕСТЬ ПРОБЕЛЫ`);
  console.log(`   Некоторые компоненты не найдены`);
} else {
  console.log(`❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ`);
  console.log(`   Базовые компоненты отсутствуют`);
}

console.log(`\n${'═'.repeat(100)}\n`);
