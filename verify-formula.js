/* ============================================================
   公式实验室 · 数值与排版自检
   ------------------------------------------------------------
   检查项：
   1. 31 条公式全部能被 MiniTeX 解析并排版出有限宽度
   2. 每条公式的 calc() 在默认参数下返回合法读数
   3. 抽样公式的数值与手算理论值比对（误差 < 0.5%）
   4. 每条公式的 draw() 在假 Canvas 上下文中不抛异常
   运行：node verify-formula.js
   ============================================================ */
'use strict';

/* ---- 共享 window 桩：先建好再按序加载两个模块 ---- */
var win = {};
global.window = win;

/* 假 Canvas 2D 上下文：记录调用次数，不抛异常 */
function FakeCtx() {
  var self = this;
  this.calls = 0;
  var noop = function () { self.calls++; };
  ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse',
    'rect', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText',
    'strokeText', 'translate', 'rotate', 'scale', 'setLineDash', 'quadraticCurveTo',
    'bezierCurveTo', 'arcTo', 'clip', 'drawImage', 'setTransform', 'resetTransform'
  ].forEach(function (k) { self[k] = noop; });
  this.measureText = function (s) {
    self.calls++;
    if (s == null) s = '';
    return { width: String(s).length * 10 };
  };
  this.createLinearGradient = function () {
    return { addColorStop: function () {} };
  };
  this.createRadialGradient = this.createLinearGradient;
  /* 属性 */
  this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1;
  this.font = '16px sans-serif'; this.textAlign = 'left'; this.textBaseline = 'alphabetic';
  this.globalAlpha = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
}

require('./js/formula/tex.js');
require('./js/formula/data.js');

var MiniTeX = win.MiniTeX;
var FC = win.FormulaCore;

var pass = 0, fail = 0, problems = [];
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; problems.push(name + (detail ? ' → ' + detail : '')); }
}

if (!MiniTeX) { console.error('✗ MiniTeX 未挂载'); process.exit(1); }
if (!FC) { console.error('✗ FormulaCore 未挂载'); process.exit(1); }

var DB = FC.DB;
console.log('公式条目数：' + DB.length + '（主表 28 + 近代物理扩展 3）');
ok('条目数为 31', DB.length === 31, '实际 ' + DB.length);

/* 主表权威清单：id → 名称，逐条核对 */
var ORIGINAL = {
  'average-speed': '平均速率', 'average-velocity': '平均速度',
  'acceleration-definition': '加速度定义', 'uniform-average': '匀变速运动平均速度',
  'velocity-compose': '运动的合成', 'vertical-throw': '竖直上抛',
  'oblique-projectile': '斜抛运动', 'density': '密度',
  'force-compose': '力的合成', 'force-components': '力的正交分解',
  'force-equilibrium': '共点力平衡', 'newton-first': '牛顿第一定律',
  'newton-third': '牛顿第三定律', 'apparent-weight': '升降机与超重失重',
  'static-friction': '静摩擦力', 'incline-components': '斜面上重力分解',
  'torque': '力矩与力臂', 'lever': '杠杆平衡', 'pulley': '理想滑轮组',
  'pulley-efficiency': '滑轮组机械效率', 'incline-efficiency': '斜面机械效率',
  'mechanical-efficiency': '机械效率', 'spring-energy': '弹性势能',
  'gravity-work': '重力做功', 'momentum-conservation': '动量守恒',
  'angular-displacement': '平均角速度', 'orbital-speed': '圆轨道卫星速度',
  'escape-speed': '第二宇宙速度'
};

