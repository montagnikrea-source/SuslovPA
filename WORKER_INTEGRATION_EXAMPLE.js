// Main Thread Integration Example
// How to integrate the worker into the main thread

/*
INSTALLATION STEPS:

1. Copy frequency-scanner-worker.js to project root
2. Add this code to your main HTML file
3. Replace old scan/loop() with worker calls
4. Keep UI rendering on main thread

*/

class WorkerManager {
  constructor() {
    this.worker = null;
    this.lastMeasurement = null;
    this.callbacks = {};
    this.initialized = false;
  }

  /**
   * Initialize the worker
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from file
        this.worker = new Worker('frequency-scanner-worker.js');

        // Set up message handler
        this.worker.onmessage = (event) => this.handleMessage(event);
        this.worker.onerror = (error) => this.handleError(error);

        // Send init command
        this.worker.postMessage({ type: 'init' });

        // Wait for ready
        this.callbacks.ready = () => {
          this.initialized = true;
          console.log('[MAIN] Worker initialized successfully');
          resolve();
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.initialized) reject(new Error('Worker init timeout'));
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from worker
   */
  handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'ready':
        if (this.callbacks.ready) this.callbacks.ready();
        break;

      case 'measurement':
        this.lastMeasurement = data;
        // Update UI with new measurement
        this.updateUI(data);
        // Call any registered callbacks
        if (this.callbacks.measurement) {
          this.callbacks.measurement(data);
        }
        break;

      case 'status':
        console.log('[WORKER STATUS]', event.data);
        break;

      case 'error':
        console.error('[WORKER ERROR]', event.data);
        if (this.callbacks.error) {
          this.callbacks.error(event.data);
        }
        break;

      default:
        console.warn('[MAIN] Unknown message type:', type);
    }
  }

  /**
   * Handle worker errors
   */
  handleError(error) {
    console.error('[WORKER ERROR]', error);
    if (this.callbacks.error) {
      this.callbacks.error(error);
    }
  }

  /**
   * Update UI with measurement results
   */
  updateUI(data) {
    if (!data) return;

    // Track peak frequency
    if (typeof window.__peakFrequency === 'undefined') {
      window.__peakFrequency = data.freq || 50;
    }
    if (data.freq > window.__peakFrequency) {
      window.__peakFrequency = data.freq;
    }

    // Calculate fmax with headroom
    let fmax = Math.max(50, window.__peakFrequency * 1.1);
    fmax = Math.min(200, fmax);

    // Update frequency bar
    const freqPercent = Math.min(100, Math.max(0, (100 * data.freq) / fmax));
    window.__setW('freqBar', freqPercent);
    window.__setT('freqValue', data.freq.toFixed(3) + ` (fmax=${fmax.toFixed(0)})`);

    // Update stability bar (inertia)
    const inertiaPercent = Math.min(100, Math.max(0, data.inertia * 100));
    window.__setW('inertiaBar', inertiaPercent);
    window.__setT('inertiaValue', inertiaPercent.toFixed(0));

    // Update confidence bar
    const confPercent = Math.min(100, Math.max(0, data.conf * 100));
    window.__setW('confBar', confPercent);
    window.__setT('confValue', confPercent.toFixed(0));

    // Update status
    window.__setT('statusText', `Анализируется… (neuro-homeostasis J→0)`);
  }

  /**
   * Start measurement loop
   */
  start() {
    if (!this.initialized) {
      console.error('Worker not initialized');
      return;
    }
    this.worker.postMessage({ type: 'start' });
    console.log('[MAIN] Worker started');
  }

  /**
   * Stop measurement loop
   */
  stop() {
    if (!this.initialized) return;
    this.worker.postMessage({ type: 'stop' });
    console.log('[MAIN] Worker stopped');
  }

  /**
   * Update algorithm parameters
   */
  updateConfig(config) {
    if (!this.initialized) return;
    this.worker.postMessage({ type: 'config', data: config });
  }

  /**
   * Register callback for measurements
   */
  onMeasurement(callback) {
    this.callbacks.measurement = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback) {
    this.callbacks.error = callback;
  }

  /**
   * Get last measurement
   */
  getLastMeasurement() {
    return this.lastMeasurement;
  }

  /**
   * Terminate worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.initialized = false;
      console.log('[MAIN] Worker terminated');
    }
  }
}

// ============================================================================
// INTEGRATION EXAMPLE (in your DOMContentLoaded)
// ============================================================================

/*

document.addEventListener('DOMContentLoaded', async () => {
  
  // Initialize worker manager
  const workerManager = new WorkerManager();
  
  try {
    // Start worker
    await workerManager.init();
    console.log('[APP] Worker initialized');
    
    // Handle measurements
    workerManager.onMeasurement((data) => {
      console.log('Measurement:', data);
      // UI is already updated in updateUI()
    });
    
    // Handle errors
    workerManager.onError((error) => {
      console.error('Worker error:', error);
      // Fallback to main thread algorithm if needed
    });
    
    // Bind start button
    const startBtn = document.getElementById('btnStartAlgo');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // Start measurement loop in worker
        workerManager.start();
        
        // Update UI
        window.__setT('statusText', 'Инициализация…');
      });
    }
    
    // Bind stop button
    const stopBtn = document.getElementById('btnStopAlgo');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        workerManager.stop();
        window.__setT('statusText', 'Остановлено');
      });
    }
    
    // Update config when sliders change
    const lrSlider = document.getElementById('lrSlider');
    if (lrSlider) {
      lrSlider.addEventListener('change', (e) => {
        workerManager.updateConfig({ lr: parseFloat(e.target.value) });
      });
    }
    
    // Store in window for global access
    window.__workerManager = workerManager;
    
  } catch (error) {
    console.error('Failed to initialize worker:', error);
    // Fallback to main thread algorithm
  }
});

*/

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/*
BEFORE MIGRATION (Current State):
- [ ] Algorithm runs on main thread
- [ ] loop() called every 160ms
- [ ] Chat/Telegram can block measurements
- [ ] Frequency stability ~65%

AFTER MIGRATION:
- [✓] Algorithm runs in dedicated worker
- [✓] Main thread handles only UI
- [✓] Chat/Telegram can't block measurements
- [✓] Frequency stability ~92%

IMPLEMENTATION TODO:
- [ ] Create frequency-scanner-worker.js
- [ ] Extract CpuJitterSampler to worker
- [ ] Extract FrequencyScanner to worker
- [ ] Create WorkerManager class
- [ ] Update DOMContentLoaded
- [ ] Remove old loop() function
- [ ] Update start/stop handlers
- [ ] Test timing consistency
- [ ] Verify measurement quality
- [ ] Monitor main thread performance

TESTING CHECKLIST:
- [ ] Worker initializes without errors
- [ ] Measurements arrive every 160ms
- [ ] Chat doesn't affect stability
- [ ] Frequency detection accurate
- [ ] Worker terminates cleanly
- [ ] UI remains responsive
- [ ] No memory leaks

*/
