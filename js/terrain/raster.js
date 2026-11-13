/* ============================================================
   栅格化 / 等高线 / 剖面采样
   ------------------------------------------------------------
   等高线用 marching squares 在栅格上求交线段，再按「单元边 ID」
   缝合折线。关键点：交叉点精确落在网格边上，用边序号做 key，
   缝合不会因为浮点误差断线。
   ============================================================ */
(function (root) {
  'use strict';
  var C = root.TerrainCore;

  /* ---------- 栅格化 ---------- */
  // 基面只跟 environment / 尺寸有关，与元件无关，缓存下来省掉每个采样点的 fbm
  var baseCache = new Map();
  function baseGridFor(state, res, step) {
    var key = [state.environment, state.size, state.centerX || 0, state.centerZ || 0, res, state.peaks.length > 0].join('|');
    var hit = baseCache.get(key);
    if (hit) return hit;
    var arr = new Float32Array(res * res);
    var flat = state.environment === 'plain' || !state.peaks.length;
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        arr[j * res + i] = flat ? C.BASE_LEVEL
          : C.baseField(state, i * step - state.size / 2 + (state.centerX || 0), j * step - state.size / 2 + (state.centerZ || 0));
      }
    }
    if (baseCache.size > 6) baseCache.clear();
    baseCache.set(key, arr);
    return arr;
  }

  function buildGrid(state, res) {
    res = res || 193;
    if (res < 3) throw new Error('网格过小');
    var n = state.size / (res - 1);
    var heights = new Float32Array(res * res);
    var base = baseGridFor(state, res, n);
    var min = Infinity, max = -Infinity;
    for (var j = 0; j < res; j++) {
      var z = j * n - state.size / 2 + (state.centerZ || 0);
      for (var i = 0; i < res; i++) {
        var x = i * n - state.size / 2 + (state.centerX || 0);
        var h = C.sampleWithBase(state, x, z, base[j * res + i]);
        heights[j * res + i] = h;
        if (h < min) min = h;
        if (h > max) max = h;
      }
    }
    return {
      heights: heights, resolution: res, step: n, size: state.size,
      centerX: state.centerX || 0, centerZ: state.centerZ || 0,
      min: min, max: max
    };
  }

  /* 三角形切分的双线性采样（与原实现一致，保证剖面不出现对角线错位） */
  function sampleGrid(g, x, z) {
    var a = g.resolution, r = g.step, o = g.heights;
    var s = C.clamp((x - (g.centerX || 0) + g.size / 2) / r, 0, a - 1);
    var l = C.clamp((z - (g.centerZ || 0) + g.size / 2) / r, 0, a - 1);
    var ci = Math.min(a - 2, Math.floor(s));
    var cj = Math.min(a - 2, Math.floor(l));
    var p = s - ci, f = l - cj, m = cj * a + ci;
    if (p + f <= 1) return o[m] * (1 - p - f) + o[m + 1] * p + o[m + a] * f;
    return o[m + a + 1] * (p + f - 1) + o[m + 1] * (1 - f) + o[m + a] * (1 - p);
  }

  /* ---------- 等高线级别 ---------- */
  function levelsFor(g, interval, waterLevel, extra) {
    var lo = Math.floor(g.min / interval) * interval;
    var hi = Math.ceil(g.max / interval) * interval;
    var out = [];
    for (var v = lo; v <= hi + 1e-6; v += interval) {
      if (v > 0) out.push(Math.round(v));
    }
    if (extra && waterLevel) out.push(waterLevel);
    return out;
  }

  /* ---------- 单条等高线：返回折线数组 ---------- */
  function contour(g, level) {
    var res = g.resolution, h = g.heights, step = g.step;
    var ox = (g.centerX || 0) - g.size / 2;
    var oz = (g.centerZ || 0) - g.size / 2;
    var segs = [];
    // 交叉点缓存：同一网格边只算一次
    function crossH(i, j) {           // (i,j)-(i+1,j)
      var v0 = h[j * res + i], v1 = h[j * res + i + 1];
      var t = (level - v0) / (v1 - v0);
      return { x: ox + (i + t) * step, z: oz + j * step, id: 'H' + i + '_' + j };
    }
    function crossV(i, j) {           // (i,j)-(i,j+1)
      var v0 = h[j * res + i], v1 = h[(j + 1) * res + i];
      var t = (level - v0) / (v1 - v0);
      return { x: ox + i * step, z: oz + (j + t) * step, id: 'V' + i + '_' + j };
    }
    var empty = { x: 0, z: 0, id: '' };
    for (var j = 0; j < res - 1; j++) {
      for (var i = 0; i < res - 1; i++) {
        var h00 = h[j * res + i], h10 = h[j * res + i + 1];
        var h11 = h[(j + 1) * res + i + 1], h01 = h[(j + 1) * res + i];
        var b = (h00 >= level ? 1 : 0) | (h10 >= level ? 2 : 0) | (h11 >= level ? 4 : 0) | (h01 >= level ? 8 : 0);
        if (b === 0 || b === 15) continue;
        var T = null, R = null, B = null, L = null;
        var getT = function () { return T || (T = crossH(i, j)); };
        var getB = function () { return B || (B = crossH(i, j + 1)); };
        var getL = function () { return L || (L = crossV(i, j)); };
        var getR = function () { return R || (R = crossV(i + 1, j)); };
        var pairs = [];
        switch (b) {
          case 1: case 14: pairs = [getL, getT]; break;
          case 2: case 13: pairs = [getT, getR]; break;
          case 3: case 12: pairs = [getL, getR]; break;
          case 4: case 11: pairs = [getR, getB]; break;
          case 6: case 9:  pairs = [getT, getB]; break;
          case 7: case 8:  pairs = [getL, getB]; break;
          case 5: case 10: {
            // 鞍点：用单元中心值决定连法
            var c = (h00 + h10 + h11 + h01) / 4;
            if ((c >= level) === (b === 5)) pairs = [getL, getT, getR, getB];
            else pairs = [getL, getB, getT, getR];
            break;
          }
        }
        for (var k = 0; k < pairs.length; k += 2) {
          var a1 = pairs[k](), a2 = pairs[k + 1]();
          if (!a1.id || !a2.id) continue;
          segs.push({ a: a1, b: a2 });
        }
      }
    }
    return stitch(segs);
  }

  /* 按交叉点 ID 把线段缝成折线 */
  function stitch(segs) {
    if (!segs.length) return [];
    var key = function (p) { return p.id; };
    var map = new Map();
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var ka = key(s.a), kb = key(s.b);
      if (!map.has(ka)) map.set(ka, []);
      if (!map.has(kb)) map.set(kb, []);
      map.get(ka).push(i);
      map.get(kb).push(i);
    }
    var used = new Uint8Array(segs.length);
    var lines = [];
    function walk(startIdx, fromPoint) {
      var pts = [fromPoint];
      var idx = startIdx;
      var cur = fromPoint;
      while (idx >= 0 && !used[idx]) {
        used[idx] = 1;
        var s = segs[idx];
        var next = (s.a === cur || (s.a.id === cur.id)) ? s.b : s.a;
        pts.push(next);
        cur = next;
        var cand = map.get(next.id) || [];
        var nxt = -1;
        for (var q = 0; q < cand.length; q++) {
          if (!used[cand[q]]) { nxt = cand[q]; break; }
        }
        idx = nxt;
      }
      return pts;
    }
    for (var i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      var s0 = segs[i];
      var deg = (map.get(s0.a.id) || []).length;
      if (deg === 1) { lines.push(walk(i, s0.a)); continue; }
    }
    for (var k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      lines.push(walk(k, segs[k].a));   // 闭环
    }
    return lines.filter(function (l) { return l.length > 1; });
  }

  function contourCache() {
    var store = new WeakMap();
    return function (g, level) {
      var m = store.get(g);
      if (!m) { m = new Map(); store.set(g, m); }
      var k = level.toFixed(3);
      if (!m.has(k)) m.set(k, contour(g, level));
      return m.get(k);
    };
  }

  /* ---------- 剖面采样：241 点 + 陡崖断点 ---------- */
  function sectionProfile(g, p0, p1, samples) {
    samples = samples || 241;
    var len = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    var pts = [];
    for (var i = 0; i < samples; i++) {
      var t = i / (samples - 1);
      pts.push({
        d: len * t,
        h: sampleGrid(g, p0.x + (p1.x - p0.x) * t, p0.z + (p1.z - p0.z) * t)
      });
    }
    // 陡崖是多值面：相邻采样落差过大就在同一点插入上下两点，画出垂直崖壁
    var out = [pts[0]];
    for (var k = 1; k < pts.length; k++) {
      var dh = pts[k].h - pts[k - 1].h;
      if (Math.abs(dh) > 25 && len / (samples - 1) < 30) {
        out.push({ d: pts[k].d, h: pts[k - 1].h, cliff: true });
        out.push({ d: pts[k].d, h: pts[k].h, cliff: true });
      } else {
        out.push(pts[k]);
      }
    }
    return { points: out, length: len, samples: pts };
  }

  /* ---------- 坡度（用于注记避让与雪线判断） ---------- */
  function slopeAt(g, x, z, d) {
    d = d || g.step;
    var hx = sampleGrid(g, x + d, z) - sampleGrid(g, x - d, z);
    var hz = sampleGrid(g, x, z + d) - sampleGrid(g, x, z - d);
    return Math.atan(Math.hypot(hx, hz) / (2 * d)) * 180 / Math.PI;
  }

  root.TerrainRaster = {
    buildGrid: buildGrid,
    sampleGrid: sampleGrid,
    levelsFor: levelsFor,
    contour: contour,
    contourCache: contourCache,
    sectionProfile: sectionProfile,
    slopeAt: slopeAt
  };
})(window);
