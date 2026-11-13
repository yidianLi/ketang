/* ============================================================
   力学实验室 · 画布绘制与交互
   ------------------------------------------------------------
   坐标系：世界坐标 y 轴向上，画布坐标 y 轴向下，View 里做翻转。
   受力箭头统一按“1 N = k 像素”，k 取所有力里的最大值自适应，
   保证小力可见、大力不爆框（原站 forceScale 的同一思路）。
   ============================================================ */
(function () {
  'use strict';
  var M = window.MechCore;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 视图 ---------- */
  function View() {
    this.k = 60;        // 像素/米
    this.cx = 0;        // 世界坐标中心 x
    this.cy = 0;
  }
  View.prototype.w2s = function (x, y) {
    return { x: this.w / 2 + (x - this.cx) * this.k, y: this.h / 2 - (y - this.cy) * this.k };
  };
  View.prototype.s2w = function (sx, sy) {
    return { x: (sx - this.w / 2) / this.k + this.cx, y: (this.h / 2 - sy) / this.k + this.cy };
  };
  View.prototype.fit = function (cv, w, h) {
    this.w = w; this.h = h;
    this.k = Math.min(w / 13, h / 8.2);
    this.cx = 0; this.cy = 0;
  };

  var state = null;
  var run = null;
  var view = new View();
  var playing = false, speed = 1, acc = 0, lastT = 0;
  var selectedId = null;
  var drag = null;
  var show = { forces: true, split: true, trail: true, labels: true, velocity: true };
  var presetSel, noteEl, hintEl, liveEl;

  var cv, ctx;
  var COL = {
    ink: '#3b3335', sub: '#6c6165', muted: '#9a8f93', line: '#f1e7e6',
    ground: '#8a7259', block: '#c9a17a', blockEdge: '#8a6a4a',
    gravity: '#7a5c44', normal: '#5d7b60', friction: '#ba8048',
    force: '#b5453a', vel: '#3a6ea5', grid: '#f5eaec'
  };

  /* ---------- 画布自适应 ---------- */
  function fitCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /* ---------- 箭头 ---------- */
  function arrow(c, x1, y1, x2, y2, color, w, label) {
    var dx = x2 - x1, dy = y2 - y1;
    var L = Math.hypot(dx, dy);
    if (L < 3) return;
    var ux = dx / L, uy = dy / L;
    var head = Math.min(9, L * 0.42);
    c.save();
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w || 2; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2 - ux * head * 0.9, y2 - uy * head * 0.9);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - ux * head - uy * head * 0.42, y2 - uy * head + ux * head * 0.42);
    c.lineTo(x2 - ux * head + uy * head * 0.42, y2 - uy * head - ux * head * 0.42);
    c.closePath();
    c.fill();
    if (label) {
      c.font = '600 11px "Microsoft YaHei",sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var lx = x2 + ux * 13, ly = y2 + uy * 13;
      var tw = c.measureText(label).width;
      c.fillStyle = 'rgba(255,253,250,.86)';
      c.fillRect(lx - tw / 2 - 3, ly - 7.5, tw + 6, 15);
      c.fillStyle = color;
      c.fillText(label, lx, ly);
    }
    c.restore();
  }

  /* ---------- 场景元素 ---------- */
  function drawGround(c, e) {
    var a = view.w2s(e.x - e.length / 2, e.y);
    var b = view.w2s(e.x + e.length / 2, e.y);
    c.save();
    c.strokeStyle = COL.ground; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    // 斜线阴影
    c.lineWidth = 1; c.strokeStyle = 'rgba(138,114,89,.45)';
    c.beginPath();
    for (var x = a.x; x < b.x; x += 9) {
      c.moveTo(x, a.y); c.lineTo(x - 6, a.y + 8);
    }
    c.stroke();
    // μ 标注
    c.fillStyle = COL.muted; c.font = '10.5px "Microsoft YaHei",sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('μs=' + (e.muStatic || 0).toFixed(2) + '  μk=' + (e.muKinetic || 0).toFixed(2), a.x + 4, a.y + 10);
    c.restore();
  }

  function drawIncline(c, e) {
    var th = M.rad(e.angle || 0), L = e.length;
    var ox = e.x - L * Math.cos(th), oy = e.y - L * Math.sin(th);
    var a = view.w2s(ox, oy), b = view.w2s(e.x, e.y);
    var c1 = view.w2s(ox, e.y);
    c.save();
    // 三角面
    c.beginPath();
    c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(c1.x, c1.y); c.closePath();
    var g = c.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(196,168,132,.30)');
    g.addColorStop(1, 'rgba(196,168,132,.14)');
    c.fillStyle = g; c.fill();
    c.strokeStyle = COL.ground; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
    // 底边阴影
    c.strokeStyle = 'rgba(138,114,89,.40)'; c.lineWidth = 1;
    c.beginPath();
    for (var x = c1.x; x < b.x; x += 9) { c.moveTo(x, c1.y); c.lineTo(x + 6, c1.y + 8); }
    c.stroke();
    // 角度弧
    var r = 34;
    c.beginPath();
    c.arc(c1.x, c1.y, r, -th, 0);
    c.strokeStyle = '#ef9a8e'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#8a6a52'; c.font = '11px "Microsoft YaHei",sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText((e.angle || 0).toFixed(0) + '°', c1.x + r + 5, c1.y - 8);
    // μ 标注
    c.fillStyle = COL.muted; c.font = '10.5px "Microsoft YaHei",sans-serif';
    c.textAlign = 'right'; c.textBaseline = 'bottom';
    c.fillText('μs=' + (e.muStatic || 0).toFixed(2) + '  μk=' + (e.muKinetic || 0).toFixed(2), c1.x - 2, c1.y - 4);
    c.restore();
  }

  function drawBlock(c, e, b) {
    var p = view.w2s(b.x, b.y);
    var w = (e.width || 0.6) * view.k, h = (e.height || 0.4) * view.k;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(-(b.angle || 0));
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    var g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#d8b593'); g.addColorStop(1, COL.block);
    c.fillStyle = g; c.fill();
    c.strokeStyle = COL.blockEdge; c.lineWidth = 1.6; c.stroke();
    // 质心点
    c.fillStyle = 'rgba(63,48,41,.55)';
    c.beginPath(); c.arc(0, 0, 2.2, 0, Math.PI * 2); c.fill();
    c.restore();
    if (selectedId === b.id) ring(c, p, Math.max(w, h) / 2 + 7);
  }

  function drawBall(c, e, b) {
    var p = view.w2s(b.x, b.y);
    var r = (e.radius || 0.2) * view.k;
    c.save();
    var g = c.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.15, p.x, p.y, r);
    g.addColorStop(0, '#9fb8c8'); g.addColorStop(1, '#5f86a0');
    c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.strokeStyle = '#46637a'; c.lineWidth = 1.4; c.stroke();
    c.restore();
    if (selectedId === b.id) ring(c, p, r + 6);
  }

  function ring(c, p, r) {
    c.save();
    c.strokeStyle = '#ef9a8e'; c.lineWidth = 1.4; c.setLineDash([4, 3]);
    c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* ---------- 主绘制 ---------- */
  function draw() {
    if (!fitCanvas()) return;
    var w = view.w, h = view.h;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COL.paper || '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.save();
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    var step = 1;   // 1 m
    while (step * view.k < 26) step *= 2;
    ctx.beginPath();
    var x0 = Math.floor(view.s2w(0, 0).x / step) * step;
    for (var x = x0; x < view.s2w(w, 0).x; x += step) {
      var sx = view.w2s(x, 0).x;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
    }
    var y0 = Math.floor(view.s2w(0, h).y / step) * step;
    for (var y = y0; y < view.s2w(0, 0).y; y += step) {
      var sy = view.w2s(0, y).y;
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
    }
    ctx.stroke();
    ctx.restore();

    // 元素
    state.entities.forEach(function (e) {
      if (e.type === 'ground') drawGround(ctx, e);
      else if (e.type === 'incline') drawIncline(ctx, e);
    });

    if (!run) return;

    // 轨迹
    if (show.trail) {
      run.bodies.forEach(function (b) {
        if (b.trail.length < 2) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(58,110,165,.38)';
        ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
        ctx.beginPath();
        b.trail.forEach(function (p, i) {
          var s = view.w2s(p.x, p.y);
          if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    // 刚体
    run.bodies.forEach(function (b) {
      var e = state.entities.filter(function (x) { return x.id === b.id; })[0];
      if (!e) return;
      if (b.type === 'ball') drawBall(ctx, e, b); else drawBlock(ctx, e, b);
    });

    // 受力箭头
    if (show.forces) {
      // 统一比例：让最大的力占 2.2 m 长度
      var maxF = 1;
      run.bodies.forEach(function (b) {
        b.forces.forEach(function (f) { maxF = Math.max(maxF, Math.hypot(f.x, f.y)); });
      });
      var scale = 2.2 * view.k / maxF;
      $('scaleV').textContent = '1 N = ' + (scale / view.k).toFixed(2) + ' m';

      run.bodies.forEach(function (b) {
        var p = view.w2s(b.x, b.y);
        b.forces.forEach(function (f) {
          var L = Math.hypot(f.x, f.y);
          if (L < 1e-6) return;
          var ex = p.x + f.x * scale, ey = p.y - f.y * scale;
          arrow(ctx, p.x, p.y, ex, ey, f.color, 2.1,
            show.labels ? (f.symbol + '=' + fmt(L) + 'N') : null);
        });
        // 速度箭头
        if (show.velocity) {
          var v = Math.hypot(b.vx, b.vy);
          if (v > 0.01) {
            var vs = 2.0 * view.k / Math.max(5, v) * Math.min(v, 5);
            arrow(ctx, p.x, p.y, p.x + b.vx / v * vs, p.y - b.vy / v * vs, COL.vel, 2,
              show.labels ? ('v=' + fmt(v) + 'm/s') : null);
          }
        }
      });
    }

    // 实时读数
    var s = run.summary();
    liveEl.innerHTML = s.map(function (x) {
      return '<span class="lv"><b>' + x.label + '</b> v ' + fmt(x.v) + ' m/s · a ' + fmt(x.a) +
        ' m/s² · E ' + fmt(x.e) + ' J</span>';
    }).join('');
  }

  function fmt(v) {
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toFixed(3);
  }

  /* ---------- 播放 ---------- */
  function loop(t) {
    if (!playing) return;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    acc += dt * speed;
    var steps = 0;
    while (acc >= M.DT && steps < 2400) { run.step(1); acc -= M.DT; steps++; }
    draw();
    if (run.finished) {
      playing = false;
      syncPlay();
      hintEl.textContent = run.message || '本次演示结束';
      return;
    }
    requestAnimationFrame(loop);
  }

  function play() {
    if (!run) return;
    if (run.finished) resetRun();
    playing = true; lastT = performance.now(); acc = 0;
    syncPlay();
    hintEl.textContent = '演示中…';
    requestAnimationFrame(loop);
  }
  function pause() { playing = false; syncPlay(); }
  function resetRun() {
    playing = false;
    run = M.createRun(state);
    acc = 0;
    draw();
    syncPlay();
    hintEl.textContent = '已回到初始位置';
    fillLive();
  }
  function syncPlay() {
    $('play').textContent = playing ? '⏸ 暂停' : '▶ 演示';
    $('tLabel').textContent = run ? run.time.toFixed(2) + ' s' : '0.00 s';
  }
  function fillLive() {
    var s = run.summary();
    liveEl.innerHTML = s.map(function (x) {
      return '<span class="lv"><b>' + x.label + '</b> v ' + fmt(x.v) + ' m/s · a ' + fmt(x.a) +
        ' m/s² · E ' + fmt(x.e) + ' J</span>';
    }).join('');
    syncPlay();
  }

  /* ---------- 拖动刚体 ---------- */
  function hitBody(sx, sy) {
    var w = view.s2w(sx, sy);
    for (var i = 0; i < run.bodies.length; i++) {
      var b = run.bodies[i];
      if (Math.hypot(w.x - b.x, w.y - b.y) < Math.max(b.r, 0.35)) return b;
    }
    return null;
  }

  function bindCanvasEvents() {
  cv.addEventListener('pointerdown', function (e) {
    var rect = cv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    var b = hitBody(sx, sy);
    if (b) {
      selectedId = b.id;
      var ent = state.entities.filter(function (x) { return x.id === b.id; })[0];
      drag = { id: b.id, dx: b.x - view.s2w(sx, sy).x, dy: b.y - view.s2w(sx, sy).y };
      renderProps();
      cv.setPointerCapture(e.pointerId);
    } else {
      drag = { pan: true, sx: sx, sy: sy, cx: view.cx, cy: view.cy };
    }
    draw();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var rect = cv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (drag.pan) {
      view.cx = drag.cx - (sx - drag.sx) / view.k;
      view.cy = drag.cy + (sy - drag.sy) / view.k;
      draw();
      return;
    }
    var w = view.s2w(sx, sy);
    var ent = state.entities.filter(function (x) { return x.id === drag.id; })[0];
    if (!ent) return;
    ent.x = +(w.x + drag.dx).toFixed(3);
    ent.y = +(w.y + drag.dy).toFixed(3);
    // 拖动时重建静态状态（不跑仿真），避免看起来“掉下去”
    run = M.createRun(state);
    playing = false;
    draw();
    renderProps();
  });
  cv.addEventListener('pointerup', function () { drag = null; syncPlay(); });
  cv.addEventListener('pointercancel', function () { drag = null; });

  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = cv.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    var before = view.s2w(sx, sy);
    view.k = M.clamp(view.k * Math.pow(1.0016, -e.deltaY), 12, 320);
    var after = view.s2w(sx, sy);
    view.cx += before.x - after.x;
    view.cy += before.y - after.y;
    draw();
  }, { passive: false });
  }

  /* ---------- 属性面板 ---------- */
  function slider(label, val, min, max, step, unit, onInput) {
    var d = document.createElement('div');
    d.className = 'row';
    d.innerHTML = '<label>' + label + '</label><input type="range" min="' + min + '" max="' + max +
      '" step="' + step + '" value="' + val + '"><span class="val">' + val + (unit || '') + '</span>';
    var inp = d.querySelector('input'), out = d.querySelector('.val');
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      out.textContent = v + (unit || '');
      onInput(v);
    });
    return d;
  }
  function number(label, val, step, unit, onChange) {
    var d = document.createElement('div');
    d.className = 'row';
    d.innerHTML = '<label>' + label + '</label><input type="number" step="' + step + '" value="' + val + '">' +
      (unit ? '<span class="unit">' + unit + '</span>' : '');
    d.querySelector('input').addEventListener('change', function (e) {
      onChange(parseFloat(e.target.value));
    });
    return d;
  }

  function renderProps() {
    var box = $('props');
    box.innerHTML = '';
    var ent = state.entities.filter(function (x) { return x.id === selectedId; })[0];
    var h = document.createElement('h3');

    if (!ent) {
      h.textContent = '物体属性';
      box.appendChild(h);
      var p = document.createElement('p');
      p.className = 'tip';
      p.textContent = '点画布上的物体或斜面来调参数。拖动可改位置，滚轮缩放。';
      box.appendChild(p);
      return;
    }

    var NAMES = { block: '木块', ball: '小球', incline: '斜面', ground: '水平面', wall: '竖直墙' };
    h.textContent = '属性 · ' + (NAMES[ent.type] || ent.type);
    box.appendChild(h);

    var touch = function () {
      run = M.createRun(state);
      playing = false;
      draw(); fillLive(); noteEl.textContent = '';
      autoNote();
    };

    if (ent.type === 'block' || ent.type === 'ball') {
      box.appendChild(slider('质量', ent.mass, 0.1, 20, 0.1, ' kg', function (v) { ent.mass = v; touch(); }));
      if (ent.type === 'block') {
        box.appendChild(slider('宽度', ent.width || 0.8, 0.2, 2, 0.05, ' m', function (v) { ent.width = v; touch(); }));
        box.appendChild(slider('高度', ent.height || 0.6, 0.2, 2, 0.05, ' m', function (v) { ent.height = v; touch(); }));
      } else {
        box.appendChild(slider('半径', ent.radius || 0.2, 0.08, 0.8, 0.01, ' m', function (v) { ent.radius = v; touch(); }));
      }
      box.appendChild(slider('水平外力', ent.forceX || 0, -60, 60, 0.5, ' N', function (v) { ent.forceX = v; touch(); }));
      box.appendChild(slider('竖直外力', ent.forceY || 0, -60, 60, 0.5, ' N', function (v) { ent.forceY = v; touch(); }));
      box.appendChild(slider('初速度', ent.vx || 0, -12, 12, 0.1, ' m/s', function (v) { ent.vx = v; touch(); }));
    }

    if (ent.type === 'incline' || ent.type === 'ground') {
      box.appendChild(slider('倾角', ent.angle || 0, 0, 60, 1, '°', function (v) {
        // 改角度时保持坡底不动
        var L = ent.length || 7;
        var oldTh = M.rad(ent.angle || 0), newTh = M.rad(v);
        ent.x = +(ent.x - L * Math.cos(oldTh) + L * Math.cos(newTh)).toFixed(3);
        ent.y = +(ent.y - L * Math.sin(oldTh) + L * Math.sin(newTh)).toFixed(3);
        ent.angle = v;
        touch();
      }));
      box.appendChild(slider('长度', ent.length || 7, 2, 14, 0.5, ' m', function (v) { ent.length = v; touch(); }));
      box.appendChild(slider('静摩擦系数 μs', ent.muStatic == null ? 0.4 : ent.muStatic, 0, 1.2, 0.01, '', function (v) { ent.muStatic = v; touch(); }));
      box.appendChild(slider('动摩擦系数 μk', ent.muKinetic == null ? 0.25 : ent.muKinetic, 0, 1.2, 0.01, '', function (v) {
        ent.muKinetic = Math.min(v, ent.muStatic); touch();
      }));
    }

    box.appendChild(number('重力加速度 g', state.g, 0.01, 'm/s²', function (v) {
      if (v > 0 && v < 40) { state.g = v; touch(); }
    }));

    var tip = document.createElement('p');
    tip.className = 'tip';
    tip.textContent = '坐标 x=' + ent.x.toFixed(2) + ' m，y=' + ent.y.toFixed(2) + ' m';
    box.appendChild(tip);
  }

  /* 根据当前受力给出教学提示 */
  function autoNote() {
    var rows = M.analyze(state);
    if (!rows.length) { noteEl.textContent = ''; return; }
    var r = rows[0];
    var txt = '';
    if (r.contact) {
      txt += '支持力 N = mg·cosθ = ' + r.N.toFixed(2) + ' N；';
      txt += '沿面重力分量 = ' + Math.abs(r.Fpar).toFixed(2) + ' N；';
      txt += '最大静摩擦 μsN = ' + r.limit.toFixed(2) + ' N。';
      txt += ' ' + r.note + '。';
    } else {
      txt = r.note + '。';
    }
    noteEl.textContent = txt;
  }

  /* ---------- 顶栏与开关 ---------- */
  function buildPresetSelect() {
    presetSel = $('preset');
    presetSel.innerHTML = '';
    M.PRESETS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      presetSel.appendChild(o);
    });
    presetSel.onchange = function () {
      var p = M.PRESETS.filter(function (x) { return x.id === presetSel.value; })[0];
      if (!p) return;
      load(p.build());
      noteEl.textContent = p.note || '';
      if (window.Shell) Shell.setParams({ preset: presetSel.value });
    };
  }

  function load(doc) {
    state = JSON.parse(JSON.stringify(doc));
    selectedId = (state.entities.filter(function (e) { return e.type === 'block' || e.type === 'ball'; })[0] || {}).id || null;
    run = M.createRun(state);
    playing = false;
    acc = 0;
    draw();
    renderProps();
    fillLive();
  }

  function bindToggles() {
    ['forces', 'split', 'trail', 'labels', 'velocity'].forEach(function (k) {
      var el = $('show_' + k);
      if (!el) return;
      el.checked = show[k];
      el.onchange = function () { show[k] = el.checked; draw(); };
    });
    $('play').onclick = function () { playing ? pause() : play(); };
    $('reset').onclick = resetRun;
    $('step').onclick = function () {
      playing = false;
      run.step(24);           // 0.1 s
      draw(); fillLive();
    };
    $('speed').oninput = function (e) {
      speed = parseFloat(e.target.value);
      $('speedV').textContent = speed.toFixed(1) + '×';
    };
  }

  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'r' || e.key === 'R') resetRun();
  });

  window.addEventListener('resize', function () { if (state) draw(); });

  /* ---------- 主题跟随（结构性配色，力矢量/地面等语义色不变） ---------- */
  function syncCol() {
    if (!window.CanvasTheme) return;
    var p = CanvasTheme.palette();
    COL.ink = p.ink; COL.sub = p.ink2; COL.muted = p.muted; COL.line = p.line;
    COL.grid = p.grid; COL.paper = p.canvas;
  }
  if (window.CanvasTheme) CanvasTheme.on(function () { syncCol(); if (state) draw(); });
  syncCol();


  /* ---------- 启动 ---------- */
  function boot() {
    cv = $('scene');
    ctx = cv.getContext('2d');
    noteEl = $('note');
    hintEl = $('hint');
    liveEl = $('live');
    buildPresetSelect();
    bindToggles();
    bindCanvasEvents();
    var s = fitCanvas();
    view.fit(cv, cv.clientWidth, cv.clientHeight);
    var q = window.Shell ? Shell.params() : {};
    var first = M.PRESETS.filter(function (x) { return x.id === q.preset; })[0] || M.PRESETS[0];
    presetSel.value = first.id;
    load(first.build());
    noteEl.textContent = first.note;
    syncPlay();
    if (window.Shell) Shell.setParams({ preset: first.id });
  }

  // 暴露给调试
  window.__mech = { get run() { return run; }, get state() { return state; }, draw: draw };
  boot();
})();
