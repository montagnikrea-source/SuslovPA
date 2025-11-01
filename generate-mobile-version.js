#!/usr/bin/env node
/**
 * Generate lightweight mobile version of noninput.html
 * Removes: chat, complex stats, animations, extra panels
 * Keeps: core algorithm, controls, basic display
 */

const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'noninput.html');
let content = fs.readFileSync(mainFile, 'utf-8');

// 1. Remove chat container section
content = content.replace(
  /<div class="chat-container"[\s\S]*?<\/div>\s*<!-- End chat-container -->/,
  '<!-- Chat removed for mobile -->'
);

// 2. Remove global-online-counter complex styling
content = content.replace(
  /<div class="global-online-counter"[\s\S]*?<\/div>/,
  '<div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">📱 Мобильная версия</div>'
);

// 3. Simplify stats display - remove complex charts
content = content.replace(
  /<div class="stats-container"[\s\S]*?<\/div>\s*<!-- End stats-container -->/,
  '<div style="padding: 10px; text-align: center; color: #999; font-size: 12px;">Статистика доступна на полной версии</div>'
);

// 4. Remove theme selector if present (keep it simple on mobile)
content = content.replace(
  /<button[^>]*id="themeToggle"[^>]*>[\s\S]*?<\/button>/,
  ''
);

// 5. Reduce animation frame rate for mobile
content = content.replace(
  /requestAnimationFrame\(animate\)/,
  `// Mobile optimization - reduced animation
  if (Math.random() > 0.3) return; // Skip some frames for mobile
  requestAnimationFrame(animate)`
);

// 6. Add mobile-specific CSS
const mobileCSS = `
  <style>
    /* Mobile optimizations */
    @media (max-width: 768px) {
      body { font-size: 14px; }
      .btn { padding: 8px 12px !important; font-size: 13px !important; }
      .wrap { padding: 8px !important; }
      input, select { font-size: 16px !important; } /* Prevent zoom on iOS */
      canvas { max-height: 60vh !important; }
      .controls label { flex-wrap: wrap; margin-bottom: 4px; }
      .row.controls { flex-wrap: wrap; gap: 4px; }
    }
  </style>
`;

// Insert mobile CSS before closing head
content = content.replace('</head>', mobileCSS + '\n</head>');

// 7. Simplify FFT visualization for mobile
content = content.replace(
  /fftSize\s*=\s*2048/,
  'fftSize = 512 // Mobile: reduced for performance'
);

// 8. Reduce sample rate options for mobile
const mobileSampleRateLabel = `
          <label style="display: flex; align-items: center; gap: 6px">
            Sample Rate:
            <input
              id="startSampleRate"
              type="number"
              min="30"
              max="120"
              value="60"
              style="width: 60px; margin-left: 6px"
            />
          </label>
`;
content = content.replace(
  /<label[^>]*>[\s\S]*?Sample Rate:[\s\S]*?<\/label>/,
  mobileSampleRateLabel
);

// 9. Simplify hover effects for touch
const touchCSS = `
  <style>
    /* Touch-friendly adjustments */
    button { min-height: 44px; } /* iOS minimum touch target */
    input, select { min-height: 44px; padding: 10px 8px; }
    a { padding: 10px 8px; }
  </style>
`;
content = content.replace('</head>', touchCSS + '\n</head>');

// 10. Remove offline download script (already removed in main version)
// Already removed via previous commits

// Write the mobile version
const outputPath = path.join(__dirname, 'noninput-mobile.html');
fs.writeFileSync(outputPath, content);

// Also write to public directory
const publicOutputPath = path.join(__dirname, 'public', 'noninput-mobile.html');
fs.writeFileSync(publicOutputPath, content);

console.log(`✅ Mobile version created: ${outputPath}`);
console.log(`✅ Mobile version copied: ${publicOutputPath}`);
console.log(`📊 Original size: ${fs.statSync(mainFile).size} bytes`);
console.log(`📊 Mobile size: ${fs.statSync(outputPath).size} bytes`);
console.log(`💾 Size reduction: ${Math.round((1 - fs.statSync(outputPath).size / fs.statSync(mainFile).size) * 100)}%`);
