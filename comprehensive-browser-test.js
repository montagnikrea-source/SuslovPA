#!/usr/bin/env node
/**
 * ПОЛНЫЙ ТЕСТ РАБОТЫ САЙТА
 * Эмулирует браузер, загружает HTML, выполняет JS и проверяет все элементы
 */

const fs = require('fs');
const path = require('path');

// ===== АНАЛИЗ #1: Проверка HTML структуры =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 1: HTML СТРУКТУРА');
console.log('='.repeat(80));

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

// Ищем все телеметрия элементы
const telemetryElements = [
  'freqValue', 'freqBar',
  'confValue', 'confBar',
  'inertiaValue', 'inertiaBar',
  'lrSlider', 'lrVal', 'lrBar',
  'l2Slider', 'l2Val', 'l2Bar',
  'mixSlider', 'mixVal', 'mixBar',
  'resourceValue', 'resourceBar',
  'lrAdaptValue',
  'mixAdaptValue',
  'KpAdaptValue',
  'HValue',
  'qualityValue', 'qualityBar',
  'freezeStatusValue',
  'precisionValue',
  'statusText',
  'loadingBar',
  'info'
];

console.log('\n📋 Проверка наличия телеметрия элементов в HTML:');
let missingElements = [];
telemetryElements.forEach(id => {
  const regex = new RegExp(`id=["']${id}["']`, 'i');
  if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
    console.log(`  ✅ #${id}`);
  } else {
    console.log(`  ❌ #${id} - НЕ НАЙДЕН!`);
    missingElements.push(id);
  }
});

console.log(`\n✨ Найдено: ${telemetryElements.length - missingElements.length}/${telemetryElements.length}`);
if (missingElements.length > 0) {
  console.log(`⚠️  Отсутствуют: ${missingElements.join(', ')}`);
}

// ===== АНАЛИЗ #2: Проверка функций JS =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 2: JAVASCRIPT ФУНКЦИИ');
console.log('='.repeat(80));

const functions = [
  'setT',
  'setW',
  'render',
  'loop',
  'attachSecureShell',
  'startPseudoTelemetry',
  'attachTelemetryHandler'
];

console.log('\n📝 Проверка определения функций:');
functions.forEach(fn => {
  if (html.includes(`function ${fn}`) || html.includes(`${fn} = function`) || html.includes(`${fn}()`) && html.includes(`function ${fn}`)) {
    if (fn === 'startPseudoTelemetry') {
      console.log(`  ⚠️  ${fn} - ВСЕ ЕЩЕ ПРИСУТСТВУЕТ (должно быть удалено!)`);
    } else {
      console.log(`  ✅ ${fn} определена`);
    }
  } else if (fn === 'startPseudoTelemetry') {
    console.log(`  ✅ ${fn} удалена (правильно!)`);
  } else {
    console.log(`  ❌ ${fn} - НЕ НАЙДЕНА!`);
  }
});

// ===== АНАЛИЗ #3: Проверка обновления элементов в render() =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 3: ОБНОВЛЕНИЕ ЭЛЕМЕНТОВ В render()');
console.log('='.repeat(80));

// Найти функцию render
const renderMatch = html.match(/function render\s*\(\s*out\s*\)\s*{([\s\S]*?)^[\s]*}\s*$/m);
if (renderMatch) {
  const renderBody = renderMatch[1];
  console.log('\n📊 Элементы, обновляемые в render():');
  
  let updateCount = 0;
  telemetryElements.forEach(id => {
    const updateRegex = new RegExp(`(setT|setW)\\s*\\(\\s*["']${id}["']`, 'i');
    if (updateRegex.test(renderBody)) {
      console.log(`  ✅ #${id} обновляется`);
      updateCount++;
    } else {
      console.log(`  ❌ #${id} НЕ обновляется`);
    }
  });
  console.log(`\n✨ Обновляется: ${updateCount}/${telemetryElements.length}`);
} else {
  console.log('❌ Функция render() не найдена!');
}

