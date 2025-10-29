# Memory Smoke Test for noninput-mobile.html

This directory contains automated memory leak detection tools for the `noninput-mobile.html` page.

## Overview

The memory test script uses [Playwright](https://playwright.dev/) to run automated browser tests that measure memory usage patterns across Chromium and Firefox browsers. It helps detect potential memory leaks by:

- Running multiple iterations of user interactions
- Measuring process RSS (Resident Set Size) via `pidusage`
- Measuring JavaScript Heap Size via `performance.memory` (Chromium only)
- Tracking memory growth trends over time
- Outputting detailed results to JSON for analysis

## Prerequisites

- Node.js >= 20.0.0
- npm (comes with Node.js)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers (Chromium and Firefox):
```bash
npm run memtest:install
```

Or manually:
```bash
npx playwright install
```

## Usage

### Basic Usage

Run the memory test with default settings:
```bash
npm run memtest
```

This will:
- Test the default GitHub Pages URL: `https://montagnikrea-source.github.io/SuslovPA/noninput-mobile.html`
- Run 40 iterations
- Send 20 messages per iteration
- Save results to `memtest-noninput-mobile-results.json`

### Custom Configuration

You can customize the test parameters:

```bash
node memtest-noninput-mobile.js --url="URL" --iterations=N --messages=M --output="filename.json"
```

**Parameters:**

- `--url` - URL to test (default: GitHub Pages URL)
- `--iterations` - Number of test iterations (default: 40)
- `--messages` - Number of messages to send per iteration (default: 20)
- `--output` - Output JSON file name (default: `memtest-noninput-mobile-results.json`)

### Examples

**Test local development server:**
```bash
node memtest-noninput-mobile.js --url="http://localhost:8000/noninput-mobile.html" --iterations=30 --messages=15
```

**Quick smoke test (fewer iterations):**
```bash
node memtest-noninput-mobile.js --iterations=10 --messages=5
```

**Intensive stress test:**
```bash
node memtest-noninput-mobile.js --iterations=100 --messages=50
```

**Test production URL:**
```bash
node memtest-noninput-mobile.js --url="https://montagnikrea-source.github.io/SuslovPA/noninput-mobile.html" --iterations=40 --messages=20
```

## What the Test Does

For each browser (Chromium and Firefox), the script:

1. **Launches the browser** in headless mode with mobile viewport (375x667)
2. **Navigates** to the specified URL
3. **Performs iterations** of user interactions:
   - Opens chat (if available)
   - Sends multiple messages
   - Toggles theme (if available)
   - Scrolls the page up and down
4. **Samples memory metrics** before and after each iteration:
   - RSS (Resident Set Size) - total process memory
   - JS Heap Size (Chromium only) - JavaScript heap memory
5. **Saves results** to JSON file with detailed metrics

## Interpreting Results

The test generates a JSON file (`memtest-noninput-mobile-results.json` by default) containing:

```json
{
  "timestamp": "2025-10-29T12:00:00.000Z",
  "config": { ... },
  "tests": [
    {
      "browser": "Chromium",
      "iterations": [
        {
          "iteration": 1,
          "memoryBefore": { "rss": 123456789, "jsHeap": { ... } },
          "memoryAfter": { "rss": 134567890, "jsHeap": { ... } },
          "timestamp": "..."
        },
        ...
      ]
    },
    {
      "browser": "Firefox",
      "iterations": [ ... ]
    }
  ]
}
```

### Key Metrics

- **RSS (Resident Set Size)**: Total memory used by the browser process in bytes
- **usedJSHeapSize**: JavaScript heap memory used by the page (Chromium only)
- **totalJSHeapSize**: Total allocated JavaScript heap (Chromium only)

### What to Look For

**🟢 Healthy Memory Pattern:**
- Memory usage stabilizes after initial iterations
- Small fluctuations (± 10-20 MB) are normal
- Memory may increase slightly but plateaus

**🟡 Potential Concern:**
- Steady linear growth over iterations
- Growth > 30-50% from start to finish
- No stabilization pattern

**🔴 Likely Memory Leak:**
- Continuous linear or exponential growth
- Growth > 100% from start to finish
- Browser crashes or becomes unresponsive

### Console Output

The script provides real-time console output:

```
🚀 Memory Smoke Test Configuration:
   URL: https://...
   Iterations: 40
   Messages per iteration: 20
   Output file: memtest-noninput-mobile-results.json

============================================================
📊 Testing Chromium...
============================================================
   🌐 Navigating to URL...
   ✅ Page loaded successfully

   📍 Iteration 1/40...
      RSS: 256.34 MB
      JS Heap: 45.67 MB
   📍 Iteration 2/40...
      RSS: 258.12 MB
      JS Heap: 46.23 MB
   ...
```

At the end, it displays a summary:

```
📊 Memory Test Summary:

   Chromium RSS Memory:
      First: 256.34 MB
      Last: 278.56 MB
      Growth: 22.22 MB (8.67%)
   Chromium JS Heap:
      First: 45.67 MB
      Last: 48.92 MB
      Growth: 3.25 MB (7.12%)

   Firefox RSS Memory:
      First: 312.45 MB
      Last: 334.21 MB
      Growth: 21.76 MB (6.96%)
```

## Troubleshooting

### Browsers Not Installed

If you see an error about missing browsers:
```bash
npx playwright install
```

### Page Not Loading

- Check the URL is correct and accessible
- Increase timeout if page is slow to load
- Check network connectivity

### Interaction Errors

The script is resilient to missing UI elements and will continue even if some interactions fail. Warnings like "⚠️ Interaction error" are usually not critical.

### Memory Metrics Not Available

- RSS should always be available on Linux/macOS
- JS Heap metrics are only available in Chromium
- Firefox does not expose `performance.memory`

## Integration with CI/CD

You can integrate this test into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run memory smoke test
  run: npm run memtest

- name: Upload results
  uses: actions/upload-artifact@v3
  with:
    name: memory-test-results
    path: memtest-noninput-mobile-results.json
```

## Notes

- Tests are **non-destructive** - they only read the page, don't modify content
- Tests run in **headless mode** by default (no visible browser window)
- Mobile viewport is used to match typical usage patterns
- Results are **cumulative** - each run overwrites the previous results file

## Contributing

If you find issues or want to improve the memory test:

1. Test your changes locally
2. Ensure the script still produces valid JSON output
3. Document any new parameters or features
4. Submit a pull request

## License

MIT License - same as the main repository
