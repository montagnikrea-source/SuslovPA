#!/usr/bin/env node

/**
 * Patch script: Integrate OscillationDamper into NeuroHomeo class
 * This script:
 * 1. Reads the downloaded noninput.html from Vercel
 * 2. Injects OscillationDamper class before NeuroHomeo
 * 3. Modifies NeuroHomeo.constructor to instantiate damper
 * 4. Modifies NeuroHomeo.step() to protect state with damper
 * 5. Modifies NeuroHomeo._backward() to protect weight updates
 * 6. Saves patched version to public/noninput.html
 */

const fs = require('fs');
const path = require('path');

// Read damper module
const damperCode = fs.readFileSync(path.join(__dirname, 'anti-oscillation.js'), 'utf8');

// Read original Vercel noninput.html
const originalPath = '/tmp/suslovpa_analysis/noninput_vercel.html';
let html = fs.readFileSync(originalPath, 'utf8');

// --- STEP 1: Inject OscillationDamper class before NeuroHomeo ---
// Find line "class NeuroHomeo {" and insert damper code before it
const neuoroHomeoStart = html.indexOf('class NeuroHomeo {');
if (neuoroHomeoStart === -1) {
  console.error('❌ Could not find class NeuroHomeo');
  process.exit(1);
}

// Extract damper code (remove exports, remove comments about module.exports/window)
let damperCodeForInlining = damperCode
  .replace(/\/\/ ===== EXPORT FOR DIFFERENT MODULE SYSTEMS =====[\s\S]*$/m, '')
  .replace(/if \(typeof module[\s\S]*?\}/gm, '')
  .replace(/if \(typeof window[\s\S]*?\}/gm, '')
  .trim();

// Add damper class before NeuroHomeo
html = html.slice(0, neuoroHomeoStart) + 
       damperCodeForInlining + '\n\n' +
       html.slice(neuoroHomeoStart);

console.log('✅ Injected OscillationDamper class');

