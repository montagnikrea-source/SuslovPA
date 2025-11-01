// algorithm-worker.js
// Isolated Frequency Scanner Algorithm Running in Dedicated Web Worker Thread
// Completely independent from main thread - immune to UI blocking

'use strict';

// ============================================================================
// COPIED CLASSES (Full duplicates for worker isolation)
// ============================================================================

class CpuJitterSampler {
  // Provide MASK used by legacy logic to compute available samples
  static MASK = (1 << 16) - 1; // 65535
  constructor(bufferSize = 65536) {
    this.MASK = bufferSize - 1;
    this.ticks = [];
    this.widx = 0;
    this.actual_fs = 60;
  }

  sample() {
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) {
      Math.sqrt(Math.random() * 1e6);
    }
    const dt = performance.now() - t0;
    this.ticks.push(dt);
    if (this.ticks.length > 2000) this.ticks.shift();
    this.widx++;
  }

  getStats() {
    if (this.ticks.length < 100) return { mean: 60, std: 10, fs: 60 };
    const mean = this.ticks.reduce((a, b) => a + b, 0) / this.ticks.length;
    const variance = this.ticks.reduce((a, b) => a + (b - mean) ** 2, 0) / this.ticks.length;
    const fs = 1000 / mean;
    return { mean, std: Math.sqrt(variance), fs };
  }
}

class OutputBlender {
  constructor() {
    this.ready = false;
    this.ramp = 0;
    this.last = { f: 0, conf: 0, inertia: 0, state: "SEARCHING" };
  }

  blend(cur, step = 0.18) {
    if (!this.ready) {
      this.last = { ...cur };
      this.ready = true;
      this.ramp = Math.min(1, this.ramp + step);
      return cur;
    }
    const a = Math.min(1, this.ramp + step);
    this.ramp = a;
    const mix = (p, q) => p * (1 - a) + q * a;
    const out = {
      f: mix(this.last.f, cur.f),
      conf: mix(this.last.conf, cur.conf),
      inertia: mix(this.last.inertia, cur.inertia),
      state: cur.state,
    };
    this.last = out;
    return out;
  }

  hold(step = 0.08) {
    this.ramp = Math.min(1, this.ramp + step);
    return this.last;
  }
}

class Kalman {
  constructor(x0, v0, qpos, qvel) {
    this.qp = qpos;
    this.qv = qvel;
    this.reset(x0, v0);
  }

  reset(x, v) {
    this.x = x;
    this.v = v;
    this.p00 = 1;
    this.p01 = 0;
    this.p10 = 0;
    this.p11 = 1;
  }

  predict(dt) {
    this.x += this.v * dt;
    this.p00 += dt * (this.p10 + this.p01) + dt * dt * this.p11;
    this.p01 += dt * this.p11;
    this.p10 += dt * this.p11;
    this.p00 += this.qp;
    this.p11 += this.qv;
  }

  update(z, r) {
    const y = z - this.x,
          s = this.p00 + r;
    if (Math.abs(s) < 1e-9) return;
    const k0 = this.p00 / s,
          k1 = this.p10 / s;
    this.x += k0 * y;
    this.v += k1 * y;
    const p00 = this.p00,
          p01 = this.p01;
    this.p00 -= k0 * p00;
    this.p01 -= k0 * p01;
    this.p10 -= k1 * p00;
    this.p11 -= k1 * p01;
  }
}

// ============================================================================
// FREQUENCY SCANNER (Simplified for worker - core algorithm only)
// ============================================================================

class FrequencyScanner {
  constructor(sampler) {
    this.s = sampler;
    this.r = 0;
    this.out_f = 0;
    this.out_conf = 0;
    this.out_inertia = 0;
    this.out_state = "INIT";
    this.out_H = 4;
    this.out_J = 0;
    this.out_peak = 0;
    this.out_resourceUsage = 0;
    this.out_frozen = false;

    // State for frequency detection
    this.lastValidF = 0;
    this.confHistory = [];
    this.inerHistory = [];
    this.peakF = 0;
  }

  needCount() {
    return 512;
  }

  processOnce() {
    // Collect samples
    for (let i = 0; i < 180; i++) {
      this.s.sample();
    }

    // Analyze CPU jitter to detect frequency
    const stats = this.s.getStats();
    
    // Frequency detection from timing statistics (stabilized, non-saturating)
    const tickMean = stats.mean; // Average sample time in ms
    if (tickMean > 0) {
      const fs = 1000 / tickMean; // effective sampling-like rate
      // Save for optional diagnostics/resource mapping
      this.s.actual_fs = fs;
      // Map fs to a pleasant 0..120 Hz range using log compression to avoid 200 Hz saturation
      const fCompressed = Math.log10(fs + 1) * 40; // ~0..120 for fs up to ~1e4
      this.out_f = Math.max(0, Math.min(120, fCompressed));
    }

    // Confidence based on relative jitter (0..1, higher = more stable)
    const relStd = stats.std / Math.max(1e-6, stats.mean);
    const confidenceRaw = 1 - relStd; // if std ~ mean => low confidence
    this.out_conf = Math.max(0, Math.min(1, confidenceRaw));

    // Inertia (stability) based on history
    this.confHistory.push(this.out_conf);
    if (this.confHistory.length > 20) this.confHistory.shift();
    
    const avgConf = this.confHistory.reduce((a, b) => a + b, 0) / this.confHistory.length;
    this.out_inertia = Math.min(1, avgConf * 0.8 + 0.2);

    // Peak tracking
    if (this.out_f > this.peakF) {
      this.peakF = this.out_f;
    }
    this.out_peak = this.peakF;

    // State
    if (this.out_conf < 0.2) {
      this.out_state = "SEARCHING";
    } else if (this.out_conf < 0.5) {
      this.out_state = "ANALYZING";
    } else {
      this.out_state = "LOCKED";
    }

    // Update resource usage estimate
    this.updateResourceUsage();
  }

