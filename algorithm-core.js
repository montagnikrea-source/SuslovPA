// Minimal algorithm-core runtime placeholder
// This provides a small buildEngine() stub so pages that import
// algorithm-core.js find a functional API. Replace with full runtime
// from the repository build when available.
(function(global){
  'use strict';

  function buildEngine(opts){
    opts = opts || {};
    return {
      start: function(){
        console.info('algorithm-core: start (placeholder)');
      },
      stop: function(){
        console.info('algorithm-core: stop (placeholder)');
      },
      sample: function(){
        return {t: Date.now(), value: Math.random()};
      }
    };
  }

  // Attach to window and support CommonJS/AMD/ESM consumers
  if(typeof window !== 'undefined') window.buildEngine = buildEngine;
  if(typeof module !== 'undefined' && module.exports) module.exports = buildEngine;
  if(typeof define === 'function' && define.amd) define(function(){ return buildEngine; });

})(this);
