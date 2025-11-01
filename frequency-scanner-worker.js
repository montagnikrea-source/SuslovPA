// frequency-scanner-worker.js
// Isolated algorithm thread - runs independently without main thread interference

class CpuJitterSampler {
  // [COPY FROM MAIN: Full CpuJitterSampler implementation]
  // This must be duplicated in worker for isolation
  
  constructor(bufferSize = 65536) {
    this.MASK = bufferSize - 1;
    this.ticks = [];
    this.widx = 0;
    this.actual_fs = 60;
  }

  sample() {
    const t0 = performance.now();
    // Busy loop to measure CPU jitter
    for (let i = 0; i < 300; i++) {
      Math.sqrt(Math.random() * 1e6);
    }
    const dt = performance.now() - t0;
    this.ticks.push(dt);
    if (this.ticks.length > 2000) this.ticks.shift();
    this.widx++;
  }

  getStats() {
    if (this.ticks.length < 100) return { mean: 60, std: 10 };
    const mean = this.ticks.reduce((a, b) => a + b, 0) / this.ticks.length;
    const variance = this.ticks.reduce((a, b) => a + (b - mean) ** 2, 0) / this.ticks.length;
    return { mean, std: Math.sqrt(variance), fs: this.ticks.length / (this.ticks[this.ticks.length - 1] / 1000) };
  }
}

class FrequencyScanner {
  // [COPY FROM MAIN: Full FrequencyScanner implementation]
  
  constructor(sampler) {
    this.s = sampler;
    this.out_f = 0;
    this.out_conf = 0;
    this.out_inertia = 0;
    this.out_state = "INIT";
  }

  processOnce() {
    // Main algorithm processing
    // This runs in worker thread without interruption
    for (let i = 0; i < 180; i++) {
      this.s.sample();
    }
    
    // Compute frequency, confidence, inertia
    const stats = this.s.getStats();
    this.out_f = stats.mean * 20; // Scaled representation
    this.out_conf = Math.min(1, this.out_f / 100);
    this.out_inertia = 0.7; // Simplified for this template
    this.out_state = "ANALYZING";
  }
}

// Global state in worker context
let sampler = null;
let scanner = null;
let running = false;
let loopTimeout = null;

// Initialize worker
function initializeWorker() {
  sampler = new CpuJitterSampler();
  scanner = new FrequencyScanner(sampler);
  console.log('[WORKER] Initialized frequency scanner');
}

// Main measurement loop (runs in worker thread)
function measurementLoop() {
  if (!running) return;

  try {
    // ===== CRITICAL: Runs without main thread interference =====
    scanner.processOnce();

    // Get current results
    const measurement = {
      type: 'measurement',
      data: {
        freq: scanner.out_f,
        conf: scanner.out_conf,
        inertia: scanner.out_inertia,
        state: scanner.out_state,
        timestamp: performance.now()
      }
    };

    // Send results back to main thread (non-blocking)
    self.postMessage(measurement);

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack
    });
  }

  // Reschedule for next cycle (160ms)
  loopTimeout = setTimeout(measurementLoop, 160);
}

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      initializeWorker();
      self.postMessage({ type: 'ready' });
      break;

    case 'start':
      running = true;
      measurementLoop();
      console.log('[WORKER] Measurement loop started');
      break;

    case 'stop':
      running = false;
      if (loopTimeout) clearTimeout(loopTimeout);
      console.log('[WORKER] Measurement loop stopped');
      break;

    case 'config':
      // Update algorithm parameters
      if (data.lr !== undefined) scanner.tuner.lr = data.lr;
      if (data.mix !== undefined) scanner.tuner.mix = data.mix;
      if (data.l2 !== undefined) scanner.tuner.l2 = data.l2;
      console.log('[WORKER] Config updated:', data);
      break;

    case 'getStatus':
      self.postMessage({
        type: 'status',
        running: running,
        measurements: scanner.out_f,
        timestamp: performance.now()
      });
      break;

    default:
      console.warn('[WORKER] Unknown message type:', type);
  }
};

// Initialize on load
initializeWorker();
console.log('[WORKER] Ready and waiting for commands');
