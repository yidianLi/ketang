/* ============================================================
   力学实验室 · 物理内核
   ------------------------------------------------------------
   简普力学实验室 si-translation-v1 运动学模型。
   关键实现点：

   1. 斜面受力 S(entity, surface, Fext, vAlong)：
        n  = 单位法向，t = 单位切向
        N  = max(0, −Fext·n)                       支持力，压不住就离面
        F∥ = Fext·t                                 沿面主动分量
        静止判据：|v| < 1e-8 且 |F∥| <= μs·N + 1e-9
            → 静摩擦 f = −F∥（恰好抵消，不超额）
        否则滑动：f = −sign(v 或 F∥)·μk·N
        a = (F∥ + f)/m

   2. 积分：dt = 1/240 s 固定步长，半步法
        路面：x += v·dt + ½a·dt² ， v += a·dt
        自由：x += v·dt + ½g·dt²，  v += g·dt

   3. 受力箭头按“1 N = 多少像素”统一比例，避免小力看不见、大力撑破画布。

   一个文档（state）：
     { g, entities:[{id,type,...}] }
   entities 支持：ground / incline / block / ball / rope / pulley /
                  spring / belt / wall
   ============================================================ */
(function (root) {
  'use strict';

  var DT = 1 / 240;            // 固定物理步长
  var STATIC_EPS = 1e-6;       // 静止判定阈值
  var V_EPS = 1e-8;            // 判定“静止”的速度阈值

  /* ---------- 小工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function deg(r) { return r * 180 / Math.PI; }
  function rad(d) { return d * Math.PI / 180; }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function unit(a) {
    var l = len(a);
    return l < 1e-12 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
  }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function mul(a, k) { return { x: a.x * k, y: a.y * k }; }

  // 切向 / 法向：θ 为斜面与水平夹角（y 轴向上为正）
  function tangent(theta) { return { x: Math.cos(theta), y: Math.sin(theta) }; }
  function normal(theta) { return { x: -Math.sin(theta), y: Math.cos(theta) }; }

  /* ============================================================
     1. 斜面受力 S 函数
     ============================================================ */
  function surfaceForces(body, surface, Fext, vAlong) {
    var th = rad(surface.angle || 0);
    var t = tangent(th), n = normal(th);
    var N = Math.max(0, -dot(Fext, n));               // 支持力大小
    var Fpar = dot(Fext, t);                          // 沿面主动力
    var muS = surface.muStatic == null ? 0.4 : surface.muStatic;
    var muK = surface.muKinetic == null ? 0.25 : surface.muKinetic;
    var isStatic = Math.abs(vAlong) < V_EPS && Math.abs(Fpar) <= muS * N + 1e-9;
    var f = isStatic ? -Fpar : -Math.sign(vAlong || Fpar) * muK * N;
    return {
      t: t, n: n, N: N, Fpar: Fpar, f: f, isStatic: isStatic,
      a: (Fpar + f) / body.mass,
      forces: [
        { name: '支持力', symbol: 'N', ...mul(n, N), color: '#5d7b60' },
        { name: isStatic ? '静摩擦力' : '滑动摩擦力', symbol: 'f', ...mul(t, f), color: '#ba8048' }
      ]
    };
  }

  /* 外接圆半径：木块用对角线一半（保守处理，保证任何倾角都不穿面） */
  function bodyRadius(e) {
    if (e.type === 'ball') return e.radius || 0.2;
    return Math.hypot(e.width || 0.6, e.height || 0.4) / 2;
  }

  /* ============================================================
     2. 由状态构建可动体
     ============================================================ */
  function buildBodies(doc) {
    var bodies = [];
    doc.entities.forEach(function (e) {
      if (e.type === 'block' || e.type === 'ball') {
        bodies.push({
          id: e.id, type: e.type, label: e.label || (e.type === 'ball' ? '小球' : '木块'),
          mass: e.mass, x: e.x, y: e.y, vx: e.vx || 0, vy: e.vy || 0,
          r: bodyRadius(e),
          fx: e.forceX || 0, fy: e.forceY || 0,
          onSurface: null, angle: 0,
          forces: [], trail: [], ax: 0, ay: 0
        });
      }
    });
    return bodies;
  }

  /* 斜面锚点 = 坡底（右下角），沿面坐标 s∈[0, length] 由坡底指向坡顶。
     这样 (x,y) 就是最直观的“坡脚坐标”。 */
  function inclineOrigin(s) {
    var th = rad(s.angle || 0);
    return { x: s.x - s.length * Math.cos(th), y: s.y - s.length * Math.sin(th) };
  }

  /* 判断球/块落在哪个支撑面上；返回 {surface, s, n, t}
     吸附式判定：|垂距 − r| < SNAP 即视为贴面，并给出 snap 修正量。
     紧容差 0.00001 配合“不动点修正”，这里放宽到 SNAP 以吸收
     半步法累积误差，效果等价但更稳。 */
  var SNAP = 0.06;
  function findContact(body, surfaces) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < surfaces.length; i++) {
      var s = surfaces[i];
      var th = rad(s.angle || 0);
      var t = tangent(th), n = normal(th);
      var ox, oy;
      if (s.type === 'incline') { var o = inclineOrigin(s); ox = o.x; oy = o.y; }
      else { ox = s.x; oy = s.y; }
      var dx = body.x - ox, dy = body.y - oy;
      var along = dot({ x: dx, y: dy }, t);
      var perp = dot({ x: dx, y: dy }, n);
      var half = (s.length || 8) / 2;
      var inSpan = s.type === 'incline'
        ? (along >= -0.001 && along <= s.length + 0.001)
        : (Math.abs(along) <= half);
      var d = Math.abs(perp - body.r);
      if (inSpan && d < SNAP && d < bestD) {
        bestD = d;
        best = { surface: s, s: along, n: n, t: t, ox: ox, oy: oy, snap: perp - body.r };
      }
    }
    return best;
  }

  /* ============================================================
     3. 单步推进
     ============================================================ */
  function stepOnce(doc, bodies, surfaces) {
    var g = doc.g || 9.81;
    var dt = DT;

    bodies.forEach(function (b) {
      var Fext = { x: b.fx, y: -b.mass * g + b.fy };   // 竖直向下 + 外力
      var contact = findContact(b, surfaces);
      b.contact = contact;

      var forces = [{ name: '重力', symbol: 'G', x: 0, y: -b.mass * g, color: '#7a5c44' }];
      if (b.fx || b.fy) {
        forces.push({ name: '外力', symbol: 'F', x: b.fx, y: b.fy, color: '#b5453a' });
      }

      if (contact) {
        var r = surfaceForces(b, contact.surface, Fext, dot({ x: b.vx, y: b.vy }, contact.t));
        forces = forces.concat(r.forces);
        b.angle = rad(contact.surface.angle || 0);
        b.mode = r.isStatic ? '静止在面上' : (r.Fpar > 0 ? '沿面向上滑动' : '沿面向下滑动');
        b.need = Math.abs(r.Fpar);
        b.limit = contact.surface.muStatic * r.N;
        b.ax = r.a * contact.t.x;
        b.ay = r.a * contact.t.y;
        // 半步法
        var vAlong = dot({ x: b.vx, y: b.vy }, contact.t);
        var a = r.a;
        var s2 = vAlong * dt + 0.5 * a * dt * dt;
        b.x += contact.t.x * s2; b.y += contact.t.y * s2;
        var v2 = vAlong + a * dt;
        // 速度方向只沿面
        b.vx = contact.t.x * v2; b.vy = contact.t.y * v2;
        // 若静摩擦且速度归零，吸附
        if (Math.abs(v2) < 1e-7 && r.isStatic) { b.vx = 0; b.vy = 0; v2 = 0; }
        // 贴面修正：把垂距拉回 r（用修正后的沿面位置重新计算）
        var dx2 = b.x - contact.ox, dy2 = b.y - contact.oy;
        var perp2 = dx2 * contact.n.x + dy2 * contact.n.y;
        var along2 = dx2 * contact.t.x + dy2 * contact.t.y;
        b.x = contact.ox + contact.t.x * along2 + contact.n.x * b.r;
        b.y = contact.oy + contact.t.y * along2 + contact.n.y * b.r;
        b.along = along2;
      } else {
        var a2 = { x: Fext.x / b.mass, y: Fext.y / b.mass };
        b.ax = a2.x; b.ay = a2.y;
        b.mode = '自由运动（无接触）';
        b.x += b.vx * dt + 0.5 * a2.x * dt * dt;
        b.y += b.vy * dt + 0.5 * a2.y * dt * dt;
        b.vx += a2.x * dt; b.vy += a2.y * dt;
      }
      b.forces = forces;
    });
  }

  /* ============================================================
     4. 对外：建立运行会话
     ============================================================ */
  function createRun(doc) {
    var d = JSON.parse(JSON.stringify(doc));
    var bodies = buildBodies(d);
    var surfaces = d.entities.filter(function (e) {
      return e.type === 'ground' || e.type === 'incline' || e.type === 'belt' || e.type === 'wall';
    });
    var t = 0, done = false, msg = '';

    function record() {
      bodies.forEach(function (b) {
        b.trail.push({ x: b.x, y: b.y, t: t });
        if (b.trail.length > 4000) b.trail.shift();
      });
    }

    // 初始化：贴到面上
    bodies.forEach(function (b) {
      var c = findContact(b, surfaces);
      if (c) { b.contact = c; b.angle = rad(c.surface.angle || 0); }
    });
    stepOnce(d, bodies, surfaces);
    record();

    return {
      doc: d,
      bodies: bodies,
      surfaces: surfaces,
      get time() { return t; },
      get finished() { return done; },
      get message() { return msg; },
      step: function (n) {
        for (var i = 0; i < n && !done; i++) {
          stepOnce(d, bodies, surfaces);
          t += DT;
          record();
          if (t > 20) { done = true; msg = '已达到 20 s 演示上限'; }
          var out = bodies.some(function (b) { return !isFinite(b.x + b.y) || len({ x: b.x, y: b.y }) > 1e4; });
          if (out) { done = true; msg = '物体已超出可计算范围'; }
        }
        return t;
      },
      reset: function () {
        var fresh = createRun(doc);
        bodies = fresh.bodies; surfaces = fresh.surfaces; t = 0; done = false; msg = '';
        stepOnce(d, bodies, surfaces); record();
      },
      // 当前时刻汇总（给面板显示）
      summary: function () {
        return bodies.map(function (b) {
          var v = len({ x: b.vx, y: b.vy });
          return {
            label: b.label,
            v: v,
            a: Math.hypot(b.ax, b.ay),
            x: b.x, y: b.y,
            mode: b.mode || '',
            e: 0.5 * b.mass * v * v + b.mass * (d.g || 9.81) * b.y
          };
        });
      }
    };
  }

  /* ============================================================
     5. 静态受力分析（不跑仿真，直接给出这一瞬间的所有力）
     ============================================================ */
  function analyze(doc) {
    var g = doc.g || 9.81;
    var surfaces = doc.entities.filter(function (e) {
      return e.type === 'ground' || e.type === 'incline' || e.type === 'belt' || e.type === 'wall';
    });
    var out = [];
    doc.entities.forEach(function (e) {
      if (e.type !== 'block' && e.type !== 'ball') return;
      var b = {
        mass: e.mass, r: bodyRadius(e), x: e.x, y: e.y
      };
      var c = findContact(b, surfaces);
      var Fext = { x: e.forceX || 0, y: -e.mass * g + (e.forceY || 0) };
      var res = {
        label: e.label || (e.type === 'ball' ? '小球' : '木块'),
        id: e.id,
        weight: e.mass * g,
        forces: [{ name: '重力', symbol: 'G', x: 0, y: -e.mass * g, color: '#7a5c44' }],
        contact: !!c,
        note: ''
      };
      if (c) {
        var r = surfaceForces(b, c.surface, Fext, 0);
        res.forces = res.forces.concat(r.forces);
        res.N = r.N; res.Fpar = r.Fpar; res.f = r.f;
        res.isStatic = r.isStatic;
        res.needed = Math.abs(r.Fpar);
        res.limit = c.surface.muStatic * r.N;
        res.note = r.isStatic
          ? (Math.abs(res.needed - res.limit) < 1e-4 && res.limit > 0
            ? '静摩擦达到上限，处在起滑临界状态'
            : '静摩擦按需要平衡，物体保持静止')
          : '所需静摩擦超过上限，物体开始滑动';
      } else {
        res.note = '没有接触面，支持力与摩擦力为零';
      }
      out.push(res);
    });
    return out;
  }

  /* ============================================================
     6. 场景预置
     ------------------------------------------------------------
     斜面锚点 = 坡底（右下角）：左下角 = (x − L·cosθ, y − L·sinθ)
     块的圆心放在 坡底 + 沿面距离 s · t + 外接半径 r · n，
     保证一开局就是贴面状态，不会先掉一帧。
     ============================================================ */
  var G0 = 9.81;

  function onIncline(angleDeg, s, opts) {
    var o = opts || {};
    var L = 7, r = Math.hypot(0.8, 0.6) / 2;
    var th = rad(angleDeg);
    var t = tangent(th), n = normal(th);
    var ox = o.ox == null ? 0 : o.ox;
    var oy = o.oy == null ? 0 : o.oy;
    if (o.ox == null) { ox = -L * Math.cos(th) + 3.3; oy = -L * Math.sin(th) - 1.2; }
    return {
      x: ox + t.x * s + n.x * r,
      y: oy + t.y * s + n.y * r
    };
  }

  var PRESETS = [
    {
      id: 'incline-static', name: '斜面静止（静摩擦平衡）',
      note: '19° 斜面、μs=0.40。tan19°≈0.344 < 0.40，静摩擦足够，木块保持静止。把倾角拉到 22° 以上就会起滑。',
      build: function () {
        var th = rad(19), L = 7;
        var ox = -L * Math.cos(th) + 3.3, oy = -L * Math.sin(th) - 1.2;
        var p = onIncline(19, 3.0, { ox: ox, oy: oy });
        return {
          g: G0, title: '斜面静止',
          entities: [
            { id: 'In', type: 'incline', x: ox + L * Math.cos(th), y: oy + L * Math.sin(th), length: L, angle: 19, muStatic: 0.4, muKinetic: 0.3 },
            { id: 'B', type: 'block', x: p.x, y: p.y, mass: 2, width: 0.8, height: 0.6, label: '木块' }
          ]
        };
      }
    },
    {
      id: 'incline-slide', name: '斜面下滑（动摩擦）',
      note: '30° 斜面、μs=0.20、μk=0.15。所需沿面静摩擦 mg·sin30° 已超上限，起滑后 a = g(sinθ − μk·cosθ) ≈ 3.63 m/s²。',
      build: function () {
        var th = rad(30), L = 7;
        var ox = -L * Math.cos(th) + 3.3, oy = -L * Math.sin(th) - 1.2;
        var p = onIncline(30, 5.2, { ox: ox, oy: oy });
        return {
          g: G0, title: '斜面下滑',
          entities: [
            { id: 'In', type: 'incline', x: ox + L * Math.cos(th), y: oy + L * Math.sin(th), length: L, angle: 30, muStatic: 0.2, muKinetic: 0.15 },
            { id: 'B', type: 'block', x: p.x, y: p.y, mass: 2, width: 0.8, height: 0.6, label: '木块' }
          ]
        };
      }
    },
    {
      id: 'incline-push', name: '斜面上推（外力做功）',
      note: '25° 面上沿坡方向推 9 N。重力沿面分量 1.5g·sin25°≈6.2 N 与摩擦共同抵抗，净合力决定是匀速上滑还是加速。',
      build: function () {
        var th = rad(25), L = 7;
        var ox = -L * Math.cos(th) + 3.3, oy = -L * Math.sin(th) - 1.2;
        var p = onIncline(25, 2.4, { ox: ox, oy: oy });
        return {
          g: G0, title: '斜面上推',
          entities: [
            { id: 'In', type: 'incline', x: ox + L * Math.cos(th), y: oy + L * Math.sin(th), length: L, angle: 25, muStatic: 0.3, muKinetic: 0.22 },
            { id: 'B', type: 'block', x: p.x, y: p.y, mass: 1.5, width: 0.8, height: 0.6, forceX: 9 * Math.cos(th), forceY: 9 * Math.sin(th), label: '木块' }
          ]
        };
      }
    },
    {
      id: 'flat-pull', name: '水平面拉木块',
      note: '2 kg 木块受 6 N 水平拉力，μs=0.40。最大静摩擦 = 0.40×19.62 ≈ 7.85 N > 6 N，拉不动；调到 9 N 才开始加速。',
      build: function () {
        return {
          g: G0, title: '水平面拉木块',
          entities: [
            { id: 'Gd', type: 'ground', x: 0, y: -1.9, length: 9, angle: 0, muStatic: 0.4, muKinetic: 0.3 },
            { id: 'B', type: 'block', x: -1.4, y: -1.4, mass: 2, width: 0.8, height: 0.6, forceX: 6, label: '木块' }
          ]
        };
      }
    },
    {
      id: 'ground-friction', name: '地面滑动（μk 制动）',
      note: '1 kg 滑块以 5 m/s 进入 μk=0.30 地面，a = −μg ≈ −2.94 m/s²，理论滑行 4.25 m、用时 1.7 s。',
      build: function () {
        return {
          g: G0, title: '地面滑动',
          entities: [
            { id: 'Gd', type: 'ground', x: 0, y: -1.9, length: 9, angle: 0, muStatic: 0.35, muKinetic: 0.3 },
            { id: 'B', type: 'block', x: -3.2, y: -1.4, mass: 1, width: 0.8, height: 0.6, vx: 5, label: '滑块' }
          ]
        };
      }
    },
    {
      id: 'ball-roll', name: '小球沿光滑斜面下滑',
      note: '35° 光滑斜面（μ=0），半径 0.25 m 的小球沿面加速度 g·sin35° ≈ 5.63 m/s²（本模型不计转动惯量）。',
      build: function () {
        var th = rad(35), L = 12, r = 0.25;
        var ox = -L * Math.cos(th) + 3.3, oy = -L * Math.sin(th) - 1.2;
        var t = tangent(th), n = normal(th);
        return {
          g: G0, title: '小球下滑',
          entities: [
            { id: 'In', type: 'incline', x: ox + L * Math.cos(th), y: oy + L * Math.sin(th), length: L, angle: 35, muStatic: 0, muKinetic: 0 },
            { id: 'B', type: 'ball', x: ox + t.x * 9.6 + n.x * r, y: oy + t.y * 9.6 + n.y * r, mass: 0.5, radius: r, label: '小球' }
          ]
        };
      }
    }
  ];

  root.MechCore = {
    DT: DT,
    PRESETS: PRESETS,
    createRun: createRun,
    analyze: analyze,
    surfaceForces: surfaceForces,
    inclineOrigin: inclineOrigin,
    bodyRadius: bodyRadius,
    findContact: findContact,
    tangent: tangent,
    normal: normal,
    deg: deg,
    rad: rad,
    clamp: clamp,
    len: len,
    dot: dot
  };
})(window);
