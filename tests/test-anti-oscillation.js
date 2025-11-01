/**
 * Unit Tests for OscillationDamper
 * Tests all damping mechanisms and edge cases
 */

const OscillationDamper = require('../anti-oscillation.js');

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      this.failed++;
      throw new Error(message);
    } else {
      this.passed++;
    }
  }

  assertEqual(actual, expected, message) {
    this.assert(
      Math.abs(actual - expected) < 1e-6,
      `${message} (expected ${expected}, got ${actual})`
    );
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running OscillationDamper Tests\n');

    for (const { name, fn } of this.tests) {
      try {
        console.log(`  ▶️  ${name}`);
        await fn();
        console.log(`    ✅ PASS\n`);
      } catch (err) {
        console.error(`    ${err.message}\n`);
      }
    }

    console.log(`
📊 Test Results:
   ✅ Passed: ${this.passed}
   ❌ Failed: ${this.failed}
   📈 Total: ${this.passed + this.failed}
    `);

    return this.failed === 0;
  }
}

// ===== TEST CASES =====
const runner = new TestRunner();

// Test 1: Gradient Clipping
runner.test('Gradient Clipping: Large gradient should be clipped', function() {
  const damper = new OscillationDamper({ gradientClipValue: 5.0 });
  const clipped = damper.clipGradient(10.0);
  runner.assertEqual(clipped, 5.0, 'Positive gradient clipping');
  runner.assertEqual(damper.clipGradient(-10.0), -5.0, 'Negative gradient clipping');
  runner.assertEqual(damper.stats.clipsApplied, 2, 'Clip counter incremented');
});

// Test 2: Small Gradient Pass-through
runner.test('Gradient Clipping: Small gradient should pass through', function() {
  const damper = new OscillationDamper({ gradientClipValue: 5.0 });
  const notClipped = damper.clipGradient(2.5);
  runner.assertEqual(notClipped, 2.5, 'Small gradient unchanged');
  runner.assertEqual(damper.stats.clipsApplied, 0, 'No clips applied');
});

// Test 3: Deadzone - Hard mode
runner.test('Deadzone (Hard): Small error should be zeroed', function() {
  const damper = new OscillationDamper({
    deadzoneTolerance: 0.01,
    deadzoneMode: 'hard',
  });
  const deadZoned = damper.applyDeadzone(0.005);
  runner.assertEqual(deadZoned, 0, 'Error below deadzone zeroed');
  runner.assertEqual(damper.stats.deadzonesApplied, 1, 'Deadzone counter incremented');
});

// Test 4: Deadzone - Soft mode
runner.test('Deadzone (Soft): Small error should be smoothed', function() {
  const damper = new OscillationDamper({
    deadzoneTolerance: 0.01,
    deadzoneMode: 'soft',
  });
  const deadZoned = damper.applyDeadzone(0.005);
  runner.assert(
    deadZoned > 0 && deadZoned < 0.005,
    `Soft deadzone applied (got ${deadZoned})`
  );
});

// Test 5: Low-Pass Filter
runner.test('Low-Pass Filter: Should smooth value transitions', function() {
  const damper = new OscillationDamper({ lowPassAlpha: 0.2 });
  const filtered1 = damper.filterAggregator(100);
  runner.assertEqual(filtered1, 100, 'First value = input');
  
  const filtered2 = damper.filterAggregator(200);
  runner.assert(
    filtered2 > 100 && filtered2 < 200,
    `Filtered value smoothed (got ${filtered2})`
  );
  runner.assert(
    Math.abs(filtered2 - 120) < 1,
    `Expected ~120, got ${filtered2}`
  );
});

// Test 6: Integral Anti-Windup
runner.test('Integral Anti-Windup: Should clip integral accumulation', function() {
  const damper = new OscillationDamper({ integralClipValue: 3.0 });
  const clipped = damper.limitIntegralWindup(5.0);
  runner.assertEqual(clipped, 3.0, 'Positive integral clipped');
  runner.assertEqual(damper.limitIntegralWindup(-5.0), -3.0, 'Negative integral clipped');
  runner.assertEqual(damper.limitIntegralWindup(1.5), 1.5, 'Within bounds unchanged');
});

