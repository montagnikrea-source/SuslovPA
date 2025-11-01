#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  '/workspaces/SuslovPA/noninput-mobile.html',
  '/workspaces/SuslovPA/public/noninput.html',
  '/workspaces/SuslovPA/public/noninput-mobile.html'
];

function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Добавляем window экспорты после определения setT и setW
  const exportPattern = /const setT = \(id, v\) => \{[\s\S]*?\n        \};/;
  if (content.match(exportPattern)) {
    content = content.replace(
      /const setT = \(id, v\) => \{[\s\S]*?\n        \};[\n\s]*const setW = \(id, p\) => \{[\s\S]*?\n        \};/,
      (match) => {
        // Добавляем экспорты после setW
        return match + '\n        // Экспортируем в глобальный scope для IIFE\n        window.__setT = setT;\n        window.__setW = setW;\n        window.__$ = $_p;';
      }
    );
  }
  
  // 2. Удаляем дублирующиеся определения setT/setW в IIFE (около строки 11105)
  content = content.replace(
    /const setT = \(id, v\) => \{\s*return \$\(id\)\.textContent = v;\s*\};\s*const setW = \(id, p\) => \{\s*const el = \$\(id\);\s*if \(el\) el\.style\.width = p \+ "%";\s*\};/,
    '// ИСПОЛЬЗУЕМ setT И setW ИЗ ВНЕШНЕГО SCOPE'
  );
  
  // 3. Заменяем все setT( на window.__setT( внутри render()
  // Нужно быть осторожным - только внутри функции render
  
  // Найдём функцию render и заменим внутри неё
  const renderMatch = content.match(/function render\(out\) \{[\s\S]*?\n          function loop\(\)/);
  if (renderMatch) {
    let renderFunc = renderMatch[0];
    const origRender = renderFunc;
    
    // Заменяем setT на window.__setT
    renderFunc = renderFunc.replace(/setT\(/g, 'window.__setT(');
    renderFunc = renderFunc.replace(/setW\(/g, 'window.__setW(');
    renderFunc = renderFunc.replace(/\$\(/g, 'window.__$(');
    
    content = content.replace(origRender, renderFunc);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
}

files.forEach(file => {
  if (fs.existsSync(file)) {
    fixFile(file);
  } else {
    console.log(`⚠ File not found: ${file}`);
  }
});

console.log('\nAll files processed!');