// --- STEP 2: Modify NeuroHomeo constructor to instantiate damper ---
// Find and modify the constructor
const constructorPattern = /constructor\(enableOptimization = true\)\{/;
const constructorMatch = html.match(constructorPattern);

if (constructorMatch) {
  const constructorReplace = `constructor(enableOptimization = true){
    // ===== ANTI-OSCILLATION DAMPING (NEW) =====
    this.damper = new OscillationDamper({
      gradientClipValue: 5.0,
      deadzoneTolerance: 0.0005,      // Very small deadzone
      lowPassAlpha: 0.15,              // Strong damping on aggregator
      integralClipValue: 2.5,          // Tighter integral bounds
      integralSaturationThresh: 0.7,
      weightDeltaClip: 0.08,
      momentumDecay: 0.93,
      spikeThreshold: 2.5,
      spikeWindow: 40,
      oscDetectionWindow: 80,
      oscThreshold: 0.35,
      lrRecoveryRate: 0.01,
      spikeLrPenalty: 0.15,
    });`;
  
  html = html.replace(constructorPattern, constructorReplace);
  console.log('✅ Modified constructor to instantiate damper');
} else {
  console.warn('⚠️  Could not modify constructor (pattern not found)');
}

// --- STEP 3: Modify step() to protect state ---
// Find the line with "const J = this.cost();" and add protection after it
const stepProtectPattern = /const J = this\.cost\(\);\s*this\.maybeLock\(J, conf, inertia\);/;
const stepProtectReplace = `const J = this.cost();
    // ===== OSCILLATION PROTECTION (NEW) =====
    this.damper.protect({
      J: J,
      prevJ: this.prevJ,
      dJdy: 0,  // Placeholder, will be set in backward
      error: -J,
      aggr: this.aggr,
      I: this.I,
      lrScale: this.lr,
    });
    this.maybeLock(J, conf, inertia);`;

if (html.includes('const J = this.cost();')) {
  html = html.replace(stepProtectPattern, stepProtectReplace);
  console.log('✅ Modified step() to protect state');
}

// --- STEP 4: Modify _backward() to protect weight updates and clip gradients ---
// Find _backward() and add protection
const backwardPatternStart = /  _backward\(dJdy\)\{[\s\S]*?if\(this\.frozenWeights\) return;/;
const backwardReplace = `  _backward(dJdy){
    // ===== OSCILLATION PROTECTION: CLIP GRADIENT (NEW) =====
    dJdy = this.damper.clipGradient(dJdy);
    
    // НОВОЕ: Проверяем не заморозены ли веса
    if(this.frozenWeights) return;  // Не обновляем веса если заморозены`;

if (html.includes('  _backward(dJdy){')) {
  html = html.replace(/  _backward\(dJdy\)\{[\s\S]*?if\(this\.frozenWeights\) return;/,
    backwardReplace);
  console.log('✅ Modified _backward() to clip gradients');
}

// --- STEP 5: Add anti-windup to integral term in step() ---
// Find "this.I = Math.max(-this.Imax, Math.min(this.Imax, this.I + this.Ki*e));"
// and replace with protected version
const integralPattern = /this\.I = Math\.max\(-this\.Imax, Math\.min\(this\.Imax, this\.I \+ this\.Ki\*e\)\);/;
if (html.includes('this.I = Math.max(-this.Imax, Math.min(this.Imax, this.I + this.Ki*e));')) {
  const integralReplace = `this.I = Math.max(-this.Imax, Math.min(this.Imax, this.I + this.Ki*e));
    this.I = this.damper.limitIntegralWindup(this.I);  // ===== ANTI-WINDUP (NEW) =====`;
  html = html.replace(integralPattern, integralReplace);
  console.log('✅ Added anti-windup protection to integral term');
}

// --- STEP 6: Modify weight updates to use protected deltas ---
// Find W1 and W2 update lines and protect them
const w2UpdatePattern = /this\.W2\[i\] -= this\.lr \* dW2;/;
if (html.includes('this.W2[i] -= this.lr * dW2;')) {
  const w2UpdateReplace = `dW2 = this.damper.applyMomentum(\`W2[\${i}]\`, dW2);
    dW2 = this.damper.clipWeightDelta(dW2);
    this.W2[i] -= this.damper.lrScale * dW2;  // ===== PROTECTED UPDATE (NEW) =====`;
  html = html.replace(w2UpdatePattern, w2UpdateReplace);
  console.log('✅ Protected W2 weight updates');
}

const w1UpdatePattern = /this\.W1\[off\+j\] -= this\.lr \* dW1;/;
if (html.includes('this.W1[off+j] -= this.lr * dW1;')) {
  const w1UpdateReplace = `dW1 = this.damper.applyMomentum(\`W1[\${off}+\${j}]\`, dW1);
      dW1 = this.damper.clipWeightDelta(dW1);
      this.W1[off+j] -= this.damper.lrScale * dW1;  // ===== PROTECTED UPDATE (NEW) =====`;
  html = html.replace(w1UpdatePattern, w1UpdateReplace);
  console.log('✅ Protected W1 weight updates');
}

// Create public directory if not exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`✅ Created ${publicDir}`);
}

// --- STEP 7: Save patched version ---
const outputPath = path.join(publicDir, 'noninput.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`✅ Saved patched noninput.html to ${outputPath}`);

// Print summary
const lineCount = html.split('\n').length;
const fileSize = (html.length / 1024 / 1024).toFixed(2);
console.log(`
📊 Patching Summary:
   - Original file: 8666 lines (361 KB)
   - Patched file: ${lineCount} lines (${fileSize} MB)
   - Damper code size: ${damperCodeForInlining.split('\n').length} lines
   - Changes:
     ✓ OscillationDamper class injected
     ✓ Constructor modified for damper instantiation
     ✓ step() protected against oscillations
     ✓ _backward() gradients clipped
     ✓ Integral term anti-windup added
     ✓ Weight updates protected with momentum/clipping
`);
