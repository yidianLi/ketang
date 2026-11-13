/* ============================================================
   分子实验室 · 画布渲染与交互
   Canvas 版：球棍 / 空间填充 / 结构式三种模式 + 晶胞展示
   ============================================================ */
(function () {
  'use strict';
  var M = window.MolCore;
  var $ = function (id) { return document.getElementById(id); };

  var cv, ctx, noteEl, infoEl;
  var mode = 'ball';           // ball | fill | structure
  var tab = 'molecule';        // molecule | crystal
  var mol = M.MOLECULES[0];
  var cry = M.CRYSTALS[0];
  var view = { yaw: 0.6, pitch: 0.35 };
  var zoom = 1;
  var drag = null;
  var selectedAtom = -1;

  var COL = { ink: '#3b3335', muted: '#9a8f93', line: '#f1e7e6', paper: '#ffffff', bond: '#a4aaa5', bondHi: '#8a6a52' };

  function fitCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /* ---------- 球体着色 ---------- */
  function ball(c, x, y, r, el, alpha) {
    var e = M.ELEMENTS[el];
    if (!e) return;
    c.save();
    if (alpha != null) c.globalAlpha = alpha;
    var g = c.createRadialGradient(x - r * 0.32, y - r * 0.4, r * 0.12, x, y, r * 1.02);
    g.addColorStop(0, e.light);
    g.addColorStop(0.45, e.color);
    g.addColorStop(1, e.dark);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.strokeStyle = e.dark; c.globalAlpha = (alpha == null ? 1 : alpha) * 0.25;
    c.lineWidth = 1; c.stroke();
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = e.text;
    c.font = '600 ' + Math.max(9, r * 0.72) + 'px "Microsoft YaHei",sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (r > 10) c.fillText(el, x, y + 1);
    c.restore();
  }

  /* ---------- 分子绘制 ---------- */
  function drawMolecule() {
    if (!fitCanvas()) return;
    var w = cv.clientWidth, h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COL.paper;
    ctx.fillRect(0, 0, w, h);

    var atoms = mol.atoms.map(function (a, i) {
      var r = mode === 'fill' ? M.vdwRadius(a.el) : M.stickRadius(a.el) / 110;
      return { el: a.el, x: a.x, y: a.y, z: a.z, radius: r, idx: i };
    });
    var proj = M.makeProjector(atoms, view, w, h - 44, zoom);

    // 投影 + 深度排序
    var pts = atoms.map(function (a) {
      var p = proj.project(a);
      return { x: p.x, y: p.y, z: p.z, el: a.el, r: a.radius * proj.scale, idx: a.idx };
    }).sort(function (u, v) { return u.z - v.z; });
    // 坐标系 y 向下：投影 y 已翻

    // 键（先画后面的键，简化：键按两端平均深度排序）
    if (mode !== 'fill') {
      var bonds = mol.bonds.map(function (b) {
        return { b: b, z: (pts[b.a] ? 0 : 0) };
      });
      // 直接用未排序原子对（pts[a] 无法对应）——改为重投影原始原子
      var raw = mol.atoms.map(function (a) { return proj.project(a); });
      mol.bonds.map(function (b, bi) {
        var p1 = raw[b.a], p2 = raw[b.b];
        var zAvg = (mol.atoms[b.a].x * 0 + projZ(b.a) + projZ(b.b)) / 2;
        return { bi: bi, b: b, p1: p1, p2: p2, z: zAvg };
      }).sort(function (u, v) { return u.z - v.z; }).forEach(function (o) {
        drawBond(o.p1, o.p2, o.b.order);
      });
    }

    function projZ(i) {
      var a = mol.atoms[i];
      var p = proj.project(a);
      return p.z;
    }
    function drawBond(p1, p2, order) {
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L, ny = dx / L;
      ctx.save();
      for (var u = 0; u < order; u++) {
        var off = (u - (order - 1) / 2) * 5.5;
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * off, p1.y + ny * off);
        ctx.lineTo(p2.x + nx * off, p2.y + ny * off);
        ctx.strokeStyle = COL.bond; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = '#d3d7d3'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * off - 1, p1.y + ny * off - 1);
        ctx.lineTo(p2.x + nx * off - 1, p2.y + ny * off - 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 原子（深度排序后画）
    pts.forEach(function (p) {
      ball(ctx, p.x, p.y, Math.max(4, p.r), p.el);
      if (p.idx === selectedAtom) {
        ctx.save();
        ctx.strokeStyle = '#ef9a8e'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, p.r) + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    });

    // 底部信息
    ctx.fillStyle = COL.muted;
    ctx.font = '11.5px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(sub(mol.formula) + ' · ' + mol.shape + ' · 拖动旋转 · 滚轮缩放', 12, h - 12);

    // 选中原子信息 + 键角
    if (selectedAtom >= 0) {
      var a = mol.atoms[selectedAtom];
      var angs = M.anglesAt(mol, selectedAtom);
      ctx.fillStyle = COL.ink;
      ctx.font = '600 12.5px "Microsoft YaHei",sans-serif';
      ctx.fillText(M.ELEMENTS[a.el].name + '（' + a.el + '）· 化合价 ' + M.ELEMENTS[a.el].valence, 12, h - 34);
      if (angs.length) {
        ctx.fillStyle = COL.muted;
        ctx.font = '11.5px "Microsoft YaHei",sans-serif';
        ctx.fillText('键角：' + angs.map(function (x) { return x.label + ' ' + x.degrees.toFixed(1) + '°'; }).join('  '), 12, h - 52);
      }
    }
  }

  function sub(s) {
    var low = '₀₁₂₃₄₅₆₇₈₉';
    return s.replace(/[0-9]/g, function (d) { return low[+d]; });
  }

  /* ---------- 晶胞绘制 ---------- */
  function drawCrystal() {
    if (!fitCanvas()) return;
    var w = cv.clientWidth, h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COL.paper;
    ctx.fillRect(0, 0, w, h);

    // 晶胞 8 个顶点 + basis
    var atoms = cry.basis.map(function (s) {
      return { el: s.sp, x: s.x, y: s.y, z: s.z, radius: cry.species[s.sp].r, isSite: true };
    });
    var proj = M.makeProjector(atoms, view, w, h - 44, zoom);

    // 晶胞立方体框
    var corners = [];
    for (var i = 0; i < 8; i++) {
      corners.push(proj.project({
        x: (i & 1) ? 1 : 0, y: (i & 2) ? 1 : 0, z: (i & 4) ? 1 : 0
      }));
    }
    var EDGES = [[0, 1], [0, 2], [2, 3], [1, 3], [4, 5], [4, 6], [6, 7], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    ctx.save();
    ctx.strokeStyle = 'rgba(138,114,89,.4)'; ctx.lineWidth = 1;
    EDGES.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(corners[e[0]].x, corners[e[0]].y);
      ctx.lineTo(corners[e[1]].x, corners[e[1]].y);
      ctx.stroke();
    });
    ctx.restore();

    // 近邻虚线（离子晶体配位提示）
    var bonds = M.crystalBonds(cry);
    var raw = cry.basis.map(function (s) { return proj.project(s); });
    ctx.save();
    ctx.strokeStyle = 'rgba(154,123,112,.35)';
    ctx.setLineDash([3, 4]);
    bonds.forEach(function (b) {
      ctx.beginPath();
      ctx.moveTo(raw[b[0]].x, raw[b[0]].y);
      ctx.lineTo(raw[b[1]].x, raw[b[1]].y);
      ctx.stroke();
    });
    ctx.restore();

    // 球体（深度排序）
    cry.basis.map(function (s, i) {
      var p = proj.project(s);
      return { x: p.x, y: p.y, z: p.z, sp: s.sp, r: cry.species[s.sp].r * proj.scale, i: i };
    }).sort(function (u, v) { return u.z - v.z; }).forEach(function (p) {
      var sp = cry.species[p.sp];
      ctx.save();
      var g = ctx.createRadialGradient(p.x - p.r * 0.32, p.y - p.r * 0.4, p.r * 0.12, p.x, p.y, p.r * 1.02);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, sp.color); g.addColorStop(1, shade(sp.color, 0.62));
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, p.r), 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.stroke();
      if (p.r > 13) {
        ctx.fillStyle = '#fff'; ctx.font = '600 ' + Math.max(9, p.r * 0.5) + 'px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sp.label, p.x, p.y + 1);
      }
      ctx.restore();
    });

    ctx.fillStyle = COL.muted;
    ctx.font = '11.5px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(cry.name + ' · ' + cry.cell + ' · ' + cry.kind + ' · 拖动旋转', 12, h - 12);
  }

  function shade(hex, f) {
    var m = hex.slice(1).match(/../g);
    return '#' + m.map(function (o) {
      var v = Math.round(parseInt(o, 16) * f);
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
  }

  function draw() { tab === 'molecule' ? drawMolecule() : drawCrystal(); }

  /* ---------- 交互 ---------- */
  function bind() {
    cv.addEventListener('pointerdown', function (e) {
      drag = { sx: e.clientX, sy: e.clientY, yaw: view.yaw, pitch: view.pitch };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      view.yaw = drag.yaw - (e.clientX - drag.sx) * 0.008;
      view.pitch = Math.max(-1.4, Math.min(1.4, drag.pitch + (e.clientY - drag.sy) * 0.006));
      draw();
    });
    cv.addEventListener('pointerup', function () { drag = null; });
    cv.addEventListener('pointercancel', function () { drag = null; });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom = Math.max(0.4, Math.min(3, zoom * Math.pow(1.0015, -e.deltaY)));
      draw();
    }, { passive: false });
    // 点选原子
    cv.addEventListener('click', function (e) {
      if (tab !== 'molecule') return;
      var rect = cv.getBoundingClientRect();
      var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      var w = cv.clientWidth, h = cv.clientHeight;
      var atoms = mol.atoms.map(function (a) {
        return { el: a.el, x: a.x, y: a.y, z: a.z, radius: mode === 'fill' ? M.vdwRadius(a.el) : M.stickRadius(a.el) / 110 };
      });
      var proj = M.makeProjector(atoms, view, w, h - 44, zoom);
      var best = -1, bestD = 22;
      mol.atoms.forEach(function (a, i) {
        var p = proj.project(a);
        var d = Math.hypot(p.x - sx, p.y - sy);
        if (d < bestD) { bestD = d; best = i; }
      });
      selectedAtom = best;
      draw();
    });
  }

  /* ---------- 面板 ---------- */
  function buildMolList() {
    var box = $('molList');
    box.innerHTML = '';
    M.MOLECULES.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'comp' + (m === mol ? ' on' : '');
      li.innerHTML = '<span class="nm">' + m.name + '</span><span class="vh">' + sub(m.formula) + '</span>';
      li.onclick = function () {
        mol = m; selectedAtom = -1;
        buildMolList(); renderInfo(); draw();
        if (window.Shell) Shell.setParams({ m: mol.id || mol.name });
      };
      box.appendChild(li);
    });
  }
  function buildCryList() {
    var box = $('cryList');
    box.innerHTML = '';
    M.CRYSTALS.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'comp' + (c === cry ? ' on' : '');
      li.innerHTML = '<span class="nm">' + c.name + '</span><span class="vh">' + c.kind.slice(0, 2) + '</span>';
      li.onclick = function () {
        cry = c;
        buildCryList(); renderInfo(); draw();
        if (window.Shell) Shell.setParams({ c: cry.id || cry.name });
      };
      box.appendChild(li);
    });
  }

  function renderInfo() {
    if (tab === 'molecule') {
      var angs = [];
      mol.atoms.forEach(function (a, i) {
        M.anglesAt(mol, i).forEach(function (x) {
          if (!angs.some(function (y) { return y.label === x.label; })) angs.push(x);
        });
      });
      infoEl.innerHTML =
        '<h3>' + mol.name + ' <small>' + sub(mol.formula) + '</small></h3>' +
        '<p>' + mol.desc + '</p>' +
        '<p class="tip">' + mol.high + '</p>' +
        (angs.length ? '<p class="tip"><b>理论键角：</b>' +
          angs.map(function (x) { return x.label + ' ≈ ' + x.degrees.toFixed(1) + '°'; }).join('；') + '</p>' : '') +
        '<p class="tip">原子数 ' + mol.atoms.length + ' · 化学键 ' + mol.bonds.length + ' 条</p>';
    } else {
      infoEl.innerHTML =
        '<h3>' + cry.name + ' <small>' + cry.formula + '</small></h3>' +
        '<p>' + cry.summary + '</p>' +
        '<p class="tip">' + cry.note + '</p>' +
        '<p class="tip">晶胞粒子：' + cry.basis.length + ' 个（含界面共享）</p>';
    }
  }

  function bindUI() {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        tab = b.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('molBlock').hidden = tab !== 'molecule';
        $('cryBlock').hidden = tab !== 'crystal';
        renderInfo(); draw();
        if (window.Shell) Shell.setParams({ tab: tab });
      };
    });
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.onclick = function () {
        mode = b.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw();
        if (window.Shell) Shell.setParams({ mode: mode });
      };
    });
    $('resetView').onclick = function () {
      view = { yaw: 0.6, pitch: 0.35 }; zoom = 1; draw();
    };
  }

  window.addEventListener('resize', draw);

  /* ---------- 主题跟随（结构性配色，语义色 bond 不变） ---------- */
  function syncCol() {
    if (!window.CanvasTheme) return;
    var p = CanvasTheme.palette();
    COL.ink = p.ink; COL.muted = p.muted; COL.line = p.line; COL.paper = p.canvas;
  }
  if (window.CanvasTheme) CanvasTheme.on(function () { syncCol(); draw(); });
  syncCol();

  function boot() {
    cv = $('stage');
    ctx = cv.getContext('2d');
    noteEl = $('note');
    infoEl = $('info');
    bind();
    bindUI();
    buildMolList();
    buildCryList();
    renderInfo();
    draw();
  }
  function applyLink() {
    if (!window.Shell) return;
    var q = Shell.params();
    if (q.m) {
      var mm = M.MOLECULES.filter(function (x) { return (x.id || x.name) === q.m; })[0];
      if (mm) { mol = mm; selectedAtom = -1; buildMolList(); }
    }
    if (q.c) {
      var cc = M.CRYSTALS.filter(function (x) { return (x.id || x.name) === q.c; })[0];
      if (cc) { cry = cc; buildCryList(); }
    }
    if (q.tab === 'molecule' || q.tab === 'crystal') {
      var tb = document.querySelector('[data-tab="' + q.tab + '"]');
      if (tb && tb.onclick) tb.onclick();
    }
    if (q.mode === 'ball' || q.mode === 'fill') {
      var mb = document.querySelector('[data-mode="' + q.mode + '"]');
      if (mb && mb.onclick) mb.onclick();
    }
    renderInfo();
    draw();
  }
  boot();
  applyLink();
})();