/* ---------- 1 + 2 + 4：逐条遍历 ---------- */
var ctx = new FakeCtx();
var idSeen = {}, catCount = {};
DB.forEach(function (e, i) {
  var tag = '[#' + i + ' ' + (e.id || '无id') + '] ' + (e.name || '');
  ok(tag + ' 有 id', !!e.id);
  ok(tag + ' id 唯一', !idSeen[e.id], '重复 id');
  idSeen[e.id] = 1;
  catCount[e.cat] = (catCount[e.cat] || 0) + 1;

  /* 排版 */
  var L = null;
  try { L = MiniTeX.tex(e.tex, 22); }
  catch (err) { ok(tag + ' 排版不抛异常', false, err.message); return; }
  ok(tag + ' 排版宽度有限', L && isFinite(L.w) && L.w > 0, L && ('w=' + L.w));
  ok(tag + ' 排版有高度', L && isFinite(L.asc) && isFinite(L.desc), L && ('asc=' + L.asc + ' desc=' + L.desc));
  /* 宽度合理性：不应出现 0 宽或极端异常（例如未解析记号被吃光） */
  ok(tag + ' 宽度合理(>8px)', L && L.w > 8, L && ('w=' + L.w));

  /* 绘制 */
  try { L.draw(ctx, 0, 0, 1); }
  catch (err) { ok(tag + ' 公式绘制不抛异常', false, err.message); }

  /* 数据完整性 */
  ok(tag + ' 有 vars', Array.isArray(e.vars) && e.vars.length > 0);
  ok(tag + ' 有 calc', typeof e.calc === 'function');
  ok(tag + ' 有 note', typeof e.note === 'string' && e.note.length > 0);

  /* calc 默认参数 */
  var v = {};
  (e.vars || []).forEach(function (va) { v[va.k] = va.def; });
  var R = null;
  try { R = e.calc(v); }
  catch (err) { ok(tag + ' calc 不抛异常', false, err.message); return; }
  ok(tag + ' calc 返回数组', Array.isArray(R) && R.length > 0, typeof R);
  /* calc 的每个返回值：数值必须有限；字符串（如状态描述）视为合法 */
  if (Array.isArray(R)) {
    R.forEach(function (x, j) {
      var good = (typeof x === 'number' && isFinite(x)) ||
        (typeof x === 'string' && x.length > 0 && x !== 'undefined' && x.indexOf('NaN') < 0);
      ok(tag + ' calc#' + j + ' 为有限数或状态文本', good, '值=' + x);
    });
  }
  /* reads 定义与 calc 返回值数量必须一致 */
  ok(tag + ' reads 数量与 calc 对齐',
    Array.isArray(e.reads) && Array.isArray(R) && e.reads.length === R.length,
    'reads=' + (e.reads && e.reads.length) + ' calc=' + (R && R.length));
  if (Array.isArray(e.reads)) {
    e.reads.forEach(function (r, j) {
      ok(tag + ' 读数#' + j + ' 有 label', typeof r.label === 'string' && r.label.length > 0, 'label=' + r.label);
      ok(tag + ' 读数#' + j + ' 有 unit 字段', r.unit !== undefined, 'unit=' + r.unit);
    });
  }

  /* 示意图：签名与 app.js 一致 draw(ctx, vals, calcResult) */
  if (typeof e.draw === 'function') {
    var before = ctx.calls;
    try {
      e.draw(ctx, v, R);
    } catch (err) {
      ok(tag + ' 示意图不抛异常', false, err.message);
    }
    ok(tag + ' 示意图确实绘制了内容', ctx.calls > before, '无绘制调用');
  }
});

/* ---------- 3：抽样数值比对 ---------- */
function near(name, got, want, tolPct) {
  var d = Math.abs(got - want) / (Math.abs(want) || 1) * 100;
  ok(name, d <= tolPct, 'got=' + got + ' want=' + want + ' err=' + d.toFixed(3) + '%');
}
function byId(id) {
  for (var i = 0; i < DB.length; i++) if (DB[i].id === id) return DB[i];
  return null;
}
function defs(e) {
  var v = {}; e.vars.forEach(function (va) { v[va.k] = va.def; }); return v;
}
/* 用首读数的数值来核对 */
function firstNum(e, over) {
  var v = defs(e);
  if (over) for (var k in over) v[k] = over[k];
  var R = e.calc(v);
  var n = parseFloat(String(R[0].value).replace(/[^\d.\-eE]/g, ''));
  return n;
}

console.log('\n--- 抽样数值核对 ---');

/* v = s/t ：s1=6, s2=0, t=3 → 2 m/s */
(function () {
  var e = byId('average-speed');
  if (!e) return;
  var v = defs(e);
  v.s1 = 6; v.s2 = 0; v.t = 3;
  near('平均速率 average-speed', e.calc(v)[0], 2, 0.5);
})();

/* a=(v-v0)/t ：v0=0, v=6, t=3 → 2 m/s² */
(function () {
  var e = byId('acceleration-definition');
  if (!e) return;
  var v = defs(e);
  v.v0 = 0; v.v = 6; v.t = 3;
  near('加速度加速度加速度 ' + e.id, e.calc(v)[0], 2, 0.5);
})();

/* 竖直上抛：v0=12 → 回到起点用时 2v0/g = 2.449s，最大高度 v0²/2g = 7.347m */
(function () {
  var e = byId('vertical-throw');
  if (!e) return;
  var v = defs(e);
  v.v0 = 12;
  var R = e.calc(v);
  near('竖直上抛 用时', R[0], 2 * 12 / 9.8, 0.5);
  near('竖直上抛 最大高度', R[1], 12 * 12 / (2 * 9.8), 0.5);
})();

