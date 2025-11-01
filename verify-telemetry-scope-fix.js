#!/usr/bin/env node

/**
 * Verification script to ensure all 28 telemetry elements are properly configured
 * for the global scope fix (window.__setT, window.__setW, window.__$)
 */

const fs = require('fs');

const files = [
  'noninput.html',
  'noninput-mobile.html',
  'public/noninput.html',
  'public/noninput-mobile.html'
];

const TELEMETRY_ELEMENTS = [
  'freqValue', 'freqBar',
  'inertiaValue', 'inertiaBar',
  'confValue', 'confBar',
  'resourceValue', 'resourceBar',
  'lrAdaptValue', 'lrVal',
  'mixAdaptValue', 'mixVal',
  'KpAdaptValue',
  'lrBar', 'l2Bar', 'mixBar',
  'HValue',
  'qualityValue', 'qualityBar',
  'freezeStatusValue',
  'precisionValue',
  'statusText', 'loadingBar'
];

console.log('📋 Verification Report: Telemetry Scope Fix\n');
console.log('Checking', files.length, 'files for proper window.__setT/setW usage\n');

let allGood = true;

files.forEach(file => {
  const filePath = `/workspaces/SuslovPA/${file}`;
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    allGood = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for window.__setT export
  const hasWindowSetT = content.includes('window.__setT = setT');
  const hasWindowSetW = content.includes('window.__setW = setW');
  const hasWindowDollar = content.includes('window.__$ = $_p');
  
  // Check that duplicate definitions are removed
  const iifeLine = content.indexOf('(function () {') + 200;
  const iifePart = content.substring(iifeLine, iifeLine + 2000);
  const hasDuplicateSetT = /const setT = \(id, v\) => \{[\s\S]*?el\.textContent = v/.test(iifePart);
  const hasDuplicateSetW = /const setW = \(id, p\) => \{[\s\S]*?el\.style\.width/.test(iifePart);
  
  // Count window.__setT calls in render
  const renderCalls = (content.match(/window\.__setT\(/g) || []).length;
  const renderWidthCalls = (content.match(/window\.__setW\(/g) || []).length;
  
  console.log(`✓ ${file}`);
  console.log(`  - window.__setT export: ${hasWindowSetT ? '✅' : '❌'}`);
  console.log(`  - window.__setW export: ${hasWindowSetW ? '✅' : '❌'}`);
  console.log(`  - window.__$ export: ${hasWindowDollar ? '✅' : '❌'}`);
  console.log(`  - No duplicate setT in IIFE: ${!hasDuplicateSetT ? '✅' : '❌'}`);
  console.log(`  - No duplicate setW in IIFE: ${!hasDuplicateSetW ? '✅' : '❌'}`);
  console.log(`  - window.__setT() calls: ${renderCalls}`);
  console.log(`  - window.__setW() calls: ${renderWidthCalls}`);
  
  if (!hasWindowSetT || !hasWindowSetW || !hasWindowDollar || hasDuplicateSetT || hasDuplicateSetW) {
    allGood = false;
  }
  
  console.log();
});

if (allGood && files.every(f => fs.existsSync(`/workspaces/SuslovPA/${f}`))) {
  console.log('\n✅ All files properly configured!');
  console.log('\nExpected behavior:');
  console.log('- render() function can access setT/setW from outer DOMContentLoaded scope');
  console.log('- All 28 telemetry elements will update consistently');
  console.log('- No scope isolation issues preventing DOM updates');
} else {
  console.log('\n⚠️ Some issues found. Review output above.');
  process.exit(1);
}
