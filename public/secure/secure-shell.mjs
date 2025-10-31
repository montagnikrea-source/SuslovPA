// secure/secure-shell.mjs
export default class SecureShell {
  constructor(options = {}) {
    this.onTelemetry = options.onTelemetry || (() => {});
    this.sampleRate = 60;
    this.freeze = false;
  }

  async init() {
    console.log('SecureShell: init');
    // Инициализация CPU-сэмплера, нейросети и т.д.
    this.sampler = new CpuJitterSampler();
    this.scanner = new FrequencyScanner(this.sampler);
    this.blender = new OutputBlender();
    this.tuner = new NeuroHomeo();
    return this;
  }

  async start({ sampleRate = 60, freeze = false } = {}) {
    this.sampleRate = sampleRate;
    this.freeze = freeze;
    console.log(`SecureShell: start (SR=${sampleRate}, freeze=${freeze})`);
    this.paused = false;
    // Run continuous loop driven by requestAnimationFrame so telemetry is updated repeatedly
    const loop = () => {
      try {
        if (this.paused) return;
        // perform several sampler ticks per frame to keep buffer filled
        for (let i = 0; i < 8; i++) {
          this.sampler.sample();
        }
        if (this.scanner.needCount() <= ((this.sampler.widx - this.scanner.r) & CpuJitterSampler.MASK)) {
          this.scanner.processOnce();
          const out = this.blender.blend({
            f: this.scanner.out_f,
            conf: this.scanner.out_conf,
            inertia: this.scanner.out_inertia,
            state: this.scanner.out_state
          });
          this.onTelemetry({
            f: out.f,
            conf: out.conf,
            inertia: out.inertia,
            fs: this.sampler.actual_fs
          });
        }
      } catch (e) {
        console.error('SecureShell error:', e);
      }
      // schedule next frame if not paused
      if (!this.paused) this._rafId = requestAnimationFrame(loop);
    };
    // start looping
    this._rafId = requestAnimationFrame(loop);
  }

  pause() {
    this.paused = true;
    if (typeof this._rafId === 'number') try{ cancelAnimationFrame(this._rafId); }catch(_){}
  }
}
