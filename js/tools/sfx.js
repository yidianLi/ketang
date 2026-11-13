/* ============================================================
   sfx.js — WebAudio 合成音效（无音频文件，首次手势后激活）
   ============================================================ */
(function () {
  'use strict';
  var ac = null;
  var muted = false;

  function ctx() {
    if (muted) return null;
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }

  function tone(freq, dur, type, gain, delay) {
    var a = ctx();
    if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  window.Sfx = {
    ding: function () { tone(880, 0.28, 'sine'); tone(1320, 0.34, 'sine', 0.12, 0.06); },
    ok: function () { tone(660, 0.12, 'sine'); tone(990, 0.18, 'sine', 0.14, 0.09); },
    buzz: function () { tone(180, 0.32, 'square', 0.1); },
    tick: function () { tone(520, 0.05, 'triangle', 0.07); },
    roll: function () { tone(340 + Math.random() * 260, 0.045, 'triangle', 0.05); },
    toggle: function () { muted = !muted; return muted; },
    isMuted: function () { return muted; }
  };
})();
