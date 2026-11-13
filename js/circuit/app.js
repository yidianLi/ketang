/* ============================================================
   电路实验室 · 编辑器与渲染（SVG）
   ============================================================ */
(function () {
  'use strict';
  var CC = window.CircuitCore;
  var $ = function (id) { return document.getElementById(id); };

  var CS = 26;                 // 网格间距 px

  /* ---------- 主题跟随（结构性配色；元件本色/LED/选中红不变） ---------- */
  var PAL = { canvas: '#ffffff', grid: '#e9dfd4', wire: '#5a4a3f', badge: '#8a7263' };
  function syncCol() {
    if (!window.CanvasTheme) return;
    var p = CanvasTheme.palette();
    PAL.canvas = p.canvas; PAL.grid = p.grid; PAL.wire = p.ink2; PAL.badge = p.muted;
  }
  if (window.CanvasTheme) CanvasTheme.on(function () { syncCol(); if (state) render(); });
  syncCol();
  var COLS = 30, ROWS = 17;
  var svg = $('schem');

  var state = null;
  var tool = 'select';         // select | wire | 放置类型
  var selected = null;         // {kind:'comp'|'wire', id}
  var wireDraft = null;        // 导线草稿
  var ghost = null;
  var undoStack = [], redoStack = [];
  var solved = null;

  var TYPE_META = {
    battery:   { name: '电源',   color: '#b5453a' },
    resistor:  { name: '电阻',   color: '#4a5568' },
    bulb:      { name: '小灯泡', color: '#a8842c' },
    switch:    { name: '开关',   color: '#4a5568' },
    diode:     { name: '二极管', color: '#2f6b4f' },
    led:       { name: 'LED',    color: '#2f6b4f' },
    ammeter:   { name: '电流表', color: '#3a6ea5' },
    voltmeter: { name: '电压表', color: '#3a6ea5' }
  };
  var LED_COLOR = { red: '#e5484d', green: '#30a46c', yellow: '#f5a623', blue: '#3e7bfa' };

  /* ---------- 历史 ---------- */
  function push() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    syncButtons();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(undoStack.pop());
    selected = null; wireDraft = null;
    refresh();
    syncButtons();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    selected = null; wireDraft = null;
    refresh();
    syncButtons();
  }
  function syncButtons() {
    $('undo').disabled = !undoStack.length;
    $('redo').disabled = !redoStack.length;
  }

  /* ---------- 求解 ---------- */
  function refresh() {
    solved = CC.solve(state);
    render();
    renderProps();
    renderStatus();
  }

  function renderStatus() {
    var el = $('status');
    if (!solved.ok) { el.textContent = '⚠ ' + solved.message; el.className = 'status warn'; return; }
    var total = 0;
    state.comps.forEach(function (c) {
      if (c.type === 'battery') {
        var r = reading(c.id);
        if (r && r.i < 0) total += -r.i * r.v;   // i<0 表示放电（电流从 + 流出）
      }
    });
    el.className = 'status';
    el.textContent = '已求解 · ' + (state.comps.length) + ' 个元件 · ' +
      (total > 0 ? '总功率 ' + total.toFixed(2) + ' W' : '等待闭合回路');
  }
  function reading(id) {
    if (!solved || !solved.ok) return null;
    for (var i = 0; i < solved.readings.length; i++) if (solved.readings[i].id === id) return solved.readings[i];
    return null;
  }

  /* ---------- 绘制元件符号 ---------- */
  function symbol(c) {
    // 局部坐标：引脚 A 在 (0,0)，引脚 B 在 (52,0)
    var m = TYPE_META[c.type];
    var s = '';
    var sw = 2.2, ink = '#3b3335';
    switch (c.type) {
      case 'battery':
        s += '<line x1="20" y1="-12" x2="20" y2="12" stroke="' + ink + '" stroke-width="3"/>' +
             '<line x1="30" y1="-6" x2="30" y2="6" stroke="' + ink + '" stroke-width="3"/>' +
             '<line x1="36" y1="-12" x2="36" y2="12" stroke="' + ink + '" stroke-width="3"/>' +
             '<line x1="46" y1="-6" x2="46" y2="6" stroke="' + ink + '" stroke-width="3"/>' +
             '<text x="16" y="-16" font-size="11" fill="' + m.color + '" text-anchor="middle" font-weight="700">+</text>';
        break;
      case 'resistor':
        s += '<line x1="0" y1="0" x2="8" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="44" y1="0" x2="52" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<rect x="8" y="-9" width="36" height="18" fill="#fff" stroke="' + ink + '" stroke-width="' + sw + '"/>';
        break;
      case 'bulb':
        s += '<line x1="0" y1="0" x2="13" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="39" y1="0" x2="52" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<circle cx="26" cy="0" r="13" fill="#fff" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="17" y1="-9" x2="35" y2="9" stroke="' + ink + '" stroke-width="1.6"/>' +
             '<line x1="17" y1="9" x2="35" y2="-9" stroke="' + ink + '" stroke-width="1.6"/>';
        break;
      case 'switch':
        s += '<circle cx="8" cy="0" r="2.6" fill="' + ink + '"/><circle cx="44" cy="0" r="2.6" fill="' + ink + '"/>' +
             '<line x1="0" y1="0" x2="8" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="44" y1="0" x2="52" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="8" y1="0" x2="44" y2="' + (c.closed ? 0 : -16) + '" stroke="' + ink + '" stroke-width="' + sw + '"/>';
        break;
      case 'diode': case 'led': {
        var col = c.type === 'led' ? (LED_COLOR[c.color] || '#e5484d') : m.color;
        var dir = c.reversed ? -1 : 1;
        var cx = 26;
        var tri = dir > 0
          ? '<polygon points="' + (cx - 8) + ',-9 ' + (cx - 8) + ',9 ' + (cx + 7) + ',0" fill="' + col + '"/>'
          : '<polygon points="' + (cx + 8) + ',-9 ' + (cx + 8) + ',9 ' + (cx - 7) + ',0" fill="' + col + '"/>';
        var bar = dir > 0 ? (cx + 7) : (cx - 7);
        s += '<line x1="0" y1="0" x2="' + (cx - 8) + '" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="' + bar + '" y1="0" x2="52" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="' + bar + '" y1="-10" x2="' + bar + '" y2="10" stroke="' + ink + '" stroke-width="2.6"/>' + tri;
        if (c.type === 'led') {
          s += '<path d="M ' + (cx + 4) + ' -14 l 7 -7 m -2 0 l 2 0 l 0 2" stroke="' + col + '" fill="none" stroke-width="1.6"/>' +
               '<path d="M ' + (cx - 2) + ' -16 l 7 -7 m -2 0 l 2 0 l 0 2" stroke="' + col + '" fill="none" stroke-width="1.6"/>';
        }
        break;
      }
      case 'ammeter': case 'voltmeter': {
        var letter = c.type === 'ammeter' ? 'A' : 'V';
        s += '<line x1="0" y1="0" x2="13" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<line x1="39" y1="0" x2="52" y2="0" stroke="' + ink + '" stroke-width="' + sw + '"/>' +
             '<circle cx="26" cy="0" r="13" fill="#fff" stroke="' + m.color + '" stroke-width="2.2"/>' +
             '<text x="26" y="4.5" font-size="13" font-weight="700" fill="' + m.color + '" text-anchor="middle">' + letter + '</text>';
        break;
      }
    }
    return s;
  }

  function badgeText(c) {
    var r = reading(c.id);
    switch (c.type) {
      case 'battery': return (c.v || 9) + ' V';
      case 'resistor': return fmtR(c.r || 100);
      case 'bulb': return fmtR(c.r || 100);
      case 'switch': return c.closed ? '闭合' : '断开';
      case 'diode': return r && solved.diodeOn[c.id] ? '导通' : '截止';
      case 'led': return r && solved.diodeOn[c.id] ? '亮' : '灭';
      case 'ammeter': return r ? fmtI(Math.abs(r.i)) : '—';
      case 'voltmeter': return r ? fmtV(Math.abs(r.v)) : '—';
    }
    return '';
  }
  function fmtI(i) { return i >= 0.1 ? i.toFixed(2) + ' A' : i >= 0.001 ? (i * 1000).toFixed(1) + ' mA' : (i * 1e6).toFixed(0) + ' µA'; }
  function fmtV(v) { return Math.abs(v) >= 1 ? v.toFixed(2) + ' V' : (v * 1000).toFixed(0) + ' mV'; }
  function fmtR(r) { return r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω'; }

  /* ---------- 主渲染 ---------- */
  function render() {
    var W = COLS * CS, H = ROWS * CS;
    var s = '<rect width="' + W + '" height="' + H + '" fill="' + PAL.canvas + '"/>';

    // 网格点
    s += '<g fill="' + PAL.grid + '">';
    for (var j = 0; j <= ROWS; j++)
      for (var i = 0; i <= COLS; i++)
        s += '<circle cx="' + i * CS + '" cy="' + j * CS + '" r="1"/>';
    s += '</g>';

    // 导线
    (state.wires || []).forEach(function (w) {
      var pts = w.pts.map(function (p) { return p.x * CS + ',' + p.z * CS; }).join(' ');
      var sel = selected && selected.kind === 'wire' && selected.id === w.id;
      s += '<polyline class="wire" data-wire="' + w.id + '" points="' + pts + '" fill="none" stroke="' +
        (sel ? '#c0392b' : PAL.wire) + '" stroke-width="' + (sel ? 4 : 3) + '" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer"/>';
    });
    // 结点
    junctions().forEach(function (p) {
      s += '<circle cx="' + p.x * CS + '" cy="' + p.z * CS + '" r="3.4" fill="' + PAL.wire + '"/>';
    });

    // 元件
    state.comps.forEach(function (c) {
      var sel = selected && selected.kind === 'comp' && selected.id === c.id;
      var rot = c.rot === 90 ? 90 : 0;
      var flip = rot === 90;      // 竖直元件的标注翻到左侧
      var tx = 'translate(' + c.x * CS + ',' + c.z * CS + ')' + (rot ? ' rotate(90)' : '');
      var glow = '';
      var r = reading(c.id);
      if (c.type === 'bulb' && r && solved.ok) {
        var p = r.p;
        var op = Math.min(1, p / 0.8);
        if (op > 0.02) glow = '<circle cx="26" cy="0" r="17" fill="#ffd977" opacity="' + (op * 0.5).toFixed(2) + '"/>';
      }
      if (c.type === 'led' && solved && solved.diodeOn[c.id]) {
        glow = '<circle cx="26" cy="0" r="17" fill="' + (LED_COLOR[c.color] || '#e5484d') + '" opacity=".35"/>';
      }
      s += '<g class="comp" data-comp="' + c.id + '" transform="' + tx + '" style="cursor:pointer">';
      s += '<title>' + TYPE_META[c.type].name + (c.name ? ' · ' + c.name : '') + (
        r && solved.ok ? '\nU=' + fmtV(Math.abs(r.v)) + '  I=' + fmtI(Math.abs(r.i)) + '  P=' + r.p.toFixed(3) + ' W' : '') + '</title>';
      if (sel) s += '<rect x="-6" y="-24" width="64" height="48" rx="8" fill="rgba(192,57,43,.08)" stroke="#c0392b" stroke-dasharray="4 3"/>';
      s += glow + symbol(c);
      s += '</g>';
      // 数值标签：在屏幕坐标系里画，竖直元件文字不跟着转
      var bx = rot === 90 ? c.x * CS + 34 : (c.x + 1) * CS;
      var by = rot === 90 ? (c.z + 1) * CS + 4 : c.z * CS + 26;
      s += '<text x="' + bx + '" y="' + by + '" font-size="10.5" fill="' + PAL.badge + '" text-anchor="middle">' + badgeText(c) + '</text>';
    });

    // 导线草稿
    if (wireDraft && wireDraft.pts.length) {
      var pts = wireDraft.pts.map(function (p) { return p.x * CS + ',' + p.z * CS; });
      if (wireDraft.hover) pts.push(wireDraft.hover.x * CS + ',' + wireDraft.hover.z * CS);
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#c0392b" stroke-width="3" stroke-dasharray="6 4"/>';
      wireDraft.pts.forEach(function (p) {
        s += '<circle cx="' + p.x * CS + '" cy="' + p.z * CS + '" r="3.4" fill="#c0392b"/>';
      });
    }

    svg.innerHTML = s;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  }

  function junctions() {
    // 任一点上汇聚 ≥3 条支路（导线端点/转折、引脚、搭在其他导线上的 T 点）就画结点
    var wires = state.wires || [];
    var cands = {};
    function mark(p) { var k = p.x + ',' + p.z; cands[k] = { x: p.x, z: p.z }; }
    wires.forEach(function (w) { w.pts.forEach(mark); });
    state.comps.forEach(function (c) { CC.pinPos(c).forEach(mark); });

    var out = [];
    for (var k in cands) {
      var p = cands[k], deg = 0;
      wires.forEach(function (w) {
        for (var i = 0; i < w.pts.length; i++) {
          var a = w.pts[i];
          if (a.x === p.x && a.z === p.z) {
            deg += (i > 0 && i < w.pts.length - 1) ? 2 : 1;   // 内部转折点自带两段
            break;
          }
        }
        // 搭在别的导线线段中段（T 形）
        for (var s = 0; s < w.pts.length - 1; s++) {
          var a2 = w.pts[s], b2 = w.pts[s + 1];
          var onSeg = (a2.x === b2.x) ? (p.x === a2.x && p.z > Math.min(a2.z, b2.z) && p.z < Math.max(a2.z, b2.z))
                                      : (p.z === a2.z && p.x > Math.min(a2.x, b2.x) && p.x < Math.max(a2.x, b2.x));
          if (onSeg) { deg += 1; break; }
        }
      });
      state.comps.forEach(function (c) {
        CC.pinPos(c).forEach(function (pp) {
          if (pp.x === p.x && pp.z === p.z) deg += 1;
        });
      });
      if (deg >= 3) out.push(p);
    }
    return out;
  }

  /* ---------- 交互 ---------- */
  function svgPoint(e) {
    var rect = svg.getBoundingClientRect();
    var sx = (e.clientX - rect.left) / rect.width * COLS * CS;
    var sy = (e.clientY - rect.top) / rect.height * ROWS * CS;
    return { x: Math.round(sx / CS), z: Math.round(sy / CS), sx: sx, sy: sy };
  }

  function compAt(gp) {
    for (var i = state.comps.length - 1; i >= 0; i--) {
      var c = state.comps[i], pp = CC.pinPos(c);
      if ((gp.x === pp[0].x && gp.z === pp[0].z) || (gp.x === pp[1].x && gp.z === pp[1].z)) return c;
    }
    return null;
  }
  function compBodyAt(gp) {
    for (var i = state.comps.length - 1; i >= 0; i--) {
      var c = state.comps[i], pp = CC.pinPos(c);
      var minx = Math.min(pp[0].x, pp[1].x), maxx = Math.max(pp[0].x, pp[1].x);
      var minz = Math.min(pp[0].z, pp[1].z), maxz = Math.max(pp[0].z, pp[1].z);
      if (gp.x >= minx && gp.x <= maxx && gp.z >= minz && gp.z <= maxz) return c;
    }
    return null;
  }
  function wireAt(gp) {
    var wires = state.wires || [];
    for (var i = wires.length - 1; i >= 0; i--) {
      var pts = wires[i].pts;
      for (var k = 0; k < pts.length - 1; k++) {
        var a = pts[k], b = pts[k + 1];
        if (a.x === b.x && gp.x === a.x && gp.z >= Math.min(a.z, b.z) && gp.z <= Math.max(a.z, b.z)) return wires[i];
        if (a.z === b.z && gp.z === a.z && gp.x >= Math.min(a.x, b.x) && gp.x <= Math.max(a.x, b.x)) return wires[i];
      }
    }
    return null;
  }

  svg.addEventListener('pointermove', function (e) {
    var gp = svgPoint(e);
    if (tool === 'wire' && wireDraft) {
      var last = wireDraft.pts[wireDraft.pts.length - 1];
      wireDraft.hover = ortho(last, gp);
      render();
    } else if (tool !== 'select' && tool !== 'wire') {
      ghost = gp; render();
    } else if (drag) {
      var dx = gp.x - drag.gp.x, dz = gp.z - drag.gp.z;
      var nx = Math.max(0, Math.min(COLS - 2, drag.comp.x + dx));
      var nz = Math.max(0, Math.min(ROWS - 2, drag.comp.z + dz));
      if (nx !== drag.comp.x || nz !== drag.comp.z) {
        drag.comp.x = nx; drag.comp.z = nz; drag.gp = gp;
        refresh();
      }
    }
  });

  function ortho(from, to) {
    // L 形走线：先横后竖
    return Math.abs(to.x - from.x) >= Math.abs(to.z - from.z)
      ? { x: to.x, z: from.z }
      : { x: from.x, z: to.z };
  }

  var drag = null;
  svg.addEventListener('pointerdown', function (e) {
    var gp = svgPoint(e);
    if (tool === 'wire') {
      if (!wireDraft) wireDraft = { pts: [{ x: gp.x, z: gp.z }] };
      else {
        var last = wireDraft.pts[wireDraft.pts.length - 1];
        var nxt = ortho(last, gp);
        if (nxt.x !== last.x || nxt.z !== last.z) wireDraft.pts.push(nxt);
        if (gp.x === last.x && gp.z === last.z) commitWire();
      }
      render();
      return;
    }
    if (tool !== 'select') {   // 放置元件
      place(tool, gp);
      return;
    }
    var c = compBodyAt(gp) || compAt(gp);
    if (c) {
      if (c.type === 'switch') {
        push();
        c.closed = !c.closed;
        refresh();
        return;
      }
      selected = { kind: 'comp', id: c.id };
      drag = { comp: c, gp: gp };
      svg.setPointerCapture(e.pointerId);
      refresh();
      return;
    }
    var w = wireAt(gp);
    selected = w ? { kind: 'wire', id: w.id } : null;
    refresh();
  });

  svg.addEventListener('pointerup', function () { drag = null; });

  svg.addEventListener('dblclick', function (e) {
    if (tool === 'wire' && wireDraft) commitWire();
  });

  function commitWire() {
    if (wireDraft && wireDraft.pts.length >= 2) {
      push();
      state.wires.push({ id: 'w' + Date.now().toString(36), pts: wireDraft.pts });
    }
    wireDraft = null;
    refresh();
  }

  function place(type, gp) {
    push();
    var id = type + '-' + Date.now().toString(36);
    var c = { id: id, type: type, name: TYPE_META[type].name, x: gp.x, z: gp.z, rot: 0 };
    if (type === 'battery') { c.v = 9; c.r = 0.5; }
    if (type === 'resistor') c.r = 100;
    if (type === 'bulb') c.r = 100;
    if (type === 'switch') c.closed = true;
    if (type === 'diode') c.vf = 0.7;
    if (type === 'led') { c.vf = 2.0; c.color = 'red'; }
    state.comps.push(c);
    selected = { kind: 'comp', id: id };
    setTool('select');
    refresh();
  }

  /* ---------- 工具栏 ---------- */
  function setTool(t) {
    tool = t;
    if (t !== 'wire') wireDraft = null;
    ghost = null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
      b.classList.toggle('on', b.dataset.tool === t);
    });
    render();
  }
  document.querySelectorAll('[data-tool]').forEach(function (b) {
    b.addEventListener('click', function () { setTool(b.dataset.tool); });
  });

  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); if (e.shiftKey) redo(); else undo(); return;
    }
    if (e.key === 'Escape') { setTool('select'); return; }
    if (e.key === 'Enter' && tool === 'wire') { commitWire(); return; }
    if (e.key.toLowerCase() === 'r' && selected && selected.kind === 'comp') {
      var c = compById(selected.id);
      if (c) { push(); c.rot = c.rot === 90 ? 0 : 90; refresh(); }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault();
      push();
      if (selected.kind === 'comp') state.comps = state.comps.filter(function (x) { return x.id !== selected.id; });
      else state.wires = state.wires.filter(function (x) { return x.id !== selected.id; });
      selected = null;
      refresh();
    }
  });

  /* ---------- 属性面板 ---------- */
  function compById(id) {
    for (var i = 0; i < state.comps.length; i++) if (state.comps[i].id === id) return state.comps[i];
    return null;
  }
  function wireById(id) {
    for (var i = 0; i < (state.wires || []).length; i++) if (state.wires[i].id === id) return state.wires[i];
    return null;
  }

  function slider(label, min, max, step, val, unit, fn) {
    var d = document.createElement('div');
    d.className = 'row slider';
    d.innerHTML = '<label>' + label + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><span class="val"></span>';
    var inp = d.querySelector('input'), out = d.querySelector('.val');
    var show = function (v) { out.textContent = (step < 1 ? v.toFixed(1) : Math.round(v)) + unit; };
    show(val);
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value); show(v); fn(v, false); refresh();
    });
    inp.addEventListener('change', function () { fn(parseFloat(inp.value), true); });
    return d;
  }

  function renderProps() {
    var box = $('props');
    box.innerHTML = '';
    var c = selected && selected.kind === 'comp' ? compById(selected.id) : null;
    var w = selected && selected.kind === 'wire' ? wireById(selected.id) : null;
    var h = document.createElement('h3');
    h.textContent = '属性';
    box.appendChild(h);

    if (w) {
      var p = document.createElement('p');
      p.className = 'tip';
      var r = solved.ok ? solved.voltageOf(w.pts[0]) : 0;
      p.textContent = '导线（' + w.pts.length + ' 个转折点）· 节点电位 ' + fmtV(r);
      box.appendChild(p);
      var ops = document.createElement('div');
      ops.className = 'row ops';
      ops.innerHTML = '<button id="delW" class="danger">删除导线</button>';
      box.appendChild(ops);
      $('delW').onclick = function () { push(); state.wires = state.wires.filter(function (x) { return x.id !== w.id; }); selected = null; refresh(); };
      return;
    }
    if (!c) {
      box.innerHTML += '<p class="tip">选中元件后在这里调参。<br>开关可以直接在图上点击闭合/断开。<br>快捷键：R 旋转 · Delete 删除 · Ctrl+Z 撤销</p>';
      return;
    }
    var r = reading(c.id);
    var info = document.createElement('p');
    info.className = 'tip';
    if (r && solved.ok) info.textContent = TYPE_META[c.type].name + ' · U=' + fmtV(Math.abs(r.v)) + '，I=' + fmtI(Math.abs(r.i)) + '，P=' + r.p.toFixed(3) + ' W';
    else info.textContent = TYPE_META[c.type].name + ' · 未接入回路';
    box.appendChild(info);

    var dirty = function () { refresh(); };
    if (c.type === 'battery') {
      box.appendChild(slider('电压', 1, 24, 0.5, c.v, ' V', function (v) { c.v = v; }));
      box.appendChild(slider('内阻', 0.1, 5, 0.1, c.r, ' Ω', function (v) { c.r = v; }));
    } else if (c.type === 'resistor' || c.type === 'bulb') {
      box.appendChild(slider('阻值', 1, 1000, 1, c.r, ' Ω', function (v) { c.r = v; }));
      if (c.type === 'bulb' && r && solved.ok) {
        var pp = document.createElement('p');
        pp.className = 'tip';
        pp.textContent = '实际功率 ' + r.p.toFixed(3) + ' W（亮度按 0.8 W 满亮度折算）';
        box.appendChild(pp);
      }
    } else if (c.type === 'switch') {
      var sw = document.createElement('div');
      sw.className = 'row';
      sw.innerHTML = '<label>状态</label><select><option value="1"' + (c.closed ? ' selected' : '') + '>闭合</option><option value="0"' + (!c.closed ? ' selected' : '') + '>断开</option></select>';
      sw.querySelector('select').onchange = function (e) { push(); c.closed = e.target.value === '1'; refresh(); };
      box.appendChild(sw);
    } else if (c.type === 'diode' || c.type === 'led') {
      box.appendChild(slider('正向压降', 0.3, c.type === 'led' ? 3.4 : 1.0, 0.05, c.vf, ' V', function (v) { c.vf = v; }));
      var dv = document.createElement('div');
      dv.className = 'row';
      dv.innerHTML = '<label>方向</label><select><option value="0"' + (!c.reversed ? ' selected' : '') + '>正向（A→B 导通）</option><option value="1"' + (c.reversed ? ' selected' : '') + '>反向</option></select>';
      dv.querySelector('select').onchange = function (e) { push(); c.reversed = e.target.value === '1'; refresh(); };
      box.appendChild(dv);
      if (c.type === 'led') {
        var cl = document.createElement('div');
        cl.className = 'row';
        cl.innerHTML = '<label>颜色</label><select>' + Object.keys(LED_COLOR).map(function (k) {
          return '<option value="' + k + '"' + (c.color === k ? ' selected' : '') + '>' + ({ red: '红', green: '绿', yellow: '黄', blue: '蓝' })[k] + '</option>';
        }).join('') + '</select>';
        cl.querySelector('select').onchange = function (e) { c.color = e.target.value; refresh(); };
        box.appendChild(cl);
      }
    }
    var ops = document.createElement('div');
    ops.className = 'row ops';
    ops.innerHTML = '<button id="rotC">旋转 (R)</button><button id="dupC">复制</button><button id="delC" class="danger">删除</button>';
    box.appendChild(ops);
    $('rotC').onclick = function () { push(); c.rot = c.rot === 90 ? 0 : 90; refresh(); };
    $('dupC').onclick = function () {
      push();
      var cp = JSON.parse(JSON.stringify(c));
      cp.id = c.type + '-' + Date.now().toString(36);
      cp.x = Math.min(COLS - 3, c.x + 2); cp.z = Math.min(ROWS - 3, c.z + 2);
      state.comps.push(cp); selected = { kind: 'comp', id: cp.id };
      refresh();
    };
    $('delC').onclick = function () { push(); state.comps = state.comps.filter(function (x) { return x.id !== c.id; }); selected = null; refresh(); };
  }

  /* ---------- 预置电路 ---------- */
  var PRESETS = [
    {
      id: 'series', name: '串联电路 · 开关控灯',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 7, rot: 90, v: 9, r: 0.5 },
          { id: 'sw', type: 'switch', name: '开关', x: 6, z: 3, rot: 0, closed: true },
          { id: 'am', type: 'ammeter', name: '电流表', x: 10, z: 3, rot: 0 },
          { id: 'b1', type: 'bulb', name: '小灯泡', x: 14, z: 3, rot: 0, r: 100 }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 7 }, { x: 6, z: 7 }, { x: 6, z: 3 }] },
          { id: 'w2', pts: [{ x: 8, z: 3 }, { x: 10, z: 3 }] },
          { id: 'w3', pts: [{ x: 12, z: 3 }, { x: 14, z: 3 }] },
          { id: 'w4', pts: [{ x: 16, z: 3 }, { x: 22, z: 3 }, { x: 22, z: 12 }, { x: 2, z: 12 }, { x: 2, z: 9 }] }
        ]
      }; }
    },
    {
      id: 'divider', name: '串联分压 · 电压表',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 7, rot: 90, v: 9, r: 0.5 },
          { id: 'r1', type: 'resistor', name: 'R1', x: 5, z: 3, rot: 0, r: 100 },
          { id: 'r2', type: 'resistor', name: 'R2', x: 10, z: 3, rot: 0, r: 200 },
          { id: 'vm', type: 'voltmeter', name: '电压表', x: 10, z: 6, rot: 90 }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 7 }, { x: 2, z: 3 }, { x: 5, z: 3 }] },
          { id: 'w2', pts: [{ x: 7, z: 3 }, { x: 10, z: 3 }] },
          { id: 'w3', pts: [{ x: 12, z: 3 }, { x: 18, z: 3 }, { x: 18, z: 12 }, { x: 2, z: 12 }, { x: 2, z: 9 }] },
          { id: 'w4', pts: [{ x: 10, z: 3 }, { x: 10, z: 6 }] },
          { id: 'w5', pts: [{ x: 10, z: 8 }, { x: 10, z: 12 }] }
        ]
      }; }
    },
    {
      id: 'parallel', name: '并联电路 · 干路电流表',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 6, rot: 90, v: 9, r: 0.5 },
          { id: 'am', type: 'ammeter', name: '干路电流表', x: 6, z: 2, rot: 0 },
          { id: 'sw', type: 'switch', name: '开关', x: 6, z: 14, rot: 0, closed: true },
          { id: 'b1', type: 'bulb', name: '灯 L1', x: 12, z: 2, rot: 90, r: 100 },
          { id: 'b2', type: 'bulb', name: '灯 L2', x: 17, z: 2, rot: 90, r: 100 }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 6 }, { x: 2, z: 2 }, { x: 6, z: 2 }] },
          { id: 'w2', pts: [{ x: 8, z: 2 }, { x: 22, z: 2 }] },
          { id: 'w3', pts: [{ x: 12, z: 4 }, { x: 12, z: 14 }] },
          { id: 'w4', pts: [{ x: 2, z: 8 }, { x: 2, z: 14 }, { x: 6, z: 14 }] },
          { id: 'w5', pts: [{ x: 8, z: 14 }, { x: 22, z: 14 }] },
          { id: 'w6', pts: [{ x: 17, z: 4 }, { x: 17, z: 14 }] }
        ]
      }; }
    },
    {
      id: 'diode', name: '二极管 · 单向导通',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 7, rot: 90, v: 5, r: 0.5 },
          { id: 'sw', type: 'switch', name: '开关', x: 5, z: 3, rot: 0, closed: true },
          { id: 'd1', type: 'diode', name: '二极管', x: 9, z: 3, rot: 0, vf: 0.7 },
          { id: 'b1', type: 'bulb', name: '小灯泡', x: 13, z: 3, rot: 0, r: 100 }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 7 }, { x: 2, z: 3 }, { x: 5, z: 3 }] },
          { id: 'w2', pts: [{ x: 7, z: 3 }, { x: 9, z: 3 }] },
          { id: 'w3', pts: [{ x: 11, z: 3 }, { x: 13, z: 3 }] },
          { id: 'w4', pts: [{ x: 15, z: 3 }, { x: 20, z: 3 }, { x: 20, z: 12 }, { x: 2, z: 12 }, { x: 2, z: 9 }] }
        ]
      }; }
    },
    {
      id: 'led', name: 'LED · 限流电阻',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 7, rot: 90, v: 5, r: 0.5 },
          { id: 'r1', type: 'resistor', name: '限流电阻', x: 6, z: 3, rot: 0, r: 220 },
          { id: 'led', type: 'led', name: 'LED', x: 11, z: 3, rot: 0, vf: 2.0, color: 'red' }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 7 }, { x: 2, z: 3 }, { x: 6, z: 3 }] },
          { id: 'w2', pts: [{ x: 8, z: 3 }, { x: 11, z: 3 }] },
          { id: 'w3', pts: [{ x: 13, z: 3 }, { x: 18, z: 3 }, { x: 18, z: 12 }, { x: 2, z: 12 }, { x: 2, z: 9 }] }
        ]
      }; }
    },
    {
      id: 'mixed', name: '混联综合 · R2∥R3',
      build: function () { return {
        comps: [
          { id: 'bat', type: 'battery', name: '电池', x: 2, z: 7, rot: 90, v: 12, r: 0.5 },
          { id: 'am', type: 'ammeter', name: '电流表', x: 4, z: 3, rot: 0 },
          { id: 'r1', type: 'resistor', name: 'R1', x: 8, z: 3, rot: 0, r: 50 },
          { id: 'r2', type: 'resistor', name: 'R2', x: 14, z: 3, rot: 90, r: 100 },
          { id: 'r3', type: 'resistor', name: 'R3', x: 18, z: 3, rot: 90, r: 100 },
          { id: 'vm', type: 'voltmeter', name: '电压表', x: 26, z: 3, rot: 90 }
        ],
        wires: [
          { id: 'w1', pts: [{ x: 2, z: 7 }, { x: 2, z: 3 }, { x: 4, z: 3 }] },
          { id: 'w2', pts: [{ x: 6, z: 3 }, { x: 8, z: 3 }] },
          { id: 'w3', pts: [{ x: 10, z: 3 }, { x: 26, z: 3 }] },
          { id: 'w4', pts: [{ x: 14, z: 5 }, { x: 26, z: 5 }] },
          { id: 'w5', pts: [{ x: 20, z: 5 }, { x: 20, z: 10 }, { x: 2, z: 10 }, { x: 2, z: 9 }] }
        ]
      }; }
    }
  ];

  var presetSel = $('preset');
  PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    presetSel.appendChild(o);
  });
  presetSel.onchange = function () {
    var p = PRESETS.filter(function (x) { return x.id === presetSel.value; })[0];
    if (!p) return;
    if (window.Shell) Shell.setParams({ preset: presetSel.value });
    push();
    state = p.build();
    selected = null; wireDraft = null;
    refresh();
  };

  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('export').onclick = function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'circuit.json';
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
        if (!obj.comps) throw new Error('缺少 comps 字段');
        push();
        state = obj; state.wires = state.wires || [];
        selected = null;
        refresh();
      } catch (err) { alert('导入失败：' + err.message); }
    };
    fr.readAsText(f);
  };
  $('clear').onclick = function () {
    push();
    state = { comps: [], wires: [] };
    selected = null;
    refresh();
  };

  /* ---------- 启动 ---------- */
  var q = new URLSearchParams(location.search);
  var pid = q.get('preset') || 'series';
  presetSel.value = pid;
  if (presetSel.value !== pid) presetSel.value = 'series';
  state = (PRESETS.filter(function (x) { return x.id === presetSel.value; })[0] || PRESETS[0]).build();
  setTool('select');
  refresh();
  syncButtons();
})();
