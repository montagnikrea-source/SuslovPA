/**
 * Anti-Oscillation Damping Module for NeuroHomeostasis Algorithm
 * Implements multi-layer protection against system instability and oscillatory behavior
 * 
 * Features:
 * - Gradient clipping with dynamic thresholds
 * - Deadzone filtering on errors
 * - Low-pass filtering on aggregator updates (exponential moving average)
 * - Anti-windup limiter for integral accumulation
 * - Weight delta clipping to prevent divergence
 * - Spike detection with learning rate throttling
 * - Momentum dampening with exponential decay
 * - Frequency-domain oscillation detection
 */

class OscillationDamper {
  constructor(config = {}) {
    // ===== GRADIENT PROTECTION =====
    this.gradientClipValue = config.gradientClipValue ?? 5.0;      // Max gradient magnitude
    this.gradientL2Norm = config.gradientL2Norm ?? null;           // Optional L2 norm clipping
    
    // ===== ERROR DEADZONE =====
    this.deadzoneTolerance = config.deadzoneTolerance ?? 0.001;    // Ignore errors below this
    this.deadzoneMode = config.deadzoneMode ?? 'soft';             // 'soft' (smooth) or 'hard' (zero)
    
    // ===== LOW-PASS FILTERING =====
    this.lowPassAlpha = config.lowPassAlpha ?? 0.2;                // EMA coefficient (0-1, lower=more damping)
    this.filteredAggr = 0;                                          // EMA state
    this.firstAggr = true;
    
    // ===== INTEGRAL ANTI-WINDUP =====
    this.integralClipValue = config.integralClipValue ?? 3.0;      // Max integral term
    this.integralSaturationThresh = config.integralSaturationThresh ?? 0.8; // When to warn
    
    // ===== WEIGHT UPDATE PROTECTION =====
    this.weightDeltaClip = config.weightDeltaClip ?? 0.1;          // Max delta per weight per step
    this.momentumDecay = config.momentumDecay ?? 0.95;             // Exponential decay of momentum
    this.momentum = {};                                             // Track per-weight momentum
    
    // ===== SPIKE DETECTION =====
    this.spikeThreshold = config.spikeThreshold ?? 3.0;            // Relative change threshold
    this.spikeWindow = config.spikeWindow ?? 50;                   // Detect spike over N iterations
    this.spikeBuffer = [];                                          // History of |dJ|
    this.spikeCount = 0;
    this.inSpike = false;
    
    // ===== OSCILLATION DETECTION (FREQUENCY DOMAIN) =====
    this.oscDetectionWindow = config.oscDetectionWindow ?? 100;    // Buffer size for FFT
    this.oscBuffer = [];                                            // History of cost values
    this.oscThreshold = config.oscThreshold ?? 0.3;                // Peak power ratio for oscillation
    
    // ===== LEARNING RATE MANAGEMENT =====
    this.lrScale = 1.0;                                            // Current scaling factor (0-1)
    this.lrRecoveryRate = config.lrRecoveryRate ?? 0.02;          // Per-step recovery
    this.spikeLrPenalty = config.spikeLrPenalty ?? 0.1;           // Reduce LR to 10% during spike
    
    // ===== STATISTICS =====
    this.stats = {
      clipsApplied: 0,
      deadzonesApplied: 0,
      spikesDetected: 0,
      oscillationsDetected: 0,
      momentumApplied: 0,
    };
    
    this.iterCount = 0;
  }

  /**
   * Clip gradient to safe range
   * @param {number} gradient - Gradient value to protect
   * @returns {number} - Clipped gradient
   */
  clipGradient(gradient) {
    if (Math.abs(gradient) > this.gradientClipValue) {
      this.stats.clipsApplied++;
      const sign = Math.sign(gradient);
      return sign * this.gradientClipValue;
    }
    return gradient;
  }

  /**
   * Apply L2 norm clipping to gradient array
   * @param {Float64Array} gradients - Gradient vector
   * @returns {Float64Array} - Clipped gradients
   */
  clipGradientL2(gradients) {
    if (!this.gradientL2Norm) return gradients;
    
    let norm = 0;
    for (let i = 0; i < gradients.length; i++) {
      norm += gradients[i] ** 2;
    }
    norm = Math.sqrt(norm);
    
    if (norm > this.gradientL2Norm) {
      const scale = this.gradientL2Norm / (norm + 1e-8);
      for (let i = 0; i < gradients.length; i++) {
        gradients[i] *= scale;
      }
      this.stats.clipsApplied++;
    }
    return gradients;
  }