  updateResourceUsage() {
    // Estimate based on memory and processing
    const tickCount = this.s.ticks.length;
    const memoryEstimate = (tickCount * 8) / (1024 * 1024); // Estimate in MB
    this.out_resourceUsage = Math.min(1, memoryEstimate / 50); // Normalize to 0-1
  }

  getStatus() {
    return {
      freq: this.out_f,
      conf: this.out_conf,
      inertia: this.out_inertia,
      state: this.out_state,
      peak: this.out_peak,
      resourceUsage: this.out_resourceUsage,
      timestamp: performance.now()
    };
  }
}

// ============================================================================
// WORKER STATE MANAGEMENT
// ============================================================================

let sampler = null;
let scanner = null;
let blender = null;
let running = false;
let loopTimeout = null;
let config = {
  sampleRate: 60,
  freeze: false
};

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

function initializeWorker() {
  sampler = new CpuJitterSampler();
  scanner = new FrequencyScanner(sampler);
  blender = new OutputBlender();
  console.log('[WORKER] Algorithm initialized');
}

// ============================================================================
// MEASUREMENT LOOP (Core algorithm - runs uninterrupted)
// ============================================================================

function measurementLoop() {
  if (!running) return;

  try {
    // ===== CRITICAL: This runs WITHOUT main thread interference =====
    
    // Check if we need more samples
    const needCnt = scanner.needCount();
    const avail = (sampler.widx - scanner.r) & CpuJitterSampler.MASK;
    const need = avail < needCnt;

    if (need) {
      // Accumulation phase
      for (let i = 0; i < 180; i++) {
        sampler.sample();
      }
      
      const fill = Math.min(100, (avail / Math.max(1, needCnt)) * 100);
      
      self.postMessage({
        type: 'accumulation',
        fill: fill,
        timestamp: performance.now()
      });
      
      // Reschedule quickly during accumulation
      loopTimeout = setTimeout(measurementLoop, 80);
      return;
    }

    // Main processing step
    scanner.processOnce();
    
    // Blend output for smooth transitions
    const blendedOutput = blender.blend({
      f: scanner.out_f,
      conf: scanner.out_conf,
      inertia: scanner.out_inertia,
      state: scanner.out_state
    });

    // Send measurement results back to main thread (non-blocking)
    self.postMessage({
      type: 'measurement',
      data: {
        freq: blendedOutput.f,
        conf: blendedOutput.conf,
        inertia: blendedOutput.inertia,
        state: blendedOutput.state,
        peak: scanner.out_peak,
        resourceUsage: scanner.out_resourceUsage,
        timestamp: performance.now()
      }
    });

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack,
      timestamp: performance.now()
    });
  }

  // Reschedule for next cycle (160ms - exactly consistent timing)
  loopTimeout = setTimeout(measurementLoop, 160);
}

// ============================================================================
// MESSAGE HANDLER (Communication with main thread)
// ============================================================================

self.onmessage = function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'init':
      initializeWorker();
      self.postMessage({ 
        type: 'ready',
        timestamp: performance.now()
      });
      console.log('[WORKER] Ready');
      break;

    case 'start':
      if (!running) {
        running = true;
        config = { ...config, ...data };
        measurementLoop();
        self.postMessage({ 
          type: 'started',
          config: config,
          timestamp: performance.now()
        });
        console.log('[WORKER] Started with config:', config);
      }
      break;

    case 'stop':
      if (running) {
        running = false;
        if (loopTimeout) clearTimeout(loopTimeout);
        self.postMessage({ 
          type: 'stopped',
          timestamp: performance.now()
        });
        console.log('[WORKER] Stopped');
      }
      break;

    case 'config':
      config = { ...config, ...data };
      self.postMessage({ 
        type: 'configUpdated',
        config: config,
        timestamp: performance.now()
      });
      console.log('[WORKER] Config updated:', config);
      break;

    case 'getStatus':
      self.postMessage({
        type: 'status',
        running: running,
        measurements: scanner ? scanner.getStatus() : null,
        config: config,
        timestamp: performance.now()
      });
      break;

    case 'reset':
      if (sampler) sampler = new CpuJitterSampler();
      if (scanner) scanner = new FrequencyScanner(sampler);
      if (blender) blender = new OutputBlender();
      self.postMessage({
        type: 'resetComplete',
        timestamp: performance.now()
      });
      console.log('[WORKER] Reset complete');
      break;

    default:
      console.warn('[WORKER] Unknown message type:', type);
  }
};

// ============================================================================
// WORKER READY
// ============================================================================

initializeWorker();
console.log('[WORKER] Algorithm worker thread ready');
