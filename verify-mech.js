/* ============================================================
   力学实验室 · 数值自检
   ------------------------------------------------------------
   对照解析解验证内核（si-translation-v1 模型）：
   1. 斜面静摩擦判据：能静则静、静摩擦不超额
   2. 斜面下滑加速度 a = g(sinθ − μk cosθ)
   3. 水平面摩擦减速 a = μk·g
   4. 斜面小球滚下 v = √(2·a·L)
   5. 无摩擦能量守恒 v = √(2gh)
   6. 积分器自洽：v(t) ≈ a·t
   7. 斜面几何与接触检测
   运行：node verify-mech.js
   ============================================================ */
'use strict';

var win = {};
global.window = win;
require('./js/mech/core.js');
var M = win.MechCore;
if (!M) { console.error('✗ 力学内核未挂载'); process.exit(1); }

var G = 9.81;   /* 内核与预设统一用 9.81 */

var pass = 0, fail = 0, problems = [];
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; problems.push(name + (detail ? ' → ' + detail : '')); }
}
function near(name, got, want, tolPct) {
  if (typeof got !== 'number' || !isFinite(got)) {
    ok(name, false, 'got 非数：' + got); return;
  }
  var d = Math.abs(got - want) / (Math.abs(want) || 1) * 100;
  ok(name, d <= tolPct, 'got=' + got.toFixed(6) + ' want=' + want.toFixed(6) + ' err=' + d.toFixed(3) + '%');
}
function preset(id) {
  for (var i = 0; i < M.PRESETS.length; i++) if (M.PRESETS[i].id === id) return M.PRESETS[i];
  return null;
}
function docOf(id) {
  var p = preset(id);
  return p ? p.build() : null;
}
function surfOf(doc) {
  for (var i = 0; i < doc.entities.length; i++) {
    var t = doc.entities[i].type;
    if (t === 'incline' || t === 'ground') return doc.entities[i];
  }
  return null;
}
function bodyOf(doc) {
  for (var i = 0; i < doc.entities.length; i++) {
    var t = doc.entities[i].type;
    if (t === 'block' || t === 'ball') return doc.entities[i];
  }
  return null;
}
function speedOf(b) { return Math.hypot(b.vx, b.vy); }
function runFor(doc, seconds) {
  var r = M.createRun(doc);
  var steps = Math.round(seconds / M.DT);
  for (var i = 0; i < steps; i++) r.step(1);
  return r;
}
function maxSpeed(doc, seconds) {
  var r = M.createRun(doc);
  var steps = Math.round(seconds / M.DT);
  var mv = 0;
  for (var i = 0; i < steps; i++) {
    r.step(1);
    var v = speedOf(r.bodies[0]);
    if (v > mv) mv = v;
  }
  return { run: r, maxV: mv };
}
/* 只在「仍处于坡面接触」期间统计峰值；离开坡面后属抛体，速度会继续增大 */
function maxSpeedOnSurface(doc, seconds) {
  var r = M.createRun(doc);
  var steps = Math.round(seconds / M.DT);
  var mv = 0, lastContactV = 0, leftAt = null;
  for (var i = 0; i < steps; i++) {
    r.step(1);
    var b = r.bodies[0];
    var v = speedOf(b);
    if (b.contact) {
      if (v > mv) mv = v;
      lastContactV = v;
    } else if (leftAt === null) {
      leftAt = r.time;
    }
  }
  return { run: r, maxV: mv, lastContactV: lastContactV, leftAt: leftAt };
}
/* analyze 返回数组，取第一个物体的受力分析 */
function analyzeFirst(doc) {
  var arr = M.analyze(doc);
  return Array.isArray(arr) ? arr[0] : arr;
}

console.log('力学内核 · 基础');
ok('DT = 1/240 s', Math.abs(M.DT - 1 / 240) < 1e-15, 'DT=' + M.DT);
ok('预置数量 = 6', M.PRESETS.length === 6, '实际 ' + M.PRESETS.length);
ok('6 个预置 id 齐全', ['incline-static', 'incline-slide', 'incline-push', 'flat-pull',
  'ground-friction', 'ball-roll'].every(function (id) { return !!preset(id); }),
  M.PRESETS.map(function (p) { return p.id; }).join(','));

