/* ============================================================
   store.js — file:// 安全的键值存储（localStorage 不可用时退内存）
   ============================================================ */
(function () {
  'use strict';
  var ok = true;
  try {
    var k = '__zl_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  } catch (e) { ok = false; }
  var mem = {};

  function Store(scope) {
    var pre = 'zl:' + scope + ':';
    return {
      ok: ok,
      get: function (key, dft) {
        try {
          var raw = ok ? localStorage.getItem(pre + key) : (mem[pre + key] || null);
          if (raw == null) return dft;
          return JSON.parse(raw);
        } catch (e) { return dft; }
      },
      set: function (key, val) {
        try {
          var raw = JSON.stringify(val);
          if (ok) localStorage.setItem(pre + key, raw); else mem[pre + key] = raw;
        } catch (e) { /* quota / 隐私模式：静默降级 */ }
      },
      del: function (key) {
        try { if (ok) localStorage.removeItem(pre + key); else delete mem[pre + key]; } catch (e) {}
      }
    };
  }
  window.Store = Store;
})();
