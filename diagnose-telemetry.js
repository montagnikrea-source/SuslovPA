#!/usr/bin/env node

/**
 * ДИАГНОСТИКА ПРОБЛЕМЫ ТЕЛЕМЕТРИИ
 * Проверяем что на самом деле происходит в коде
 */

const fs = require('fs');

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const content = fs.readFileSync(htmlFile, 'utf8');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                           🔍 ДИАГНОСТИКА ПРОБЛЕМЫ ТЕЛЕМЕТРИИ                                 ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝

1️⃣ ПРОВЕРКА ВЫЗОВОВ render():
`);

// Ищем где вызывается render
const renderCalls = content.match(/render\s*\(\s*[^)]+\)/g);
if (renderCalls) {
  renderCalls.forEach((call, i) => {
    console.log(`   ${i + 1}. ${call}`);
  });
} else {
  console.log('   ❌ Вызовов render не найдено!');
}

console.log(`\n2️⃣ ПРОВЕРКА ИНИЦИАЛИЗАЦИИ ПЕРЕМЕННЫХ:
`);

const checks = {
  'scan = new FrequencyScanner': content.includes('const scan = new FrequencyScanner'),
  'loop() function': content.includes('function loop()'),
  'render() function': content.includes('function render(out)'),
  'blender = new OutputBlender': content.includes('const blender = new OutputBlender'),
  'setT helper': content.includes('const setT ='),
  'setW helper': content.includes('const setW ='),
  'lrSlider': content.includes('const lrSlider ='),
  'l2Slider': content.includes('const l2Slider ='),
  'mixSlider': content.includes('const mixSlider ='),
};

Object.entries(checks).forEach(([name, exists]) => {
  console.log(`   ${exists ? '✅' : '❌'} ${name}`);
});

console.log(`\n3️⃣ ПРОВЕРКА НАЧАЛА ВЫПОЛНЕНИЯ:
`);

// Ищем window.__legacyEngine.start()
if (content.includes('window.__legacyEngine.start()')) {
  console.log('   ✅ window.__legacyEngine.start() присутствует');
} else {
  console.log('   ❌ window.__legacyEngine.start() НЕ НАЙДЕНО!');
}

// Ищем loop() вызов
if (content.includes('loop()')) {
  console.log('   ✅ loop() вызывается');
  // Ищем где
  const loopCalls = content.match(/loop\(\);?/g);
  console.log(`      Найдено ${loopCalls.length} вызовов`);
} else {
  console.log('   ❌ loop() НИ РАЗУ НЕ ВЫЗЫВАЕТСЯ!');
}

console.log(`\n4️⃣ ПРОВЕРКА СОДЕРЖИМОГО render():
`);

// Ищем что render() пытается обновить
const renderStart = content.indexOf('function render(out)');
const renderEnd = content.indexOf('function emulateLoad', renderStart);
const renderBody = content.substring(renderStart, renderEnd);

const renderUpdates = [
  'setT("freqValue"',
  'setW("freqBar"',
  'setT("qualityValue"',
  'setW("qualityBar"',
  'setT("freezeStatusValue"',
  'setT("HValue"',
  'setT("precisionValue"',
  'setT("info"',
];

console.log('   Проверяем обновления элементов:');
renderUpdates.forEach((update) => {
  if (renderBody.includes(update)) {
    console.log(`      ✅ ${update}`);
  } else {
    console.log(`      ❌ ${update} - НЕ НАЙДЕНО!`);
  }
});

console.log(`\n5️⃣ ПРОВЕРКА ВЫЗОВА setT и setW:
`);

// Найдем определение setT
const setTDef = content.match(/const setT\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/);
const setWDef = content.match(/const setW\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/);

if (setTDef) {
  console.log('   ✅ setT определена:');
  console.log('      ' + setTDef[0].substring(0, 60) + '...');
} else {
  console.log('   ❌ setT НЕ ОПРЕДЕЛЕНА!');
}

if (setWDef) {
  console.log('   ✅ setW определена:');
  console.log('      ' + setWDef[0].substring(0, 60) + '...');
} else {
  console.log('   ❌ setW НЕ ОПРЕДЕЛЕНА!');
}

console.log(`\n6️⃣ ПРОВЕРКА SCOPE render():
`);

// Ищем в каком scope находится render
if (content.includes('function render(out) {')) {
  console.log('   ✅ render() определена локально в функции');
  
  // Ищем на каком уровне вложенности
  const beforeRender = content.substring(0, content.indexOf('function render(out)'));
  const braceCount = (beforeRender.match(/{/g) || []).length - (beforeRender.match(/}/g) || []).length;
  console.log(`      Глубина nesting: ${braceCount + 1}`);
  
  if (braceCount >= 3) {
    console.log('      ⚠️ ГЛУБОКАЯ вложенность может привести к проблемам с closure!');
  }
}

console.log(`\n7️⃣ ПРОВЕРКА HTML ЭЛЕМЕНТОВ:
`);

const elements = [
  'freqValue', 'freqBar',
  'qualityValue', 'qualityBar',
  'freezeStatusValue',
  'HValue',
  'precisionValue',
  'info',
  'lrSlider', 'l2Slider', 'mixSlider',
  'loadingBar', 'statusText',
];

let missingElements = [];
elements.forEach((id) => {
  if (!content.includes(`id="${id}"`)) {
    missingElements.push(id);
  }
});

if (missingElements.length === 0) {
  console.log('   ✅ Все элементы HTML присутствуют');
} else {
  console.log(`   ❌ ОТСУТСТВУЮТ элементы: ${missingElements.join(', ')}`);
}

console.log(`\n🔴 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:
`);

console.log(`
   1. render() может быть не в области видимости других функций
   2. scan объект может быть undefined в момент вызова render()
   3. setT() или setW() могут быть не доступны в scope render()
   4. HTML элементы могут быть загружены позже, чем запускается код
   5. Процесс инициализации может застрять на фазе накопления данных
   6. Может быть ошибка в расчетах значений внутри render()

🔧 РЕКОМЕНДАЦИЯ:
   Нужно добавить console.log() внутрь render() функции и проверить
   что она вообще вызывается и какие значения получает!
`);

console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                              Для продолжения нужна отладка в браузере!                       ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\n');
