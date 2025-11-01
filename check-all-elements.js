#!/usr/bin/env node

/**
 * ПРОВЕРКА ВСЕХ ЭЛЕМЕНТОВ ТЕЛЕМЕТРИИ
 * Детальный анализ какие элементы обновляются и видимы
 */

const fs = require('fs');

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                        🔍 ПОЛНАЯ ДИАГНОСТИКА ВСЕХ ЭЛЕМЕНТОВ                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
`);

// Все элементы которые должны обновляться
const elements = {
  '📊 ОСНОВНЫЕ МЕТРИКИ': [
    'freqValue', 'freqBar', 'inertiaValue', 'inertiaBar', 'confValue', 'confBar'
  ],
  '⚙️ ПАРАМЕТРЫ ОБУЧЕНИЯ': [
    'lrSlider', 'lrVal', 'lrBar', 
    'l2Slider', 'l2Val', 'l2Bar',
    'mixSlider', 'mixVal', 'mixBar'
  ],
  '🧠 АДАПТИВНЫЕ МЕТРИКИ': [
    'resourceValue', 'resourceBar', 'lrAdaptValue', 'mixAdaptValue', 'KpAdaptValue'
  ],
  '🏗️ АРХИТЕКТУРА': [
    'HValue', 'qualityValue', 'qualityBar', 'freezeStatusValue', 'precisionValue'
  ],
  '📡 СТАТУС': [
    'statusText', 'loadingBar', 'info'
  ]
};

console.log(`1️⃣ ПРОВЕРКА НАЛИЧИЯ HTML ЭЛЕМЕНТОВ:\n`);

let totalElements = 0;
let foundElements = 0;
let htmlIssues = [];

Object.entries(elements).forEach(([category, ids]) => {
  console.log(`${category}:`);
  
  ids.forEach(id => {
    totalElements++;
    const exists = html.includes(`id="${id}"`);
    
    if (exists) {
      foundElements++;
      console.log(`   ✅ ${id}`);
    } else {
      console.log(`   ❌ ${id} - НЕ НАЙДЕН!`);
      htmlIssues.push(id);
    }
  });
  console.log('');
});

console.log(`\n2️⃣ ПРОВЕРКА ОБНОВЛЕНИЙ В render():\n`);

// Найдем render функцию
const renderStart = html.indexOf('function render(out)');
const emulateLoadStart = html.indexOf('function emulateLoad', renderStart);
const renderBody = html.substring(renderStart, emulateLoadStart);

let updateCount = 0;
let updateIssues = [];

Object.entries(elements).forEach(([category, ids]) => {
  console.log(`${category}:`);
  
  ids.forEach(id => {
    // Ищем setT или setW с этим id
    const setTPattern = new RegExp(`setT\\s*\\(\\s*['"]*${id}['"]*\\s*,`);
    const setWPattern = new RegExp(`setW\\s*\\(\\s*['"]*${id}['"]*\\s*,`);
    const elementPattern = new RegExp(`${id}\\s*\\.`);
    
    if (setTPattern.test(renderBody) || setWPattern.test(renderBody)) {
      updateCount++;
      console.log(`   ✅ ${id} - обновляется`);
    } else if (elementPattern.test(renderBody)) {
      console.log(`   ⚠️ ${id} - прямое обновление (не через setT/setW)`);
      updateCount++;
    } else {
      console.log(`   ❌ ${id} - НЕ ОБНОВЛЯЕТСЯ`);
      updateIssues.push(id);
    }
  });
  console.log('');
});

console.log(`\n3️⃣ ПРОВЕРКА CSS ВИДИМОСТИ:\n`);

let cssIssues = [];

// Ищем display: none и opacity: 0 для наших элементов
Object.values(elements).flat().forEach(id => {
  // Ищем CSS правила для этого элемента
  const idPattern = new RegExp(`#${id}\\s*{[^}]*}`);
  const match = idPattern.exec(html);
  
  if (match) {
    const css = match[0];
    if (css.includes('display: none') || css.includes('display:none')) {
      console.log(`   ⚠️ ${id} - скрыт display:none!`);
      cssIssues.push(`${id}: display:none`);
    } else if (css.includes('opacity: 0') || css.includes('opacity:0')) {
      console.log(`   ⚠️ ${id} - скрыт opacity:0!`);
      cssIssues.push(`${id}: opacity:0`);
    } else {
      console.log(`   ✅ ${id} - видим`);
    }
  } else {
    console.log(`   ℹ️ ${id} - нет специального CSS (наследует стили)`);
  }
});

// Итоги
console.log(`\n${'═'.repeat(100)}`);
console.log(`📊 ИТОГОВАЯ СТАТИСТИКА:\n`);

console.log(`   HTML элементы:      ${foundElements}/${totalElements}`);
console.log(`   Обновления:         ${updateCount}/${totalElements}`);
console.log(`   \n`);

if (htmlIssues.length > 0) {
  console.log(`   ⚠️ ОТСУТСТВУЮЩИЕ HTML ЭЛЕМЕНТЫ:`);
  htmlIssues.forEach(id => console.log(`      • ${id}`));
}

if (updateIssues.length > 0) {
  console.log(`   ⚠️ НЕ ОБНОВЛЯЮЩИЕСЯ ЭЛЕМЕНТЫ:`);
  updateIssues.forEach(id => console.log(`      • ${id}`));
}

if (cssIssues.length > 0) {
  console.log(`   ⚠️ ПРОБЛЕМЫ С CSS ВИДИМОСТЬЮ:`);
  cssIssues.forEach(issue => console.log(`      • ${issue}`));
}

if (htmlIssues.length === 0 && updateIssues.length === 0 && cssIssues.length === 0) {
  console.log(`   ✅ ВСЕ ЭЛЕМЕНТЫ ПРИСУТСТВУЮТ, ОБНОВЛЯЮТСЯ И ВИДИМЫ!`);
  console.log(`   \n   🎉 ЕСЛИ ТЕЛЕМЕТРИЯ НЕ ВИДНА, ПРИЧИНЫ:`);
  console.log(`      1. Идет фаза "Плавное накопление..."  (ждите 3-5 сек)`);
  console.log(`      2. Микрофон не разрешен браузером`);
  console.log(`      3. Элементы лежат за другими элементами (z-index)`);
  console.log(`      4. Родительский контейнер скрыт`);
} else {
  console.log(`\n   ❌ ЕСТЬ ПРОБЛЕМЫ - НУЖНЫ ИСПРАВЛЕНИЯ!`);
}

console.log(`\n${'═'.repeat(100)}\n`);
