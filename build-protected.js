#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Простая обфускация JavaScript
function obfuscateJS(code) {
  // Заменяем переменные на случайные имена
  const variables = ['multiUserChat', 'frequencyScanner', 'telegramConfig'];
  const obfuscatedVars = {};
  
  variables.forEach(variable => {
    const randomName = '_' + Math.random().toString(36).substr(2, 8);
    obfuscatedVars[variable] = randomName;
    code = code.replace(new RegExp(variable, 'g'), randomName);
  });
  
  // Удаляем комментарии
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/\/\/.*$/gm, '');
  
  // Минифицируем пробелы
  code = code.replace(/\s+/g, ' ');
  
  // Добавляем защитный заголовок
  const protection = `
// ⚠️ ЗАЩИЩЕННЫЙ КОД - КОПИРОВАНИЕ ЗАПРЕЩЕНО ⚠️
// © 2025 SuslovPA - Все права защищены
// Несанкционированное копирование преследуется по закону
//
// Anti-copy protection active
(function(){
  if(window.location.hostname !== 'montagnikrea-source.github.io' && 
     window.location.hostname !== 'localhost' && 
     window.location.hostname !== '127.0.0.1') {
    document.body.innerHTML = '<h1>⛔ Доступ запрещен</h1><p>Этот код защищен от копирования.</p>';
    return;
  }
})();

// Защита от DevTools
let devtools = {open: false, orientation: null};
setInterval(function(){
  if(window.outerHeight - window.innerHeight > 160 || window.outerWidth - window.innerWidth > 160) {
    if(!devtools.open) {
      devtools.open = true;
      console.clear();
      console.log('%c⛔ ПРЕДУПРЕЖДЕНИЕ', 'color:red;font-size:30px;font-weight:bold;');
      console.log('%cЭтот код защищен авторским правом!', 'color:red;font-size:16px;');
    }
  } else {
    devtools.open = false;
  }
}, 500);

// Защита от правой кнопки мыши
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

// Защита от горячих клавиш
document.addEventListener('keydown', function(e) {
  if(e.key === 'F12' || 
     (e.ctrlKey && e.shiftKey && e.key === 'I') ||
     (e.ctrlKey && e.shiftKey && e.key === 'C') ||
     (e.ctrlKey && e.key === 'U') ||
     (e.ctrlKey && e.key === 'S')) {
    e.preventDefault();
    return false;
  }
});

`;
  
  return protection + code;
}

// Читаем исходный файл
const htmlContent = fs.readFileSync('noninput.html', 'utf8');

// Обфускуем JavaScript
const obfuscatedContent = obfuscateJS(htmlContent);

// Сохраняем защищенную версию
fs.writeFileSync('noninput-protected.html', obfuscatedContent);

console.log('✅ Создана защищенная версия: noninput-protected.html');
console.log('🔒 Добавлены защиты:');
console.log('  - Проверка домена');
console.log('  - Защита от DevTools');
console.log('  - Блокировка правой кнопки мыши');
console.log('  - Защита от горячих клавиш');
console.log('  - Обфускация переменных');
console.log('  - Удаление комментариев');