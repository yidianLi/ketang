/* ============================================================
   theme.js — 明/暗主题引导（零依赖，file:// 可用）
   ------------------------------------------------------------
   必须在 <head> 里、所有 <link rel=stylesheet> 之前同步加载：
   这样 data-theme 在首帧绘制前就已写入，不会出现白闪。

   用法：<script src="js/theme.js"></script>
   对外：window.Theme = { get, resolved, set, toggle, cycle, mount }
   事件：document 上派发 'themechange'，detail = {mode, theme}
   URL：?theme=light|dark|auto 仅对本次会话生效（便于分享/截图）
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'jianpu.theme';
  var MODES = ['auto', 'light', 'dark'];
  var LABEL = { auto: '自动', light: '浅色', dark: '深色' };
  var ICON = { auto: '\u25D0', light: '\u2600', dark: '\u263E' };
  var root = document.documentElement;

  var canStore = true;
  var mem = null;

  function readMode() {
    try {
      var v = localStorage.getItem(KEY);
      if (v && MODES.indexOf(v) >= 0) return v;
    } catch (e) { canStore = false; }
    return mem || 'auto';
  }

  function writeMode(m) {
    mem = m;
    if (!canStore) return;
    try { localStorage.setItem(KEY, m); } catch (e) { canStore = false; }
  }

  /* ?theme= 覆盖（不持久化） */
  function urlMode() {
    var m = /[?&]theme=(auto|light|dark)\b/.exec(location.search || '');
    return m ? m[1] : null;
  }

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var pinned = urlMode();
  var mode = pinned || readMode();

  function systemTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function resolve(m) { return m === 'auto' ? systemTheme() : m; }

  function paint(m, persist) {
    mode = m;
    var theme = resolve(m);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1a1618' : '#fbf9f7');
    if (persist) writeMode(m);
    document.dispatchEvent(new CustomEvent('themechange', {
      detail: { mode: mode, theme: theme }
    }));
    syncButton();
  }

  /* ---------- 切换按钮 ---------- */
  var btn = null;
  function syncButton() {
    if (!btn) return;
    btn.innerHTML = '<span class="tt-ico" aria-hidden="true">' + ICON[mode] + '</span>' +
                    '<span class="tt-txt">' + LABEL[mode] + '</span>';
    btn.setAttribute('aria-label', '主题：' + LABEL[mode] + '（点击切换）');
    btn.setAttribute('title', '主题：' + LABEL[mode] + ' · 点击切换 浅色/深色/跟随系统');
    btn.setAttribute('aria-pressed', resolve(mode) === 'dark' ? 'true' : 'false');
  }

  function ensureStyle() {
    if (document.getElementById('theme-ui')) return;
    var st = document.createElement('style');
    st.id = 'theme-ui';
    /* 未引 app.css 的页面也能得到正确样式；值取令牌，缺令牌时用浅色兜底 */
    st.textContent =
      '.theme-toggle,.theme-fab{display:inline-flex;align-items:center;justify-content:center;gap:5px;' +
      'height:30px;min-width:30px;padding:0 9px;border-radius:8px;' +
      'border:1px solid var(--line,#f1e7e6);background:var(--field,#fff);color:var(--ink-2,#6c6165);' +
      'font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:.15s;white-space:nowrap}' +
      '.theme-toggle:hover,.theme-fab:hover{border-color:var(--accent,#e8879b);color:var(--ink,#3b3335)}' +
      '.theme-fab{position:fixed;right:14px;bottom:14px;z-index:95;width:38px;height:38px;padding:0;' +
      'border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,.18)}' +
      '.theme-toggle .tt-ico{font-size:14px;line-height:1}' +
      '@media (max-width:560px){.theme-toggle .tt-txt{display:none}.theme-toggle{width:30px;padding:0}}';
    document.head.appendChild(st);
  }

  function mount() {
    if (document.querySelector('[data-theme-toggle]')) {
      btn = document.querySelector('[data-theme-toggle]');
      syncButton();
      return;
    }
    ensureStyle();
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.setAttribute('data-theme-toggle', '');
    btn.addEventListener('click', function () { cycle(); });

    var tools = document.querySelector('.topbar .tools, header.topbar .tools, .sitebar .tools');
    if (tools) {
      tools.appendChild(btn);
    } else {
      var bar = document.querySelector('div.topbar, header.topbar');
      if (bar) {
        bar.appendChild(btn);
      } else {
        btn.className = 'theme-fab';
        document.body.appendChild(btn);
      }
    }
    syncButton();
  }

  function cycle() {
    var order = ['auto', 'light', 'dark'];
    var i = order.indexOf(mode);
    paint(order[(i + 1) % order.length], true);
  }

  function toggle() {
    paint(resolve(mode) === 'dark' ? 'light' : 'dark', true);
  }

  function set(m, persist) {
    if (MODES.indexOf(m) < 0) return;
    paint(m, persist !== false);
  }

  /* 首帧前落属性 */
  paint(mode, false);

  if (mq) {
    var onSys = function () { if (mode === 'auto') paint('auto', false); };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }

  /* 多标签页同步 */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && MODES.indexOf(e.newValue) >= 0) paint(e.newValue, false);
  });

  window.Theme = {
    get: function () { return mode; },
    resolved: function () { return resolve(mode); },
    set: set,
    toggle: toggle,
    cycle: cycle,
    mount: mount
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
