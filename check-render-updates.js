#!/usr/bin/env node

/**
 * ДЕТАЛЬНЫЙ АНАЛИЗ - КАКИЕ ЭЛЕМЕНТЫ ОБНОВЛЯЮТСЯ В render()
 */

const fs = require('fs');

const html = fs.readFileSync('/workspaces/SuslovPA/noninput.html', 'utf8');

// Найдем функцию render
const renderStart = html.indexOf('function render(out)');
const renderEnd = html.indexOf('\n          function ', renderStart + 1);
const renderBody = html.substring(renderStart, renderEnd);

console.log(`\n${'═'.repeat(100)}`);
console.log(`📋 ДЕТАЛЬНЫЙ АНАЛИЗ ФУНКЦИИ render()\n`);

// Найдем все setT и setW вызовы
const setTMatches = [...renderBody.matchAll(/setT\s*\(\s*["']([^"']+)["']/g)];
const setWMatches = [...renderBody.matchAll(/setW\s*\(\s*["']([^"']+)["']/g)];

console.log(`🔴 ОБНОВЛЕНИЯ ТЕКСТА (setT) - ${setTMatches.length}:\n`);
const setText = new Set();
setTMatches.forEach((match, i) => {
  const id = match[1];
  setText.add(id);
  console.log(`   ${(i+1).toString().padEnd(3)} setT("${id}")`);
});

console.log(`\n🟠 ОБНОВЛЕНИЯ ШИРИНЫ/PROGRESS (setW) - ${setWMatches.length}:\n`);
const setWidth = new Set();
setWMatches.forEach((match, i) => {
  const id = match[1];
  setWidth.add(id);
  console.log(`   ${(i+1).toString().padEnd(3)} setW("${id}")`);
});

// Теперь проверим ВСЕ элементы HTML
console.log(`\n${'─'.repeat(100)}\n`);
console.log(`🔍 АНАЛИЗ ВСЕХ HTML ЭЛЕМЕНТОВ:\n`);

const allElements = [
  // Основные метрики
  { id: 'freqValue', type: 'text', desc: 'Частота (текст)' },
  { id: 'freqBar', type: 'width', desc: 'Частота (progress)' },
  { id: 'inertiaValue', type: 'text', desc: 'Стабильность (текст)' },
  { id: 'inertiaBar', type: 'width', desc: 'Стабильность (progress)' },
  { id: 'confValue', type: 'text', desc: 'Уверенность (текст)' },
  { id: 'confBar', type: 'width', desc: 'Уверенность (progress)' },
  
  // Ресурсы
  { id: 'resourceValue', type: 'text', desc: 'Ресурсы (текст)' },
  { id: 'resourceBar', type: 'width', desc: 'Ресурсы (progress)' },
  
  // Адаптивные
  { id: 'lrAdaptValue', type: 'text', desc: 'LR адаптивный' },
  { id: 'mixAdaptValue', type: 'text', desc: 'Mix адаптивный' },
  { id: 'KpAdaptValue', type: 'text', desc: 'Kp адаптивный' },
  
  // Слайдеры
  { id: 'lrSlider', type: 'slider', desc: 'Слайдер LR' },
  { id: 'lrVal', type: 'text', desc: 'LR значение' },
  { id: 'lrBar', type: 'width', desc: 'LR progress' },
  { id: 'l2Slider', type: 'slider', desc: 'Слайдер L2' },
  { id: 'l2Val', type: 'text', desc: 'L2 значение' },
  { id: 'l2Bar', type: 'width', desc: 'L2 progress' },
  { id: 'mixSlider', type: 'slider', desc: 'Слайдер Mix' },
  { id: 'mixVal', type: 'text', desc: 'Mix значение' },
  { id: 'mixBar', type: 'width', desc: 'Mix progress' },
  
  // Архитектура
  { id: 'HValue', type: 'text', desc: 'H (нейроны)' },
  { id: 'qualityValue', type: 'text', desc: 'Качество' },
  { id: 'qualityBar', type: 'width', desc: 'Качество progress' },
  { id: 'freezeStatusValue', type: 'text', desc: 'Статус обучения' },
  { id: 'precisionValue', type: 'text', desc: 'Точность' },
  
  // Статус
  { id: 'statusText', type: 'text', desc: 'Статус текст' },
  { id: 'loadingBar', type: 'width', desc: 'Loading progress' },
  { id: 'info', type: 'text', desc: 'Информация' },
];

let working = 0;
let missing = 0;
let partialIssue = [];

allElements.forEach(elem => {
  const hasInHTML = html.includes(`id="${elem.id}"`);
  const hasSetT = setText.has(elem.id);
  const hasSetW = setWidth.has(elem.id);
  
  const hasUpdate = (elem.type === 'text' && hasSetT) ||
                    (elem.type === 'width' && hasSetW) ||
                    (elem.type === 'slider'); // Слайдеры не нуждаются в setT/setW
  
  if (!hasInHTML) {
    console.log(`   ❌ ${elem.id.padEnd(25)} - НЕТУ В HTML!`);
    missing++;
  } else if (!hasUpdate && elem.type !== 'slider') {
    console.log(`   ⚠️ ${elem.id.padEnd(25)} - В HTML НО НЕ ОБНОВЛЯЕТСЯ!`);
    partialIssue.push(elem.id);
  } else {
    console.log(`   ✅ ${elem.id.padEnd(25)} - OK (${elem.desc})`);
    working++;
  }
});

console.log(`\n${'═'.repeat(100)}\n`);
console.log(`📊 ИТОГИ:\n`);
console.log(`   ✅ Работают:           ${working}/${allElements.length}`);
console.log(`   ❌ Не найдены в HTML:  ${missing}`);
console.log(`   ⚠️ Не обновляются:     ${partialIssue.length}`);

if (partialIssue.length > 0) {
  console.log(`\n⚠️ ЭЛЕМЕНТЫ ЧТО НЕ ОБНОВЛЯЮТСЯ (нужно добавить setT/setW):\n`);
  partialIssue.forEach(id => {
    console.log(`   • ${id}`);
  });
  console.log(`\n🔧 НУЖНО ДОБАВИТЬ В render():\n`);
  partialIssue.forEach(id => {
    console.log(`   setT("${id}", ...);`);
  });
}

console.log(`\n${'═'.repeat(100)}\n`);
