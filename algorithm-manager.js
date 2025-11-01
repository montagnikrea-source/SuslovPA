// Main Thread Algorithm Manager
// Manages communication with algorithm worker and UI updates

class AlgorithmWorkerManager {
  constructor() {
    this.worker = null;
    this.lastMeasurement = null;
    this.callbacks = {};
    this.initialized = false;
    this.running = false;
    this.stats = {
      messagesReceived: 0,
      errorsReceived: 0,
      measurementTime: 0
    };
    // Debug counters
    this.__dbg_measLogged = 0;
    this.__dbg_accumLogged = 0;
  }

  /**
   * Initialize the worker thread
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Try to create worker - support relative and absolute paths
        let workerPath = 'algorithm-worker.js';
        
        // Detect current location for relative path
        if (typeof window !== 'undefined' && window.location) {
          const baseDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
          if (baseDir && baseDir !== '/') {
            workerPath = window.location.origin + baseDir + 'algorithm-worker.js';
          }
        }
        
        console.log('[MAIN] Creating worker from:', workerPath);
        this.worker = new Worker(workerPath);
        
        // Set up message handler
        this.worker.onmessage = (event) => this.handleMessage(event);
        this.worker.onerror = (error) => this.handleError(error);
        
        console.log('[MAIN] Creating worker...');
        
        // Send init command
        this.worker.postMessage({ type: 'init' });
        
        // Wait for ready signal
        this.callbacks.ready = () => {
          this.initialized = true;
          console.log('[MAIN] Worker initialized successfully');
          resolve();
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.initialized) {
            reject(new Error('Worker init timeout'));
          }
        }, 5000);
        
      } catch (error) {
        console.error('[MAIN] Failed to create worker:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle messages from worker thread
   */
  handleMessage(event) {
    const { type, data } = event.data;
    this.stats.messagesReceived++;
    
    switch (type) {
      case 'ready':
        if (this.callbacks.ready) {
          this.callbacks.ready();
          delete this.callbacks.ready;
        }
        break;

      case 'started':
        console.log('[MAIN] Worker started with config:', event.data.config);
        break;

      case 'stopped':
        console.log('[MAIN] Worker stopped');
        break;

      case 'accumulation':
        // During accumulation phase
        if (this.__dbg_accumLogged < 3) {
          console.log('[MAIN][ACC]', Math.round(event.data.fill) + '%');
          this.__dbg_accumLogged++;
        }
        window.__setT('statusText', `Плавное накопление… (${event.data.fill.toFixed(0)}%)`);
        window.__setW('loadingBar', event.data.fill);
        break;

      case 'measurement':
        this.lastMeasurement = data;
        this.stats.measurementTime = performance.now();
        if (this.__dbg_measLogged < 5) {
          console.log('[MAIN][MEAS]', {
            f: data && data.freq,
            conf: data && data.conf,
            inertia: data && data.inertia
          });
          this.__dbg_measLogged++;
        }
        this.updateUI(data);
        
        // Call any registered callbacks
        if (this.callbacks.measurement) {
          this.callbacks.measurement(data);
        }
        break;

      case 'status':
        console.log('[MAIN] Worker status:', event.data);
        break;

      case 'configUpdated':
        console.log('[MAIN] Worker config updated:', event.data.config);
        break;

      case 'error':
        this.stats.errorsReceived++;
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
    console.error('[WORKER FATAL ERROR]', error);
    this.stats.errorsReceived++;
    if (this.callbacks.error) {
      this.callbacks.error(error);
    }
  }

  /**
   * Update UI with measurement results from worker
   */
  updateUI(data) {
    if (!data) return;
    
    // Ensure UI helpers are available
    if (!window.__setT || !window.__setW) {
      console.warn('[MAIN] UI helpers not ready, skipping update');
      return;
    }

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

    // === FREQUENCY BAR ===
    const freqPercent = Math.min(100, Math.max(0, (100 * data.freq) / fmax));
    window.__setW('freqBar', freqPercent);
    window.__setT('freqValue', data.freq.toFixed(3) + ` (fmax=${fmax.toFixed(0)})`);

    // === STABILITY BAR (INERTIA) ===
    const inertiaPercent = Math.min(100, Math.max(0, data.inertia * 100));
    window.__setW('inertiaBar', inertiaPercent);
    window.__setT('inertiaValue', inertiaPercent.toFixed(0));

    // === CONFIDENCE BAR ===
    const confPercent = Math.min(100, Math.max(0, data.conf * 100));
    window.__setW('confBar', confPercent);
    window.__setT('confValue', confPercent.toFixed(0));

    // === STATUS TEXT ===
    window.__setT('statusText', `Анализируется… (neuro-homeostasis J→0)`);

    // === RESOURCE USAGE (optional) ===
    if (data.resourceUsage !== undefined) {
      const resPercent = Math.min(100, Math.max(0, data.resourceUsage * 100));
      if (window.__setW) {
        window.__setW('resourceBar', resPercent);
      }
      if (window.__setT) {
        window.__setT('resourceValue', resPercent.toFixed(0) + '%');
      }
    }
  }

  /**
   * Start measurement loop in worker
   */
  start(config = {}) {
    if (!this.initialized) {
      console.error('[MAIN] Worker not initialized');
      return;
    }
    if (this.running) {
      console.warn('[MAIN] Worker already running');
      return;
    }
    
    this.running = true;
    this.worker.postMessage({ 
      type: 'start',
      data: config
    });
    console.log('[MAIN] Worker started');
  }

  /**
   * Stop measurement loop in worker
   */
  stop() {
    if (!this.initialized || !this.running) return;
    
    this.running = false;
    this.worker.postMessage({ type: 'stop' });
    console.log('[MAIN] Worker stopped');
  }

  /**
   * Update algorithm configuration in worker
   */
  updateConfig(config) {
    if (!this.initialized) return;
    this.worker.postMessage({ 
      type: 'config',
      data: config
    });
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
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      initialized: this.initialized
    };
  }