  /**
   * Apply deadzone to error signal (suppress small errors)
   * @param {number} error - Error magnitude
   * @returns {number} - Deadzoned error
   */
  applyDeadzone(error) {
    const absErr = Math.abs(error);
    if (absErr < this.deadzoneTolerance) {
      this.stats.deadzonesApplied++;
      if (this.deadzoneMode === 'hard') {
        return 0;
      } else {
        // Soft deadzone: smooth transition
        const ratio = absErr / this.deadzoneTolerance;
        return error * (ratio ** 2); // Smooth S-curve
      }
    }
    return error;
  }

  /**
   * Apply low-pass filter to aggregator (exponential moving average)
   * @param {number} newValue - New aggregator value
   * @returns {number} - Filtered value
   */
  filterAggregator(newValue) {
    if (this.firstAggr) {
      this.filteredAggr = newValue;
      this.firstAggr = false;
      return newValue;
    }
    
    this.filteredAggr = this.lowPassAlpha * newValue + (1 - this.lowPassAlpha) * this.filteredAggr;
    return this.filteredAggr;
  }

  /**
   * Limit integral term to prevent windup
   * @param {number} integral - Current integral accumulation
   * @returns {number} - Clipped integral
   */
  limitIntegralWindup(integral) {
    // Fast path: no logging, just clipping for performance
    return Math.max(-this.integralClipValue, Math.min(this.integralClipValue, integral));
  }

  /**
   * Detect cost spikes and return LR scale factor
   * @param {number} costValue - Current cost J
   * @param {number} prevCost - Previous cost value
   * @returns {number} - LR scale factor (1.0 = no change, <1 = reduce)
   */
  detectSpike(costValue, prevCost) {
    if (prevCost === null || prevCost === undefined) {
      return 1.0;
    }

    const costDelta = Math.abs(costValue - prevCost);
    this.spikeBuffer.push(costDelta);
    
    if (this.spikeBuffer.length > this.spikeWindow) {
      this.spikeBuffer.shift();
    }

    // Compute mean of recent deltas
    const mean = this.spikeBuffer.reduce((a, b) => a + b, 0) / this.spikeBuffer.length;
    const std = Math.sqrt(
      this.spikeBuffer.reduce((a, val) => a + (val - mean) ** 2, 0) / this.spikeBuffer.length + 1e-8
    );

    // Spike detection: cost delta exceeds threshold multiple times
    const zScore = std > 1e-8 ? (costDelta - mean) / std : 0;
    if (zScore > this.spikeThreshold && this.spikeBuffer.length > 10) {
      this.inSpike = true;
      this.spikeCount++;
      this.stats.spikesDetected++;
      return this.spikeLrPenalty; // Reduce LR during spike
    }

    // Recover from spike
    if (this.inSpike && zScore < 1.0) {
      this.inSpike = false;
    }

    return 1.0;
  }

  /**
   * Detect oscillatory behavior in cost history (frequency domain)
   * @param {number} costValue - Current cost value
   * @returns {boolean} - True if oscillation detected
   */
  detectOscillation(costValue) {
    this.oscBuffer.push(costValue);
    if (this.oscBuffer.length > this.oscDetectionWindow) {
      this.oscBuffer.shift();
    }

    if (this.oscBuffer.length < this.oscDetectionWindow / 2) {
      return false; // Not enough history
    }

    // Simple oscillation detection: count sign changes in cost deltas
    let signChanges = 0;
    for (let i = 1; i < this.oscBuffer.length - 1; i++) {
      const prevDelta = this.oscBuffer[i] - this.oscBuffer[i - 1];
      const currDelta = this.oscBuffer[i + 1] - this.oscBuffer[i];
      if (prevDelta * currDelta < 0) {
        signChanges++;
      }
    }

    const expectedChanges = this.oscBuffer.length * 0.2; // ~20% changes in stable state
    const oscillating = signChanges > expectedChanges * 1.5;

    if (oscillating) {
      this.stats.oscillationsDetected++;
      return true;
    }
    return false;
  }

  /**
   * Apply momentum dampening to weight deltas
   * @param {string} key - Unique identifier for weight (e.g., "W1[0][1]")
   * @param {number} delta - Weight update delta
   * @returns {number} - Dampened delta
   */
  applyMomentum(key, delta) {
    if (!this.momentum[key]) {
      this.momentum[key] = 0;
    }

    // Exponential decay of momentum: apply old momentum, then accumulate new
    this.momentum[key] = this.momentumDecay * this.momentum[key] + (1 - this.momentumDecay) * delta;

    // Combine current update with momentum
    const dampedDelta = 0.7 * delta + 0.3 * this.momentum[key];
    
    if (Math.abs(dampedDelta) > 1e-8) {
      this.stats.momentumApplied++;
    }
    
    return dampedDelta;
  }