/* ---------- 1. 静摩擦判据 ---------- */
console.log('\n--- 1. 斜面静摩擦（θ=19°, μs=0.40）---');
(function () {
  var doc = docOf('incline-static');
  if (!doc) return ok('incline-static 可用', false);
  var s = surfOf(doc), b = bodyOf(doc);
  var th = s.angle * Math.PI / 180;
  var needed = b.mass * G * Math.sin(th);
  var limit = s.muStatic * b.mass * G * Math.cos(th);
  var a = analyzeFirst(doc);
  console.log('  理论 needed=' + needed.toFixed(4) + ' N   limit=' + limit.toFixed(4) +
    ' N   tan' + s.angle + '°=' + Math.tan(th).toFixed(4));
  console.log('  内核 needed=' + a.needed.toFixed(4) + ' N   limit=' + a.limit.toFixed(4) + ' N');
  ok('判定为静止', a.isStatic === true, 'isStatic=' + a.isStatic);
  near('沿面重力分量 = mg sinθ', a.needed, needed, 1.0);
  near('最大静摩擦 = μs·mg cosθ', a.limit, limit, 1.0);
  ok('静摩擦不超额 |f| ≤ μsN', Math.abs(a.f) <= a.limit + 1e-6,
    '|f|=' + a.f + ' limit=' + a.limit);
  near('静摩擦恰等于沿面分量', Math.abs(a.f), needed, 1.0);

  var r = runFor(doc, 2);
  var bb = r.bodies[0];
  ok('运行 2s 后仍静止（v≈0）', speedOf(bb) < 1e-5, 'v=' + speedOf(bb));
})();

/* ---------- 2. 斜面下滑 ---------- */
console.log('\n--- 2. 斜面下滑 a = g(sinθ − μk cosθ)（θ=30°）---');
(function () {
  var doc = docOf('incline-slide');
  if (!doc) return ok('incline-slide 可用', false);
  var s = surfOf(doc);
  var th = s.angle * Math.PI / 180;
  var want = G * (Math.sin(th) - s.muKinetic * Math.cos(th));
  var a = analyzeFirst(doc);
  var sm = runFor(doc, 0.2).summary()[0];
  console.log('  θ=' + s.angle + '°  μk=' + s.muKinetic + '  理论 a=' + want.toFixed(6) +
    '  内核 a=' + sm.a.toFixed(6));
  near('下滑加速度（summary）', sm.a, want, 1.0);
  ok('判定为滑动', a.isStatic === false, 'isStatic=' + a.isStatic);

  var r = runFor(doc, 0.5);
  var v = speedOf(r.bodies[0]);
  near('0.5s 后速率 ≈ a·t', v, want * 0.5, 5.0);
})();

/* ---------- 3. 水平面摩擦 ---------- */
console.log('\n--- 3. 水平面 a = μk·g（ground-friction）---');
(function () {
  var doc = docOf('ground-friction');
  if (!doc) return ok('ground-friction 可用', false);
  var s = surfOf(doc);
  if (!s) return ok('ground-friction 含水平面', false);
  var want = s.muKinetic * G;
  var sm = runFor(doc, 0.2).summary()[0];
  console.log('  μk=' + s.muKinetic + '  理论 |a|=' + want.toFixed(6) + '  内核 |a|=' + Math.abs(sm.a).toFixed(6));
  near('摩擦减速度', Math.abs(sm.a), want, 1.0);

  var r = M.createRun(doc);
  var v0 = speedOf(r.bodies[0]);
  var stopT = v0 / want;
  for (var i = 0; i < Math.round(stopT * 1.2 / M.DT); i++) r.step(1);
  var vEnd = speedOf(r.bodies[0]);
  console.log('  v0=' + v0.toFixed(4) + '  理论停下=' + stopT.toFixed(3) + 's  末速=' + vEnd.toFixed(4));
  ok('足够时间后基本停下', vEnd < 0.3, '末速=' + vEnd.toFixed(4));
})();

