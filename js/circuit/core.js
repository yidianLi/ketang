/* ============================================================
   电路实验室 · 求解内核
   ------------------------------------------------------------
   · 改进节点法（MNA）装配电导矩阵，高斯列主元消元
   · 电源用诺顿等效（电导 + 电流源），避免引入额外未知量
   · 二极管 / LED 用分段线性 + 状态迭代（有效集思想）：
       导通态 = 电阻 Rs 串 Vf 的诺顿等效；截止态 = 微电导
   · 每个元件外部电流 I = (vA − vB)·g − J（A→B 为正）
   ============================================================ */
(function (root) {
  'use strict';

  var EPS_G = 1e-12;        // 防奇异的最小接地电导
  var G_SHORT = 1e4;        // 开关闭合 / 电流表
  var G_OPEN = 1e-12;       // 开关断开
  var G_VOLTMETER = 1e-6;   // 电压表内阻 1MΩ
  var DIODE_RS = 8;         // 二极管导通内阻

  /* ---------- 高斯消元（列主元） ---------- */
  function solveLinear(A, b, n) {
    for (var col = 0; col < n; col++) {
      var piv = col, best = Math.abs(A[col][col]);
      for (var r = col + 1; r < n; r++) {
        var v = Math.abs(A[r][col]);
        if (v > best) { best = v; piv = r; }
      }
      if (best < 1e-14) return null;
      if (piv !== col) {
        var t = A[piv]; A[piv] = A[col]; A[col] = t;
        var tb = b[piv]; b[piv] = b[col]; b[col] = tb;
      }
      var d = A[col][col];
      for (r = col + 1; r < n; r++) {
        var f = A[r][col] / d;
        if (!f) continue;
        for (var c = col; c < n; c++) A[r][c] -= f * A[col][c];
        b[r] -= f * b[col];
      }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (var j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }

  /* ---------- 几何 → 电气节点 ---------- */
  function key(p) { return p.x + ',' + p.z; }
  function pinPos(c) {
    return c.rot === 90
      ? [{ x: c.x, z: c.z }, { x: c.x, z: c.z + 2 }]
      : [{ x: c.x, z: c.z }, { x: c.x + 2, z: c.z }];
  }

  function buildNodes(state) {
    var parent = {};
    function find(k) {
      while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; }
      return k;
    }
    function union(a, b) {
      if (!(a in parent)) parent[a] = a;
      if (!(b in parent)) parent[b] = b;
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    }
    var wires = state.wires || [];
    var wirePts = [];
    wires.forEach(function (w) {
      for (var i = 0; i < w.pts.length; i++) {
        var k = key(w.pts[i]);
        if (!(k in parent)) parent[k] = k;
        if (i) union(key(w.pts[i - 1]), k);
      }
      for (i = 0; i < w.pts.length - 1; i++) wirePts.push([w.pts[i], w.pts[i + 1]]);
    });
    state.comps.forEach(function (c) {
      var pp = pinPos(c);
      pp.forEach(function (p) { if (!(key(p) in parent)) parent[key(p)] = key(p); });
    });
    // 端点/折点落在别的导线线段上 → 连通（T 形接法）
    state.comps.forEach(function (c) {
      pinPos(c).forEach(function (p) { touch(p); });
    });
    wires.forEach(function (w) { w.pts.forEach(function (p) { touch(p); }); });

    function touch(p) {
      for (var i = 0; i < wirePts.length; i++) {
        var a = wirePts[i][0], b = wirePts[i][1];
        if (a.x === b.x) {
          if (p.x === a.x && p.z >= Math.min(a.z, b.z) && p.z <= Math.max(a.z, b.z)) union(key(p), key(a));
        } else if (a.z === b.z) {
          if (p.z === a.z && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x)) union(key(p), key(a));
        }
      }
    }

    // 分配节点编号
    var indexOf = new Map();
    var groups = [];
    Object.keys(parent).forEach(function (k) {
      var r = find(k);
      if (!indexOf.has(r)) { indexOf.set(r, groups.length); groups.push([]); }
      groups[indexOf.get(r)].push(k);
    });
    return {
      indexOf: function (p) {
        var k = key(p);
        if (!(k in parent)) return -1;      // 悬空引脚
        return indexOf.get(find(k));
      },
      groupCount: groups.length,
      groups: groups
    };
  }

  /* ---------- 单个元件的线性化模型 ---------- */
  /* 返回 { g, j, jInto } 或 null（不接入）；
     g: A-B 间电导；j: 电流源大小；jInto: 注入 A 端为 'a'，注入 B 端为 'b' */
  function linearModel(c, vA, vB) {
    switch (c.type) {
      case 'resistor': case 'bulb':
        return { g: 1 / Math.max(0.01, c.r || 100), j: 0 };
      case 'battery':
        return { g: 1 / Math.max(0.05, c.r || 0.5), j: (c.v || 9) / Math.max(0.05, c.r || 0.5), jInto: 'a' };
      case 'ammeter':
        return { g: G_SHORT, j: 0 };
      case 'voltmeter':
        return { g: G_VOLTMETER, j: 0 };
      case 'switch':
        return c.closed ? { g: G_SHORT, j: 0 } : { g: G_OPEN, j: 0 };
      case 'diode': case 'led': {
        var vf = c.type === 'led' ? (c.vf || 2.0) : (c.vf || 0.7);
        var rev = c.reversed;
        var va = rev ? vB : vA;      // 正向压降方向
        var vb = rev ? vA : vB;
        var fwd = va - vb;
        if (fwd > vf) {
          var gs = 1 / DIODE_RS, jj = vf / DIODE_RS;
          return { g: gs, j: jj, jInto: rev ? 'b' : 'a', on: true };
        }
        return { g: 1e-9, j: 0, on: false };
      }
      default:
        return null;
    }
  }

  function hasModel(type) {
    return ['resistor', 'bulb', 'battery', 'ammeter', 'voltmeter', 'switch', 'diode', 'led'].indexOf(type) >= 0;
  }

  /* ---------- 求解（含二极管状态迭代） ---------- */
  function solve(state, net) {
    net = net || buildNodes(state);
    var N = net.groupCount - 1;                  // 去掉参考地
    if (N < 1) return { ok: false, reason: 'no-circuit', message: '没有构成回路' };

    // 参考地：电池负极所在的节点组；没有电池就用 0 号组
    var gnd = 0;
    for (var i = 0; i < state.comps.length; i++) {
      if (state.comps[i].type === 'battery') {
        var pp = pinPos(state.comps[i]);
        gnd = net.indexOf(pp[1]);
        break;
      }
    }
    if (gnd < 0) gnd = 0;
    // 编号映射：电气节点 → 方程编号（地 = -1）
    var eq = new Array(net.groupCount).fill(-1), n = 0;
    for (i = 0; i < net.groupCount; i++) if (i !== gnd) eq[i] = n++;

    var diodes = state.comps.filter(function (c) { return c.type === 'diode' || c.type === 'led'; });
    var diodeOn = {};
    diodes.forEach(function (d) { diodeOn[d.id] = false; });

    var v = new Array(net.groupCount).fill(0), result = null;
    for (var iter = 0; iter < 60; iter++) {
      var A = [], b = [];
      for (i = 0; i < n; i++) { A.push(new Array(n).fill(0)); b.push(0); }
      // 接地微电导防奇异
      for (i = 0; i < n; i++) A[i][i] += EPS_G;

      state.comps.forEach(function (c) {
        if (!hasModel(c.type)) return;
        var pp = pinPos(c);
        var na = net.indexOf(pp[0]), nb = net.indexOf(pp[1]);
        if (na < 0 || nb < 0) return;          // 悬空不接入
        var m;
        if (c.type === 'diode' || c.type === 'led') {
          var vf = c.type === 'led' ? (c.vf || 2.0) : (c.vf || 0.7);
          var fwd = c.reversed ? (v[nb] - v[na]) : (v[na] - v[nb]);
          var on = diodeOn[c.id];
          if (on) {
            m = { g: 1 / DIODE_RS, j: vf / DIODE_RS, jInto: c.reversed ? 'b' : 'a' };
          } else {
            m = { g: 1e-9, j: 0 };
          }
        } else {
          m = linearModel(c, v[net.indexOf(pp[0])], v[net.indexOf(pp[1])]);
        }
        var ea = eq[na], eb = eq[nb];
        if (ea >= 0) { A[ea][ea] += m.g; b[ea] += m.jInto === 'a' ? m.j : -m.j; }
        if (eb >= 0) { A[eb][eb] += m.g; b[eb] += m.jInto === 'b' ? m.j : -m.j; }
        if (ea >= 0 && eb >= 0) { A[ea][eb] -= m.g; A[eb][ea] -= m.g; }
      });

      var x = solveLinear(A, b, n);
      if (!x) return { ok: false, reason: 'singular', message: '矩阵奇异：电路连接不完整' };
      var vi = 0;
      for (i = 0; i < net.groupCount; i++) v[i] = (eq[i] === -1) ? 0 : x[vi++];

      // 二极管状态更新
      var changed = false;
      for (var k = 0; k < diodes.length; k++) {
        var d = diodes[k];
        var pp2 = pinPos(d);
        var na2 = net.indexOf(pp2[0]), nb2 = net.indexOf(pp2[1]);
        if (na2 < 0 || nb2 < 0) continue;
        var vf2 = d.type === 'led' ? (d.vf || 2.0) : (d.vf || 0.7);
        var fwd2 = d.reversed ? (v[nb2] - v[na2]) : (v[na2] - v[nb2]);
        var I = diodeOn[d.id] ? (fwd2 - vf2) / DIODE_RS : 0;
        if (!diodeOn[d.id] && fwd2 > vf2 + 1e-6) { diodeOn[d.id] = true; changed = true; }
        else if (diodeOn[d.id] && I < -1e-9) { diodeOn[d.id] = false; changed = true; }
      }
      result = { v: v.slice(), diodeOn: Object.assign({}, diodeOn) };
      if (!changed) break;
    }

    // 元件读数
    var comps = state.comps.map(function (c) {
      var out = { id: c.id, v: 0, i: 0, p: 0 };
      if (!hasModel(c.type)) return out;
      var pp = pinPos(c);
      var na = net.indexOf(pp[0]), nb = net.indexOf(pp[1]);
      if (na < 0 || nb < 0) return out;
      var vab = v[na] - v[nb];
      switch (c.type) {
        case 'resistor': case 'bulb':
          out.v = vab; out.i = vab / Math.max(0.01, c.r || 100); break;
        case 'battery':
          out.v = vab; out.i = (vab - (c.v || 9)) / Math.max(0.05, c.r || 0.5); break;
        case 'ammeter':
          out.v = vab; out.i = vab * G_SHORT; break;
        case 'voltmeter':
          out.v = vab; out.i = vab * G_VOLTMETER; break;
        case 'switch':
          out.v = vab; out.i = c.closed ? vab * G_SHORT : 0; break;
        case 'diode': case 'led': {
          var vf = c.type === 'led' ? (c.vf || 2.0) : (c.vf || 0.7);
          if (result.diodeOn[c.id]) {
            var fwd = c.reversed ? -vab : vab;
            var ii = (fwd - vf) / DIODE_RS;
            out.i = c.reversed ? -ii : ii;
            out.v = c.reversed ? -fwd : fwd;
          } else {
            out.i = vab * 1e-9; out.v = vab;
          }
          break;
        }
      }
      out.p = Math.abs(out.v * out.i);
      return out;
    });

    return {
      ok: true, net: net, v: v, ground: gnd,
      readings: comps, diodeOn: result.diodeOn,
      voltageOf: function (p) { var idx = net.indexOf(p); return idx >= 0 ? v[idx] : 0; }
    };
  }

  root.CircuitCore = {
    buildNodes: buildNodes,
    solve: solve,
    pinPos: pinPos,
    hasModel: hasModel,
    G_SHORT: G_SHORT, G_VOLTMETER: G_VOLTMETER, DIODE_RS: DIODE_RS
  };
})(window);
