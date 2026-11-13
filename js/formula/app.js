/* ============================================================
   公式实验室 · 页面逻辑
   左侧：分类 + 公式列表；右侧：TeX 公式 + 滑条 + 读数 + 示意图
   ============================================================ */
(function () {
  'use strict';
  var T = window.MiniTeX, FC = window.FormulaCore;
  var $ = function (id) { return document.getElementById(id); };

  var cv, ctx, catEl, listEl, formulaBox, varsBox, readsBox, noteEl, hintEl;
  var cat = FC.CATS[0];
  var item = null;
  var vals = {};

  var COL = { ink: '#3b3335', muted: '#9a8f93', accent: '#b5453a', blue: '#3a6ea5', paper: '#ffffff', line: '#f1e7e6' };

  function fitCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function buildCats() {
    catEl.innerHTML = '';
    FC.CATS.forEach(function (cname) {
      var b = document.createElement('button');
      b.className = 'catbtn' + (cname === cat ? ' on' : '');
      b.textContent = cname;
      b.onclick = function () {
        cat = cname;
        buildCats(); buildList();
        select(FC.DB.filter(function (x) { return x.cat === cat; })[0]);
      };
      catEl.appendChild(b);
    });
  }

  function buildList() {
    listEl.innerHTML = '';
    FC.DB.filter(function (x) { return x.cat === cat; }).forEach(function (d) {
      var li = document.createElement('li');
      li.className = 'comp' + (d === item ? ' on' : '');
      li.innerHTML = '<span class="nm">' + d.name + '</span>';
      li.onclick = function () { select(d); };
      listEl.appendChild(li);
    });
  }

  function select(d) {
    if (!d) return;
    if (window.Shell) Shell.setParams({ f: d.id });
    item = d;
    vals = {};
    d.vars.forEach(function (v) { vals[v.k] = v.def; });
    buildList();
    renderFormula();
    renderVars();
    renderReads();
    noteEl.textContent = d.note;
    draw();
  }

  function renderFormula() {
    formulaBox.innerHTML = '';
    // 用 canvas 排版公式
    var c2 = document.createElement('canvas');
    c2.style.width = '100%';
    c2.style.height = '86px';
    c2.className = 'tex-canvas';
    formulaBox.appendChild(c2);
    var dpr = window.devicePixelRatio || 1;
    c2.width = c2.clientWidth * dpr;
    c2.height = 86 * dpr;
    var cx = c2.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = COL.paper;
    cx.fillRect(0, 0, c2.clientWidth, 86);
    cx.strokeStyle = COL.line;
    cx.strokeRect(0.5, 0.5, c2.clientWidth - 1, 85);
    T.draw(cx, item.tex, c2.clientWidth / 2, 52, item.tex.length > 46 ? 17 : 21, COL.ink);
  }

  function renderVars() {
    varsBox.innerHTML = '';
    item.vars.forEach(function (v) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<label>' + v.label + '</label>' +
        '<input type="range" min="' + v.min + '" max="' + v.max + '" step="' + v.step + '" value="' + vals[v.k] + '">' +
        '<span class="val">' + vals[v.k] + (v.unit || '') + '</span>';
      var inp = row.querySelector('input'), out = row.querySelector('.val');
      inp.addEventListener('input', function () {
        var x = parseFloat(inp.value);
        vals[v.k] = x;
        out.textContent = (v.step < 1 ? x.toFixed(String(v.step).split('.')[1].length) : x) + (v.unit || '');
        renderReads();
        draw();
      });
      varsBox.appendChild(row);
    });
  }

  function renderReads() {
    var R = item.calc(vals);
    readsBox.innerHTML = '';
    item.reads.forEach(function (r, i) {
      var d = document.createElement('div');
      d.className = 'read';
      d.innerHTML = '<span>' + r.label + '</span><b>' + FC.fmt(R[i]) + '<small>' + (r.unit || '') + '</small></b>';
      readsBox.appendChild(d);
    });
  }

  function draw() {
    if (!fitCanvas()) return;
    var w = cv.clientWidth, h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COL.paper;
    ctx.fillRect(0, 0, w, h);

    // 逻辑坐标：中心原点，x -160..160，y -100..100
    var S = Math.min(w / 340, h / 220);
    ctx.save();
    ctx.translate(w / 2, h / 2 - 8);
    ctx.scale(S, S);
    try { item.draw(ctx, vals, item.calc(vals)); }
    catch (err) {
      ctx.restore();
      hintEl.textContent = '绘制错误：' + err.message;
      return;
    }
    ctx.restore();
    if (hintEl) hintEl.textContent = '示意图按逻辑坐标缩放，不代表真实尺寸';
  }

  window.addEventListener('resize', function () {
    if (item) { renderFormula(); draw(); }
  });

  /* ---------- 主题跟随（结构性配色，曲线/示意语义色不变） ---------- */
  function syncCol() {
    if (!window.CanvasTheme) return;
    var p = CanvasTheme.palette();
    COL.ink = p.ink; COL.muted = p.muted; COL.paper = p.canvas; COL.line = p.line;
  }
  if (window.CanvasTheme) CanvasTheme.on(function () {
    syncCol();
    if (item) { renderFormula(); draw(); }
  });
  syncCol();

  function boot() {
    cv = $('stage');
    ctx = cv.getContext('2d');
    catEl = $('cats');
    listEl = $('fList');
    formulaBox = $('formulaBox');
    varsBox = $('varsBox');
    readsBox = $('readsBox');
    noteEl = $('note');
    hintEl = $('hint');
    buildCats();
    var q = window.Shell ? Shell.params() : {};
    var it = q.f ? FC.DB.filter(function (x) { return x.id === q.f; })[0] : null;
    if (it) { cat = it.cat; buildCats(); select(it); }
    else select(FC.DB.filter(function (x) { return x.cat === cat; })[0]);
  }
  boot();
})();
