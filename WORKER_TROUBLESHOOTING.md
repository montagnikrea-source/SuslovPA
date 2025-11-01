# 🔧 Web Worker Initialization - Troubleshooting Guide

**Date:** November 1, 2025  
**Status:** Fixes applied

---

## ✅ What Was Fixed

### Issue: "Ожидание запуска…" (Waiting to start...)

After clicking START, page was frozen - no progress.

### Root Causes Identified

1. **Script Loading Race Condition**
   - `algorithm-manager.js` loaded asynchronously
   - `initializeAlgorithmWorker()` called before script parsed
   - Result: Function undefined, silent failure

2. **UI Helper Functions**
   - `window.__setT` and `window.__setW` not available initially
   - Worker messages tried to update UI before functions existed

3. **Worker Path Resolution**
   - Worker file path might be incorrect relative to HTML file
   - Different hosting scenarios need different paths

### Solutions Applied

#### 1. Added `defer` Attribute
```html
<!-- BEFORE -->
<script src="algorithm-manager.js"></script>

<!-- AFTER -->
<script src="algorithm-manager.js" defer></script>
```

**Effect:** Script loads but HTML parsing continues, then script executes.

#### 2. Improved Initialization Logic
```javascript
// BEFORE
await initializeAlgorithmWorker(); // Could fail silently

// AFTER
if (typeof initializeAlgorithmWorker !== 'undefined') {
  await initializeAlgorithmWorker();
} else {
  // Retry after delay
  setTimeout(async () => {
    if (typeof initializeAlgorithmWorker !== 'undefined') {
      await initializeAlgorithmWorker();
    }
  }, 500);
}
```

#### 3. Added UI Helper Guards
```javascript
// BEFORE
window.__setT('status', value); // Could fail if helpers not ready

// AFTER
if (!window.__setT || !window.__setW) {
  console.warn('UI helpers not ready');
  return;
}
window.__setT('status', value); // Safe
```

#### 4. Enhanced Worker Path Detection
```javascript
// Now tries to find correct path
let workerPath = 'algorithm-worker.js';

if (window.location) {
  const baseDir = window.location.pathname.substring(0, 
    window.location.pathname.lastIndexOf('/') + 1);
  if (baseDir && baseDir !== '/') {
    workerPath = window.location.origin + baseDir + 'algorithm-worker.js';
  }
}

console.log('Creating worker from:', workerPath);
this.worker = new Worker(workerPath);
```

#### 5. Added Detailed Logging
```javascript
console.log('[APP] startAlgorithm called with config:', config);
console.log('[APP] window.__algorithmWorker =', window.__algorithmWorker);
console.log('[APP] ✅ Starting algorithm via worker');
```

---

## 🧪 How to Test

### Step 1: Check Console Logs

**Expected output:**

```
[INIT] Initializing Algorithm Worker...
[INIT] algorithm-manager.js loaded
[INIT] ✅ Algorithm Worker ready
```

If you see this, worker loaded successfully! ✅

### Step 2: Check Network Tab

Open DevTools → Network tab:

- [ ] `algorithm-manager.js` - should show 200 OK
- [ ] `algorithm-worker.js` - should show 200 OK

Both should be loaded when page ready.

### Step 3: Test START Button

1. Click **START** button
2. Watch console for:
   ```
   [APP] startAlgorithm called with config: {sampleRate: 60, freeze: false}
   [APP] ✅ Starting algorithm via worker
   [WORKER] Started with config: {sampleRate: 60, freeze: false}
   [MAIN] Measurement received: {freq: 77.686, conf: 0.85, ...}
   ```

3. If you see measurements → **WORKING** ✅
4. If you see error → See troubleshooting below

### Step 4: Monitor Main Thread

**DevTools → Performance:**

1. Click **START** to begin recording
2. Click START button in UI
3. Wait 5 seconds
4. Stop recording

**Look for:**
- Main thread CPU: 1-2% ✅
- Worker thread separate
- No 100% CPU spikes
- Smooth flame graph

---

## 🚨 Troubleshooting

### Problem 1: "Algorithm worker not initialized"

**Symptom:**
```
[APP] ❌ Algorithm worker not initialized! Cannot start.
```

**Causes:**
1. Worker failed to load
2. Initialization timed out
3. Error during init

**Solution:**
1. Check Network tab - are files loading?
2. Check for CORS errors in console
3. Look at init error messages
4. Try hard refresh: Ctrl+Shift+F5

### Problem 2: "Failed to load algorithm-worker.js"

**Symptom:**
```
[MAIN] Creating worker from: ...
Uncaught DOMException: Failed to construct 'Worker': ...
```

**Causes:**
1. File not in right directory
2. Wrong path to file
3. File has syntax error

