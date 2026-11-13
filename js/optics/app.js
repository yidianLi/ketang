/* ============================================================
 * 简普 · 光学实验室  (app.js)
 * 依赖：js/optics/core.js 暴露的 window.Optics
 * 渲染与交互；剥离全部 CDN，使用 css/app.css 陶土色风格
 * ============================================================ */
(function () {
  'use strict';

  var O = window.Optics;
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');

  var state = {
    f: 10.0, u: 30.0,
    pxPerCm: 15,
    candleH: 92,
    show: { focus: true, virtual: true, arrows: true },
    isDragging: false,
    scanning: false,
    scanId: null,
    recCount: 0
  };

  function $(id) { return document.getElementById(id); }

  /* ---------- 主题跟随：结构性配色缓存 ---------- */
  var PAL = { line2: '#d8cec4', grid: '#f1e7e6', label: '#b3a094', panel: '#fbf6ef', accent: '#e8879b', muted: '#9a8f93' };
  function syncCol() {
    if (!window.CanvasTheme) return;
    var p = CanvasTheme.palette();
    PAL.line2 = p.line2; PAL.grid = p.grid; PAL.label = p.label;
    PAL.panel = p.panel; PAL.accent = p.accent; PAL.muted = p.muted;
  }
  if (window.CanvasTheme) CanvasTheme.on(function () { syncCol(); });
  syncCol();

  /* ---------- 初始化 ---------- */
  function init() {
    window.addEventListener('resize', resize);
    resize();
    var q = window.Shell ? Shell.params() : {};
    if (q.f) { var f0 = parseFloat(q.f); if (!isNaN(f0)) state.f = clamp(f0, 5, 15); }
    if (q.u) { var u0 = parseFloat(q.u); if (!isNaN(u0)) state.u = clamp(u0, 2, 60); }
    bindInputs();
    bindButtons();
    bindDrag();
    updateAllUI();
    requestAnimationFrame(renderLoop);
  }

  function renderLoop() {
    draw();
    requestAnimationFrame(renderLoop);
  }

  function bindInputs() {
    var fR = $('fRange'), fN = $('fNum'), uR = $('uRange'), uN = $('uNum');
    fR.addEventListener('input', function () { setF(parseFloat(fR.value)); });
    fN.addEventListener('input', function () { setF(parseFloat(fN.value)); });
    uR.addEventListener('input', function () { stopScan(); setU(parseFloat(uR.value)); });
    uN.addEventListener('input', function () { stopScan(); setU(parseFloat(uN.value)); });

    $('showFocus').addEventListener('change', function (e) { state.show.focus = e.target.checked; });
    $('showVirtual').addEventListener('change', function (e) { state.show.virtual = e.target.checked; });
    $('showArrows').addEventListener('change', function (e) { state.show.arrows = e.target.checked; });
  }

  function bindButtons() {
    $('recBtn').addEventListener('click', record);
    $('clearBtn').addEventListener('click', clearData);
    $('scanBtn').addEventListener('click', toggleScan);
  }

  function bindDrag() {
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }

  /* ---------- 状态更新 ---------- */
  function setF(v) {
    if (isNaN(v)) return;
    state.f = clamp(v, 5, 15);
    updateAllUI();
    linkState();
  }
  function setU(v) {
    if (isNaN(v)) return;
    state.u = clamp(v, 2, 60);
    updateAllUI();
    linkState();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var linkT = null;
  function linkState() {
    if (!window.Shell) return;
    if (linkT) clearTimeout(linkT);
    linkT = setTimeout(function () {
      Shell.setParams({ f: state.f.toFixed(1), u: state.u.toFixed(1) });
    }, 250);
  }

  function updateAllUI() {
    var r = O.calc(state.f, state.u);

    // 滑块/数字双向同步（不覆盖正在编辑的控件）
    var fR = $('fRange'), fN = $('fNum'), uR = $('uRange'), uN = $('uNum');
    var active = document.activeElement;
    if (active !== fR && active !== fN) { fR.value = state.f; fN.value = state.f.toFixed(1); }
    if (active !== uR && active !== uN) { uR.value = state.u; uN.value = state.u.toFixed(1); }

    // 像距（只读显示）
    var vDisp = (r.v === Infinity || r.v < 0) ? Math.abs(r.v) : r.v;
    $('vNum').value = (r.v === Infinity) ? '∞' : (isFinite(vDisp) ? vDisp.toFixed(1) : '∞');

    // 成像结果读数
    $('rV').textContent = (r.v === Infinity) ? '∞' : r.v.toFixed(1) + ' cm';
    $('rM').textContent = (r.m === Infinity) ? '∞' : Math.abs(r.m).toFixed(2) + '×';
    $('rNature').textContent = O.nature(r);
    $('rApp').textContent = r.app;

    // 顶栏状态
    var live = $('live');
    live.innerHTML = 'u=<b>' + state.u.toFixed(1) + '</b>cm &nbsp; f=<b>' + state.f.toFixed(1) +
      '</b>cm &nbsp; v=<b>' + ((r.v === Infinity) ? '∞' : r.v.toFixed(1)) + '</b>cm &nbsp; ' +
      '<span class="lv">' + O.nature(r) + '</span>';
  }

  /* ---------- 实验记录 ---------- */
  function record() {
    state.recCount++;
    var r = O.calc(state.f, state.u);
    var vTxt = (r.v === Infinity) ? '∞' : Math.abs(r.v).toFixed(1);
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="p2 c">' + state.recCount + '</td>' +
      '<td class="p2">' + state.u.toFixed(1) + '</td>' +
      '<td class="p2">' + vTxt + '</td>' +
      '<td class="p2">' + O.nature(r) + '</td>' +
      '<td class="p2">' + r.app + '</td>';
    $('recBody').appendChild(tr);
  }
  function clearData() {
    $('recBody').innerHTML = '';
    state.recCount = 0;
  }

  /* ---------- 物距扫描动画 ---------- */
  function toggleScan() { state.scanning ? stopScan() : startScan(); }
  function startScan() {
    if (state.scanning) return;
    state.scanning = true;
    $('scanBtn').textContent = '⏸ 暂停扫描';
    if (state.u < 3) state.u = 60;
    var last = performance.now();
    function loop(t) {
      if (!state.scanning) return;
      var dt = t - last; last = t;
      state.u -= 0.018 * dt;
      if (state.u < 2.5) state.u = 60.0;
      updateAllUI();
      state.scanId = requestAnimationFrame(loop);
    }
    state.scanId = requestAnimationFrame(loop);
  }
  function stopScan() {
    if (!state.scanning) return;
    state.scanning = false;
    cancelAnimationFrame(state.scanId);
    $('scanBtn').textContent = '▶ 物距扫描';
  }

  /* ---------- 拖动改物距 ---------- */
  function startDrag(e) {
    stopScan();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
    var cx = cssW() / 2;
    var ox = O.objX(cx, state.u, state.pxPerCm);
    if (Math.abs(x - ox) < 70) state.isDragging = true;
  }
  function onDrag(e) {
    if (!state.isDragging) return;
    e.preventDefault();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
    var cx = cssW() / 2;
    state.u = clamp((cx - x) / state.pxPerCm, 2, 60);
    updateAllUI();
  }
  function endDrag() { state.isDragging = false; }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.parentElement.clientWidth - 20;
    var h = canvas.parentElement.clientHeight - 20;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.pxPerCm = w / 85;
  }
  function cssW() { return canvas.width / (window.devicePixelRatio || 1); }
  function cssH() { return canvas.height / (window.devicePixelRatio || 1); }

  /* ============================================================
   *  绘制
   * ============================================================ */
  function draw() {
    var W = cssW(), H = cssH();
    var cx = W / 2, cy = H / 2;
    var fPx = state.f * state.pxPerCm;
    var candleH = state.candleH;
    var ox = O.objX(cx, state.u, state.pxPerCm);
    var oy = cy - candleH;

    ctx.clearRect(0, 0, W, H);

    // 主光轴
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.strokeStyle = PAL.line2; ctx.lineWidth = 2; ctx.stroke();

    // 透镜
    drawLens(cx, cy, Math.min(H * 0.78, 240), 250 / state.f);

    // 焦点 / 二倍焦点
    if (state.show.focus) {
      drawPoint(cx - fPx, cy, 'F'); drawPoint(cx + fPx, cy, 'F');
      drawPoint(cx - 2 * fPx, cy, '2F'); drawPoint(cx + 2 * fPx, cy, '2F');
    }

    // 物体（蜡烛）
    drawCandle(ox, cy, candleH, 1, false, false);
    ctx.fillStyle = PAL.accent; ctx.font = '12px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('u=' + state.u.toFixed(1), ox, cy + 20);

    var r = O.calc(state.f, state.u);

    if (r.type === 'parallel') {
      drawParallel(cx, cy, ox, oy, fPx);
    } else {
      var it = O.intersect(fPx, cx, cy, ox, oy);
      var isReal = it.isReal;

      // 光线 1：入射水平段（物体顶端 -> 透镜处同高）
      ctx.strokeStyle = RAY1; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(cx, oy); ctx.stroke();
      if (state.show.arrows) drawArrow((ox + cx) / 2, oy, 0, RAY1);

      // 光线 1 折射段：从 (cx, oy) 斜率 (cy-oy)/fPx
      var kR = (cy - oy) / fPx;
      var r1 = isReal
        ? [{ minX: cx, maxX: 1e5, dashed: false }]
        : (state.show.virtual
            ? [{ minX: -1e5, maxX: cx, dashed: true }, { minX: cx, maxX: 1e5, dashed: false }]
            : [{ minX: cx, maxX: 1e5, dashed: false }]);
      drawClippedLine(cx, oy, kR, r1, RAY1, cx + 60, W, H);

      // 光线 2：过光心直线（物体顶端 -> 光心 -> 延长）
      var kG = (cy - oy) / (cx - ox);
      var r2 = isReal
        ? [{ minX: ox, maxX: 1e5, dashed: false }]
        : (state.show.virtual
            ? [{ minX: -1e5, maxX: ox, dashed: true }, { minX: ox, maxX: 1e5, dashed: false }]
            : [{ minX: ox, maxX: 1e5, dashed: false }]);
      drawClippedLine(cx, cy, kG, r2, RAY2, cx + 60, W, H);
      if (state.show.arrows) drawArrow((ox + cx) / 2, (oy + cy) / 2, Math.atan(kG), RAY2);

      // 像
      if (Math.abs(it.ix) < 1e4 && Math.abs(it.iy - cy) < H * 6) {
        if (it.ix > -W * 2 && it.ix < W * 2) {
          var imgH = Math.min(Math.abs(it.iy - cy), H * 0.82);
          drawCandle(it.ix, cy, imgH, isReal ? 0.95 : 0.5, true, isReal);
          ctx.fillStyle = isReal ? '#b5453a' : '#b08a3c';
          ctx.font = '12px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('v=' + Math.abs(O.vFromX(it.ix, cx, state.pxPerCm)).toFixed(1),
            it.ix, cy + (isReal ? -12 : 20));
        }
      }
    }

    // 底部光学导轨刻度
    drawRail(cx, cy, W, H, fPx);
  }

  var RAY1 = '#d9695c';   // 平行主轴光线（红）
  var RAY2 = '#4f9d6b';   // 过光心光线（绿）

  function drawLens(cx, cy, h, curve) {
    ctx.save();
    ctx.fillStyle = 'rgba(111,154,141,0.14)';
    ctx.strokeStyle = '#6f9a8d'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.quadraticCurveTo(cx + curve, cy, cx, cy + h / 2);
    ctx.quadraticCurveTo(cx - curve, cy, cx, cy - h / 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a8478'; ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('O', cx - 4, cy + h / 2 + 18);
    ctx.restore();
  }

  function drawPoint(x, y, label) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = PAL.accent; ctx.fill();
    ctx.fillStyle = PAL.muted; ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(label, x, y + 16);
  }

  function drawArrow(x, y, angle, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 4); ctx.lineTo(-10, -4);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  // 按 dashRanges 把直线裁剪到屏幕范围绘制（支持虚线延长段）
  function drawClippedLine(x1, y1, slope, dashRanges, color, arrowAt, W, H) {
    var pts = [];
    var yAt0 = y1 + slope * (0 - x1); if (yAt0 >= 0 && yAt0 <= H) pts.push({ x: 0, y: yAt0 });
    var yAtW = y1 + slope * (W - x1); if (yAtW >= 0 && yAtW <= H) pts.push({ x: W, y: yAtW });
    if (slope !== 0) {
      var xAt0 = x1 + (0 - y1) / slope; if (xAt0 > 0 && xAt0 < W) pts.push({ x: xAt0, y: 0 });
      var xAtH = x1 + (H - y1) / slope; if (xAtH > 0 && xAtH < W) pts.push({ x: xAtH, y: H });
    }
    pts.sort(function (a, b) { return a.x - b.x; });
    if (pts.length < 2) return;
    var start = pts[0], end = pts[pts.length - 1];
    dashRanges.forEach(function (range) {
      var ds = Math.max(start.x, range.minX);
      var de = Math.min(end.x, range.maxX);
      if (de > ds) {
        var yS = y1 + slope * (ds - x1);
        var yE = y1 + slope * (de - x1);
        ctx.beginPath();
        if (range.dashed) { ctx.setLineDash([8, 8]); ctx.lineWidth = 2.2; ctx.strokeStyle = color; ctx.globalAlpha = 0.6; }
        else { ctx.setLineDash([]); ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.globalAlpha = 1; }
        ctx.moveTo(ds, yS); ctx.lineTo(de, yE); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (arrowAt >= ds && arrowAt <= de && !range.dashed && state.show.arrows) {
          var yA = y1 + slope * (arrowAt - x1);
          drawArrow(arrowAt, yA, Math.atan(slope), color);
        }
      }
    });
  }

  function drawParallel(cx, cy, ox, oy, fPx) {
    ctx.strokeStyle = RAY1; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(cx, oy); ctx.stroke();
    if (state.show.arrows) drawArrow((ox + cx) / 2, oy, 0, RAY1);
    var kR = (cy - oy) / fPx;
    drawClippedLine(cx, oy, kR, [{ minX: cx, maxX: 1e5, dashed: false }], RAY1, cx + 60, cssW(), cssH());
    var kG = (cy - oy) / (cx - ox);
    drawClippedLine(cx, cy, kG, [{ minX: ox, maxX: 1e5, dashed: false }], RAY2, cx + 60, cssW(), cssH());
    if (state.show.arrows) drawArrow((ox + cx) / 2, (oy + cy) / 2, Math.atan(kG), RAY2);
  }

  // 蜡烛（物体/像）。inverted=true 时倒立（像）。isReal 控制描边风格
  function drawCandle(x, baseY, h, alpha, inverted, isReal) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, baseY);
    if (inverted) ctx.scale(1, -1);
    var w = h * 0.5, waxH = h * 0.72, flameH = h * 0.28, radius = w * 0.32;
    var topY = -waxH, leftX = -w / 2;

    function bodyPath() {
      ctx.beginPath();
      ctx.moveTo(leftX, topY + radius);
      ctx.quadraticCurveTo(leftX, topY, leftX + radius, topY);
      ctx.lineTo(w / 2 - radius, topY);
      ctx.quadraticCurveTo(w / 2, topY, w / 2, topY + radius);
      ctx.lineTo(w / 2, -radius);
      ctx.quadraticCurveTo(w / 2, 0, w / 2 - radius, 0);
      ctx.lineTo(leftX + radius, 0);
      ctx.quadraticCurveTo(leftX, 0, leftX, -radius);
      ctx.closePath();
    }
    bodyPath();
    ctx.save(); ctx.clip();
    ctx.fillStyle = PAL.panel; ctx.fill();
    ctx.lineWidth = w * 0.32; ctx.strokeStyle = PAL.line2; ctx.lineCap = 'round';
    for (var i = -2; i < 8; i++) {
      var sy = topY + i * ((waxH + w) / 4);
      ctx.beginPath(); ctx.moveTo(leftX - w, sy);
      ctx.quadraticCurveTo(leftX + w / 1.5, sy + w * 1.5, leftX + w * 2.5, sy + w * 2.5); ctx.stroke();
    }
    ctx.restore();
    bodyPath();
    ctx.strokeStyle = isReal ? '#e8879b' : '#b08a3c';
    ctx.lineWidth = inverted ? 1.6 : 2;
    if (!isReal) ctx.setLineDash([5, 4]);
    ctx.stroke(); ctx.setLineDash([]);

    // 灯芯
    ctx.beginPath(); ctx.moveTo(0, topY);
    ctx.quadraticCurveTo(0, topY - flameH * 0.2, w * 0.05, topY - flameH * 0.2);
    ctx.strokeStyle = '#8a8175'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

    // 火焰
    var fbY = topY - flameH * 0.15, t = Date.now();
    var sway = inverted ? 0 : (Math.sin(t / 220) * w * 0.08 + Math.sin(t / 55) * w * 0.04);
    var grad = ctx.createRadialGradient(0, fbY - flameH * 0.5, 0, 0, fbY - flameH * 0.5, flameH);
    grad.addColorStop(0, '#fde68a'); grad.addColorStop(0.45, '#f59e0b'); grad.addColorStop(1, '#ea580c');
    ctx.beginPath();
    ctx.moveTo(0, fbY);
    ctx.bezierCurveTo(-w * 0.5 + sway, fbY - flameH * 0.4, -w * 0.1 + sway * 1.5, fbY - flameH * 1.1, sway * 2, fbY - flameH * 1.1);
    ctx.bezierCurveTo(w * 0.1 + sway * 1.5, fbY - flameH * 1.1, w * 0.5 + sway, fbY - flameH * 0.4, 0, fbY);
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
  }

  function drawRail(cx, cy, W, H, fPx) {
    var y = H - 16;
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = PAL.label; ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    // 以透镜为 0 点，向左为负、向右为正，每 10cm 一格
    var per = state.pxPerCm;
    for (var cm = -Math.floor(cx / per); cm * per + cx < W; cm++) {
      var x = cx + cm * per;
      if (x < 0 || x > W) continue;
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
      if (cm % 10 === 0) ctx.fillText(cm + 'cm', x, y + 14);
    }
  }

  /* ---------- 错误捕获 ---------- */
  try {
    if (!window.Optics) throw new Error('Optics 内核未加载');
    init();
  } catch (e) {
    var h = document.getElementById('hint');
    if (h) { h.textContent = '脚本错误：' + e.message; h.className = 'hint bad'; }
  }
})();
