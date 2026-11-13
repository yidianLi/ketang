/* ============================================================
   地形实验室 · 交互与界面
   ============================================================ */
(function () {
  'use strict';
  var C = window.TerrainCore, R = window.TerrainRaster, D2 = window.TerrainRender2D;
  var PRESETS = window.TerrainPresets;

  var $ = function (id) { return document.getElementById(id); };

  var state = PRESETS[0].build();
  var selectedId = null;
  var view = new D2.View();
  var grid = null, imageCache = null;
  var cCache = R.contourCache();
  var sectionData = null;
  var undoStack = [], redoStack = [];
  var mode = '2d', style = 'color';
  var showLabels = true, showSection = true, showMarkers = true;
  var drag = null;

  var mapCv = $('map'), mapCtx = mapCv.getContext('2d');
  var secCv = $('section'), secCtx = secCv.getContext('2d');
  var glCv = $('gl');
  var renderer = null;

  var TYPE_LIST = ['mountain', 'plateau', 'basin', 'ridge', 'valley', 'slope', 'fan', 'cliff', 'river', 'lake'];
  var TYPE_NAME = D2.typeName;

  /* ---------- 历史 ---------- */
  function snapshot() { return JSON.stringify(state); }
  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    syncButtons();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    state = JSON.parse(undoStack.pop());
    afterStateChange(true);
    syncButtons();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    state = JSON.parse(redoStack.pop());
    afterStateChange(true);
    syncButtons();
  }
  function syncButtons() {
    $('undo').disabled = !undoStack.length;
    $('redo').disabled = !redoStack.length;
  }

  /* ---------- 计算 ---------- */
  var FULL_RES = 193, DRAG_RES = 97;
  var settleTimer = null;
  /* 低精度先出图，停手 220ms 后自动补一版高精度 */
  function rebuild(res) {
    var target = res || DRAG_RES;
    grid = R.buildGrid(state, target);
    imageCache = D2.buildImage(grid, state);
    if (state.section) {
      sectionData = R.sectionProfile(grid, state.section[0], state.section[1], 241);
    } else {
      sectionData = null;
    }
    if (target !== FULL_RES) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        if (!drag) { rebuild(FULL_RES); drawAll(); }
      }, 220);
    }
  }

  function afterStateChange(full) {
    if (full !== false) { clearTimeout(settleTimer); rebuild(FULL_RES); }
    drawAll();
    renderList();
    renderProps();
    $('compCount').textContent = state.peaks.length + ' 个';
  }

  function drawAll() {
    if (mode === '2d') draw2d(); else draw3d();
    drawSection();
  }

  /* ---------- 画布尺寸 ---------- */
  function fitCanvas(cv, ctx) {
    var dpr = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return { w: 0, h: 0 };
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  /* ---------- 2D ---------- */
  function draw2d() {
    try {
      var s = fitCanvas(mapCv, mapCtx);
      if (!s.w) return;
      if (!view.k || view.w !== s.w || view.h !== s.h) {
        view.fit(state.size, s.w, s.h, 0.08);
      }
      D2.draw(mapCtx, s.w, s.h, state, grid, view, {
        style: style, labels: showLabels, showSection: showSection,
        showMarkers: showMarkers, selectedId: selectedId,
        contourCache: cCache, imageCache: imageCache
      });
    } catch (err) {
      $('hint').textContent = '绘制错误：' + err.message;
    }
  }

  function refitView() {
    var s = { w: mapCv.clientWidth, h: mapCv.clientHeight };
    view.fit(state.size, s.w, s.h, 0.08);
  }

  /* ---------- 剖面 ---------- */
  function drawSection() {
    var s = fitCanvas(secCv, secCtx);
    if (!s.w || !s.h) return;
    var ctx = secCtx;
    ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s.w, s.h);

    if (!sectionData || !showSection) {
      ctx.fillStyle = '#a08a7a';
      ctx.font = '13px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('未设置剖面线 A—B', s.w / 2, s.h / 2);
      return;
    }

    var padL = 52, padR = 18, padT = 22, padB = 26;
    var W = s.w - padL - padR, H = s.h - padT - padB;
    var pts = sectionData.points;
    var minH = Infinity, maxH = -Infinity;
    pts.forEach(function (p) { if (p.h < minH) minH = p.h; if (p.h > maxH) maxH = p.h; });
    minH = Math.floor((minH - 20) / 50) * 50;
    maxH = Math.ceil((maxH + 20) / 50) * 50;
    if (maxH - minH < 100) maxH = minH + 100;

    var X = function (d) { return padL + (d / sectionData.length) * W; };
    var Y = function (h) { return padT + H - ((h - minH) / (maxH - minH)) * H; };

    // 网格
    ctx.strokeStyle = '#eee3d8'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var h = minH; h <= maxH; h += 100) {
      ctx.moveTo(padL, Y(h)); ctx.lineTo(padL + W, Y(h));
    }
    ctx.stroke();

    // 水面
    if (state.water) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#5b93ad';
      ctx.beginPath(); ctx.moveTo(padL, Y(state.water)); ctx.lineTo(padL + W, Y(state.water)); ctx.stroke();
      ctx.restore();
    }

    // 地形剖面
    ctx.beginPath();
    ctx.moveTo(X(pts[0].d), Y(pts[0].h));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i].d), Y(pts[i].h));
    ctx.lineTo(X(pts[pts.length - 1].d), padT + H);
    ctx.lineTo(X(pts[0].d), padT + H);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, padT, 0, padT + H);
    g.addColorStop(0, 'rgba(168,150,120,.55)');
    g.addColorStop(1, 'rgba(168,150,120,.12)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a5c44'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(pts[0].d), Y(pts[0].h));
    for (var k = 1; k < pts.length; k++) ctx.lineTo(X(pts[k].d), Y(pts[k].h));
    ctx.stroke();

    // 坐标轴
    ctx.strokeStyle = '#b9a696'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + H); ctx.lineTo(padL + W, padT + H);
    ctx.stroke();

    ctx.fillStyle = '#8a7263';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var hh = minH; hh <= maxH; hh += 100) {
      ctx.fillText(hh + '', padL - 6, Y(hh));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('A', padL, padT + H + 6);
    ctx.fillText('B', padL + W, padT + H + 6);
    ctx.fillStyle = '#a08a7a';
    ctx.fillText((sectionData.length / 1000).toFixed(2) + ' km', padL + W / 2, padT + H + 6);

    ctx.save();
    ctx.translate(14, padT + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a7263';
    ctx.fillText('海拔 (m)', 0, 0);
    ctx.restore();
  }

  /* ---------- 3D ---------- */
  function ensureRenderer() {
    if (renderer) return renderer;
    try {
      renderer = new window.TerrainRender3D.Renderer(glCv);
      renderer.setData(grid, state);
    } catch (e) {
      renderer = { ok: false, err: e.message };
      $('hint').textContent = '3D 初始化失败：' + e.message;
    }
    return renderer;
  }

  var glDirty = false;
  function draw3d() {
    var r = ensureRenderer();
    if (!r || !r.ok) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = glCv.getBoundingClientRect();
    glCv.width = Math.round(rect.width * dpr);
    glCv.height = Math.round(rect.height * dpr);
    r.setData(grid, state);
    r.render(state);
  }

  /* ---------- 元件列表 ---------- */
  function renderList() {
    var box = $('compList');
    box.innerHTML = '';
    if (!state.peaks.length) {
      box.innerHTML = '<li class="empty">还没有地形元件</li>';
      return;
    }
    state.peaks.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'comp' + (c.id === selectedId ? ' on' : '');
      li.innerHTML = '<span class="ico t-' + c.type + '"></span><span class="nm">' + (c.name || TYPE_NAME(c.type)) + '</span>' +
        '<span class="vh">' + Math.round(c.height) + 'm</span>';
      li.onclick = function () {
        selectedId = c.id;
        renderList(); renderProps(); drawAll();
      };
      box.appendChild(li);
    });
  }

  /* ---------- 属性 ---------- */
  function row(label, min, max, step, val, unit, onInput) {
    var wrap = document.createElement('div');
    wrap.className = 'row slider';
    wrap.innerHTML = '<label>' + label + '</label>' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
      '<span class="val">' + val + (unit || '') + '</span>';
    var input = wrap.querySelector('input');
    var out = wrap.querySelector('.val');
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      out.textContent = v + (unit || '');
      onInput(v, false);
    });
    input.addEventListener('change', function () {
      onInput(parseFloat(input.value), true);
    });
    return wrap;
  }

  function renderProps() {
    var box = $('props');
    box.innerHTML = '';
    var c = state.peaks.filter(function (x) { return x.id === selectedId; })[0];
    if (!c) {
      box.innerHTML = '<h3>元件属性</h3><p class="tip">在图上点一个元件，或从左侧列表选择。</p>';
      return;
    }
    var h = document.createElement('h3');
    h.innerHTML = '元件属性 · ' + TYPE_NAME(c.type);
    box.appendChild(h);

    var D = C.defaults()[c.type];
    box.appendChild(row(D.label || '高程', 20, 1400, 10, Math.round(c.height), ' m', function (v, done) {
      if (done) pushHistory();
      c.height = v; rebuild(); drawAll();
    }));
    box.appendChild(row('东西宽度', 200, 4000, 50, Math.round(c.width), ' m', function (v, done) {
      if (done) pushHistory();
      c.width = v; rebuild(); drawAll();
    }));
    box.appendChild(row('南北长度', 200, 4000, 50, Math.round(c.length), ' m', function (v, done) {
      if (done) pushHistory();
      c.length = v; rebuild(); drawAll();
    }));
    if (c.type !== 'slope' && c.type !== 'fan' && c.type !== 'mountain') {
      box.appendChild(row('形态参数', 0, 1, 0.01, c.shape, '', function (v, done) {
        if (done) pushHistory();
        c.shape = v; rebuild(); drawAll();
      }));
    }
    if (['mountain', 'plateau', 'basin', 'ridge', 'valley', 'lake', 'river'].indexOf(c.type) >= 0) {
      box.appendChild(row('细节起伏', 0, 1, 0.01, c.detail, '', function (v, done) {
        if (done) pushHistory();
        c.detail = v; rebuild(); drawAll();
      }));
    }
    box.appendChild(row('旋转角度', 0, 359, 1, c.rotation || 0, '°', function (v, done) {
      if (done) pushHistory();
      c.rotation = v; rebuild(); drawAll();
    }));

    if (c.type === 'slope' || c.type === 'fan') {
      var p = document.createElement('div');
      p.className = 'row';
      p.innerHTML = '<label>' + (c.type === 'slope' ? '坡脚海拔' : '扇缘海拔') + '</label>' +
        '<input type="number" step="10" value="' + (c.type === 'slope' ? c.slopeBottomLevel : c.fanToeLevel) + '">';
      p.querySelector('input').addEventListener('change', function (e) {
        pushHistory();
        if (c.type === 'slope') c.slopeBottomLevel = parseFloat(e.target.value);
        else c.fanToeLevel = parseFloat(e.target.value);
        rebuild(); drawAll();
      });
      box.appendChild(p);

      var sel = document.createElement('div');
      sel.className = 'row';
      var cur = c.type === 'slope' ? c.slopeProfile : c.fanProfile;
      sel.innerHTML = '<label>坡形</label><select>' +
        ['uniform', 'concave', 'convex'].map(function (v) {
          return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' +
            ({ uniform: '均匀坡', concave: '凹坡', convex: '凸坡' })[v] + '</option>';
        }).join('') + '</select>';
      sel.querySelector('select').addEventListener('change', function (e) {
        pushHistory();
        if (c.type === 'slope') c.slopeProfile = e.target.value;
        else c.fanProfile = e.target.value;
        rebuild(); drawAll();
      });
      box.appendChild(sel);
    }

    if (c.type === 'cliff') {
      var cb = document.createElement('div');
      cb.className = 'row';
      cb.innerHTML = '<label>崖底海拔</label><input type="number" step="10" value="' + (c.cliffBottomLevel || 185) + '">';
      cb.querySelector('input').addEventListener('change', function (e) {
        pushHistory();
        c.cliffBottomLevel = parseFloat(e.target.value);
        rebuild(); drawAll();
      });
      box.appendChild(cb);
    }

    if (c.type === 'river' || c.type === 'lake') {
      var wl = document.createElement('div');
      wl.className = 'row';
      wl.innerHTML = '<label>水面高程</label><input type="number" step="5" min="70" max="300" value="' + (c.waterLevel || 145) + '">';
      wl.querySelector('input').addEventListener('change', function (e) {
        pushHistory();
        c.waterLevel = parseFloat(e.target.value);
        c.bedReferenceLevel = c.waterLevel;
        state.water = c.waterLevel;
        $('water').value = state.water; $('waterV').textContent = state.water + ' m';
        rebuild(); drawAll();
      });
      box.appendChild(wl);
    }

    var ops = document.createElement('div');
    ops.className = 'row ops';
    ops.innerHTML = '<button id="dupComp">复制</button><button id="delComp" class="danger">删除</button>';
    box.appendChild(ops);
    $('dupComp').onclick = function () {
      pushHistory();
      var copy = JSON.parse(JSON.stringify(c));
      copy.id = c.type + '-' + Date.now();
      copy.x += 220; copy.z += 180;
      copy.name = (c.name || TYPE_NAME(c.type)) + ' 副本';
      state.peaks.push(copy);
      selectedId = copy.id;
      afterStateChange();
    };
    $('delComp').onclick = function () {
      pushHistory();
      state.peaks = state.peaks.filter(function (x) { return x.id !== c.id; });
      selectedId = null;
      afterStateChange();
    };

    var pos = document.createElement('p');
    pos.className = 'tip';
    pos.textContent = '坐标：x ' + Math.round(c.x) + ' m，z ' + Math.round(c.z) + ' m（可直接在图上拖动）';
    box.appendChild(pos);
  }

  /* ---------- 交互 ---------- */
  var HIT = 15;
  function pick(e) {
    var rect = mapCv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    // 剖面线端点
    if (state.section && showSection) {
      for (var i = 0; i < 2; i++) {
        var p = view.w2s(state.section[i].x, state.section[i].z);
        if (Math.hypot(p.x - sx, p.y - sy) < 11) return { kind: 'section', index: i };
      }
    }
    var best = null, bestD = HIT;
    state.peaks.forEach(function (c) {
      var p = view.w2s(c.x, c.z);
      var d = Math.hypot(p.x - sx, p.y - sy);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best ? { kind: 'comp', comp: best } : null;
  }

  mapCv.addEventListener('pointerdown', function (e) {
    if (mode !== '2d') return;
    var hit = pick(e);
    var rect = mapCv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (hit && hit.kind === 'section') {
      pushHistory();
      drag = { type: 'section', index: hit.index };
    } else if (hit && hit.kind === 'comp') {
      selectedId = hit.comp.id;
      pushHistory();
      var w = view.s2w(sx, sy);
      drag = { type: 'comp', comp: hit.comp, dx: hit.comp.x - w.x, dz: hit.comp.z - w.z };
      renderList(); renderProps();
      drawAll();
    } else {
      drag = { type: 'pan', sx: sx, sy: sy, px: view.px, py: view.py };
    }
    mapCv.setPointerCapture(e.pointerId);
  });

  mapCv.addEventListener('pointermove', function (e) {
    if (!drag || mode !== '2d') return;
    var rect = mapCv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (drag.type === 'pan') {
      view.px = drag.px + (sx - drag.sx);
      view.py = drag.py + (sy - drag.sy);
      draw2d();
      return;
    }
    var w = view.s2w(sx, sy);
    if (drag.type === 'section') {
      state.section[drag.index] = { x: Math.round(w.x), z: Math.round(w.z) };
      sectionData = R.sectionProfile(grid, state.section[0], state.section[1], 241);
    } else if (drag.type === 'comp') {
      drag.comp.x = Math.round(w.x + drag.dx);
      drag.comp.z = Math.round(w.z + drag.dz);
      rebuild(DRAG_RES);
    }
    drawAll();
  });

  mapCv.addEventListener('pointerup', function () {
    if (drag && (drag.type === 'comp' || drag.type === 'section') && grid && grid.resolution < FULL_RES) {
      rebuild(FULL_RES);
      drawAll();
    }
    drag = null;
  });
  mapCv.addEventListener('pointercancel', function () { drag = null; });

  mapCv.addEventListener('wheel', function (e) {
    if (mode !== '2d') return;
    e.preventDefault();
    var rect = mapCv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    var before = view.s2w(sx, sy);
    var f = Math.pow(1.0016, -e.deltaY);
    view.k = C.clamp(view.k * f, 0.02, 2.5);
    var after = view.s2w(sx, sy);
    view.cx += before.x - after.x;
    view.cz += before.z - after.z;
    draw2d();
  }, { passive: false });

  /* 3D 轨道控制 */
  glCv.addEventListener('pointerdown', function (e) {
    glCv.setPointerCapture(e.pointerId);
    drag = { type: 'orbit', sx: e.clientX, sy: e.clientY, yaw: renderer.yaw, pitch: renderer.pitch };
  });
  glCv.addEventListener('pointermove', function (e) {
    if (!drag || drag.type !== 'orbit' || !renderer || !renderer.ok) return;
    renderer.yaw = drag.yaw - (e.clientX - drag.sx) * 0.008;
    renderer.pitch = C.clamp(drag.pitch + (e.clientY - drag.sy) * 0.006, 0.12, 1.45);
    renderer.render(state);
  });
  glCv.addEventListener('pointerup', function () { drag = null; });
  glCv.addEventListener('wheel', function (e) {
    if (!renderer || !renderer.ok) return;
    e.preventDefault();
    renderer.dist = C.clamp(renderer.dist * Math.pow(1.0015, e.deltaY), 0.5, 4);
    renderer.render(state);
  }, { passive: false });

  /* ---------- 顶栏 ---------- */
  var presetSel = $('preset');
  PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    presetSel.appendChild(o);
  });
  presetSel.onchange = function () {
    var p = PRESETS.filter(function (x) { return x.id === presetSel.value; })[0];
    if (!p) return;
    pushHistory();
    state = p.build();
    selectedId = null;
    cCache = R.contourCache();
    clearTimeout(settleTimer); rebuild(FULL_RES); refitView(); afterStateChange(false);
  };

  $('undo').onclick = undo;
  $('redo').onclick = redo;

  $('export').onclick = function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.title || 'terrain') + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };
  $('import').onchange = function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var obj = JSON.parse(fr.result);
        if (!obj.peaks) throw new Error('缺少 peaks 字段');
        pushHistory();
        state = obj;
        selectedId = null;
        cCache = R.contourCache();
        clearTimeout(settleTimer); rebuild(FULL_RES); refitView(); afterStateChange(false);
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    };
    fr.readAsText(f);
  };

  /* ---------- 添加元件 ---------- */
  function addComponent(type) {
    pushHistory();
    var d = C.defaults()[type];
    var c = {
      id: type + '-' + Date.now().toString(36),
      type: type, name: d.name,
      x: Math.round((Math.random() - 0.5) * state.size * 0.3),
      z: Math.round((Math.random() - 0.5) * state.size * 0.3),
      height: d.height, width: d.width, length: d.length,
      shape: d.shape === undefined ? 0.3 : d.shape,
      detail: d.detail === undefined ? 0.3 : d.detail,
      seed: Math.round(Math.random() * 60) / 10 + 1,
      rotation: d.rotation || 0
    };
    ['slopeBottomLevel', 'slopeProfile', 'fanToeLevel', 'fanProfile', 'cliffBottomLevel', 'waterLevel', 'bedReferenceLevel']
      .forEach(function (k) { if (d[k] !== undefined) c[k] = d[k]; });
    if (type === 'cliff') c.cliffBottomLevel = 185;
    state.peaks.push(c);
    selectedId = c.id;
    afterStateChange();
  }

  (function initAddGrid() {
    var box = $('addGrid');
    TYPE_LIST.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'add';
      b.innerHTML = '<span class="ico t-' + t + '"></span>' + TYPE_NAME(t);
      b.onclick = function () { addComponent(t); };
      box.appendChild(b);
    });
  })();

  /* ---------- 图幅设置 ---------- */
  $('interval').onchange = function (e) {
    pushHistory();
    state.interval = parseInt(e.target.value, 10);
    cCache = R.contourCache();
    rebuild(); drawAll();
  };
  $('water').oninput = function (e) {
    state.water = parseInt(e.target.value, 10);
    $('waterV').textContent = state.water + ' m';
    rebuild(); drawAll();
  };
  $('water').onchange = function () { pushHistory(); };
  $('snow').oninput = function (e) {
    state.snow = parseInt(e.target.value, 10);
    $('snowV').textContent = state.snow + ' m';
    rebuild(); drawAll();
  };
  $('snow').onchange = function () { pushHistory(); };
  $('size').onchange = function (e) {
    pushHistory();
    state.size = parseInt(e.target.value, 10);
    cCache = R.contourCache();
    rebuild(); refitView(); drawAll();
  };
  $('env').onchange = function (e) {
    pushHistory();
    state.environment = e.target.value;
    rebuild(); drawAll();
  };

  /* ---------- 视图切换 ---------- */
  $('viewSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    mode = b.dataset.view;
    Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
    mapCv.hidden = mode !== '2d';
    glCv.hidden = mode !== '3d';
    $('sliceRow').hidden = mode !== '3d';
    drawAll();
  });
  $('styleSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    style = b.dataset.style;
    Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
    drawAll();
  });
  $('showLabels').onchange = function (e) { showLabels = e.target.checked; draw2d(); };
  $('showSection').onchange = function (e) { showSection = e.target.checked; drawAll(); };
  $('showMarkers').onchange = function (e) { showMarkers = e.target.checked; draw2d(); };

  $('slice').oninput = function (e) {
    if (!renderer || !renderer.ok) return;
    renderer.slice = parseInt(e.target.value, 10);
    $('sliceV').textContent = renderer.slice + ' m';
    renderer.render(state);
  };
  $('vex').oninput = function (e) {
    if (!renderer || !renderer.ok) return;
    renderer.vEx = parseFloat(e.target.value);
    $('vexV').textContent = renderer.vEx.toFixed(1) + '×';
    renderer.render(state);
  };
  $('showContour3d').onchange = function (e) {
    if (!renderer || !renderer.ok) return;
    renderer.showContour = e.target.checked ? 1 : 0;
    renderer.render(state);
  };

  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      e.preventDefault();
      pushHistory();
      state.peaks = state.peaks.filter(function (x) { return x.id !== selectedId; });
      selectedId = null;
      afterStateChange();
    }
  });

  window.addEventListener('resize', function () {
    drawAll();
  });

  /* ---------- 启动 ---------- */
  function boot() {
    $('size').value = state.size;
    $('interval').value = String(state.interval);
    $('water').value = state.water;
    $('waterV').textContent = state.water + ' m';
    $('snow').value = state.snow;
    $('snowV').textContent = state.snow + ' m';
    $('env').value = state.environment;
    rebuild(FULL_RES);
    requestAnimationFrame(function () {
      refitView();
      afterStateChange(false);
      syncButtons();

      // URL 参数：?preset=xx&view=3d&style=exam，方便直接打开某个状态
      try {
        var q = new URLSearchParams(location.search);
        if (q.get('preset')) {
          presetSel.value = q.get('preset');
          if (presetSel.value === q.get('preset')) presetSel.onchange();
        }
        if (q.get('style') === 'exam') {
          style = 'exam';
          Array.prototype.forEach.call($('styleSeg').children, function (x) {
            x.classList.toggle('on', x.dataset.style === 'exam');
          });
        }
        if (q.get('view') === '3d') {
          mode = '3d';
          mapCv.hidden = true; glCv.hidden = false;
          $('sliceRow').hidden = false;
          Array.prototype.forEach.call($('viewSeg').children, function (x) {
            x.classList.toggle('on', x.dataset.view === '3d');
          });
        }
        drawAll();
      } catch (e) { /* 忽略参数错误 */ }
    });
  }
  boot();
})();
