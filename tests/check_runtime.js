const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { performance } = require('perf_hooks');

async function main(){
  const file = path.resolve(__dirname, '../public/secure/algorithm-core.js');
  if(!fs.existsSync(file)){
    console.error('ERROR: file not found:', file);
    process.exit(2);
  }
  const code = fs.readFileSync(file, 'utf8');

  const sandbox = {
    window: {},
    performance,
    console,
    setTimeout,
    clearTimeout,
    Float64Array,
    Array,
    Math,
    Number,
    Date,
  };

  vm.createContext(sandbox);

  try{
    vm.runInContext(code, sandbox, { filename: file, displayErrors: true });
  }catch(err){
    console.error('ERROR while evaluating algorithm-core.js:', err);
    process.exit(3);
  }

  if(typeof sandbox.window.buildEngine !== 'function'){
    console.error('FAIL: window.buildEngine is not a function (found:', typeof sandbox.window.buildEngine, ')');
    process.exit(4);
  }

  const eng = sandbox.window.buildEngine();
  if(!eng || typeof eng !== 'object'){
    console.error('FAIL: buildEngine() did not return an object:', eng);
    process.exit(5);
  }

  // Basic runtime interaction: call sample() and ensure sample_count increments
  if(!eng.s || typeof eng.s.sample !== 'function'){
    console.error('FAIL: engine.s.sample not available');
    process.exit(6);
  }

  const before = eng.s.sample_count || 0;
  try{
    eng.s.sample();
  }catch(err){
    console.error('ERROR during s.sample():', err);
    process.exit(7);
  }
  const after = eng.s.sample_count || 0;

  if(after > before){
    console.log('OK: buildEngine() exists and s.sample() ran — sample_count', before, '->', after);
    process.exit(0);
  }else{
    console.error('WARN: s.sample() did not increase sample_count (before:', before, 'after:', after, ')');
    process.exit(8);
  }
}

main();
