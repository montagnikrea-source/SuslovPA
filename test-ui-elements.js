#!/usr/bin/env node
/**
 * ТЕСТ ИНТЕРФЕЙСА И ЭЛЕМЕНТОВ
 * Проверяет что все элементы на панели обновляются правильно
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔍 ПРОВЕРКА ИНТЕРФЕЙСА');
console.log('='.repeat(80));

const htmlFile = '/workspaces/SuslovPA/noninput.html';
const html = fs.readFileSync(htmlFile, 'utf8');

// ===== ПРОВЕРКА ЭЛЕМЕНТОВ ОБУЧЕНИЯ =====
console.log('\n📊 ПАРАМЕТРЫ ОБУЧЕНИЯ (Learning Rate, L2, Mix):');
console.log('='.repeat(80));

const learningParams = [
  { name: 'Learning Rate (lr)', slider: 'lrSlider', val: 'lrVal', bar: 'lrBar', auto: 'lrAuto' },
  { name: 'L2-регуляризация (l2)', slider: 'l2Slider', val: 'l2Val', bar: 'l2Bar', auto: 'l2Auto' },
  { name: 'Смешивание NN/PI (mix)', slider: 'mixSlider', val: 'mixVal', bar: 'mixBar', auto: 'mixAuto' }
];

learningParams.forEach(param => {
  console.log(`\n🔧 ${param.name}:`);
  
  // Проверить наличие элементов
  const hasSlider = html.includes(`id="${param.slider}"`) || html.includes(`id='${param.slider}'`);
  const hasVal = html.includes(`id="${param.val}"`) || html.includes(`id='${param.val}'`);
  const hasBar = html.includes(`id="${param.bar}"`) || html.includes(`id='${param.bar}'`);
  const hasAuto = html.includes(`id="${param.auto}"`) || html.includes(`id='${param.auto}'`);
  
  console.log(`  Slider #${param.slider}: ${hasSlider ? '✅' : '❌'}`);
  console.log(`  Value #${param.val}: ${hasVal ? '✅' : '❌'}`);
  console.log(`  Progress bar #${param.bar}: ${hasBar ? '✅' : '❌'}`);
  console.log(`  Auto checkbox #${param.auto}: ${hasAuto ? '✅' : '❌'}`);
  
  // Проверить обновление в render()
  const updateVal = html.includes(`setT("${param.val}"`) || html.includes(`__setT("${param.val}"`);
  const updateBar = html.includes(`setW("${param.bar}"`) || html.includes(`__setW("${param.bar}"`);
  
  console.log(`  Обновление Value в render(): ${updateVal ? '✅' : '❌ НЕ ОБНОВЛЯЕТСЯ!'}`);
  console.log(`  Обновление Bar в render(): ${updateBar ? '✅' : '❌ НЕ ОБНОВЛЯЕТСЯ!'}`);
  
  // Проверить обработку изменения слайдера
  const hasEventListener = html.includes(`${param.slider}.addEventListener`) || 
                          html.includes(`$("${param.slider}").addEventListener`) ||
                          html.includes(`getElementById("${param.slider}").addEventListener`);
  console.log(`  Event listener на слайдер: ${hasEventListener ? '✅' : '⚠️  Может быть пропущен'}`);
});

// ===== ПРОВЕРКА ОБНОВЛЕНИЯ ЗНАЧЕНИЙ В render() =====
console.log('\n' + '='.repeat(80));
console.log('🔍 ОБНОВЛЕНИЯ В render() ФУНКЦИИ:');
console.log('='.repeat(80));

// Найти функцию render
const renderMatch = html.match(/function render\s*\(\s*out\s*\)\s*{([\s\S]*?)^[\s]{0,8}}/m);
if (renderMatch) {
  const renderBody = renderMatch[1];
  
  console.log('\n✅ Найдены обновления в render():');
  
  // Проверить обновления слайдеров
  const sliderUpdates = [
    { param: 'lrSlider', pattern: 'lrSlider.value' },
    { param: 'l2Slider', pattern: 'l2Slider.value' },
    { param: 'mixSlider', pattern: 'mixSlider.value' }
  ];
  
  sliderUpdates.forEach(item => {
    if (renderBody.includes(item.pattern)) {
      console.log(`  ✅ ${item.param} обновляется`);
    } else {
      console.log(`  ❌ ${item.param} НЕ обновляется!`);
    }
  });
  
  // Проверить обновления значений
  const valueUpdates = [
    { param: 'lrVal', pattern: 'lrVal' },
    { param: 'l2Val', pattern: 'l2Val' },
    { param: 'mixVal', pattern: 'mixVal' }
  ];
  
  console.log('\n✅ Обновления значений:');
  valueUpdates.forEach(item => {
    if (renderBody.includes(`setT("${item.param}"`)) {
      console.log(`  ✅ ${item.param} обновляется`);
    } else {
      console.log(`  ❌ ${item.param} НЕ обновляется!`);
    }
  });
  
  // Проверить обновления progress bars
  const barUpdates = [
    { param: 'lrBar' },
    { param: 'l2Bar' },
    { param: 'mixBar' }
  ];
  
  console.log('\n✅ Обновления progress bars:');
  barUpdates.forEach(item => {
    if (renderBody.includes(`setW("${item.param}"`) || renderBody.includes(`__setW("${item.param}"`)) {
      console.log(`  ✅ ${item.param} обновляется`);
    } else {
      console.log(`  ❌ ${item.param} НЕ обновляется!`);
    }
  });
} else {
  console.log('❌ Функция render() не найдена!');
}

// ===== ПРОВЕРКА EVENT LISTENERS =====
console.log('\n' + '='.repeat(80));
console.log('🔍 EVENT LISTENERS НА ПОЛЗУНКИ:');
console.log('='.repeat(80));

const eventListenerPatterns = [
  { slider: 'lrSlider', pattern: /lrSlider\s*\.addEventListener|getElementById\s*\(\s*["']lrSlider["']\s*\)\s*\.addEventListener/ },
  { slider: 'l2Slider', pattern: /l2Slider\s*\.addEventListener|getElementById\s*\(\s*["']l2Slider["']\s*\)\s*\.addEventListener/ },
  { slider: 'mixSlider', pattern: /mixSlider\s*\.addEventListener|getElementById\s*\(\s*["']mixSlider["']\s*\)\s*\.addEventListener/ }
];

eventListenerPatterns.forEach(item => {
  if (item.pattern.test(html)) {
    console.log(`\n✅ ${item.slider} имеет event listener`);
    
    // Найти что делает listener
    const match = html.match(new RegExp(`${item.slider}\\.addEventListener\\([^,]+,\\s*(?:function|\\(|\\w+)\\s*[{\\(][\\s\\S]{0,500}(?:setT|setW)`));
    if (match) {
      console.log(`   └─ Обновляет DOM элементы`);
    }
  } else {
    console.log(`\n❌ ${item.slider} НЕ имеет event listener!`);
  }
});

// ===== ПРОВЕРКА СВЯЗИ СЛАЙДЕР -> ЗНАЧЕНИЕ -> PROGRESS BAR =====
console.log('\n' + '='.repeat(80));
console.log('🔗 СВЯЗЬ: СЛАЙДЕР → ЗНАЧЕНИЕ → PROGRESS BAR');
console.log('='.repeat(80));

learningParams.forEach(param => {
  console.log(`\n${param.name}:`);
  console.log(`  1️⃣  Слайдер #${param.slider}`);
  console.log(`       ↓ (value меняется)`);
  console.log(`  2️⃣  Текст #${param.val}`);
  console.log(`       ↓ (процент/значение)`);
  console.log(`  3️⃣  Progress bar #${param.bar}`);
  console.log(`       ↓ (width меняется)`);
  
  // Проверить логику обновления
  if (html.includes(`${param.slider}.value`)) {
    console.log(`  ✅ Слайдер подключен к render()`);
  } else {
    console.log(`  ❌ Слайдер НЕ подключен к render()`);
  }
});

// ===== ПРОВЕРКА AUTO CHECKBOXES =====
console.log('\n' + '='.repeat(80));
console.log('🔍 AUTO CHECKBOXES:');
console.log('='.repeat(80));

learningParams.forEach(param => {
  console.log(`\n${param.name}:`);
  
  const hasAuto = html.includes(`id="${param.auto}"`);
  console.log(`  Checkbox #${param.auto}: ${hasAuto ? '✅' : '❌'}`);
  
  if (html.includes(`${param.auto}.checked`)) {
    console.log(`  ✅ Логика обработки AUTO найдена`);
  } else {
    console.log(`  ⚠️  Логика обработки AUTO может быть пропущена`);
  }
});

// ===== ФИНАЛЬНЫЙ ОТЧЕТ =====
console.log('\n' + '='.repeat(80));
console.log('📋 РЕКОМЕНДАЦИИ');
console.log('='.repeat(80));

console.log(`
✅ ЧТО ПРОВЕРИТЬ В БРАУЗЕРЕ:

1. 🔧 Параметры обучения (Learning Rate, L2, Mix):
   - Откройте DevTools (F12 → Console)
   - Нажмите кнопку "СТАРТ"
   - Убедитесь что видны логи [SET-T] и [SET-W]
   - Проверьте:
     * Слайдер меняет значение: №1 (элемент меняется)
     * Текстовое поле обновляется: №2 (видно в консоли [SET-T])
     * Progress bar заполняется: №3 (видно в консоли [SET-W])

2. 📊 Всех 28 элементов телеметрии:
   - Должны обновляться каждые ~160ms
   - Должны быть видны логи типа:
     [SET-T] #freqValue = "2.345"
     [SET-W] #freqBar = 23%
     [SET-T] #lrVal = "0.030"
     [SET-W] #lrBar = 14%

3. 🎛️ AUTO checkboxes:
   - Должны переключаться между ручным и автоматическим режимом
   - При AUTO = ON: слайдеры должны игнорироваться
   - При AUTO = OFF: слайдеры должны управляться вручную

4. 🔄 Event Listeners:
   - Когда вы движете слайдер → должны быть логи обновления
   - Когда вы кликаете AUTO → должны быть логи переключения

💡 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

Выполните в консоли браузера:

// 1. Проверить что render() вызывается
console.log('RENDER вызовов:', window.__telemetryDebug || 0)

// 2. Проверить что setT/setW работают
console.log('SET-T вызовов:', window.__setT_calls || 0)
console.log('SET-W вызовов:', window.__setW_calls || 0)

// 3. Проверить значения слайдеров
console.log('lrSlider:', document.getElementById('lrSlider')?.value)
console.log('l2Slider:', document.getElementById('l2Slider')?.value)
console.log('mixSlider:', document.getElementById('mixSlider')?.value)

// 4. Проверить текстовые значения
console.log('lrVal:', document.getElementById('lrVal')?.textContent)
console.log('l2Val:', document.getElementById('l2Val')?.textContent)
console.log('mixVal:', document.getElementById('mixVal')?.textContent)

// 5. Проверить progress bars
console.log('lrBar width:', document.getElementById('lrBar')?.style.width)
console.log('l2Bar width:', document.getElementById('l2Bar')?.style.width)
console.log('mixBar width:', document.getElementById('mixBar')?.style.width)

// 6. Проверить AUTO checkboxes
console.log('lrAuto checked:', document.getElementById('lrAuto')?.checked)
console.log('l2Auto checked:', document.getElementById('l2Auto')?.checked)
console.log('mixAuto checked:', document.getElementById('mixAuto')?.checked)

ЕСЛИ КАКОЙ-ТО ЭЛЕМЕНТ ВОЗВРАЩАЕТ NULL → он не найден в HTML!
ЕСЛИ ЗНАЧЕНИЕ НЕ МЕНЯЕТСЯ → render() не вызывается для этого элемента!
`);

console.log('='.repeat(80) + '\n');