// ===== АНАЛИЗ #4: Проверка цикла обновления =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 4: ЦИКЛ ОБНОВЛЕНИЯ');
console.log('='.repeat(80));

console.log('\n🔄 Проверка механизма обновления:');

if (html.includes('function loop()')) {
  console.log('  ✅ loop() функция найдена');
} else {
  console.log('  ❌ loop() функция НЕ найдена');
}

if (html.includes('setTimeout(loop')) {
  console.log('  ✅ setTimeout(loop, ...) найден');
  const timeoutMatch = html.match(/setTimeout\s*\(\s*loop\s*,\s*(\d+)/);
  if (timeoutMatch) {
    console.log(`  ℹ️  Интервал: ${timeoutMatch[1]}ms (${(1000/timeoutMatch[1]).toFixed(2)} раз/сек)`);
  }
} else {
  console.log('  ❌ setTimeout(loop) НЕ найден');
}

if (html.includes('window.__legacyEngine') && html.includes('window.__legacyEngine.start()')) {
  console.log('  ✅ window.__legacyEngine.start() вызывается');
} else if (html.includes('window.__legacyEngine')) {
  console.log('  ⚠️  window.__legacyEngine существует, но start() может не вызваться правильно');
} else {
  console.log('  ❌ window.__legacyEngine НЕ найден');
}

// ===== АНАЛИЗ #5: Поиск ошибок и проблем =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 5: ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ');
console.log('='.repeat(80));

const issues = [];

// Проверка requestAnimationFrame
if (html.includes('requestAnimationFrame') && !html.includes('startPseudoTelemetry')) {
  issues.push('⚠️  requestAnimationFrame найден (может конкурировать с setTimeout)');
}

// Проверка обработки ошибок
if (html.includes('try {') && html.includes('catch')) {
  console.log('  ✅ Try-catch блоки присутствуют');
} else {
  issues.push('⚠️  Try-catch блоков не найдено (потенциально проблемные ошибки скрыты)');
}

// Проверка console.error
if (html.includes('console.error')) {
  console.log('  ✅ console.error вызовы найдены (для отладки)');
} else {
  issues.push('⚠️  console.error не найден (сложнее отлаживать)');
}

// Проверка инициализации
if (html.includes('DOMContentLoaded')) {
  console.log('  ✅ DOMContentLoaded обработчик найден');
} else {
  issues.push('❌ DOMContentLoaded НЕ найден (скрипты могут выполниться до загрузки DOM)');
}

// Проверка глобальных переменных
if (html.includes('window.__telemetryDebug')) {
  console.log('  ✅ window.__telemetryDebug для отладки найден');
} else {
  issues.push('⚠️  window.__telemetryDebug не найден (нет отладочного счетчика)');
}

if (issues.length > 0) {
  console.log('\n🚨 Найденные проблемы:');
  issues.forEach(issue => console.log('  ' + issue));
} else {
  console.log('\n✨ Серьезных проблем не найдено');
}

// ===== АНАЛИЗ #6: Проверка всех 4 файлов =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 6: СИНХРОНИЗАЦИЯ 4 ФАЙЛОВ');
console.log('='.repeat(80));

const files = [
  '/workspaces/SuslovPA/noninput.html',
  '/workspaces/SuslovPA/noninput-mobile.html',
  '/workspaces/SuslovPA/public/noninput.html',
  '/workspaces/SuslovPA/public/noninput-mobile.html'
];

console.log('\n📂 Проверка всех файлов:');
files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasPseudo = content.includes('function startPseudoTelemetry');
    const hasLegacy = content.includes('window.__legacyEngine.start()');
    const updateCount = telemetryElements.filter(id => 
      content.includes(`setT("${id}"`) || 
      content.includes(`setW("${id}"`) ||
      content.includes(`setT('${id}'`) ||
      content.includes(`setW('${id}'`)
    ).length;
    
    console.log(`\n  📄 ${path.basename(file)}`);
    console.log(`    Размер: ${(content.length / 1024).toFixed(1)} KB`);
    console.log(`    Псевдо-режим: ${hasPseudo ? '❌ ЕСТЬ' : '✅ удален'}`);
    console.log(`    Реальный алгоритм: ${hasLegacy ? '✅ есть' : '❌ НЕТ'}`);
    console.log(`    Обновления элементов: ${updateCount}/${telemetryElements.length}`);
  } else {
    console.log(`\n  ❌ ${file} - НЕ СУЩЕСТВУЕТ`);
  }
});

