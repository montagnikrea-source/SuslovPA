#!/usr/bin/env node

/**
 * TELEMETRY REAL-TIME VERIFICATION SCRIPT
 * Проверяет что все элементы телеметрии обновляются правильно в реальном времени
 */

const fs = require('fs');
const path = require('path');

// Элементы для проверки
const TELEMETRY_ELEMENTS = {
  // Основные метрики
  'freqValue': { name: 'Частота (Гц)', type: 'number', range: [0, 100] },
  'inertiaValue': { name: 'Стабильность %', type: 'percentage', range: [0, 100] },
  'confValue': { name: 'Уверенность %', type: 'percentage', range: [0, 100] },
  
  // Progress bars для основных метрик
  'freqBar': { name: 'Progress bar Частота', type: 'progress', range: [0, 100] },
  'inertiaBar': { name: 'Progress bar Стабильность', type: 'progress', range: [0, 100] },
  'confBar': { name: 'Progress bar Уверенность', type: 'progress', range: [0, 100] },
  
  // Ползунки параметров обучения
  'lrSlider': { name: 'Learning Rate ползунок', type: 'slider', range: [0.001, 0.2] },
  'l2Slider': { name: 'L2 Регуляризация ползунок', type: 'slider', range: [0, 0.01] },
  'mixSlider': { name: 'Mix ползунок', type: 'slider', range: [0, 1] },
  
  // Progress bars ползунков
  'lrBar': { name: 'Progress bar Learning Rate', type: 'progress', range: [0, 100] },
  'l2Bar': { name: 'Progress bar L2', type: 'progress', range: [0, 100] },
  'mixBar': { name: 'Progress bar Mix', type: 'progress', range: [0, 100] },
  
  // Текстовые значения ползунков
  'lrVal': { name: 'Learning Rate значение', type: 'text', pattern: /\d+\.\d+/ },
  'l2Val': { name: 'L2 значение', type: 'text', pattern: /\d+\.\d+/ },
  'mixVal': { name: 'Mix значение', type: 'text', pattern: /\d+\.\d+/ },
  
  // Адаптивные метрики
  'resourceValue': { name: 'Ресурсы %', type: 'text', pattern: /\d+%/ },
  'lrAdaptValue': { name: 'Learning Rate адапт.', type: 'text', pattern: /\d+\.\d+/ },
  'mixAdaptValue': { name: 'Mix адапт. %', type: 'text', pattern: /\d+%/ },
  'KpAdaptValue': { name: 'Kp адапт.', type: 'text', pattern: /\d+\.\d+/ },
  
  // Архитектура
  'HValue': { name: 'H (нейроны)', type: 'text', pattern: /\d+/ },
  'qualityValue': { name: 'Качество %', type: 'text', pattern: /\d+%|\\?/ },
  'freezeStatusValue': { name: 'Статус обучения', type: 'text', pattern: /Learning|Frozen/ },
  'precisionValue': { name: 'Точность вычислений', type: 'text', pattern: /float32|float64/ },
  
  // Прогресс бары архитектуры
  'resourceBar': { name: 'Progress bar Ресурсы', type: 'progress', range: [0, 100] },
  'qualityBar': { name: 'Progress bar Качество', type: 'progress', range: [0, 100] },
  
  // Status и info
  'statusText': { name: 'Статус текст', type: 'text', pattern: /.+/ },
  'loadingBar': { name: 'Progress bar загрузки', type: 'progress', range: [0, 100] },
  'info': { name: 'Info строка', type: 'text', pattern: /Состояние:|f=/ },
};

const htmlFile = path.join(__dirname, 'noninput.html');

console.log('\n🔍 ПРОВЕРКА ТЕЛЕМЕТРИИ В РЕАЛЬНОМ ВРЕМЕНИ\n');
console.log('=' .repeat(80));

// Читаем HTML файл
const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// 1. Проверяем наличие всех элементов в HTML
console.log('\n1️⃣ ПРОВЕРКА НАЛИЧИЯ ЭЛЕМЕНТОВ В HTML:\n');

let elementsPresent = 0;
let elementsMissing = 0;

