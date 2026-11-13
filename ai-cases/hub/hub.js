/* ============================================================
   hub.js — 学科分级目录的运行时
   ------------------------------------------------------------
   一个学科页只需要在 </body> 前引两个脚本：
     <script src="../hub/subjects.js"></script>   // 学科清单（顶部切换用）
     <script src="../hub/data/physics.js"></script> // window.SUBJECT 数据
     <script src="../hub/hub.js"></script>
   页面里放 <div id="hub"></div> 即可，其余全部由本文件生成：
   标题 → 学科切换 → 年级 tab → 左侧条目 → 右侧内嵌演示。
   ============================================================ */
(function () {
  'use strict';

  var S = window.SUBJECT;
  var HOST = document.getElementById('hub');
  if (!S || !HOST) return;

  var TAG_TEXT = { key: '重点学', hot: '高频', gap: '查漏补缺' };

  /* ---------- 小工具 ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  var byKey = {};
  var flat = [];          // 全部条目，按年级顺序平铺（上一题 / 下一题用）
  S.grades.forEach(function (g) {
    g.items.forEach(function (it) {
      byKey[it.k] = { g: g, it: it };
      flat.push({ g: g, it: it });
    });
  });

  /* ---------- 顶部 ---------- */
  document.body.setAttribute('data-subject', S.key);
  document.title = S.title + ' · 简普实验室';

  var head = el('header', 'app-header');
  head.innerHTML =
    '<div class="header-inner">' +
      '<div class="header-text">' +
        '<h1>' + S.title + '</h1>' +
        '<p class="subtitle">' + S.subtitle + '</p>' +
      '</div>' +
      '<div class="head-tools">' +
        '<a class="head-link" href="../../ai-cases.html">案例库</a>' +
        '<a class="head-link" href="../../index.html">回到首页</a>' +
      '</div>' +
    '</div>' +
    '<div class="subject-bar"><div class="subject-seg" id="subjSeg" role="navigation" aria-label="切换学科"></div></div>' +
    '<div class="grade-bar"><div class="grade-seg"><div class="seg-wrap" id="gradeSeg" role="tablist" aria-label="选择年级"></div></div></div>';
  document.body.insertBefore(head, HOST);

  /* ---------- 总览卡：这一科到底有多少货 ---------- */
  (function () {
    var groups = {};
    var pickN = 0, labN = 0;
    flat.forEach(function (r) {
      if (r.it.kind === 'lab') { labN++; return; }
      pickN++;
      if (r.it.group) groups[r.it.group] = 1;
    });
    var modCount = Object.keys(groups).length;
    var spanTxt = S.grades.length > 1
      ? S.grades[0].label + ' 到 ' + S.grades[S.grades.length - 1].label
      : S.grades[0].label;
    var ov = el('div', 'ov-strip');
    ov.innerHTML =
      '<div class="ov-inner">' +
        '<div class="ov-item"><b>' + pickN + '</b><span>精选演示</span></div>' +
        (labN ? '<div class="ov-item ov-lab"><b>' + labN + '</b><span>3D 实验课</span></div>' : '') +
        (modCount ? '<div class="ov-item"><b>' + modCount + '</b><span>知识模块</span></div>' : '') +
        '<div class="ov-item"><b>' + S.grades.length + '</b><span>个年级档 · ' + spanTxt + '</span></div>' +
        '<p class="ov-note">考频 / 分值为近五年考卷考点权重整理的<b>近似参考值</b>，用来安排先学后学，不是精确统计。</p>' +
      '</div>';
    head.querySelector('.grade-bar').insertAdjacentElement('afterend', ov);
  })();

  /* ---------- 学科切换药丸 ---------- */
  var seg = head.querySelector('#subjSeg');
  (window.HUB_SUBJECTS || []).forEach(function (s) {
    var a = el('a', 'subj-pill' + (s.key === S.key ? ' on' : ''),
      '<span>' + s.name + '</span>' + (s.count ? '<span class="cnt">' + s.count + '</span>' : ''));
    a.href = s.href;
    if (s.key === S.key) a.setAttribute('aria-current', 'page');
    a.title = s.name + '：' + (s.hint || '');
    seg.appendChild(a);
  });

  /* ---------- 主体骨架 ---------- */
  var app = el('div', 'hub-app');
  app.innerHTML =
    '<nav class="side-nav" id="sideNav" aria-label="本学科条目"></nav>' +
    '<main class="content">' +
      '<div class="stage-bar">' +
        '<h2><span class="sec-num" id="stNum">1</span><span class="t" id="stTitle"></span></h2>' +
        '<span class="ext-src" id="stSrc"></span>' +
        '<span class="stat-chip stage-stat" id="stStat" hidden></span>' +
        '<div class="stage-actions">' +
          '<button class="btn" id="btnPrev" type="button">← 上一题</button>' +
          '<button class="btn" id="btnNext" type="button">下一题 →</button>' +
          '<a class="btn btn-primary" id="btnOpen" target="_blank" rel="noopener">新窗口打开 ↗</a>' +
        '</div>' +
      '</div>' +
      '<p class="stage-tip" id="stTip"><span class="qs">想一想</span><span id="stDesc"></span></p>' +
      '<div class="frame-wrap">' +
        '<iframe id="stageFrame" title="互动演示" loading="eager" referrerpolicy="no-referrer"></iframe>' +
        '<div class="stage-loading" id="stLoading"><span class="spin"></span><span>正在加载演示…</span></div>' +
        '<div class="frame-fallback" id="stFallback">' +
          '<p class="big">这个页面不允许被内嵌显示</p>' +
          '<p>演示本身可以正常打开，点下面的按钮在新标签页看。</p>' +
          '<a class="btn btn-primary" id="btnOpen2" target="_blank" rel="noopener">在新窗口打开 ↗</a>' +
        '</div>' +
      '</div>' +
    '</main>';
  HOST.parentNode.replaceChild(app, HOST);

  var navBox = app.querySelector('#sideNav');
  var gradeSeg = head.querySelector('#gradeSeg');
  var frame = app.querySelector('#stageFrame');
  var loading = app.querySelector('#stLoading');
  var fallback = app.querySelector('#stFallback');
  var $num = app.querySelector('#stNum');
  var $title = app.querySelector('#stTitle');
  var $src = app.querySelector('#stSrc');
  var $desc = app.querySelector('#stDesc');
  var $tip = app.querySelector('#stTip');
  var $open = app.querySelector('#btnOpen');
  var $open2 = app.querySelector('#btnOpen2');
  var $prev = app.querySelector('#btnPrev');
  var $next = app.querySelector('#btnNext');

  /* ---------- 年级 tab ---------- */
  S.grades.forEach(function (g, i) {
    var b = el('button', 'grade-tab' + (i === 0 ? ' active' : ''),
      g.label + (g.hint ? '<small>' + g.hint + '</small>' : ''));
    b.type = 'button';
    b.dataset.gid = g.id;
    b.title = g.label + (g.hint ? ' · ' + g.hint : '') + '（' + g.items.length + ' 题）';
    gradeSeg.appendChild(b);
  });

  /* ---------- 左侧导航：精选演示 / 3D 实验课 分档 ---------- */
  var content = app.querySelector('.content');
  navBox.remove();
  S.grades.forEach(function (g, gi) {
    var nav = el('nav', 'side-nav');
    nav.id = 'nav-' + g.id;
    nav.hidden = gi !== 0;
    nav.setAttribute('aria-label', g.label + '条目');

    var pick = g.items.filter(function (it) { return it.kind !== 'lab'; });
    var lab = g.items.filter(function (it) { return it.kind === 'lab'; });
    var seq = 0;

    function makeItem(it, isLab) {
      var meta = (it.fq != null && it.sc != null)
        ? '<span class="nmeta">考频 ' + it.fq + '% · 均分 ' + it.sc + ' 分</span>' : '';
      var badge = it.tag ? '<span class="prio p-' + it.tag + '">' + TAG_TEXT[it.tag] + '</span>' : '';
      var b = el('button', 'nav-item' + (isLab ? ' is-lab' : ''),
        '<span class="nav-num">' + (++seq) + '</span>' +
        '<span class="nbody"><span class="nt">' + it.t + '</span>' + meta + '</span>' + badge);
      b.type = 'button';
      b.dataset.k = it.k;
      b.title = it.t + (isLab ? ' · 铜匠实验室 3D 课' : '');
      return b;
    }

    /* 第一档：本站策展的互动演示（带考频 / 徽章）——
       只有和 3D 课同档时才戴标题，纯策展年级保持原来的样子 */
    if (pick.length) {
      if (lab.length) {
        nav.appendChild(el('div', 'tier-h tier-pick',
          '<span class="th-t">精选互动演示</span><span class="th-n">' + pick.length + '</span>'));
      }
      var lastGroup = null;
      pick.forEach(function (it) {
        if (it.group && it.group !== lastGroup) {
          nav.appendChild(el('div', 'nav-group', it.group));
          lastGroup = it.group;
        }
        nav.appendChild(makeItem(it, false));
      });
    }

    /* 第二档：铜匠实验室 3D 实验课，可折叠 */
    if (lab.length) {
      var lh = el('div', 'tier-h tier-lab',
        '<span class="th-t">3D 实验课</span><span class="th-n">' + lab.length + '</span>' +
        '<span class="th-src">铜匠实验室</span><i class="th-x"></i>');
      lh.setAttribute('role', 'button');
      lh.tabIndex = 0;
      lh.setAttribute('aria-expanded', 'true');
      lh.title = '收起 / 展开这 ' + lab.length + ' 门 3D 课';
      var body = el('div', 'tier-body');
      body.dataset.body = 'lab';
      var lastSub = null;
      lab.forEach(function (it) {
        if (it.group && it.group !== lastSub) {
          body.appendChild(el('div', 'nav-sub', it.group));
          lastSub = it.group;
        }
        body.appendChild(makeItem(it, true));
      });
      nav.appendChild(lh);
      nav.appendChild(body);
      var toggle = function () {
        body.hidden = !body.hidden;
        lh.classList.toggle('collapsed', body.hidden);
        lh.setAttribute('aria-expanded', String(!body.hidden));
      };
      lh.addEventListener('click', toggle);
      lh.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    app.insertBefore(nav, content);
  });
  var navs = Array.prototype.slice.call(app.querySelectorAll('.side-nav'));

  /* ---------- 演示加载 ---------- */
  var curKey = null;
  var loadTimer = null;

  function encodePath(p) {
    // 文件名里有空格、+、^ 等字符，逐段编码最稳
    return p.split('/').map(encodeURIComponent).join('/').replace(/^\.\.%2F/, '../').replace(/%2F/g, '/');
  }

  function render(key) {
    var rec = byKey[key];
    if (!rec || curKey === key) return;
    curKey = key;
    var it = rec.it;

    // 高亮
    navs.forEach(function (nav) {
      Array.prototype.forEach.call(nav.querySelectorAll('.nav-item'), function (b) {
        b.classList.toggle('active', b.dataset.k === key);
      });
    });
    var on = app.querySelector('.nav-item.active');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // 头部信息
    var idxAll = flat.findIndex(function (r) { return r.it.k === key; });
    $num.textContent = rec.g.items.findIndex(function (x) { return x.k === key; }) + 1;
    $title.textContent = it.t;
    $src.textContent = it.src || '本站原创';
    var $stat = app.querySelector('#stStat');
    if (it.fq != null && $stat) {
      $stat.hidden = false;
      $stat.innerHTML = (it.tag ? '<span class="prio p-' + it.tag + '">' + TAG_TEXT[it.tag] + '</span>' : '') +
        '考频 <b>' + it.fq + '%</b> · 平均分值 <b>' + it.sc + ' 分</b>';
    } else if ($stat) {
      $stat.hidden = true;
    }
    $desc.innerHTML = it.d || '';
    $tip.classList.toggle('warn', !!it.newwin);
    $open.href = it.f;
    $open2.href = it.f;

    // 同年级内的上一题 / 下一题
    var sib = rec.g.items;
    var i = sib.findIndex(function (x) { return x.k === key; });
    $prev.disabled = i <= 0;
    $next.disabled = i >= sib.length - 1;
    $prev.dataset.k = i > 0 ? sib[i - 1].k : '';
    $next.dataset.k = i < sib.length - 1 ? sib[i + 1].k : '';

    // 路由 + 标题
    try { history.replaceState(null, '', '#' + key); } catch (e) { location.hash = key; }
    document.title = it.t + ' · ' + S.name + '可视化互动学习';

    // 载入演示
    fallback.classList.remove('show');
    frame.style.display = '';
    if (it.newwin) {
      frame.style.display = 'none';
      loading.classList.add('hide');
      fallback.classList.add('show');
      fallback.querySelector('.big').textContent = '这一页放不进内嵌窗口';
      return;
    }
    loading.classList.remove('hide');
    loading.innerHTML = '<span class="spin"></span><span>正在加载演示…</span>';
    clearTimeout(loadTimer);
    frame.src = it.f;
    loadTimer = setTimeout(function () {
      // 8 秒还没 load 完，换一句更诚实的提示（不打断加载）
      loading.innerHTML = '<span class="spin"></span><span>还在加载…页面较重时请稍等，或直接点右上「新窗口打开」</span>';
    }, 8000);
  }

  frame.addEventListener('load', function () {
    loading.classList.add('hide');
    clearTimeout(loadTimer);
    loading.innerHTML = '<span class="spin"></span><span>正在加载演示…</span>';
  });

  /* ---------- 交互 ---------- */
  function switchGrade(gid) {
    Array.prototype.forEach.call(gradeSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.gid === gid);
    });
    navs.forEach(function (n) { n.hidden = n.id !== 'nav-' + gid; });
    var g = S.grades.filter(function (x) { return x.id === gid; })[0];
    if (!g) return;
    var want = null;
    try {
      var h = location.hash.slice(1);
      if (h && byKey[h] && byKey[h].g.id === gid) want = h;
    } catch (e) {}
    if (!want) want = (lastSeen[gid] && byKey[lastSeen[gid]] ? lastSeen[gid] : g.items[0].k);
    lastSeen[gid] = want;
    if (curKey === want) { render(want); }
    else { curKey = null; render(want); }
  }
  var lastSeen = {};
  S.grades.forEach(function (g) { lastSeen[g.id] = g.items[0].k; });

  gradeSeg.addEventListener('click', function (e) {
    var b = e.target.closest('.grade-tab');
    if (b) switchGrade(b.dataset.gid);
  });
  app.addEventListener('click', function (e) {
    var b = e.target.closest('.nav-item');
    if (b && b.dataset.k) {
      var gid = byKey[b.dataset.k].g.id;
      lastSeen[gid] = b.dataset.k;
      render(b.dataset.k);
    }
  });
  $prev.addEventListener('click', function () { if ($prev.dataset.k) jump($prev.dataset.k); });
  $next.addEventListener('click', function () { if ($next.dataset.k) jump($next.dataset.k); });
  function jump(k) {
    var gid = byKey[k].g.id;
    lastSeen[gid] = k;
    switchGrade(gid);
  }
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft' && $prev.dataset.k) { e.preventDefault(); jump($prev.dataset.k); }
    if (e.key === 'ArrowRight' && $next.dataset.k) { e.preventDefault(); jump($next.dataset.k); }
  });

  /* ---------- 首次渲染 ---------- */
  function boot() {
    var h = '';
    try { h = location.hash.slice(1); } catch (e) {}
    if (h && byKey[h]) {
      var gid = byKey[h].g.id;
      lastSeen[gid] = h;
      Array.prototype.forEach.call(gradeSeg.children, function (b) {
        b.classList.toggle('active', b.dataset.gid === gid);
      });
      navs.forEach(function (n) { n.hidden = n.id !== 'nav-' + gid; });
      render(h);
    } else {
      render(S.grades[0].items[0].k);
    }
  }
  boot();
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (h && byKey[h]) {
      var gid = byKey[h].g.id;
      lastSeen[gid] = h;
      if (navs.some(function (n) { return !n.hidden && n.id === 'nav-' + gid; })) {
        curKey = null;
      }
      switchGrade(gid);
    }
  });
})();