  /**
   * Reset algorithm state in worker
   */
  reset() {
    if (!this.initialized) return;
    this.worker.postMessage({ type: 'reset' });
  }

  /**
   * Terminate worker
   */
  terminate() {
    if (this.worker) {
      this.stop();
      this.worker.terminate();
      this.initialized = false;
      this.running = false;
      console.log('[MAIN] Worker terminated');
    }
  }
}

// Create global instance
window.__algorithmWorker = null;

/**
 * Initialize algorithm worker - call this in DOMContentLoaded
 */
async function initializeAlgorithmWorker() {
  try {
    const manager = new AlgorithmWorkerManager();
    await manager.init();
    
    // Store reference for global access
    window.__algorithmWorker = manager;
    
    // Handle errors
    manager.onError((error) => {
      console.error('Algorithm worker error:', error);
      // Could implement fallback to main thread here if needed
    });
    
    console.log('[APP] Algorithm worker initialized successfully');
    return manager;
    
  } catch (error) {
    console.error('[APP] Failed to initialize algorithm worker:', error);
    throw error;
  }
}

/**
 * Start the algorithm
 */
function startAlgorithm(config = {}) {
  console.log('[APP] startAlgorithm called with config:', config);
  
  if (!window.__algorithmWorker) {
    console.error('[APP] ❌ Algorithm worker not initialized! Cannot start.');
    console.error('[APP] window.__algorithmWorker =', window.__algorithmWorker);
    return;
  }
  
  console.log('[APP] ✅ Starting algorithm via worker');
  window.__algorithmWorker.start(config);
}

/**
 * Stop the algorithm
 */
function stopAlgorithm() {
  if (!window.__algorithmWorker) return;
  window.__algorithmWorker.stop();
}

/**
 * Update algorithm configuration
 */
function updateAlgorithmConfig(config) {
  if (!window.__algorithmWorker) return;
  window.__algorithmWorker.updateConfig(config);
}

/**
 * Get algorithm statistics
 */
function getAlgorithmStats() {
  if (!window.__algorithmWorker) return null;
  return window.__algorithmWorker.getStats();
}