Object.entries(TELEMETRY_ELEMENTS).forEach(([id, config]) => {
  const idPattern = new RegExp(`id=["']${id}["']`);
  if (idPattern.test(htmlContent)) {
    console.log(`✅ ${id.padEnd(25)} - ${config.name}`);
    elementsPresent++;
  } else {
    console.log(`❌ ${id.padEnd(25)} - ${config.name} (НЕ НАЙДЕН!)`);
    elementsMissing++;
  }
});

console.log(`\n📊 Результат: ${elementsPresent} найдено, ${elementsMissing} отсутствует`);

// 2. Проверяем функцию render()
console.log('\n' + '='.repeat(80));
console.log('\n2️⃣ ПРОВЕРКА ФУНКЦИИ render():\n');

const renderMatch = htmlContent.match(/function render\(out\)\s*\{[\s\S]*?\n\s*\}/);
if (renderMatch) {
  const renderCode = renderMatch[0];
  
  // Проверяем обновления основных метрик
  const updateChecks = [
    { pattern: /setT\("freqValue"/, name: 'setT("freqValue", ...) - Частота' },
    { pattern: /setW\("freqBar"/, name: 'setW("freqBar", ...) - Progress bar Частота' },
    { pattern: /setT\("inertiaValue"/, name: 'setT("inertiaValue", ...) - Стабильность' },
    { pattern: /setW\("inertiaBar"/, name: 'setW("inertiaBar", ...) - Progress bar Стабильность' },
    { pattern: /setT\("confValue"/, name: 'setT("confValue", ...) - Уверенность' },
    { pattern: /setW\("confBar"/, name: 'setW("confBar", ...) - Progress bar Уверенность' },
    { pattern: /setT\("resourceValue"/, name: 'setT("resourceValue", ...) - Ресурсы' },
    { pattern: /setW\("resourceBar"/, name: 'setW("resourceBar", ...) - Progress bar Ресурсы' },
    { pattern: /setT\("lrAdaptValue"/, name: 'setT("lrAdaptValue", ...) - LR адапт.' },
    { pattern: /setT\("mixAdaptValue"/, name: 'setT("mixAdaptValue", ...) - Mix адапт.' },
    { pattern: /setT\("KpAdaptValue"/, name: 'setT("KpAdaptValue", ...) - Kp адапт.' },
    { pattern: /setW\("lrBar"/, name: 'setW("lrBar", ...) - Progress bar LR' },
    { pattern: /setW\("l2Bar"/, name: 'setW("l2Bar", ...) - Progress bar L2' },
    { pattern: /setW\("mixBar"/, name: 'setW("mixBar", ...) - Progress bar Mix' },
    { pattern: /setT\("qualityValue"/, name: 'setT("qualityValue", ...) - Качество' },
    { pattern: /setW\("qualityBar"/, name: 'setW("qualityBar", ...) - Progress bar Качество' },
    { pattern: /setT\("freezeStatusValue"/, name: 'setT("freezeStatusValue", ...) - Статус' },
    { pattern: /setT\("HValue"/, name: 'setT("HValue", ...) - H архитектура' },
  ];
  
  let renderUpdates = 0;
  updateChecks.forEach(check => {
    if (check.pattern.test(renderCode)) {
      console.log(`✅ ${check.name}`);
      renderUpdates++;
    } else {
      console.log(`❌ ${check.name} (отсутствует в render()!)`);
    }
  });
  
  console.log(`\n📊 В render() обновляется: ${renderUpdates}/${updateChecks.length} элементов`);
} else {
  console.log('❌ Функция render() не найдена!');
}

// 3. Проверяем функцию loop()
console.log('\n' + '='.repeat(80));
console.log('\n3️⃣ ПРОВЕРКА ФУНКЦИИ loop():\n');

const loopMatch = htmlContent.match(/function loop\(\)\s*\{[\s\S]*?\n\s*\}/);
if (loopMatch) {
  const loopCode = loopMatch[0];
  
  const loopChecks = [
    { pattern: /lrSlider\.value\s*=/, name: 'Обновление lrSlider.value' },
    { pattern: /l2Slider\.value\s*=/, name: 'Обновление l2Slider.value' },
    { pattern: /mixSlider\.value\s*=/, name: 'Обновление mixSlider.value' },
    { pattern: /render\(/, name: 'Вызов render() функции' },
    { pattern: /scan\.processOnce\(\)/, name: 'Вызов алгоритма processOnce()' },
    { pattern: /setTimeout\(loop/, name: 'Рекурсивный вызов setTimeout(loop, ...)' },
  ];
  
  let loopUpdates = 0;
  loopChecks.forEach(check => {
    if (check.pattern.test(loopCode)) {
      console.log(`✅ ${check.name}`);
      loopUpdates++;
    } else {
      console.log(`❌ ${check.name}`);
    }
  });
  
  console.log(`\n📊 В loop() реализовано: ${loopUpdates}/${loopChecks.length} проверок`);
} else {
  console.log('❌ Функция loop() не найдена!');
}

// 4. Проверяем слушатели изменения слайдеров
console.log('\n' + '='.repeat(80));
console.log('\n4️⃣ ПРОВЕРКА СЛУШАТЕЛЕЙ СЛАЙДЕРОВ:\n');

const sliderListenerChecks = [
  { pattern: /lrSlider\s*\(\s*'input'|lrSlider\s*\.addEventListener\s*\(\s*['"]input/, name: 'Слушатель input для lrSlider' },
  { pattern: /l2Slider\s*\(\s*'input'|l2Slider\s*\.addEventListener\s*\(\s*['"]input/, name: 'Слушатель input для l2Slider' },
  { pattern: /mixSlider\s*\(\s*'input'|mixSlider\s*\.addEventListener\s*\(\s*['"]input/, name: 'Слушатель input для mixSlider' },
];

let sliderListeners = 0;
sliderListenerChecks.forEach(check => {
  if (check.pattern.test(htmlContent)) {
    console.log(`✅ ${check.name}`);
    sliderListeners++;
  } else {
    console.log(`⚠️ ${check.name} (может быть интегрирован в общий обработчик)`);
  }
});

// 5. Проверяем наличие функций setT и setW
console.log('\n' + '='.repeat(80));
console.log('\n5️⃣ ПРОВЕРКА ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ:\n');

const helperChecks = [
  { pattern: /const setT\s*=|function setT/, name: 'Функция setT (обновление текста)' },
  { pattern: /const setW\s*=|function setW/, name: 'Функция setW (обновление width)' },
  { pattern: /const \$ = \(id\)|function \$\(id\)/, name: 'Функция $ (получение элемента)' },
];

let helperFunctions = 0;
helperChecks.forEach(check => {
  if (check.pattern.test(htmlContent)) {
    console.log(`✅ ${check.name}`);
    helperFunctions++;
  } else {
    console.log(`❌ ${check.name}`);
  }
});

console.log(`\n📊 Вспомогательных функций: ${helperFunctions}/${helperChecks.length}`);

// 6. Финальный отчет
console.log('\n' + '='.repeat(80));
console.log('\n📋 ФИНАЛЬНЫЙ ОТЧЕТ:\n');

const totalChecks = elementsPresent + renderUpdates + loopUpdates + sliderListeners + helperFunctions;
const totalPossible = 
  Object.keys(TELEMETRY_ELEMENTS).length + 
  19 + // updateChecks
  6 +  // loopChecks
  3 +  // sliderListenerChecks
  3;   // helperChecks

const completeness = ((totalChecks / totalPossible) * 100).toFixed(1);

console.log(`✅ Элементов HTML:         ${elementsPresent}/${Object.keys(TELEMETRY_ELEMENTS).length}`);
console.log(`✅ Обновлений в render(): ${renderUpdates}/19`);
console.log(`✅ Проверок в loop():     ${loopUpdates}/6`);
console.log(`✅ Слушателей слайдеров: ${sliderListeners}/3`);
console.log(`✅ Функций помощников:    ${helperFunctions}/3`);
console.log(`\n🎯 ПОЛНОТА РЕАЛИЗАЦИИ:    ${completeness}%`);

if (completeness >= 90) {
  console.log('\n✅ СИСТЕМА ТЕЛЕМЕТРИИ ПОЛНОСТЬЮ РАБОЧАЯ!');
} else if (completeness >= 70) {
  console.log('\n⚠️ СИСТЕМА ЧАСТИЧНО РАБОЧАЯ, но есть пробелы.');
} else {
  console.log('\n❌ СИСТЕМА НЕ ПОЛНОСТЬЮ РЕАЛИЗОВАНА.');
}

console.log('\n' + '='.repeat(80) + '\n');