/* ---------- 4. 斜面小球 ---------- */
console.log('\n--- 4. 斜面小球：坡面段运动学（ball-roll）---');
(function () {
  var doc = docOf('ball-roll');
  if (!doc) return ok('ball-roll 可用', false);
  var s = surfOf(doc);
  var th = s.angle * Math.PI / 180;
  var aT = G * (Math.sin(th) - s.muKinetic * Math.cos(th));

  /* 实测：小球从初始位置出发，滑到离开坡面为止 */
  var r = M.createRun(doc);
  var b = r.bodies[0];
  var x0 = b.x, y0 = b.y;
  var leftAt = null, distAt = 0, vAt = 0;
  for (var i = 0; i < Math.round(6 / M.DT); i++) {
    r.step(1);
    if (!b.contact) {
      leftAt = r.time;
      distAt = Math.hypot(b.x - x0, b.y - y0);
      vAt = speedOf(b);
      break;
    }
  }
  ok('小球最终离开坡面（进入抛体）', leftAt !== null, '未离开');
  /* 核心断言：v² = 2·a·s，用实测位移反推 */
  var vWant = Math.sqrt(2 * aT * distAt);
  console.log('  离开坡面 t=' + (leftAt || 0).toFixed(2) + 's  沿坡位移=' + distAt.toFixed(4) + 'm' +
    '\n  实测 v=' + vAt.toFixed(4) + '  √(2as)=' + vWant.toFixed(4) +
    '  a=' + aT.toFixed(4));
  near('|v| 与 √(2·a·s) 自洽（运动学闭合）', vAt, vWant, 1.0);
  /* 时间也应对上：t = √(2s/a) */
  near('离面时间与 √(2s/a) 自洽', leftAt, Math.sqrt(2 * distAt / aT), 2.0);
})();

/* ---------- 5. 无摩擦能量守恒 ---------- */
console.log('\n--- 5. 无摩擦：v² = 2g·s·sinθ（能量守恒）---');
(function () {
  var doc = docOf('ball-roll');
  if (!doc) return ok('ball-roll 可用', false);
  var s = surfOf(doc);
  s.muKinetic = 0;
  s.muStatic = 0;
  var th = s.angle * Math.PI / 180;
  var r = M.createRun(doc);
  var b = r.bodies[0];
  var x0 = b.x, y0 = b.y;
  for (var i = 0; i < Math.round(6 / M.DT); i++) {
    r.step(1);
    if (!b.contact) break;
  }
  var dist = Math.hypot(b.x - x0, b.y - y0);
  var v = speedOf(b);
  var vWant = Math.sqrt(2 * G * dist * Math.sin(th));
  console.log('  位移=' + dist.toFixed(4) + 'm  实测 v=' + v.toFixed(4) +
    '  能量守恒预期=' + vWant.toFixed(4));
  near('无摩擦坡面段速率（能量守恒）', v, vWant, 1.0);
})();

/* ---------- 6. 积分器自洽 ---------- */
console.log('\n--- 6. 积分步进自洽（1s）---');
(function () {
  var doc = docOf('incline-slide');
  if (!doc) return ok('incline-slide 可用', false);
  var a = runFor(doc, 0.2).summary()[0].a;
  var r = runFor(doc, 1.0);
  var v = speedOf(r.bodies[0]);
  console.log('  a=' + a.toFixed(4) + '  v(1s)=' + v.toFixed(4) + '  a·t=' + a.toFixed(4));
  near('1s 后速率 ≈ a·t', v, a, 4.0);
})();

