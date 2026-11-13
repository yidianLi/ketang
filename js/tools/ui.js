/* ============================================================
   ui.js — 课堂工具共享 UI（弹层 / 轻提示 / 格式化）
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'cr-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 1800);
  }

  /* modal(html, buttons) → close(); buttons: [{txt, primary, onClick}] */
  function modal(html, buttons) {
    var ov = document.createElement('div');
    ov.className = 'cr-ov';
    var box = document.createElement('div');
    box.className = 'cr-box';
    box.innerHTML = html;
    var foot = document.createElement('div');
    foot.className = 'foot';
    (buttons || [{ txt: '知道了', primary: true }]).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'cr-btn' + (b.primary ? ' primary' : '');
      btn.textContent = b.txt;
      btn.onclick = function () { if (b.onClick) b.onClick(box); if (b.keep !== true) close(); };
      foot.appendChild(btn);
    });
    box.appendChild(foot);
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close() {
      ov.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    return { close: close, box: box };
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  window.UI = { esc: esc, toast: toast, modal: modal, fmtTime: fmtTime, today: today };
})();