  /**
   * Clip weight delta to prevent divergence
   * @param {number} delta - Weight update delta
   * @returns {number} - Clipped delta
   */
  clipWeightDelta(delta) {
    return Math.max(-this.weightDeltaClip, Math.min(this.weightDeltaClip, delta));
  }

  /**
   * Main protection pipeline: apply all damping mechanisms
   * @param {object} state - Algorithm state object
   * @returns {object} - Protected state with applied damping
   */
  protect(state) {
    this.iterCount++;

    // --- GRADIENT PROTECTION ---
    if (state.dJdy !== undefined) {
      state.dJdy = this.clipGradient(state.dJdy);
    }

    // --- ERROR DEADZONE ---
    if (state.error !== undefined) {
      state.error = this.applyDeadzone(state.error);
    }

    // --- AGGREGATOR LOW-PASS FILTER ---
    if (state.aggr !== undefined) {
      state.aggr = this.filterAggregator(state.aggr);
    }

    // --- INTEGRAL ANTI-WINDUP ---
    if (state.I !== undefined) {
      state.I = this.limitIntegralWindup(state.I);
    }

    // --- SPIKE DETECTION & LR SCALING ---
    const spikeLRScale = this.detectSpike(state.J, state.prevJ);
    this.lrScale = Math.max(
      this.spikeLrPenalty,
      Math.min(1.0, this.lrScale + this.lrRecoveryRate)
    );
    this.lrScale *= spikeLRScale;
    state.lrScale = this.lrScale;

    // --- OSCILLATION DETECTION ---
    if (state.J !== undefined) {
      const oscillating = this.detectOscillation(state.J);
      if (oscillating) {
        state.oscillationDetected = true;
        this.lrScale *= 0.8; // Additional damping
      }
    }

    return state;
  }

  /**
   * Apply weight protection to weight updates
   * @param {Float64Array} weights - Weight array
   * @param {Float64Array} gradients - Gradient array
   * @param {number} lr - Learning rate
   * @param {string|number} weightKey - Unique identifier for weight array
   * @returns {Float64Array} - Updated weights with damping applied
   */
  protectWeightUpdate(weights, gradients, lr, weightKey = 'W') {
    const effectiveLR = lr * this.lrScale;
    const n = gradients.length;
    
    // Cache momentum object reference if needed
    const momentumObj = this.momentum;

    for (let i = 0; i < n; i++) {
      let delta = -effectiveLR * gradients[i];
      
      // Apply momentum dampening with numeric key (much faster than string keys)
      const numKey = typeof weightKey === 'string' ? weightKey.charCodeAt(0) * 65536 + i : weightKey * 65536 + i;
      if (!momentumObj[numKey]) {
        momentumObj[numKey] = 0;
      }
      
      // Exponential decay of momentum
      momentumObj[numKey] = this.momentumDecay * momentumObj[numKey] + (1 - this.momentumDecay) * delta;
      
      // Combine current update with momentum
      delta = 0.7 * delta + 0.3 * momentumObj[numKey];
      
      // Clip weight delta (inlined for speed)
      if (delta > this.weightDeltaClip) {
        delta = this.weightDeltaClip;
      } else if (delta < -this.weightDeltaClip) {
        delta = -this.weightDeltaClip;
      }
      
      weights[i] += delta;
    }

    return weights;
  }

  /**
   * Get current damping statistics
   * @returns {object} - Stats object
   */
  getStats() {
    return {
      ...this.stats,
      lrScale: this.lrScale.toFixed(4),
      spikeDetected: this.inSpike,
      iterCount: this.iterCount,
      bufferSizes: {
        spike: this.spikeBuffer.length,
        oscillation: this.oscBuffer.length,
        momentum: Object.keys(this.momentum).length,
      },
    };
  }

  /**
   * Reset damper state (e.g., between training phases)
   */
  reset() {
    this.filteredAggr = 0;
    this.firstAggr = true;
    this.spikeBuffer = [];
    this.spikeCount = 0;
    this.inSpike = false;
    this.oscBuffer = [];
    this.lrScale = 1.0;
    this.momentum = {};
    this.iterCount = 0;
  }

  /**
   * Reconfigure damper at runtime
   * @param {object} config - New configuration parameters
   */
  reconfigure(config) {
    Object.assign(this, config);
  }
}

// ===== EXPORT FOR DIFFERENT MODULE SYSTEMS =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OscillationDamper;
}

if (typeof window !== 'undefined') {
  window.OscillationDamper = OscillationDamper;
}