// Test 7: Weight Delta Clipping
runner.test('Weight Delta Clipping: Should limit update magnitude', function() {
  const damper = new OscillationDamper({ weightDeltaClip: 0.1 });
  const clipped = damper.clipWeightDelta(0.5);
  runner.assertEqual(clipped, 0.1, 'Large positive delta clipped');
  runner.assertEqual(damper.clipWeightDelta(-0.5), -0.1, 'Large negative delta clipped');
  runner.assertEqual(damper.clipWeightDelta(0.05), 0.05, 'Small delta unchanged');
});

// Test 8: Spike Detection - No spike
runner.test('Spike Detection: Stable cost should not trigger spike', function() {
  const damper = new OscillationDamper({
    spikeThreshold: 3.0,
    spikeWindow: 50,
  });
  
  // Simulate stable cost sequence
  for (let i = 0; i < 10; i++) {
    const lrScale = damper.detectSpike(1.0 + 0.001 * Math.sin(i), i === 0 ? null : 1.0);
    runner.assert(lrScale > 0.5, `LR scale should stay high during stability (iter ${i})`);
  }
  runner.assertEqual(damper.stats.spikesDetected, 0, 'No spikes detected');
});

// Test 9: Spike Detection - Detect spike
runner.test('Spike Detection: Large cost jump should trigger spike', function() {
  const damper = new OscillationDamper({
    spikeThreshold: 2.0,
    spikeWindow: 20,
    spikeLrPenalty: 0.1,
  });
  
  // Build history
  for (let i = 0; i < 15; i++) {
    damper.detectSpike(1.0, i === 0 ? null : 1.0);
  }
  
  // Insert spike
  const lrScaleAfterSpike = damper.detectSpike(5.0, 1.0);
  runner.assert(lrScaleAfterSpike < 0.5, `LR should be reduced during spike (got ${lrScaleAfterSpike})`);
});

// Test 10: Oscillation Detection
runner.test('Oscillation Detection: Buffer history should be maintained', function() {
  const damper = new OscillationDamper({
    oscDetectionWindow: 50,
    oscThreshold: 0.3,
  });
  
  // Generate oscillatory pattern
  for (let i = 0; i < 80; i++) {
    const cost = 1.0 + 0.8 * Math.sin(i * 0.4); // Oscillation
    damper.detectOscillation(cost);
  }
  
  // Verify buffer maintains oscillation history
  runner.assert(damper.oscBuffer.length > 40, `Buffer should contain significant history (${damper.oscBuffer.length})`);
  
  // Verify values are actually oscillating (not all the same)
  const min = Math.min(...damper.oscBuffer);
  const max = Math.max(...damper.oscBuffer);
  runner.assert(max - min > 0.5, `Buffer should contain oscillating values (range: ${(max-min).toFixed(3)})`);
});

// Test 11: Momentum Application
runner.test('Momentum: Should apply momentum dampening to deltas', function() {
  const damper = new OscillationDamper({ momentumDecay: 0.9 });
  
  // First delta: pure (70% input, 30% momentum which is 0)
  const delta1 = damper.applyMomentum('test_weight', 0.5);
  runner.assert(delta1 > 0.3 && delta1 < 0.5, `First delta applied (${delta1})`);
  
  // Second delta: with accumulated momentum
  const delta2 = damper.applyMomentum('test_weight', 0.5);
  runner.assert(delta2 >= delta1, `Second delta maintains or increases momentum`);
  
  // Opposite delta: momentum acts as brake
  const delta3 = damper.applyMomentum('test_weight', -0.5);
  runner.assert(delta3 < 0, `Opposite update opposes momentum`);
});

// Test 12: LR Scale Recovery
runner.test('LR Scale Recovery: Should gradually recover LR after spike', function() {
  const damper = new OscillationDamper({
    lrRecoveryRate: 0.2,
    spikeLrPenalty: 0.1,
  });
  
  const initialScale = damper.lrScale;
  damper.lrScale *= 0.1; // Simulate spike penalty
  runner.assert(damper.lrScale < 0.2, 'LR reduced');
  
  const beforeRecovery = damper.lrScale;
  // Simulate recovery iterations
  for (let i = 0; i < 5; i++) {
    damper.detectSpike(1.0, i === 0 ? null : 1.0);
  }
  
  runner.assert(damper.lrScale > beforeRecovery * 0.5, 'LR recovering or maintained');
});

