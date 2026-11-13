/* ============================================================
 * verify-optics.js — 光学内核自检（Node，零依赖）
 * 校验薄透镜成像公式、像性质、应用分类、光路求交与公式一致性。
 * 用法：node verify-optics.js
 * ============================================================ */
'use strict';
var path = require('path');
var Optics = require(path.join(__dirname, 'js', 'optics', 'core.js'));

var pass = 0, fail = 0, fails = [];
function ok(cond, msg) {
  if (cond) { pass++; }
  else { fail++; fails.push(msg); console.log('  ✗ ' + msg); }
}
function near(a, b, tol, msg) {
  ok(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', want ' + b + ', tol ' + tol + ')');
}

console.log('— 光学内核自检 optics-core-v1 —');

/* 1. 薄透镜成像 calc 数值 */
(function () {
  var f = 10;
  var c1 = Optics.calc(f, 30);
  ok(c1.v === 15 && Math.abs(c1.m + 0.5) < 1e-9 && c1.type === 'real' && c1.app === '照相机', 'u=30,f=10 → 实像 v=15 照相机');

  var c2 = Optics.calc(f, 20);
  ok(c2.v === 20 && Math.abs(c2.m + 1) < 1e-9 && c2.app === '测焦距', 'u=20,f=10 → 等大实像 v=20 测焦距');

  var c3 = Optics.calc(f, 15);
  ok(c3.v === 30 && Math.abs(c3.m + 2) < 1e-9 && c3.type === 'real' && c3.app === '投影仪', 'u=15,f=10 → 放大实像 v=30 投影仪');

  var c4 = Optics.calc(f, 8);
  ok(c4.v === -40 && c4.m === 5 && c4.type === 'virtual' && c4.app === '放大镜', 'u=8,f=10 → 虚像 v=-40 放大镜');

  var c5 = Optics.calc(f, 10);
  ok(c5.type === 'parallel' && c5.app === '探照灯 / 平行光', 'u=10,f=10 → 平行光不成像');

  var c6 = Optics.calc(f, 5);
  ok(c6.v === -10 && c6.m === 2 && c6.type === 'virtual', 'u=5,f=10 → 虚像 v=-10 放大2倍');
})();

/* 2. 薄透镜公式 1/u + 1/v = 1/f 一致性 */
(function () {
  var f = 12;
  [6, 9, 14, 18, 25, 40, 55].forEach(function (u) {
    var r = Optics.calc(f, u);
    var lhs = 1 / u + 1 / r.v;
    near(lhs, 1 / f, 1e-9, '公式一致 f=' + f + ' u=' + u + ' → 1/u+1/v=1/f');
  });
})();

/* 3. 像的性质文字 */
(function () {
  ok(Optics.nature(Optics.calc(10, 30)) === '倒立 缩小 实像', 'nature u=30 → 倒立 缩小 实像');
  ok(Optics.nature(Optics.calc(10, 20)) === '倒立 等大 实像', 'nature u=20 → 倒立 等大 实像');
  ok(Optics.nature(Optics.calc(10, 15)) === '倒立 放大 实像', 'nature u=15 → 倒立 放大 实像');
  ok(Optics.nature(Optics.calc(10, 8)).indexOf('正立 放大 虚像') >= 0, 'nature u=8 → 正立 放大 虚像');
  ok(Optics.nature(Optics.calc(10, 10)) === '不成像（平行光）', 'nature u=10 → 不成像（平行光）');
})();

/* 4. 光路求交 intersect 与 calc(v) 一致 */
(function () {
  var f = 10, cx = 400, cy = 300, pxPerCm = 15, fPx = f * pxPerCm, candleH = 92;
  [8, 12, 15, 20, 30, 50].forEach(function (u) {
    var ox = Optics.objX(cx, u, pxPerCm);
    var oy = cy - candleH;
    var it = Optics.intersect(fPx, cx, cy, ox, oy);
    var vPix = Optics.vFromX(it.ix, cx, pxPerCm);
    var r = Optics.calc(f, u);
    near(vPix, r.v, 1e-6, 'intersect v == calc v  (u=' + u + ')');
    ok(it.isReal === (r.v > 0), 'isReal 与 calc 类型一致 (u=' + u + ')');
  });
})();

/* 5. objX / vFromX 关系：vFromX 返回"相对透镜中心的带符号水平位移"，
      物体在透镜左侧 → 负；像在右侧 → 正（与 intersect 得到的 ix 一致） */
(function () {
  var cx = 400, pxPerCm = 15;
  [5, 12, 23.4, 47].forEach(function (u) {
    var ox = Optics.objX(cx, u, pxPerCm);
    near(Optics.vFromX(ox, cx, pxPerCm), -u, 1e-9, 'objX→vFromX = -u（物体在透镜左侧）u=' + u);
  });
})();

/* 6. 放大率符号 → 倒立/正立 */
(function () {
  ok(Optics.calc(10, 30).m < 0, '实像 m<0（倒立）');
  ok(Optics.calc(10, 8).m > 0, '虚像 m>0（正立）');
})();

console.log('');
console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.log('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
else { console.log('✓ 光学内核全部断言通过'); }
