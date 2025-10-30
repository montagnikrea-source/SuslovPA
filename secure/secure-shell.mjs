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
    this._key = null; // AES-GCM key after handshake
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
          // Начинаем рукопожатие
          this._handshake().then(()=> resolve(true)).catch(err=>{
            console.error('Handshake failed', err);
            resolve(true); // продолжаем без шифрования
          });
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
    if(d.type === 'handshake-ack' && d.serverNonce){
      this._deriveKey(this._clientNonce, d.serverNonce).catch(()=>{});
      return;
    }
    if(d.type === 'rpc:res'){
      const p = this.pending.get(d.id);
      if(p){ this.pending.delete(d.id); d.ok ? p.resolve(d.result) : p.reject(new Error(d.error||'error')); }
      return;
    }
    if(d.type === 'telemetry' || d.type === 'telemetry-enc'){
      let payload = d.payload;
      if(d.type === 'telemetry-enc' && this._key && d.cipher && d.iv){
        this._decrypt(d.cipher, d.iv).then(obj=>{
          try{ this.onTelemetry(obj); }catch(_){ }
          const decision = this.guardian.decide(obj);
          if (decision && decision.cmd === 'tune') {
            this._sendControl(decision.params);
          }
        }).catch(()=>{});
        return;
      }
      try{ this.onTelemetry(payload); }catch(_){ }
      const decision = this.guardian.decide(d.payload);
      if (decision && decision.cmd === 'tune') this._sendControl(decision.params);
    }
  }

  async _handshake(){
    const nonce = new Uint8Array(12);
    crypto.getRandomValues(nonce);
    this._clientNonce = nonce;
    this._post({ type:'handshake', clientNonce: Array.from(nonce) });
  }

  async _deriveKey(clientNonce, serverNonce){
    try{
      const c = new Uint8Array(clientNonce);
      const s = new Uint8Array(serverNonce);
      const concat = new Uint8Array(c.length+s.length);
      concat.set(c,0); concat.set(s,c.length);
      const hash = await crypto.subtle.digest('SHA-256', concat);
      const raw = new Uint8Array(hash);
      this._key = await crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
    }catch(e){ console.warn('deriveKey error', e); }
  }

  async _encrypt(obj){
    if(!this._key) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(JSON.stringify(obj));
    const buf = await crypto.subtle.encrypt({name:'AES-GCM', iv}, this._key, enc);
    return { cipher: Array.from(new Uint8Array(buf)), iv: Array.from(iv) };
  }

  async _decrypt(cipherArr, ivArr){
    const iv = new Uint8Array(ivArr);
    const data = new Uint8Array(cipherArr);
    const buf = await crypto.subtle.decrypt({name:'AES-GCM', iv}, this._key, data);
    const txt = new TextDecoder().decode(buf);
    return JSON.parse(txt);
  }

  _sendControl(params){
    if(this._key){
      this._encrypt(params).then(p=>{
        if(p) this._post({ type:'control-enc', cipher: p.cipher, iv: p.iv });
        else this._post({ type:'control', params });
      }).catch(()=> this._post({ type:'control', params }));
    } else {
      this._post({ type:'control', params });
    }
  }

  start(options={}){ return this._rpc('start', options); }
  pause(){ return this._rpc('pause', {}); }
  stop(){ return this._rpc('stop', {}); }
  getMetrics(){ return this._rpc('getMetrics', {}); }
}
