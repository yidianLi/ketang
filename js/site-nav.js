/* ============================================================
   site-nav.js — 站点导航与页脚（零依赖，file:// 可用）
   ------------------------------------------------------------
   为什么自包含：部分页面（资源库/知识专题/案例库）各自引了 app.css，
   而设计说明类页面用的是自己的局部变量；把样式一起注入，才能保证
   同一套导航在任何页面上长得一样、深浅两色都对。

   用法（放在 body 内、紧跟在占位 div 之后，同步执行）：
     <div id="site-nav"></div>
     <script src="js/site-nav.js"></script>
   无占位时自动插入到 body 首个元素之前；页脚同理用 id="site-foot"。

   顺带：导航里的品牌链接永远指回 index.html，5 个内部入口按当前
   文件名自动高亮，避免"这一页到底在哪"的迷失。
   ============================================================ */
(function () {
  'use strict';

  var LINKS = [
    ['index.html', '首页'],
    ['subjects.html', '学科目录'],
    ['resource.html', '资源库'],
    ['knowledge.html', '知识专题'],
    ['quiz.html', '随堂自测'],
    ['ai-cases.html', '案例库'],
    ['classroom.html', '课堂工具']
  ];

  var FOOT_LINKS = [
    ['index.html', '首页'],
    ['subjects.html', '学科目录'],
    ['resource.html', '资源库'],
    ['knowledge.html', '知识专题'],
    ['quiz.html', '随堂自测'],
    ['ai-cases.html', '案例库'],
    ['classroom.html', '课堂工具']
  ];

  function here() {
    var p = (location.pathname || '').split('/').pop();
    return p || 'index.html';
  }

  function ensureStyle() {
    if (document.getElementById('sitenav-ui')) return;
    var st = document.createElement('style');
    st.id = 'sitenav-ui';
    st.textContent =
      '.sitebar{display:flex;align-items:center;gap:18px;flex-wrap:wrap;' +
        'padding:12px 22px;background:var(--panel,#fff);border-bottom:1px solid var(--line,#f1e7e6)}' +
      '.sitebar .sb-brand{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink,#3b3335)}' +
      '.sitebar .sb-logo{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;' +
        'background:linear-gradient(150deg,#f5a9b8,var(--accent,#e8879b));color:#fff;' +
        'font-weight:700;font-size:15px;box-shadow:0 1px 3px rgba(214,138,158,.28)}' +
      '.sitebar .sb-name{font-size:15px;font-weight:600;letter-spacing:.2px;line-height:1.2}' +
      '.sitebar .sb-name em{display:block;font-style:normal;font-size:9.5px;letter-spacing:1.6px;' +
        'color:var(--muted,#9a8f93);font-weight:400}' +
      '.sitebar nav{display:flex;gap:4px;flex-wrap:wrap;margin-left:6px}' +
      '.sitebar nav a{display:inline-flex;align-items:center;height:30px;padding:0 13px;' +
        'border-radius:999px;font-size:13px;color:var(--ink-2,#6c6165);text-decoration:none;transition:.15s}' +
      '.sitebar nav a:hover{background:var(--hover-2,#fcedf0);color:var(--accent,#e8879b)}' +
      '.sitebar nav a.on{background:var(--accent,#e8879b);color:#fff;font-weight:600}' +
      '.sitebar .sb-tools{margin-left:auto;display:flex;align-items:center;gap:8px}' +
      '.sitefoot{border-top:1px solid var(--line,#f1e7e6);background:var(--paper,#fbf9f7);' +
        'padding:26px 22px 34px;margin-top:8px}' +
      '.sitefoot .sf-in{max-width:1080px;margin:0 auto;display:flex;gap:18px;flex-wrap:wrap;' +
        'align-items:center;justify-content:space-between}' +
      '.sitefoot .sf-links{display:flex;gap:14px;flex-wrap:wrap}' +
      '.sitefoot .sf-links a{font-size:12.5px;color:var(--ink-2,#6c6165);text-decoration:none}' +
      '.sitefoot .sf-links a:hover{color:var(--accent,#e8879b)}' +
      '.sitefoot .sf-meta{font-size:12px;color:var(--muted,#9a8f93);line-height:1.8}' +
      '.sitefoot .sf-meta b{color:var(--ink-2,#6c6165);font-weight:600}' +
      '@media (max-width:640px){' +
        '.sitebar{padding:10px 14px;gap:10px}' +
        '.sitebar nav{margin-left:0;order:3;width:100%;overflow-x:auto;flex-wrap:nowrap;' +
          'padding-bottom:2px;scrollbar-width:none}' +
        '.sitebar nav::-webkit-scrollbar{display:none}' +
        '.sitebar nav a{white-space:nowrap;font-size:12.5px;padding:0 11px}' +
        '.sitebar .sb-tools{margin-left:auto}' +
        '.sitefoot{padding:20px 14px 28px}' +
      '}';
    document.head.appendChild(st);
  }

  function navHtml() {
    var cur = here();
    var items = LINKS.map(function (l) {
      var on = l[0] === cur ? ' class="on"' : '';
      var aria = l[0] === cur ? ' aria-current="page"' : '';
      return '<a href="' + l[0] + '"' + on + aria + '>' + l[1] + '</a>';
    }).join('');
    return '<a class="sb-brand" href="index.html" aria-label="简普实验室 · 返回首页">' +
             '<span class="sb-logo" aria-hidden="true">帧</span>' +
             '<span class="sb-name">简普实验室<em>JIANPU LAB</em></span>' +
           '</a>' +
           '<nav aria-label="站点导航">' + items + '</nav>' +
           '<div class="sb-tools"></div>';
  }

  function footHtml() {
    var links = FOOT_LINKS.map(function (l) {
      return '<a href="' + l[0] + '">' + l[1] + '</a>';
    }).join('');
    return '<div class="sf-in">' +
             '<div class="sf-links">' + links + '</div>' +
             '<div class="sf-meta">' +
               '<b>简普实验室</b> v1.2 · 零第三方依赖 · 无需联网<br>' +
               '双击 index.html 即可离线运行 · 内核自检 1849 条断言' +
             '</div>' +
           '</div>';
  }

  function mountNav() {
    var host = document.getElementById('site-nav');
    if (host) {
      host.className = 'sitebar';
      host.innerHTML = navHtml();
      return;
    }
    var bar = document.createElement('div');
    bar.id = 'site-nav';
    bar.className = 'sitebar';
    bar.innerHTML = navHtml();
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function mountFoot() {
    var host = document.getElementById('site-foot');
    if (!host) {
      host = document.createElement('footer');
      host.id = 'site-foot';
      document.body.appendChild(host);
    }
    host.className = 'sitefoot';
    host.innerHTML = footHtml();
  }

  ensureStyle();
  mountNav();

  /* 页脚必须等 DOM 解析完再挂：本脚本是同步执行的，此刻后面的正文还没解析出来，
     直接 append 会让页脚跑到正文前面去。 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFoot);
  } else {
    mountFoot();
  }

  /* 让主题开关落进导航右侧：theme.js 的 mount 会找 .topbar .tools，
     这里补一个同样的挂点，避免退化成右下角浮动按钮。 */
  var tools = document.querySelector('.sitebar .sb-tools');
  if (tools) tools.className = 'sb-tools tools';
})();