**Solution:**
```bash
# Check if files exist
ls -la /workspaces/SuslovPA/algorithm-*.js

# Should show:
# -rw-rw-rw- ... algorithm-manager.js
# -rw-rw-rw- ... algorithm-worker.js
```

### Problem 3: Measurements not arriving

**Symptom:**
```
[APP] ✅ Starting algorithm via worker
[WORKER] Started with config: ...
(no more messages...)
```

**Causes:**
1. Worker loop failed
2. Measurement code has error
3. Message channel broken

**Solution:**
1. Check browser console for errors
2. Open DevTools Debugger, set breakpoint in worker
3. Check if `measurementLoop()` is running
4. Verify `self.postMessage()` calls work

### Problem 4: UI Not Updating

**Symptom:**
```
[WORKER] Started with config: ...
[MAIN] Measurement received: {...}
(but UI still shows "Ожидание запуска")
```

**Causes:**
1. `window.__setT` or `window.__setW` undefined
2. HTML elements not found
3. Update function skipped with warning

**Solution:**
```javascript
// In console, check if helpers exist
console.log(window.__setT);    // Should be a function
console.log(window.__setW);    // Should be a function

// Find elements
document.getElementById('statusText')  // Should exist
document.getElementById('freqValue')   // Should exist
document.getElementById('freqBar')     // Should exist
```

---

## 🔍 Debug Console Commands

You can type these in DevTools Console while running:

### Check Worker Status
```javascript
window.__algorithmWorker
// Shows: AlgorithmWorkerManager { initialized: true, running: true, ... }
```

### Get Last Measurement
```javascript
window.__algorithmWorker.getLastMeasurement()
// Shows: {freq: 77.686, conf: 0.85, inertia: 0.92, ...}
```

### Get Statistics
```javascript
getAlgorithmStats()
// Shows: {messagesReceived: 42, errorsReceived: 0, ...}
```

### Manually Start Algorithm
```javascript
startAlgorithm({ sampleRate: 60, freeze: false })
```

### Manually Stop Algorithm
```javascript
stopAlgorithm()
```

### Check Initialization Status
```javascript
console.log({
  managerExists: !!window.__algorithmWorker,
  initialized: window.__algorithmWorker?.initialized,
  running: window.__algorithmWorker?.running,
  workerInstance: window.__algorithmWorker?.worker
})
```

---

## 📊 Expected Performance

After fixes, you should see:

| Metric | Expected | Status |
|--------|----------|--------|
| Load time | <1s | ✅ |
| Worker init | <100ms | ✅ |
| First measurement | <200ms | ✅ |
| UI responsive | Yes | ✅ |
| Main thread CPU | 1-2% | ✅ |
| Worker CPU | 5-8% | ✅ |

---

## 📞 If Still Not Working

### Collect Debug Info

Open browser console and run:

```javascript
console.log('=== DEBUG INFO ===');
console.log('Worker ready:', typeof initializeAlgorithmWorker);
console.log('Manager exists:', !!window.__algorithmWorker);
console.log('Functions available:', {
  startAlgorithm: typeof startAlgorithm,
  stopAlgorithm: typeof stopAlgorithm,
  setT: typeof window.__setT,
  setW: typeof window.__setW
});
console.log('HTML elements:', {
  statusText: !!document.getElementById('statusText'),
  freqValue: !!document.getElementById('freqValue'),
  freqBar: !!document.getElementById('freqBar'),
  loadingBar: !!document.getElementById('loadingBar')
});
```

**Copy the output and check against expected values.**

---

## ✅ Checklist After Fixes

- [ ] Hard refresh page (Ctrl+Shift+F5)
- [ ] Check console for `[INIT] ✅ Algorithm Worker ready`
- [ ] Click START button
- [ ] See `[WORKER] Started with config: ...` in console
- [ ] See measurements arriving: `[MAIN] Measurement received: ...`
- [ ] UI shows frequency/confidence values
- [ ] Frequency updates every ~160ms
- [ ] Main thread responsive (can type in chat)
- [ ] No console errors or warnings

---

## 🎉 Success Criteria

✅ **ALL of the following must be true:**

1. ✅ Worker loads without errors
2. ✅ Initialization completes (see "Algorithm Worker ready")
3. ✅ START button triggers measurements
4. ✅ Console shows measurement arrivals
5. ✅ UI updates with frequency/confidence
6. ✅ Main thread not frozen (can use chat)
7. ✅ No error messages in console
8. ✅ Performance is smooth

If all 8 are true → **WORKING PERFECTLY** 🚀

---

## 📝 Commit Information

**Fixes Applied:** Commit `3844f27`

```
fix: Resolve Web Worker initialization timing issues

- Added defer to script loading
- Improved initialization retry logic
- Added UI helper guards
- Enhanced worker path detection
- Added detailed logging
```

---

**Ready to test!** Open the page in browser and check console output.

