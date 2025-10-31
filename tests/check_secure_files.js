const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256Hex(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }

const publicDir = path.resolve(__dirname, '../public');
const noninput = fs.readFileSync(path.join(publicDir, 'noninput.html'), 'utf8');

function extractExpected(html){
  const m = html.match(/const parts = \{[\s\S]*?\};\s*const EXPECTED = \{\s*shell:\s*parts\.a\.join\(""\)\s*,\s*sandbox:\s*parts\.b\.join\(""\)\s*\};/m);
  if(m){
    // extract the arrays directly
    const partsMatch = html.match(/const parts = \{([\s\S]*?)\};/m);
    if(!partsMatch) return null;
    const partsStr = partsMatch[1];
    const aMatch = partsStr.match(/a:\s*\[([^\]]+)\]/m);
    const bMatch = partsStr.match(/b:\s*\[([^\]]+)\]/m);
    if(!aMatch || !bMatch) return null;
    const parseArray = s=> s.split(',').map(x=>x.replace(/["'\s]/g,'')).filter(Boolean).join('');
    return { shell: parseArray(aMatch[1]), sandbox: parseArray(bMatch[1]) };
  }
  // fallback: try to match EXPECTED = { shell: '...', sandbox: '...'}
  const eMatch = html.match(/const EXPECTED = \{\s*shell:\s*['"]([0-9a-fA-F]+)['"],\s*sandbox:\s*['"]([0-9a-fA-F]+)['"]\s*\}/m);
  if(eMatch) return { shell: eMatch[1], sandbox: eMatch[2] };
  return null;
}

const expected = extractExpected(noninput);
if(!expected){
  console.error('Could not extract EXPECTED hashes from noninput.html');
  process.exit(2);
}
console.log('EXPECTED.shell:', expected.shell.slice(0,16)+'...');
console.log('EXPECTED.sandbox:', expected.sandbox.slice(0,16)+'...');

const files = [ ['secure/secure-shell.mjs', 'shell'], ['secure/algo-sandbox.html', 'sandbox'] ];
let allOk = true;
for(const [rel, key] of files){
  const p = path.join(publicDir, rel);
  if(!fs.existsSync(p)){
    console.error('Missing file:', p); allOk=false; continue;
  }
  const buf = fs.readFileSync(p);
  const h = sha256Hex(buf);
  console.log(rel, 'sha256:', h);
  if(h === expected[key]) console.log('  MATCH'); else { console.log('  MISMATCH'); allOk=false; }
}

// Basic sanity checks
try{
  const shellSrc = fs.readFileSync(path.join(publicDir,'secure','secure-shell.mjs'),'utf8');
  if(/export\s+default\s+class\s+SecureShell/.test(shellSrc)) console.log('secure-shell.mjs: export default class SecureShell present');
  else console.warn('secure-shell.mjs: export default class SecureShell not detected');
}catch(e){ }

try{
  const algo = fs.readFileSync(path.join(publicDir,'secure','algorithm-core.js'),'utf8');
  if(/function buildEngine\(\)/.test(algo)) console.log('algorithm-core.js: buildEngine found');
  else console.warn('algorithm-core.js: buildEngine not found');
}catch(e){}

process.exit(allOk?0:1);