/* 弹性势能 Ep=½kx²：k=100, x=0.15 → 1.125 J */
(function () {
  var e = byId('spring-energy');
  if (!e) return;
  var v = defs(e);
  v.k = 100; v.x = 0.15;
  near('弹性势能', e.calc(v)[0], 1.125, 0.5);
})();

/* 重力做功 W=mg(h1-h2)：m=2, h1=6, h2=2 → 78.4 J */
(function () {
  var e = byId('gravity-work');
  if (!e) return;
  var v = defs(e);
  v.m = 2; v.h1 = 6; v.h2 = 2;
  near('重力做功', e.calc(v)[0], 78.4, 0.5);
})();

/* 斜面机械效率 η=Gh/(Fs)：G=20,h=1,F=12,s=3 → 0.5556 */
(function () {
  var e = byId('incline-efficiency');
  if (!e) return;
  var v = defs(e);
  v.G = 20; v.h = 1; v.F = 12; v.s = 3;
  near('斜面机械效率', e.calc(v)[0], 20 / 36, 0.5);
})();

/* 圆轨道卫星速度 v=√(GM/r)：M=1 M⊕、r=6.671 千km（近地）→ 约 7.73 km/s */
(function () {
  var e = byId('orbital-speed');
  if (!e) return;
  var v = defs(e);
  v.M = 1; v.r = 6.671;
  var R = e.calc(v);
  var wantKmS = Math.sqrt(6.6743e-11 * 5.9722e24 / 6.671e6) / 1000;
  near('近地圆轨道速率(km/s)', R[0], wantKmS, 1.0);
  /* 近地轨道周期约 84.5 min */
  var rm = 6.671e6, aa = Math.sqrt(6.6743e-11 * 5.9722e24 / rm);
  near('近地轨道周期(min)', R[1], 2 * Math.PI * rm / aa / 60, 1.0);
})();

/* 光子能量 E=hν：ν=5×10¹⁴ → 2.0678 eV */
(function () {
  var e = byId('photon-energy');
  if (!e) return;
  var v = defs(e);
  v.nu = 5;
  var R = e.calc(v);
  var h = 6.62607015e-34, ec = 1.602176634e-19;
  near('光子能量 eV', R[0], h * 5e14 / ec, 0.5);
  near('光子对应波长 nm', R[1], 299792458 / 5e14 * 1e9, 0.5);
})();

/* ---------- 分类覆盖 + 与权威清单逐条对齐 ---------- */
console.log('\n--- 分类分布 ---');
FC.CATS.forEach(function (c) {
  console.log('  ' + c + '：' + (catCount[c] || 0) + ' 条');
});
ok('分类都有条目', FC.CATS.every(function (c) { return (catCount[c] || 0) > 0; }),
  JSON.stringify(catCount));

console.log('\n--- 与主表 30 条逐条对齐 ---');
Object.keys(ORIGINAL).forEach(function (id) {
  var e = byId(id);
  ok('条目存在: ' + id, !!e);
  if (e) ok('条目名称匹配: ' + id, e.name === ORIGINAL[id] || e.name.indexOf(ORIGINAL[id]) === 0,
    'got=' + e.name + ' want=' + ORIGINAL[id]);
});
  /* 反向：库内条目必须是「主表 30 条」或「近代物理扩展 3 条」之一 */
  var EXTRA = { 'photon-energy': 1, 'photoelectric-cutoff': 1, 'mass-defect': 1 };
  DB.forEach(function (e) {
    ok('库内条目来源可追溯: ' + e.id, !!(ORIGINAL[e.id] || EXTRA[e.id]), '既非主表也非扩展分组');
    if (EXTRA[e.id]) ok('扩展条目分类为近代物理: ' + e.id, e.cat === '近代物理', 'cat=' + e.cat);
  });

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(58));
if (fail === 0) {
  console.log('✓ 公式实验室自检全部通过：' + pass + ' 项断言');
} else {
  console.log('✗ 通过 ' + pass + ' 项，失败 ' + fail + ' 项：');
  problems.slice(0, 40).forEach(function (p) { console.log('   · ' + p); });
  if (problems.length > 40) console.log('   … 另有 ' + (problems.length - 40) + ' 项');
}
console.log('='.repeat(58));
process.exit(fail === 0 ? 0 : 1);
