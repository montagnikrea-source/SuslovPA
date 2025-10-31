const fs = require('fs');
const crypto = require('crypto');

const NONINPUT_PATH = 'public/noninput.html';
const FILES = {
  a: 'public/secure/secure-shell.mjs',
  b: 'public/secure/algo-sandbox.html'
};

function getBlocks(path) {
  const data = fs.readFileSync(path);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const blocks = [];
  for(let i=0;i<hash.length;i+=8) blocks.push(hash.slice(i,i+8));
  return blocks;
}

const newParts = {
  a: getBlocks(FILES.a),
  b: getBlocks(FILES.b)
};

let html = fs.readFileSync(NONINPUT_PATH, 'utf8');
const scriptRe = /(<script\s+type="module">[\s\S]*?)(const\s+parts\s*=\s*\{[\s\S]*?};\s*const\s+EXPECTED\s*=\s*\{[\s\S]*?\};)([\s\S]*?<\/script>)/m;

const newFrag = `const parts = {
  a: ${JSON.stringify(newParts.a)},
  b: ${JSON.stringify(newParts.b)}
};
const EXPECTED = { shell: parts.a.join("") , sandbox: parts.b.join("") };`;

if(scriptRe.test(html)){
  html = html.replace(scriptRe, (_, pre, oldFrag, post) => `${pre}${newFrag}${post}`);
  fs.writeFileSync(NONINPUT_PATH, html);
  console.log('public/noninput.html обновлён — SRI parts и EXPECTED обновлены.');
} else {
  console.error('Не найден нужный JS-блок в public/noninput.html');
}
