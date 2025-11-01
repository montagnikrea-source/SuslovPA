#!/usr/bin/env node

/**
 * ПОЛНАЯ ДИАГНОСТИКА ЦЕПОЧКИ: АЛГОРИТМ → LOOP → RENDER → UI
 * Ищем где именно обрывается связь
 */

const fs = require('fs');
const path = require('path');

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║              🔍 ПОЛНАЯ ДИАГНОСТИКА ЦЕПОЧКИ: АЛГОРИТМ → UI                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝

🔗 ЦЕПОЧКА ПЕРЕДАЧИ ДАННЫХ:

  1. window.__legacyEngine.start()
       ↓
  2. const scan = new FrequencyScanner()
       ↓
  3. loop() вызывается
       ↓
  4. scan.processOnce() - алгоритм обрабатывает
       ↓
  5. render(out) вызывается с данными
       ↓
  6. setT/setW обновляют DOM элементы
       ↓
  7. Страница показывает результаты

════════════════════════════════════════════════════════════════════════════════════════════════\n`);

// ========== ЭТАП 1: ИНИЦИАЛИЗАЦИЯ АЛГОРИТМА ==========
console.log(`1️⃣ ЭТАП 1: ИНИЦИАЛИЗАЦИЯ АЛГОРИТМА (window.__legacyEngine.start())\n`);

// Найдем где создается window.__legacyEngine
const legacyEngineIndex = html.indexOf('window.__legacyEngine');
if (legacyEngineIndex > 0) {
  const context = html.substring(legacyEngineIndex - 200, legacyEngineIndex + 500);
  console.log(`   ✅ window.__legacyEngine найдена`);
  
  // Проверим что она содержит start()
  if (html.includes('window.__legacyEngine.start()')) {
    console.log(`   ✅ window.__legacyEngine.start() вызывается\n`);
  } else {
    console.log(`   ❌ window.__legacyEngine.start() НЕ ВЫЗЫВАЕТСЯ!\n`);
  }
} else {
  console.log(`   ❌ window.__legacyEngine НЕ НАЙДЕНА!\n`);
}

// ========== ЭТАП 2: ИНИЦИАЛИЗАЦИЯ SCAN ==========
console.log(`2️⃣ ЭТАП 2: ИНИЦИАЛИЗАЦИЯ SCAN (const scan = new FrequencyScanner)\n`);

if (html.includes('const scan = new FrequencyScanner')) {
  console.log(`   ✅ scan инициализирован`);
  
  // Проверим что он в функции вместе с loop
  const scanIndex = html.indexOf('const scan = new FrequencyScanner');
  const nextLoop = html.indexOf('function loop()', scanIndex);
  const nextWindow = html.indexOf('window.__legacyEngine', scanIndex);
  
  if (nextLoop > scanIndex && nextLoop < scanIndex + 5000) {
    console.log(`   ✅ loop() определена после scan - ХОРОШО`);
  }
  
  if (nextWindow > scanIndex && nextWindow < scanIndex + 3000) {
    console.log(`   ✅ window.__legacyEngine.start() вызывается после scan - ХОРОШО\n`);
  }
} else {
  console.log(`   ❌ scan НЕ инициализирован!\n`);
}

// ========== ЭТАП 3: LOOP ФУНКЦИЯ ==========
console.log(`3️⃣ ЭТАП 3: LOOP ФУНКЦИЯ\n`);

const loopStart = html.indexOf('function loop()');
if (loopStart > 0) {
  const loopEnd = html.indexOf('catch (e)', loopStart) + 200;
  const loopBody = html.substring(loopStart, loopEnd);
  
  console.log(`   ✅ function loop() найдена`);
  
  // Проверим ключевые вызовы
  const checks = [
    { pattern: /scan\.processOnce\(\)/, name: 'scan.processOnce()' },
    { pattern: /render\s*\(/, name: 'render() вызов' },
    { pattern: /setTimeout\s*\(\s*loop/, name: 'setTimeout(loop)' },
    { pattern: /try\s*{/, name: 'try блок' },
  ];
  
  checks.forEach(({ pattern, name }) => {
    if (pattern.test(loopBody)) {
      console.log(`      ✅ ${name}`);
    } else {
      console.log(`      ❌ ${name} - НЕТ!`);
    }
  });
  console.log();
} else {
  console.log(`   ❌ function loop() НЕ НАЙДЕНА!\n`);
}

// ========== ЭТАП 4: RENDER ФУНКЦИЯ ==========
console.log(`4️⃣ ЭТАП 4: RENDER ФУНКЦИЯ\n`);

const renderStart = html.indexOf('function render(out)');
if (renderStart > 0) {
  const renderEnd = html.indexOf('function emulateLoad', renderStart);
  const renderBody = html.substring(renderStart, renderEnd);
  
  console.log(`   ✅ function render(out) найдена`);
  
  // Проверим что она получает
  if (/render\s*\(\s*out\s*\)/.test(html)) {
    console.log(`      ✅ Получает параметр out`);
  }
  
  // Проверим что она использует
  const uses = [
    { pattern: /out\.f/, name: 'out.f (частота)' },
    { pattern: /out\.conf/, name: 'out.conf (уверенность)' },
    { pattern: /out\.inertia/, name: 'out.inertia (стабильность)' },
    { pattern: /scan\.tuner/, name: 'scan.tuner (параметры)' },
  ];
  
  let usesCount = 0;
  uses.forEach(({ pattern, name }) => {
    if (pattern.test(renderBody)) {
      usesCount++;
      console.log(`      ✅ Использует ${name}`);
    } else {
      console.log(`      ❌ Не использует ${name}`);
    }
  });
  
  console.log();
} else {
  console.log(`   ❌ function render(out) НЕ НАЙДЕНА!\n`);
}

// ========== ЭТАП 5: setT И setW ФУНКЦИИ ==========
console.log(`5️⃣ ЭТАП 5: setT И setW ФУНКЦИИ\n`);

const setTMatch = html.match(/const setT\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/);
const setWMatch = html.match(/const setW\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/);

if (setTMatch) {
  console.log(`   ✅ setT функция найдена`);
  
  // Проверим что она делает
  if (setTMatch[0].includes('textContent')) {
    console.log(`      ✅ Обновляет textContent элемента`);
  }
  if (setTMatch[0].includes('$')) {
    console.log(`      ✅ Использует $() для поиска элемента\n`);
  }
} else {
  console.log(`   ❌ setT функция НЕ НАЙДЕНА!\n`);
}

if (setWMatch) {
  console.log(`   ✅ setW функция найдена`);
  
  if (setWMatch[0].includes('width')) {
    console.log(`      ✅ Обновляет width для progress bars`);
  }
  if (setWMatch[0].includes('$')) {
    console.log(`      ✅ Использует $() для поиска элемента\n`);
  }
} else {
  console.log(`   ❌ setW функция НЕ НАЙДЕНА!\n`);
}

// ========== ЭТАП 6: ОБНОВЛЕНИЯ В RENDER ==========
console.log(`6️⃣ ЭТАП 6: ВЫЗОВЫ setT/setW В RENDER\n`);

const renderStart2 = html.indexOf('function render(out)');
const renderEnd2 = html.indexOf('function emulateLoad', renderStart2);
const renderBody2 = html.substring(renderStart2, renderEnd2);

const updates = [
  { pattern: /setT\s*\(\s*["']freqValue["']/, name: 'freqValue' },
  { pattern: /setW\s*\(\s*["']freqBar["']/, name: 'freqBar' },
  { pattern: /setT\s*\(\s*["']statusText["']/, name: 'statusText' },
  { pattern: /setT\s*\(\s*["']info["']/, name: 'info' },
  { pattern: /setT\s*\(\s*["']qualityValue["']/, name: 'qualityValue' },
  { pattern: /setW\s*\(\s*["']qualityBar["']/, name: 'qualityBar' },
];

let updateCount = 0;
updates.forEach(({ pattern, name }) => {
  // Ищем более гибко
  if (renderBody2.includes(name)) {
    updateCount++;
    console.log(`   ✅ ${name} обновляется`);
  } else {
    console.log(`   ❌ ${name} НЕ обновляется`);
  }
});

console.log(`\n   Результат: ${updateCount}/${updates.length} элементов обновляется\n`);

// ========== ЭТАП 7: HTML ЭЛЕМЕНТЫ ==========
console.log(`7️⃣ ЭТАП 7: HTML ЭЛЕМЕНТЫ\n`);

const elementIds = [
  'freqValue', 'freqBar', 'statusText', 'info', 
  'qualityValue', 'qualityBar', 'loadingBar'
];

let elementsFound = 0;
elementIds.forEach(id => {
  if (html.includes(`id="${id}"`)) {
    elementsFound++;
    console.log(`   ✅ <div id="${id}"> существует`);
  } else {
    console.log(`   ❌ <div id="${id}"> НЕ НАЙДЕН!`);
  }
});

console.log(`\n   Результат: ${elementsFound}/${elementIds.length} элементов в HTML\n`);

// ========== ФИНАЛЬНЫЙ АНАЛИЗ ==========
console.log(`${'═'.repeat(100)}`);
console.log(`🔍 АНАЛИЗ ПРОБЛЕМЫ:\n`);

if (updateCount < 4) {
  console.log(`❌ ПРОБЛЕМА 1: setT/setW вызываются мало
   → Нужно добавить больше обновлений в render()\n`);
}

if (elementsFound < 5) {
  console.log(`❌ ПРОБЛЕМА 2: Недостаточно HTML элементов
   → Нужно добавить недостающие элементы\n`);
}

if (renderBody2.includes('return') && renderBody2.indexOf('return') < renderBody2.length / 2) {
  console.log(`⚠️  ВНИМАНИЕ: render() может выходить рано
   → Проверить условия и return ранние\n`);
}

console.log(`🔧 ОСНОВНЫЕ ТОЧКИ ПРОВЕРКИ:\n`);
console.log(`   1. Откройте https://suslovpa.vercel.app`);
console.log(`   2. Нажмите F12 → Console`);
console.log(`   3. Введите: window.__legacyEngine`);
console.log(`      Если undefined - алгоритм не запущен!`);
console.log(`   4. Введите: window.__telemetryDebug`);
console.log(`      Если > 0 - render() вызывается!`);
console.log(`   5. Введите: document.getElementById('freqValue').textContent`);
console.log(`      Если пусто - setT() не работает!\n`);

console.log(`${'═'.repeat(100)}\n`);
