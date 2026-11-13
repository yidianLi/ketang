/* ============================================================
   地形实验室 · 高程内核
   ------------------------------------------------------------
   数学习惯与原实现一致：
     1. 基面：185m 平地 + fbm 噪声 − 高斯山丘 − 曲流谷带
     2. 10 类元件：各自一个解析式（没有贴图、没有噪声贴图）
     3. 合成：soft-max 叠峰 / 谷取最深 / 高程面分区单位分解 / 水域封平
   坐标系：x 向东，z 向南（屏幕上向下），y 为海拔（米）
   ============================================================ */
(function (root) {
  'use strict';

  var BASE_LEVEL = 185;   // 基准平地海拔
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  /* ---------- 值噪声 + fbm ---------- */
  /* 哈希函数与原实现逐字一致（sin 哈希），保证同一份地形参数能还原出同样的山形。 */
  function hash2(x, y) {
    var t = Math.sin(x * 127.1 + y * 311.7 + 17.3) * 43758.5453;
    return t - Math.floor(t);
  }
  function valueNoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = smooth(x - xi), yf = smooth(y - yi);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi);
    var c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
  }
  function fbm(x, y) {
    var sum = 0, amp = 0.5;
    for (var i = 0; i < 5; i++) {
      sum += amp * valueNoise(x, y);
      x = x * 2.03 + 19.1;
      y = y * 2.03 - 7.3;
      amp *= 0.5;
    }
    return sum;
  }

  /* ---------- 坐标变换 ---------- */
  function toLocal(x, z, c) {
    var r = (c.rotation || 0) * Math.PI / 180;
    var a = x - c.x, b = z - c.z;
    return { x: a * Math.cos(r) + b * Math.sin(r), z: -a * Math.sin(r) + b * Math.cos(r) };
  }
  function toWorld(c, lx, lz) {
    var r = (c.rotation || 0) * Math.PI / 180;
    return { x: c.x + lx * Math.cos(r) - lz * Math.sin(r), z: c.z + lx * Math.sin(r) + lz * Math.cos(r) };
  }

  /* ---------- 坡形曲线：一条式子三种坡 ---------- */
  function profileCurve(t, c) {
    t = clamp(t, 0, 1);
    var p = 1.25 + (c.shape || 0) * 1.5;
    if (c.slopeProfile === 'concave') return Math.pow(1 - t, p);   // 凹坡：上陡下缓
    if (c.slopeProfile === 'convex') return 1 - Math.pow(t, p);    // 凸坡：上缓下陡
    return 1 - t;                                                 // 均匀坡
  }

  /* ---------- 坡面 / 冲积扇 的矩形衰减权重 ---------- */
  function rectMask(l, c) {
    var t = Math.abs(l.x) * 2 / c.width;
    var n = Math.abs(l.z) * 2 / c.length;
    return (1 - smooth(clamp((t - 1) / 0.4, 0, 1))) * (1 - smooth(clamp((n - 1) / 0.4, 0, 1)));
  }
  var SQRT3 = Math.sqrt(3);
  function fanPolar(x, z, c) {
    var l = toLocal(x, z, c);
    var across = l.x * SQRT3 / c.width;
    var down = 0.5 - l.z / c.length;
    return { across: across, down: down, radius: Math.hypot(across, down) };
  }
  function fanMask(p) {
    return (1 - smooth(clamp((p.radius - 1) / 0.15, 0, 1))) *
           (1 - smooth(clamp((Math.abs(p.across) * 0.5 - p.down * SQRT3 / 2) / 0.15, 0, 1)));
  }

  /* ---------- 陡崖：形变后的椭圆掩模，沿一个方向突然截断 ---------- */
  function cliffMask(x, z, c) {
    if (c.cliffBottomLevel === undefined) return 0;
    var l = toLocal(x, z, c);
    var o = l.x * 2 / c.width, s = l.z * 2 / c.length;
    return Math.min(1, Math.max(0, 1 - o * o - s * s) * (3 + (c.shape || 0) * 4));
  }
  function cliffCutX(c) { return (0.1 + (c.shape || 0) * 0.2) * c.width / 2; }

  /* ---------- 山头：角向扰动 + 径向衰减 ---------- */
  function mountainField(x, z, c) {
    var rx = (x - c.x) / (c.width / 2);
    var rz = (z - c.z) / (c.length / 2);
    var ang = Math.atan2(rz, rx);
    var r = Math.hypot(rx, rz);
    if (r > 4) return 0;
    var seed = c.seed === undefined ? 2.1 : c.seed;
    var detail = c.detail === undefined ? 0.3 : c.detail;
    // 角向噪声：山体轮廓不是圆，而是带冲沟的形状
    var warp = (valueNoise(Math.cos(ang) * 3 + seed, Math.sin(ang) * 3 + seed) - 0.5) * 1.1
             + Math.sin(ang * 3 + seed - r * 2) * 0.18;
    var f = r * (1 + warp * detail * (0.3 + smooth(Math.min(r, 1)) * 0.7));
    // f ≥ 1 时主峰剖面必为 0，先退出，省掉后面的 fbm（这是最热的一段）
    if (f >= 1) return 0;
    // 主峰剖面：1−r^p 的 1.7 次方，顶上圆、脚下收
    var m = Math.pow(1 - Math.pow(f, 1.05 + (c.shape || 0) * 1.35), 1.7);
    if (detail <= 0) return clamp((c.height - BASE_LEVEL) * m, 0, c.height - BASE_LEVEL);
    // 细节起伏：fbm 粗噪声 + 角向高频（做冲沟/山脊线）
    var g = Math.abs(valueNoise(Math.cos(ang) * 7 + seed + r * 0.8, Math.sin(ang) * 7 + seed) - 0.5);
    var d = ((fbm((x - c.x) / 170 + seed, (z - c.z) / 170 + seed) - 0.48) * 220 + (g - 0.22) * 360) * detail;
    return clamp((c.height - BASE_LEVEL + d * Math.min(r * 2, 1)) * m, 0, c.height - BASE_LEVEL);
  }

  /* ---------- 基面 ---------- */
  function baseField(state, x, z) {
    if (state.environment === 'plain' || !state.peaks.length) return BASE_LEVEL;
    var n = (fbm(x / 390, z / 390) - 0.4) * 30;
    var a = (valueNoise(x / 230, z / 230) - 0.5) * 120;
    var hill = Math.exp(-Math.pow((x - 430 + a) / 420, 2) - Math.pow((z - 550 + a * 0.7) / 310, 2)) * 128;
    var cx = 210 + Math.sin(z / 400) * 160;
    var val = Math.exp(-Math.pow((x - cx) / 150, 2) - Math.pow((z - 80) / 570, 2)) * 60;
    return BASE_LEVEL + n - hill - val;
  }

  /* ---------- 单元素场（相对基面的增量，单位 m） ---------- */
  function componentField(state, x, z, c) {
    if (c.type === 'slope') {
      var sl = toLocal(x, z, c);
      var m = rectMask(sl, c);
      if (!m) return 0;
      var bottom = c.slopeBottomLevel === undefined ? BASE_LEVEL : c.slopeBottomLevel;
      return (bottom + (c.height - bottom) * profileCurve(0.5 - sl.z / c.length, c) - BASE_LEVEL) * m;
    }
    if (c.type === 'fan') {
      var p = fanPolar(x, z, c);
      var fm = fanMask(p);
      if (!fm) return 0;
      var toe = c.fanToeLevel === undefined ? BASE_LEVEL : c.fanToeLevel;
      var q = Math.pow(1 - clamp(p.radius, 0, 1), c.fanProfile === 'concave' ? 1.15 + (c.shape || 0) * 0.85 : 1);
      return (toe + (c.height - toe) * q - BASE_LEVEL) * fm;
    }

    var l = toLocal(x, z, c);
    if (!c.type || c.type === 'mountain') return mountainField(x, z, c);

    var rx = l.x / (c.width / 2), rz = l.z / (c.length / 2);

    if (c.type === 'plateau') {
      var d = Math.hypot(rx, rz);
      var flat = 0.48 + (c.shape || 0) * 0.36;          // 台面平坦区半径
      if (d >= 1) return 0;
      var edge = 1 - smooth(clamp((d - flat) / (1 - flat), 0, 1));
      var dh = c.height - BASE_LEVEL;
      var jitter = (valueNoise(l.x / 180 + (c.seed || 2.1), l.z / 180 + (c.seed || 2.1)) - valueNoise(c.seed || 2.1, c.seed || 2.1))
                 * Math.min(60, dh * 0.1) * (c.detail === undefined ? 0.3 : c.detail);
      return Math.max(0, dh + jitter) * edge;
    }

    var radial = Math.max(0, 1 - Math.pow(Math.hypot(rx, rz), 2));
    if (!radial) return 0;
    var det = 1 + (valueNoise(l.x / 140 + (c.seed || 2.1), l.z / 140 + (c.seed || 2.1)) - 0.5)
                  * (c.detail === undefined ? 0.3 : c.detail) * 0.3;

    if (c.type === 'basin' || c.type === 'lake') {
      return -c.height * Math.pow(radial, 1 + (c.shape || 0) * 2) * det;
    }

    // 曲流中心线：沿长轴摆动的正弦带
    var center = Math.sin(rz * Math.PI * (1 + (c.shape || 0)) + (c.seed || 2.1)) * 0.22 * (c.shape || 0);
    var band = Math.max(0, 1 - Math.abs(rx - center) / (c.type === 'river' ? 0.35 : 1));

    if (c.type === 'valley' || c.type === 'river') {
      return -c.height * Math.pow(band, 1 + (c.shape || 0) * 2) * radial * det;
    }
    if (c.type === 'ridge') {
      return (c.height - BASE_LEVEL) * Math.pow(band, 1.2 + (c.shape || 0)) * Math.pow(radial, 0.6) * det;
    }
    if (c.type === 'cliff') {
      // 陡崖是多值面：只保留截断线一侧，形成垂直崖壁
      if (l.x > cliffCutX(c)) return 0;
      var f = Math.min(1, radial * (3 + (c.shape || 0) * 4));
      var bottom2 = c.cliffBottomLevel === undefined ? BASE_LEVEL : c.cliffBottomLevel;
      return (c.height - bottom2) * f * (1 + (det - 1) * (1 - f));
    }
    return 0;
  }

  /* ---------- soft-max：两峰相交不出折痕 ---------- */
  function softMax(a, b) {
    var t = Math.min(190, Math.min(a, b));
    var k = t > 0 ? Math.max(t - Math.abs(a - b), 0) / t : 0;
    return Math.max(a, b) + k * k * t * 0.25;
  }

  /* ---------- 高程面（高原/坡面/扇面）分区合成 ---------- */
  function blendSurfaces(base, fields, comps, slopeM, fanM, cliffM) {
    var i, plateau = 0;
    for (i = 0; i < fields.length; i++) {
      if (comps[i].type === 'plateau') plateau = Math.max(plateau, fields[i]);
    }
    var cliffW = 0, cliffLevel = 0;
    for (i = 0; i < cliffM.length; i++) {
      if (cliffM[i] > 0) { cliffW += cliffM[i]; cliffLevel += cliffM[i] * (comps[i].cliffBottomLevel ?? BASE_LEVEL); }
    }
    var cMax = -Infinity;
    for (i = 0; i < slopeM.length; i++) {
      if (slopeM[i] > 0) {
        var v = base + fields[i] + (BASE_LEVEL - base) * slopeM[i];
        cMax = Math.max(cMax, v);
      }
    }
    var top = cMax === -Infinity ? base + plateau
            : (plateau > 0 ? Math.max(base + plateau, cMax) : cMax);
    for (i = 0; i < fanM.length; i++) {
      if (fanM[i] > 0) top = Math.max(top, base + fields[i] + (BASE_LEVEL - base) * fanM[i]);
    }
    if (cliffW) return top + (cliffLevel / cliffW - top) * Math.min(1, cliffW);
    return top;
  }

  /* ---------- 叠加：正峰 soft-max、负地形求和、谷取最深、水域封平 ---------- */
  function compose(state, base, fields, comps, slopeM, fanM, cliffM) {
    var delta = blendSurfaces(base, fields, comps, slopeM, fanM, cliffM) - base;

    var hi1 = 0, hi2 = 0, neg = 0, valleyMin = 0, i;
    for (i = 0; i < fields.length; i++) {
      var t = comps[i];
      if (t.type === 'lake' || t.type === 'river') continue;
      if (t.type === 'plateau' || t.type === 'slope' || t.type === 'fan') continue;

      var bottomRef = t.type === 'cliff' ? (t.cliffBottomLevel ?? BASE_LEVEL) : BASE_LEVEL;
      var v = fields[i];
      if ((delta !== 0 || bottomRef !== BASE_LEVEL) && v > 0) {
        v = v * Math.max(0, t.height - base - delta) / (t.height - bottomRef);
      }
      if (v < 0 && t.type === 'valley') valleyMin = Math.min(valleyMin, v);
      else if (v < 0) neg += v;
      else if (v > hi1) { hi2 = hi1; hi1 = v; }
      else if (v > hi2) hi2 = v;
    }

    var h = base + delta + softMax(hi1, hi2) + neg + valleyMin;

    // 水域：湖/河把水面压平到各自的参考水位
    for (i = 0; i < fields.length; i++) {
      var w = comps[i];
      if (w.type !== 'lake' && w.type !== 'river') continue;
      var k = clamp(-fields[i] / w.height, 0, 1);
      var surface = Math.max(0, (w.bedReferenceLevel ?? w.waterLevel ?? 145) - w.height);
      h = Math.min(h, h + (surface - h) * k);
    }
    return Math.max(0, h);
  }

  /* ---------- 对外：任意点取高程 ---------- */
  var _f = [], _sm = [], _fm = [], _cm = [];   // 复用的临时数组，避免每次采样都分配
  function sampleWithBase(state, x, z, base) {
    var comps = state.peaks, n = comps.length;
    if (_f.length < n) {
      _f = new Array(n); _sm = new Array(n); _fm = new Array(n); _cm = new Array(n);
    }
    _f.length = n; _sm.length = n; _fm.length = n; _cm.length = n;
    for (var i = 0; i < n; i++) {
      var c = comps[i];
      _f[i] = componentField(state, x, z, c);
      _sm[i] = c.type === 'slope' ? rectMask(toLocal(x, z, c), c) : 0;
      _fm[i] = c.type === 'fan' ? fanMask(fanPolar(x, z, c)) : 0;
      _cm[i] = c.type === 'cliff' ? cliffMask(x, z, c) : 0;
    }
    return compose(state, base, _f, comps, _sm, _fm, _cm);
  }
  function sampleAt(state, x, z) {
    return sampleWithBase(state, x, z, baseField(state, x, z));
  }

  /* ---------- 元件表面几何（画到图上的轮廓辅助线） ---------- */
  function slopeOutline(c) {
    var e = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]], pts = [];
    for (var a = 0; a < 4; a++) {
      var t0 = e[a], t1 = e[a + 1];
      for (var o = 0; o < 24; o++) {
        var k = o / 24;
        pts.push(toWorld(c, (t0[0] + (t1[0] - t0[0]) * k) * c.width / 2, (t0[1] + (t1[1] - t0[1]) * k) * c.length / 2));
      }
    }
    pts.push(toWorld(c, -c.width / 2, -c.length / 2));
    return pts;
  }
  function fanOutline(c) {
    var pts = [], top = toWorld(c, 0, c.length / 2);
    for (var a = 0; a < 49; a++) {
      var r = (-60 + a * 2.5) * Math.PI / 180;
      pts.push(toWorld(c, Math.sin(r) * c.width / SQRT3, (0.5 - Math.cos(r)) * c.length));
    }
    return [top].concat(pts, [top]);
  }

  /* ---------- 水体落点判断（渲染水面时剔除游离等值线） ---------- */
  function inWaterFootprint(state, x, z) {
    for (var i = 0; i < state.peaks.length; i++) {
      var c = state.peaks[i];
      if (c.type !== 'lake' && c.type !== 'river') continue;
      var l = toLocal(x, z, c);
      var rx = l.x / (c.width / 2), rz = l.z / (c.length / 2);
      if (c.type === 'lake') {
        if (Math.hypot(rx, rz) <= 1.05) return true;
      } else {
        var center = Math.sin(rz * Math.PI * (1 + (c.shape || 0)) + (c.seed || 2.1)) * 0.22 * (c.shape || 0);
        if (Math.abs(rz) <= 1.05 && Math.abs(rx - center) <= 0.42) return true;
      }
    }
    return false;
  }

  var api = {
    BASE_LEVEL: BASE_LEVEL,
    clamp: clamp, smooth: smooth,
    fbm: fbm, valueNoise: valueNoise,
    toLocal: toLocal, toWorld: toWorld,
    profileCurve: profileCurve,
    baseField: baseField,
    componentField: componentField,
    softMax: softMax,
    compose: compose,
    sampleAt: sampleAt,
    sampleWithBase: sampleWithBase,
    inWaterFootprint: inWaterFootprint,
    slopeOutline: slopeOutline,
    fanOutline: fanOutline,
    defaults: function () {
      return {
        mountain: { name: '山头', height: 850, width: 1400, length: 1300, shape: 0.3, detail: 0.3, label: '峰顶目标海拔' },
        plateau:  { name: '高原', height: 700, width: 2000, length: 1800, shape: 0.6, detail: 0.1, label: '台面目标海拔' },
        slope:    { name: '坡面', height: 700, width: 1200, length: 1600, shape: 0.5, detail: 0, rotation: 180, slopeBottomLevel: 185, slopeProfile: 'uniform', label: '坡顶目标海拔' },
        fan:      { name: '冲积扇', height: 420, width: 1600, length: 1500, shape: 0.5, detail: 0, rotation: 180, fanToeLevel: 185, fanProfile: 'concave', label: '扇顶目标海拔' },
        basin:    { name: '盆地', height: 130, width: 1300, length: 1100, shape: 0.3, detail: 0.3, label: '下凹深度' },
        ridge:    { name: '山脊', height: 700, width: 700, length: 1700, shape: 0.3, detail: 0.3, label: '脊顶目标海拔' },
        valley:   { name: '山谷', height: 160, width: 650, length: 1800, shape: 0.3, detail: 0.3, label: '下切深度' },
        cliff:    { name: '陡崖', height: 600, width: 1100, length: 1300, shape: 0.3, detail: 0.3, cliffBottomLevel: 185, label: '崖顶目标海拔' },
        river:    { name: '河流', height: 90, width: 700, length: 1800, shape: 0.3, detail: 0.3, waterLevel: 145, bedReferenceLevel: 145, label: '河床深度' },
        lake:     { name: '湖泊', height: 120, width: 1100, length: 900, shape: 0.3, detail: 0.3, waterLevel: 145, bedReferenceLevel: 145, label: '湖盆深度' }
      };
    }
  };
  root.TerrainCore = api;
})(window);