/* ---------- 7. 几何与接触 ---------- */
console.log('\n--- 7. 斜面几何与接触检测 ---');
(function () {
  var doc = docOf('incline-static');
  if (!doc) return ok('incline-static 可用', false);
  var s = surfOf(doc);
  var th = s.angle * Math.PI / 180;
  /* 内核约定：inclineOrigin(s) = (s.x − L·cosθ, s.y − L·sinθ) 是【坡底】；
       (s.x, s.y) 是【坡顶】；t=(cosθ, sinθ) 由坡顶指向坡底（即沿坡向下）。
       s ∈ [0, L] 是沿 t 从坡底量起的距离，与 findContact 的 along 一致。 */
  var o = M.inclineOrigin(s);
  var t = M.tangent(th), n = M.normal(th);
  var otherX = o.x + t.x * s.length, otherY = o.y + t.y * s.length;
  console.log('  origin=( ' + o.x.toFixed(3) + ',' + o.y.toFixed(3) + ' )   ← 坡底');
  console.log('  另一端=( ' + otherX.toFixed(3) + ',' + otherY.toFixed(3) + ' )   ← 应为 (s.x,s.y)');
  ok('origin + L·t 回到 (s.x,s.y)', Math.abs(otherX - s.x) < 1e-9 && Math.abs(otherY - s.y) < 1e-9,
    'end=(' + otherX.toFixed(6) + ',' + otherY.toFixed(6) + ')');
  ok('斜面确有坡度（两端高度差 > 0）', Math.abs(o.y - s.y) > 1e-6,
    'Δy=' + Math.abs(o.y - s.y).toFixed(4));
  ok('(s.x,s.y) 端高于 origin 端', s.y > o.y, 's.y=' + s.y.toFixed(3) + ' o.y=' + o.y.toFixed(3));
  ok('t 指向坡顶（y 分量 > 0）', t.y > 0, 't.y=' + t.y.toFixed(4));

  var a = analyzeFirst(doc);
  ok('物块初始处于接触状态', a.contact === true, 'contact=' + a.contact);

  /* 真实 body（含外接圆半径 r）必须命中接触 */
  var run = M.createRun(doc);
  var rb = run.bodies[0];
  ok('run 生成的 body 带外接圆半径', typeof rb.r === 'number' && rb.r > 0, 'r=' + rb.r);
  var cReal = M.findContact(rb, run.surfaces);
  ok('真实 body 位置判定为接触', !!cReal, 'snap=' + (cReal && cReal.snap));
  if (cReal) ok('接触吸附误差接近 0', Math.abs(cReal.snap) < 1e-6, 'snap=' + cReal.snap);

  /* 探针：坡面中点（坡底 + L/2·t）沿外法向偏移 r，应命中，along 应为 L/2 */
  var mid = { x: o.x + t.x * s.length * 0.5, y: o.y + t.y * s.length * 0.5 };
  var probe = { x: mid.x + n.x * rb.r, y: mid.y + n.y * rb.r, r: rb.r, mass: rb.mass, type: 'block' };
  var cMid = M.findContact(probe, run.surfaces);
  ok('坡面中点正上方判定为接触', !!cMid, 'along=' + (cMid && cMid.s));
  if (cMid) {
    near('中点 along = L/2', cMid.s, s.length / 2, 1.0);
    ok('接触法向 = 表面外法向',
      Math.abs(cMid.n.x - n.x) < 1e-6 && Math.abs(cMid.n.y - n.y) < 1e-6,
      'n=(' + cMid.n.x.toFixed(6) + ',' + cMid.n.y.toFixed(6) + ')');
  }

  /* 沿法向抬高 1 m，应判定不接触 */
  var far = { x: mid.x + n.x * (rb.r + 1), y: mid.y + n.y * (rb.r + 1), r: rb.r, mass: rb.mass, type: 'block' };
  ok('法向抬高 1m 后判定为不接触', !M.findContact(far, run.surfaces));

  /* 沿切向移出坡长范围，应判定不接触 */
  var off = {
    x: o.x + t.x * (s.length + 3) + n.x * rb.r,
    y: o.y + t.y * (s.length + 3) + n.y * rb.r,
    r: rb.r, mass: rb.mass, type: 'block'
  };
  ok('移出坡长范围判定为不接触', !M.findContact(off, run.surfaces));
})();

/* ---------- 8. 自由落体 ---------- */
console.log('\n--- 8. 自由落体 v = gt ---');
(function () {
  /* 把物块抬高后释放，检查 0.5s 后 v ≈ g·0.5 */
  var doc = docOf('incline-static');
  if (!doc) return ok('incline-static 可用', false);
  /* 移除斜面，纯自由落体 */
  doc.entities = doc.entities.filter(function (e) { return e.type !== 'incline'; });
  var r = M.createRun(doc);
  for (var i = 0; i < Math.round(0.5 / M.DT); i++) r.step(1);
  var v = speedOf(r.bodies[0]);
  console.log('  0.5s 后速率=' + v.toFixed(4) + '  理论=' + (G * 0.5).toFixed(4));
  near('自由落体 0.5s 速率', v, G * 0.5, 1.0);
})();

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(58));
if (fail === 0) {
  console.log('✓ 力学实验室自检全部通过：' + pass + ' 项断言');
} else {
  console.log('✗ 通过 ' + pass + ' 项，失败 ' + fail + ' 项：');
  problems.forEach(function (p) { console.log('   · ' + p); });
}
console.log('='.repeat(58));
process.exit(fail === 0 ? 0 : 1);
