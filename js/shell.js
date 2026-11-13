/* ============================================================
   shell.js — 站点外壳（零依赖，file:// 直开）
   职责：为带 data-lab 的顶栏注入统一品牌区，消除 6 页重复标记。
   用法：
     <header class="topbar" role="banner"
             data-lab="地形实验室" data-en="Terrain Lab"
             data-glyph="帧" data-tone="terrain">
       ...本页工具...
     </header>
     <script src="js/shell.js" defer></script>
   幂等：重复调用/重复加载不会产生第二个品牌区。
   ============================================================ */
(function () {
  'use strict';

  /* 各实验室 logo 渐变（terrain 为 null = 使用 app.css .logo 默认渐变） */
  var TONES = {
    terrain:  null,
    circuit:  'linear-gradient(150deg,#7fa8d8,#5b84c4)',
    mechanics:'linear-gradient(150deg,#9fc49a,#6fa46e)',
    molecule: 'linear-gradient(150deg,#b49be0,#8e74c9)',
    formula:  'linear-gradient(150deg,#f2b78e,#db8f63)',
    optics:   'linear-gradient(150deg,#8fc7bb,#5fa396)'
  };

  function buildBrand(h) {
    var a = document.createElement('a');
    a.className = 'brand';
    a.href = 'index.html';
    a.setAttribute('aria-label', '返回首页');

    var logo = document.createElement('span');
    logo.className = 'logo';
    logo.textContent = h.getAttribute('data-glyph') || '帧';
    var tone = TONES[h.getAttribute('data-tone')];
    if (tone) logo.style.background = tone;

    var bt = document.createElement('span');
    bt.className = 'bt';
    bt.textContent = h.getAttribute('data-lab') || '';
    var en = h.getAttribute('data-en');
    if (en) {
      var em = document.createElement('em');
      em.textContent = en;
      bt.appendChild(em);
    }

    a.appendChild(logo);
    a.appendChild(bt);
    return a;
  }

  function topbar(root) {
    var scope = root || document;
    var headers = scope.querySelectorAll('header.topbar[data-lab], div.topbar[data-lab]');
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h.querySelector('.brand')) continue;   /* 幂等 */
      h.insertBefore(buildBrand(h), h.firstChild);
    }
  }

  /* ---------- URL 深链：search(?a=b) 与 hash(#a=b) 合并读写 ---------- */
  function params() {
    var out = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { out[k] = v; });
      var h = location.hash.replace(/^#/, '');
      if (h.indexOf('=') >= 0) {
        new URLSearchParams(h).forEach(function (v, k) { out[k] = v; });
      } else if (h) {
        out[h] = '1';
      }
    } catch (e) { /* file:// 下极端环境兜底：返回空 */ }
    return out;
  }

  function setParams(obj) {
    var cur = {};
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('=') >= 0) {
      try { new URLSearchParams(h).forEach(function (v, k) { cur[k] = v; }); } catch (e) {}
    }
    for (var k in obj) {
      if (obj[k] === null || obj[k] === undefined || obj[k] === '') delete cur[k];
      else cur[k] = obj[k];
    }
    var qs = '';
    try { qs = new URLSearchParams(cur).toString(); } catch (e) {}
    var target = qs ? ('#' + qs) : (location.pathname + location.search);
    try { history.replaceState(null, '', target); }
    catch (e) { location.hash = qs; }
  }

  /* ---------- 移动端抽屉：≤900px 时参数面板变为可收起抽屉 ---------- */
  function setPanel(open) {
    document.body.classList.toggle('panel-open', !!open);
    var btn = document.querySelector('.menu-btn');
    var bd = document.querySelector('.backdrop');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (bd) bd.hidden = !open;
  }

  function drawer() {
    var panel = document.querySelector('aside.panel');
    var bar = document.querySelector('.topbar');
    if (!panel || !bar || bar.querySelector('.menu-btn')) return;   /* 幂等 */

    var btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.type = 'button';
    btn.textContent = '☰ 参数';
    btn.setAttribute('aria-label', '打开参数面板');
    btn.setAttribute('aria-expanded', 'false');
    btn.onclick = function () { setPanel(!document.body.classList.contains('panel-open')); };
    var brand = bar.querySelector('.brand');
    if (brand && brand.insertAdjacentElement) brand.insertAdjacentElement('afterend', btn);
    else bar.appendChild(btn);

    var bd = document.createElement('button');
    bd.className = 'backdrop';
    bd.type = 'button';
    bd.hidden = true;
    bd.setAttribute('aria-label', '关闭参数面板');
    bd.onclick = function () { setPanel(false); };
    document.body.appendChild(bd);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setPanel(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { topbar(); drawer(); });
  } else {
    topbar(); drawer();
  }

  /* 暴露给动态插入顶栏的场景与各实验室深链复用 */
  window.Shell = {
    topbar: topbar,
    TONES: TONES,
    params: params,
    setParams: setParams,
    setPanel: setPanel
  };
})();