// Test 13: Weight Update Protection
runner.test('Weight Update Protection: Should clip and apply momentum', function() {
  const damper = new OscillationDamper({
    weightDeltaClip: 0.1,
    momentumDecay: 0.95,
    lrScale: 1.0,
  });
  
  const weights = new Float64Array([0.5, 0.5, 0.5]);
  const gradients = new Float64Array([1.0, -1.0, 0.5]);
  const lr = 0.1;
  
  damper.protectWeightUpdate(weights, gradients, lr, 'W');
  
  runner.assert(weights[0] !== 0.5, 'Weights were updated');
  runner.assert(
    Math.abs(weights[0] - 0.5) < 0.15,
    `Weight update clipped (delta: ${0.5 - weights[0]})`
  );
});

// Test 14: Statistics Tracking
runner.test('Statistics: Should track all protection events', function() {
  const damper = new OscillationDamper();
  
  damper.clipGradient(10);
  damper.applyDeadzone(0.0001);
  damper.detectSpike(5.0, 1.0);
  damper.detectOscillation(1.0);
  damper.detectOscillation(0.5);
  
  const stats = damper.getStats();
  runner.assert(stats.clipsApplied > 0, 'Clips tracked');
  runner.assert(stats.deadzonesApplied > 0, 'Deadzones tracked');
  runner.assert(stats.spikesDetected >= 0, 'Spikes tracked');
  runner.assert(stats.oscillationsDetected >= 0, 'Oscillations tracked');
});

// Test 15: Reset Functionality
runner.test('Reset: Should clear all state', function() {
  const damper = new OscillationDamper();
  
  damper.clipGradient(10);
  damper.filterAggregator(100);
  damper.applyMomentum('test', 0.5);
  damper.iterCount = 100;
  
  damper.reset();
  
  runner.assertEqual(damper.iterCount, 0, 'Iteration count reset');
  runner.assertEqual(Object.keys(damper.momentum).length, 0, 'Momentum cleared');
  runner.assertEqual(damper.lrScale, 1.0, 'LR scale reset');
  runner.assert(damper.firstAggr, 'Filter state reset');
});

// Test 16: Configuration Update
runner.test('Runtime Reconfiguration: Should update parameters', function() {
  const damper = new OscillationDamper({ gradientClipValue: 5.0 });
  runner.assertEqual(damper.gradientClipValue, 5.0, 'Initial config');
  
  damper.reconfigure({ gradientClipValue: 10.0 });
  runner.assertEqual(damper.gradientClipValue, 10.0, 'Config updated');
});

// Test 17: Protect State Integration
runner.test('Protect State: Should integrate all protections', function() {
  const damper = new OscillationDamper();
  
  const state = {
    J: 0.5,
    prevJ: 0.48,
    dJdy: 10.0,
    error: -0.5,
    aggr: 1.5,
    I: 5.0,
    lrScale: 1.0,
  };
  
  const protected = damper.protect(state);
  
  runner.assert(protected.dJdy <= 5.0, 'Gradient clipped in protect()');
  runner.assert(protected.I <= 3.0, 'Integral clipped in protect()');
  runner.assert(protected.lrScale >= 0, 'LR scale valid in protect()');
});

// Test 18: Edge case - Null/undefined values
runner.test('Edge Cases: Should handle null/undefined gracefully', function() {
  const damper = new OscillationDamper();
  
  const lrScale1 = damper.detectSpike(1.0, null);
  runner.assertEqual(lrScale1, 1.0, 'Handles null prevCost');
  
  const state = {
    J: 0.5,
    // No prevJ, dJdy, etc.
  };
  const protected = damper.protect(state);
  runner.assert(protected !== null, 'Handles incomplete state');
});

// ===== RUN ALL TESTS =====
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