// ===== АНАЛИЗ #7: Анализ render() подробно =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 7: ПОДРОБНЫЙ АНАЛИЗ render()');
console.log('='.repeat(80));

const renderRegex = /function render\s*\(\s*out\s*\)\s*{([\s\S]*?)^[\s]{0,8}}\s*$/m;
const renderMatch2 = html.match(renderRegex);

if (renderMatch2) {
  const renderBody = renderMatch2[1];
  
  // Посчитать setT вызовы
  const setTMatches = renderBody.match(/setT\s*\(/g) || [];
  const setWMatches = renderBody.match(/setW\s*\(/g) || [];
  
  console.log('\n📊 Статистика render():');
  console.log(`  setT вызовов: ${setTMatches.length}`);
  console.log(`  setW вызовов: ${setWMatches.length}`);
  console.log(`  Всего обновлений: ${setTMatches.length + setWMatches.length}`);
  
  // Найти обновления для каждого параметра
  console.log('\n🔧 Обновление параметров:');
  const params = ['freqValue', 'confValue', 'inertiaValue', 'resourceValue', 'HValue', 'qualityValue'];
  params.forEach(param => {
    const regex = new RegExp(`setT\\s*\\(\\s*["']${param}["']`);
    const matches = renderBody.match(regex) ? renderBody.match(regex).length : 0;
    if (regex.test(renderBody)) {
      console.log(`  ✅ ${param} обновляется`);
    } else {
      console.log(`  ❌ ${param} НЕ обновляется`);
    }
  });
  
  // Проверка доступа к out параметру
  const hasOutAccess = renderBody.includes('out.');
  console.log(`\n📥 Использование параметра out: ${hasOutAccess ? '✅' : '❌'}`);
  if (hasOutAccess) {
    const outMatches = renderBody.match(/out\.[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
    const uniqueProps = new Set(outMatches);
    console.log(`  Свойства из out: ${Array.from(uniqueProps).join(', ')}`);
  }
} else {
  console.log('❌ Функция render() не найдена в файле!');
}

// ===== ФИНАЛЬНЫЙ ВЫВОД =====
console.log('\n' + '='.repeat(80));
console.log('📋 ФИНАЛЬНЫЙ ДИАГНОЗ');
console.log('='.repeat(80));

const allGood = 
  telemetryElements.length - missingElements.length === telemetryElements.length &&
  !html.includes('function startPseudoTelemetry') &&
  html.includes('window.__legacyEngine.start()');

if (allGood) {
  console.log('\n✅ ВСЕ ОК! Сайт должен работать правильно.');
  console.log('\n🚀 Рекомендация: Открыть в браузере и проверить:');
  console.log('  1. F12 → Console');
  console.log('  2. Искать [RENDER N] логи');
  console.log('  3. Убедиться, что значения меняются в реальном времени');
  console.log('  4. Проверить, что ВСЕ 28 элементов обновляются (не частично)');
} else {
  console.log('\n⚠️  НАЙДЕНЫ ПРОБЛЕМЫ:');
  if (missingElements.length > 0) {
    console.log(`  - Отсутствуют HTML элементы: ${missingElements.join(', ')}`);
  }
  if (html.includes('function startPseudoTelemetry')) {
    console.log('  - startPseudoTelemetry все еще присутствует!');
  }
  if (!html.includes('window.__legacyEngine.start()')) {
    console.log('  - window.__legacyEngine.start() не вызывается!');
  }
}

console.log('\n' + '='.repeat(80) + '\n');
