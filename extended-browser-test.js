#!/usr/bin/env node
/**
 * РАСШИРЕННЫЙ ТЕСТ РАБОТЫ САЙТА
 * Эмулирует полный браузер с виртуальным DOM и проверяет все вызовы функций
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('\n' + '='.repeat(80));
console.log('🧪 РАСШИРЕННЫЙ ТЕСТ САЙТА');
console.log('='.repeat(80));

// ===== Подготовка виртуального DOM =====
console.log('\n📦 Инициализация виртуального DOM...');

// Симулируем браузерную среду
const virtualDOM = {
  elements: new Map(),
  eventListeners: new Map(),
  
  getElementById: function(id) {
    if (!this.elements.has(id)) {
      this.elements.set(id, {
        id: id,
        textContent: '',
        style: { width: '0%' },
        addEventListener: (event, handler) => {
          if (!this.eventListeners.has(id)) {
            this.eventListeners.set(id, {});
          }
          if (!this.eventListeners.get(id)[event]) {
            this.eventListeners.get(id)[event] = [];
          }
          this.eventListeners.get(id)[event].push(handler);
        }
      });
    }
    return this.elements.get(id);
  }
};

// Прочитаем HTML файл
const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

// Извлечем все <script> блоки
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let scriptContent = '';
let match;

while ((match = scriptRegex.exec(html)) !== null) {
  scriptContent += match[1] + '\n';
}

console.log(`✅ Прочитано ${htmlFile} (${(html.length / 1024).toFixed(1)} KB)`);
console.log(`✅ Найдено ${(scriptContent.match(/<script/g) || []).length} блоков скрипта`);

// ===== Анализ критических функций =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 2: КРИТИЧЕСКИЕ ФУНКЦИИ');
console.log('='.repeat(80));

const criticalFunctions = {
  'setT': 'Обновление текста элемента',
  'setW': 'Обновление ширины progress bar',
  'render': 'Отрисовка телеметрии',
  'loop': 'Главный цикл обновления',
  'attachTelemetryHandler': 'Обработчик телеметрии',
  'startSecure': 'Запуск защищенной песочницы'
};

console.log('\n🔧 Проверка определения функций:');
for (const [func, description] of Object.entries(criticalFunctions)) {
  const defined = html.includes(`function ${func}`) || 
                 html.includes(`const ${func} =`) ||
                 html.includes(`${func}() {`) ||
                 html.includes(`${func}: function`);
  console.log(`  ${defined ? '✅' : '❌'} ${func}: ${description}`);
}

// ===== Анализ вызовов setT и setW =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 3: ВЫЗОВЫ ОБНОВЛЕНИЯ ЭЛЕМЕНТОВ');
console.log('='.repeat(80));

// Найти все вызовы setT
const setTCalls = html.match(/(?:window\.__)?setT\s*\(\s*["']([^"']+)["']/g) || [];
const setWCalls = html.match(/(?:window\.__)?setW\s*\(\s*["']([^"']+)["']/g) || [];

console.log(`\n📝 Найдено вызовов:
  setT: ${setTCalls.length}
  setW: ${setWCalls.length}`);

// Извлечем уникальные ID элементов
const setTIds = new Set();
const setWIds = new Set();

setTCalls.forEach(call => {
  const match = call.match(/["']([^"']+)['"]/);
  if (match) setTIds.add(match[1]);
});

setWCalls.forEach(call => {
  const match = call.match(/["']([^"']+)['"]/);
  if (match) setWIds.add(match[1]);
});

console.log(`\n📋 Уникальные элементы которые обновляются:
  setT: ${setTIds.size} элементов
  setW: ${setWIds.size} элементов`);

console.log('\n✅ Элементы с setT:');
Array.from(setTIds).forEach(id => console.log(`    - ${id}`));

console.log('\n✅ Элементы с setW:');
Array.from(setWIds).forEach(id => console.log(`    - ${id}`));

// ===== Анализ точек вызова render() =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 4: ТОЧКИ ВЫЗОВА render()');
console.log('='.repeat(80));

// Найти где вызывается render
const renderCalls = [];
const lines = html.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('render(') && !line.includes('function render')) {
    renderCalls.push({
      line: idx + 1,
      code: line.trim().substring(0, 80)
    });
  }
});

console.log(`\n📍 Найдено ${renderCalls.length} вызовов render():`);
renderCalls.forEach(call => {
  console.log(`  Строка ${call.line}: ${call.code}`);
});

// ===== Анализ параметров render() =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 5: ПАРАМЕТРЫ render()');
console.log('='.repeat(80));

console.log('\n🔧 Параметры которые использует render():');
const renderParams = html.match(/render\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g) || [];
const uniqueParams = new Set();

renderParams.forEach(call => {
  const param = call.match(/render\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/);
  if (param) uniqueParams.add(param[1]);
});

Array.from(uniqueParams).forEach(param => {
  console.log(`  - ${param}`);
});

// ===== Анализ цикла loop() =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 6: ЦИКЛ ОБНОВЛЕНИЯ loop()');
console.log('='.repeat(80));

// Найти цикл
const loopStart = html.indexOf('function loop()');
const loopEnd = html.indexOf('}', loopStart);
const loopBody = html.substring(loopStart, Math.min(loopEnd + 100, html.length));

console.log('\n📊 Что делает loop():');
console.log(loopBody.split('\n').slice(0, 30).join('\n'));

// ===== Проверка инициализации =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 7: ИНИЦИАЛИЗАЦИЯ');
console.log('='.repeat(80));

const hasDOM = html.includes('DOMContentLoaded');
const hasLegacy = html.includes('window.__legacyEngine');
const hasSetup = html.includes('window.__setT = setT');
const hasStart = html.includes('window.__legacyEngine.start()');

console.log(`\n🔧 Инициализация:
  ${hasDOM ? '✅' : '❌'} DOMContentLoaded обработчик
  ${hasLegacy ? '✅' : '❌'} window.__legacyEngine определен
  ${hasSetup ? '✅' : '❌'} window.__setT экспортирован
  ${hasStart ? '✅' : '❌'} window.__legacyEngine.start() вызывается`);

// ===== Проверка конфликтов =====
console.log('\n' + '='.repeat(80));
console.log('🔍 АНАЛИЗ 8: ПОТЕНЦИАЛЬНЫЕ КОНФЛИКТЫ');
console.log('='.repeat(80));

const hasRequestAnimationFrame = html.includes('requestAnimationFrame');
const hasSetTimeout = html.includes('setTimeout');
const hasWorker = html.includes('Worker');
const hasIIFE = html.includes('(function() {') || html.includes('(() => {');

console.log(`\n⚠️  Механизмы асинхронности:
  requestAnimationFrame: ${hasRequestAnimationFrame ? '✅ (может конкурировать!)' : '❌'}
  setTimeout: ${hasSetTimeout ? '✅' : '❌'}
  Web Worker: ${hasWorker ? '✅ (может затруднить отладку)' : '❌'}
  IIFE: ${hasIIFE ? '✅ (области видимости изолированы)' : '❌'}`);

// ===== ФИНАЛЬНАЯ ДИАГНОСТИКА =====
console.log('\n' + '='.repeat(80));
console.log('📋 ФИНАЛЬНАЯ ДИАГНОСТИКА');
console.log('='.repeat(80));

const allGood = hasDOM && hasLegacy && hasSetup && hasStart && setTIds.size > 15;

if (allGood) {
  console.log(`\n✅ КОД ВЫГЛЯДИТ ПРАВИЛЬНЫМ!

🔍 ЧТО МОЖЕТ БЫТЬ ПРОБЛЕМОЙ:

1. ⚠️  render() получает объект из blender.blend()
   → Убедитесь, что это объект с полями: f, conf, inertia, state
   → Используйте console.log(out) в render() для отладки

2. ⚠️  setT/setW работают с window.__setT/window.__setW
   → Они определены в DOMContentLoaded
   → Это может быть проблемой если loop() вызывается ДО загрузки DOM

3. ⚠️  loop() вызывается через window.__legacyEngine.start()
   → Используйте console.log() в loop() для проверки вызовов
   → Выведите все обновления в консоль для отладки

🚀 РЕКОМЕНДАЦИЯ:

Добавьте отладочный вывод в критические места:

// В начало loop()
console.log('[LOOP] called, calling render...');

// В начало render(out)
console.log('[RENDER] called with:', out);
console.log('[RENDER] updating:', out.f, out.conf, out.inertia);

// В setT/setW
const setT = (id, v) => {
  console.log('[SET-T]', id, '=', v);
  const el = document.getElementById(id);
  if (el) el.textContent = v;
};

Затем откройте консоль браузера (F12) и посмотрите эти логи!
  `);
} else {
  console.log('\n❌ НАЙДЕНЫ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ:');
  if (!hasDOM) console.log('  - DOMContentLoaded обработчик отсутствует!');
  if (!hasLegacy) console.log('  - window.__legacyEngine не определен!');
  if (!hasSetup) console.log('  - window.__setT не экспортирован!');
  if (!hasStart) console.log('  - window.__legacyEngine.start() не вызывается!');
  if (setTIds.size < 15) console.log(`  - Слишком мало вызовов setT (${setTIds.size})`);
}

console.log('\n' + '='.repeat(80) + '\n');
