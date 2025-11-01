/**
 * Performance Benchmark for OscillationDamper and NeuroHomeostasis Algorithm
 * Tests speed and efficiency after recent anti-control oscillation changes
 */

const OscillationDamper = require('./anti-oscillation.js');

class PerformanceBenchmark {
  constructor() {
    this.damper = new OscillationDamper({
      gradientClipValue: 5.0,
      deadzoneTolerance: 0.001,
      lowPassAlpha: 0.2,
      integralClipValue: 3.0,
      spikeThreshold: 3.0,
      oscDetectionWindow: 100,
    });
    
    this.results = {};
  }

  /**
   * Benchmark gradient clipping operation
   */
  benchmarkGradientClipping(iterations = 1000000) {
    console.log(`\n⏱️  Benchmarking Gradient Clipping (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    let result = 0;
    
    for (let i = 0; i < iterations; i++) {
      const grad = (Math.random() - 0.5) * 20; // Range [-10, 10]
      result += this.damper.clipGradient(grad);
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    console.log(`  Result checksum: ${result.toFixed(2)}`);
    
    this.results.gradientClipping = { duration, opsPerMs };
    return duration;
  }

  /**
   * Benchmark deadzone filtering
   */
  benchmarkDeadzone(iterations = 1000000) {
    console.log(`\n⏱️  Benchmarking Deadzone Filtering (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    let result = 0;
    
    for (let i = 0; i < iterations; i++) {
      const error = (Math.random() - 0.5) * 0.1; // Range [-0.05, 0.05]
      result += this.damper.applyDeadzone(error);
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    console.log(`  Result checksum: ${result.toFixed(2)}`);
    
    this.results.deadzone = { duration, opsPerMs };
    return duration;
  }

  /**
   * Benchmark low-pass filtering
   */
  benchmarkLowPassFilter(iterations = 1000000) {
    console.log(`\n⏱️  Benchmarking Low-Pass Filtering (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    let result = 0;
    
    for (let i = 0; i < iterations; i++) {
      const value = Math.sin(i / 100) * 10;
      result += this.damper.filterAggregator(value);
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    console.log(`  Result checksum: ${result.toFixed(2)}`);
    
    this.results.lowPassFilter = { duration, opsPerMs };
    return duration;
  }

  /**
   * Benchmark spike detection
   */
  benchmarkSpikeDetection(iterations = 10000) {
    console.log(`\n⏱️  Benchmarking Spike Detection (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Mix of normal and spike values
      const cost = i % 50 === 0 ? Math.random() * 100 : Math.random() * 0.5;
      this.damper.detectSpike(Math.abs(cost - (this.damper.oscBuffer[this.damper.oscBuffer.length - 1] || 0)));
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    console.log(`  Spikes detected: ${this.damper.stats.spikesDetected}`);
    
    this.results.spikeDetection = { duration, opsPerMs };
    return duration;
  }

  /**
   * Benchmark weight protection
   */
  benchmarkWeightProtection(iterations = 100000) {
    console.log(`\n⏱️  Benchmarking Weight Protection (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const weights = new Float64Array(128);
      for (let j = 0; j < weights.length; j++) {
        weights[j] = (Math.random() - 0.5) * 2;
      }
      
      const gradients = new Float64Array(128);
      for (let j = 0; j < gradients.length; j++) {
        gradients[j] = (Math.random() - 0.5) * 20;
      }
      
      this.damper.protectWeightUpdate(weights, gradients, 0.01);
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    
    this.results.weightProtection = { duration, opsPerMs };
    return duration;
  }

  /**
   * Benchmark combined protect operation
   */
  benchmarkCombinedProtection(iterations = 100000) {
    console.log(`\n⏱️  Benchmarking Combined Protection (${iterations.toLocaleString()} iterations)...`);
    
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const state = {
        J: Math.random() * 10,
        prevJ: Math.random() * 10,
        dJdy: (Math.random() - 0.5) * 20,
        error: (Math.random() - 0.5) * 0.1,
        I: (Math.random() - 0.5) * 5,
        aggr: (Math.random() - 0.5) * 2,
      };
      
      this.damper.protect(state);
    }
    
    const duration = performance.now() - start;
    const opsPerMs = iterations / duration;
    
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Operations/ms: ${opsPerMs.toFixed(0)}`);
    
    this.results.combinedProtection = { duration, opsPerMs };
    return duration;
  }

  /**
   * Comprehensive performance report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE REPORT: OscillationDamper');
    console.log('='.repeat(60));
    
    console.log('\n📈 Results Summary:');
    console.log('┌─ Operation ─────────────────┬─ Duration ─┬─ Ops/ms ─┐');
    
    for (const [op, data] of Object.entries(this.results)) {
      const name = op.padEnd(28);
      const duration = `${data.duration.toFixed(2)}ms`.padEnd(11);
      const opsPerMs = `${data.opsPerMs.toFixed(0)}`.padEnd(8);
      console.log(`│ ${name} │ ${duration} │ ${opsPerMs} │`);
    }
    
    console.log('└───────────────────────────────┴────────────┴─────────┘');
    
    // Calculate totals
    const totalDuration = Object.values(this.results).reduce((sum, r) => sum + r.duration, 0);
    const avgOpsPerMs = Object.values(this.results)
      .reduce((sum, r) => sum + r.opsPerMs, 0) / Object.keys(this.results).length;
    
    console.log(`\n📊 Aggregated Metrics:`);
    console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`  Average Ops/ms: ${avgOpsPerMs.toFixed(0)}`);
    
    // Damper statistics
    console.log(`\n🛡️  Damper Statistics:`);
    console.log(`  Clips Applied: ${this.damper.stats.clipsApplied}`);
    console.log(`  Deadzones Applied: ${this.damper.stats.deadzonesApplied}`);
    console.log(`  Spikes Detected: ${this.damper.stats.spikesDetected}`);
    console.log(`  Oscillations Detected: ${this.damper.stats.oscillationsDetected}`);
    console.log(`  Momentum Applied: ${this.damper.stats.momentumApplied}`);
    
    // Performance assessment
    console.log(`\n✅ Performance Assessment:`);
    if (avgOpsPerMs > 100000) {
      console.log(`  ✨ EXCELLENT: Very high throughput (${avgOpsPerMs.toFixed(0)} ops/ms)`);
    } else if (avgOpsPerMs > 50000) {
      console.log(`  ⚡ GOOD: High throughput (${avgOpsPerMs.toFixed(0)} ops/ms)`);
    } else if (avgOpsPerMs > 10000) {
      console.log(`  ⚠️  ACCEPTABLE: Moderate throughput (${avgOpsPerMs.toFixed(0)} ops/ms)`);
    } else {
      console.log(`  🐢 SLOW: Low throughput (${avgOpsPerMs.toFixed(0)} ops/ms)`);
    }
    
    // Speed regression check
    console.log(`\n🔍 Speed Regression Analysis:`);
    const gradClipOpsPerMs = this.results.gradientClipping?.opsPerMs || 0;
    const expectedOpsPerMs = 500000; // Benchmark target
    
    if (gradClipOpsPerMs < expectedOpsPerMs * 0.5) {
      console.log(`  ⚠️  WARNING: Significant slowdown detected (${(100 - (gradClipOpsPerMs / expectedOpsPerMs * 100)).toFixed(1)}% slower than expected)`);
    } else {
      console.log(`  ✅ NORMAL: No significant slowdown detected`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Run all benchmarks
   */
  async runAll() {
    console.log('🚀 Starting Performance Benchmarks...\n');
    
    this.benchmarkGradientClipping(1000000);
    this.benchmarkDeadzone(1000000);
    this.benchmarkLowPassFilter(1000000);
    this.benchmarkSpikeDetection(10000);
    this.benchmarkWeightProtection(100000);
    this.benchmarkCombinedProtection(100000);
    
    this.generateReport();
  }
}

// Run benchmarks
const benchmark = new PerformanceBenchmark();
benchmark.runAll().catch(console.error);
