/* SecureShell (ES module): sandboxed algorithm runner with GuardianNet controller */
'use strict';

class GuardianNet {
  constructor(){
    this.enabled = true;
    this.state = { sampleRate: 60, frozen: false, loadScore: 0 };
  }
  decide(metrics){
    if(!metrics) return {cmd:'noop'};
    const { conf=0, inertia=0, J=0, fs=60 } = metrics;
    const quality = 0.5*conf + 0.5*inertia;
    let nextRate = this.state.sampleRate;
    let freeze = this.state.frozen;
    if (quality < 0.15 || J > 2.0) { nextRate = Math.max(30, fs*0.5); freeze = true; }
    else if (quality < 0.35) { nextRate = Math.max(45, fs*0.75); freeze = false; }
    else { nextRate = Math.min(120, fs*1.0); freeze = false; }
    this.state.sampleRate = Math.round(nextRate);
    this.state.frozen = !!freeze;
    return { cmd: 'tune', params: { sampleRate: this.state.sampleRate, freeze: this.state.frozen } };
  }
}

export default class SecureShell {
  constructor(opts={}){
    this.sandboxUrl = opts.sandboxUrl || 'secure/algo-sandbox.html';
    this.targetOrigin = '*';
    this.guardian = new GuardianNet();
    this.frame = null;
    this.ready = false;
    this.reqId = 0;
    this.pending = new Map();
    this.onTelemetry = opts.onTelemetry || function(){};
  }

  init(){
    return new Promise((resolve,reject)=>{
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.src = this.sandboxUrl;
      document.body.appendChild(iframe);
      this.frame = iframe;
      const onMsg = (e)=>{
        if(!e || !e.data) return;
        const { type } = e.data;
        if (type === 'sandbox:ready') {
          this.ready = true;
          window.removeEventListener('message', onMsg);
          window.addEventListener('message', (msg)=> this._onMessage(msg));
          resolve(true);
        }
      };
      window.addEventListener('message', onMsg);
      setTimeout(()=> reject(new Error('Sandbox init timeout')), 10000);
    });
  }

  _post(msg){
    this.frame && this.frame.contentWindow && this.frame.contentWindow.postMessage(msg, this.targetOrigin);
  }

  _rpc(method, params){
    return new Promise((resolve,reject)=>{
      const id = ++this.reqId;
      this.pending.set(id, { resolve, reject });
      this._post({ type: 'rpc', id, method, params });
      setTimeout(()=>{
        if(this.pending.has(id)){
          this.pending.get(id).reject(new Error('RPC timeout: '+method));
          this.pending.delete(id);
        }
      }, 12000);
    });
  }

  _onMessage(e){
    const d = e.data || {};
    if(d.type === 'rpc:res'){
      const p = this.pending.get(d.id);
      if(p){ this.pending.delete(d.id); d.ok ? p.resolve(d.result) : p.reject(new Error(d.error||'error')); }
      return;
    }
    if(d.type === 'telemetry'){
      try{ this.onTelemetry(d.payload); }catch(_){ }
      const decision = this.guardian.decide(d.payload);
      if (decision && decision.cmd === 'tune') {
        this._post({ type:'control', params: decision.params });
      }
    }
  }

  start(options={}){ return this._rpc('start', options); }
  pause(){ return this._rpc('pause', {}); }
  stop(){ return this._rpc('stop', {}); }
  getMetrics(){ return this._rpc('getMetrics', {}); }
}
