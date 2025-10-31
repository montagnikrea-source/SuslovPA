const fs = require('fs');
const crypto = require('crypto');

const NONINPUT_PATH = 'noninput.html';
const FILES = {
  a: 'secure/secure-shell.mjs',
  b: 'secure/algo-sandbox.html'
};

// Вычисляет SHA-256 и разбивает на блоки по 8 символов
function getBlocks(path) {
  const data = fs.readFileSync(path);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const blocks = [];
  for(let i=0;i<hash.length;i+=8) blocks.push(hash.slice(i,i+8));
  return blocks;
}

// Получаем новые значения
const newParts = {
  a: getBlocks(FILES.a),
  b: getBlocks(FILES.b)
};
const newExpected = {
  shell: newParts.a.join(''),
  sandbox: newParts.b.join('')
};

// Ищем <script type="module"> блок
let html = fs.readFileSync(NONINPUT_PATH, 'utf8');
const scriptRe = /(<script\s+type="module">[\s\S]*?)(const\s+parts\s*=\s*\{[\s\S]*?};\s*const\s+EXPECTED\s*=\s*\{[\s\S]*?\};)([\s\S]*?<\/script>)/m;

// Формируем новый JS-фрагмент
const newFrag = `const parts = {
  a: ${JSON.stringify(newParts.a)},
  b: ${JSON.stringify(newParts.b)}
};
const EXPECTED = { shell: parts.a.join(""), sandbox: parts.b.join("") };`;

// Заменяем в файле
if(scriptRe.test(html)) {
  html = html.replace(scriptRe, (_, pre, oldFrag, post) => `${pre}${newFrag}${post}`);
  fs.writeFileSync(NONINPUT_PATH, html);
  console.log('noninput.html обновлён! Проверяйте новые значения parts и EXPECTED.');
} else {
  console.error('Не найден нужный JS-блок в noninput.html!');
}
