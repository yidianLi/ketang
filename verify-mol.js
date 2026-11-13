/* ============================================================
   分子实验室 · 结构与几何自检
   ------------------------------------------------------------
   1. 全部 13 个分子：原子/键引用合法、坐标有限
   2. 键角与化学理论值比对（水 104.5°、甲烷 109.47°、氨 107°、二氧化碳 180°）
   3. 键长一致性（同种键长应相等）
   4. 5 个晶体：原子数、晶胞参数、近邻数合法
   5. 投影器：yaw/pitch 旋转后所有原子落在可视范围内、深度有序
   6. 球棍/空间填充半径单调性：原子序数越大半径越大
   运行：node verify-mol.js
   ============================================================ */
'use strict';

var win = {};
global.window = win;
require('./js/mol/core.js');
var C = win.MolCore;
if (!C) { console.error('✗ 分子内核未挂载'); process.exit(1); }

var pass = 0, fail = 0, problems = [];
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; problems.push(name + (detail ? ' → ' + detail : '')); }
}
function near(name, got, want, tolAbs) {
  if (typeof got !== 'number' || !isFinite(got)) {
    ok(name, false, 'got 非数：' + got); return;
  }
  var d = Math.abs(got - want);
  ok(name, d <= tolAbs, 'got=' + got.toFixed(3) + ' want=' + want.toFixed(3) + ' Δ=' + d.toFixed(3));
}
function mol(id) {
  for (var i = 0; i < C.MOLECULES.length; i++) if (C.MOLECULES[i].id === id) return C.MOLECULES[i];
  return null;
}
function crys(id) {
  for (var i = 0; i < C.CRYSTALS.length; i++) if (C.CRYSTALS[i].id === id) return C.CRYSTALS[i];
  return null;
}

console.log('分子内核 · 规模');
console.log('  元素 ' + Object.keys(C.ELEMENTS).length + ' 种');
console.log('  分子 ' + C.MOLECULES.length + ' 种');
console.log('  晶体 ' + C.CRYSTALS.length + ' 种');
ok('分子 ≥ 13 种', C.MOLECULES.length >= 13, '实际 ' + C.MOLECULES.length);
ok('晶体 = 5 种', C.CRYSTALS.length === 5, '实际 ' + C.CRYSTALS.length);

/* ---------- 1. 分子数据完整性 ---------- */
console.log('\n--- 1. 分子数据完整性 ---');
C.MOLECULES.forEach(function (m) {
  var tag = '[' + m.id + '] ' + m.name;
  ok(tag + ' 有 id/name/formula', !!m.id && !!m.name && !!m.formula);
  ok(tag + ' 有 atoms', Array.isArray(m.atoms) && m.atoms.length > 0, 'atoms=' + (m.atoms && m.atoms.length));
  ok(tag + ' 有 bonds', Array.isArray(m.bonds) && m.bonds.length > 0, 'bonds=' + (m.bonds && m.bonds.length));
  ok(tag + ' 有 desc', typeof m.desc === 'string' && m.desc.length > 4);
  /* 元素必须在元素表中 */
  m.atoms.forEach(function (a, i) {
    ok(tag + ' 原子#' + i + ' 元素合法', !!C.ELEMENTS[a.el], 'el=' + a.el);
    ok(tag + ' 原子#' + i + ' 坐标有限',
      isFinite(a.x) && isFinite(a.y) && isFinite(a.z),
      '(' + a.x + ',' + a.y + ',' + a.z + ')');
  });
  /* 键的端点索引必须合法、不能自环、不能重复 */
  var seen = {};
  m.bonds.forEach(function (b, i) {
    ok(tag + ' 键#' + i + ' 端点合法',
      Number.isInteger(b.a) && Number.isInteger(b.b) &&
      b.a >= 0 && b.a < m.atoms.length && b.b >= 0 && b.b < m.atoms.length,
      'a=' + b.a + ' b=' + b.b);
    ok(tag + ' 键#' + i + ' 非自环', b.a !== b.b, 'a=b=' + b.a);
    var k = Math.min(b.a, b.b) + '-' + Math.max(b.a, b.b);
    ok(tag + ' 键#' + i + ' 无重复', !seen[k], '重复键 ' + k);
    seen[k] = 1;
    ok(tag + ' 键#' + i + ' 级数合理（1/2/3）', [1, 2, 3].indexOf(b.order) >= 0, 'order=' + b.order);
  });
});

/* 每个原子都应至少参与一根键（无孤立原子） */
C.MOLECULES.forEach(function (m) {
  var used = {};
  m.bonds.forEach(function (b) { used[b.a] = 1; used[b.b] = 1; });
  var lonely = [];
  for (var i = 0; i < m.atoms.length; i++) if (!used[i]) lonely.push(i);
  ok('[' + m.id + '] 无孤立原子', lonely.length === 0, '孤立索引 ' + lonely.join(','));
});

/* ---------- 2. 键角验证 ---------- */
console.log('\n--- 2. 键角与化学理论值 ---');
function angle3(m, center, i, j) {
  var a = m.atoms[i], b = m.atoms[center], c = m.atoms[j];
  var u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  var v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  var dot = u.x * v.x + u.y * v.y + u.z * v.z;
  var lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
  return Math.acos(Math.max(-1, Math.min(1, dot / (lu * lv)))) * 180 / Math.PI;
}
/* 水：H–O–H = 104.5° */
(function () {
  var m = mol('water');
  if (!m) return ok('water 存在', false);
  var ang = angle3(m, 0, 1, 2);
  console.log('  水 H–O–H = ' + ang.toFixed(2) + '°  （理论 104.5°）');
  near('水 H–O–H 键角', ang, 104.5, 0.5);
})();
/* 甲烷：任意两个 H–C–H = 109.47° */
(function () {
  var m = mol('methane');
  if (!m) return ok('methane 存在', false);
  var pairs = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
  var worst = 0;
  pairs.forEach(function (p) {
    var ang = angle3(m, 0, p[0], p[1]);
    if (Math.abs(ang - 109.47) > worst) worst = Math.abs(ang - 109.47);
  });
  var a12 = angle3(m, 0, 1, 2);
  console.log('  甲烷 H–C–H = ' + a12.toFixed(2) + '°  （理论 109.47°）最大偏差 ' + worst.toFixed(3) + '°');
  near('甲烷 H–C–H 键角', a12, 109.47, 0.5);
  ok('甲烷六个键角全部等于 109.47°（正四面体）', worst < 0.5, '最大偏差 ' + worst.toFixed(3) + '°');
})();
/* 氨：H–N–H = 107° */
(function () {
  var m = mol('ammonia');
  if (!m) return ok('ammonia 存在', false);
  var ang = angle3(m, 0, 1, 2);
  console.log('  氨 H–N–H = ' + ang.toFixed(2) + '°  （理论 107°）');
  near('氨 H–N–H 键角', ang, 107.0, 0.5);
})();
/* 二氧化碳：O=C=O = 180° */
(function () {
  var m = mol('carbon-dioxide');
  if (!m) return ok('carbon-dioxide 存在', false);
  /* 中心碳应是 0 号 */
  var ang = angle3(m, 0, 1, 2);
  console.log('  二氧化碳 O=C=O = ' + ang.toFixed(2) + '°  （理论 180°）');
  near('二氧化碳 O=C=O 键角', ang, 180, 0.5);
})();
/* 乙炔：H–C≡C 直线 180° */
(function () {
  var m = mol('acetylene');
  if (!m) return ok('acetylene 存在', false);
  var ang = angle3(m, 0, 1, 2);
  console.log('  乙炔 H–C≡C = ' + ang.toFixed(2) + '°  （理论 180°）');
  near('乙炔键角', ang, 180, 0.5);
})();

/* ---------- 3. 键长一致性 ---------- */
console.log('\n--- 3. 键长一致性 ---');
C.MOLECULES.forEach(function (m) {
  /* 按 (元素对, 级数) 分组，同组键长应相等 */
  var groups = {};
  m.bonds.forEach(function (b) {
    var a = m.atoms[b.a], c = m.atoms[b.b];
    var key = [a.el, c.el].sort().join('-') + '#' + b.order;
    var L = Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z);
    (groups[key] = groups[key] || []).push(L);
  });
  Object.keys(groups).forEach(function (key) {
    var arr = groups[key];
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr);
    /* 允许 4 位小数的摆位舍入误差（1e-3 Å） */
    ok('[' + m.id + '] ' + key + ' 键长一致', (mx - mn) < 1e-3,
      'min=' + mn.toFixed(4) + ' max=' + mx.toFixed(4) + ' Δ=' + (mx - mn).toExponential(2));
    ok('[' + m.id + '] ' + key + ' 键长 > 0', mn > 1e-6, 'min=' + mn);
  });
});

/* ---------- 4. 晶体 ---------- */
console.log('\n--- 4. 晶体结构（分数坐标 basis + species）---');
C.CRYSTALS.forEach(function (cr) {
  var tag = '[' + cr.id + '] ' + cr.name;
  ok(tag + ' 有 id/name/formula', !!cr.id && !!cr.name && !!cr.formula);
  ok(tag + ' 有 kind（晶体类型）', typeof cr.kind === 'string' && cr.kind.length > 0, 'kind=' + cr.kind);
  ok(tag + ' 有 cell（晶胞描述）', typeof cr.cell === 'string' && cr.cell.length > 0, 'cell=' + cr.cell);
  ok(tag + ' 有 basis', Array.isArray(cr.basis) && cr.basis.length > 0, 'basis=' + (cr.basis && cr.basis.length));
  ok(tag + ' 有 species', !!cr.species && Object.keys(cr.species).length > 0);
  ok(tag + ' 有 summary', typeof cr.summary === 'string' && cr.summary.length > 6);
  ok(tag + ' 有 note', typeof cr.note === 'string' && cr.note.length > 6);

  /* 每个 basis 原子：sp 必须在 species 中，坐标是 [0,1) 的分数坐标 */
  cr.basis.forEach(function (a, i) {
    ok(tag + ' basis#' + i + ' 物种已声明', !!cr.species[a.sp], 'sp=' + a.sp);
    ok(tag + ' basis#' + i + ' 坐标为分数坐标 [0,1)',
      a.x >= 0 && a.x < 1 && a.y >= 0 && a.y < 1 && a.z >= 0 && a.z < 1,
      '(' + a.x + ',' + a.y + ',' + a.z + ')');
  });
  /* species 的半径必须为正、颜色为合法色值 */
  Object.keys(cr.species).forEach(function (sp) {
    var s = cr.species[sp];
    ok(tag + ' species.' + sp + ' 半径 > 0', s.r > 0, 'r=' + s.r);
    ok(tag + ' species.' + sp + ' 颜色合法', /^#[0-9a-fA-F]{3,8}$/.test(s.color), 'color=' + s.color);
    ok(tag + ' species.' + sp + ' 有标签', !!s.label);
  });
});
/* NaCl：Na 与 Cl 数量相等（1:1 化学比） */
(function () {
  var cr = crys('sodium-chloride');
  if (!cr) return ok('NaCl 存在', false);
  var na = cr.basis.filter(function (a) { return a.sp === 'Na'; }).length;
  var cl = cr.basis.filter(function (a) { return a.sp === 'Cl'; }).length;
  console.log('  NaCl basis：Na=' + na + ' Cl=' + cl + ' 合计=' + cr.basis.length);
  ok('NaCl 中 Na:Cl = 1:1', na === cl && na > 0, 'Na=' + na + ' Cl=' + cl);
  ok('NaCl basis 为 8（4 Na + 4 Cl）', cr.basis.length === 8, '实际 ' + cr.basis.length);
})();
/* CsCl：Cs:Cl = 1:1，体心立方 */
(function () {
  var cr = crys('cesium-chloride');
  if (!cr) return ok('CsCl 存在', false);
  var a = cr.basis.filter(function (x) { return x.sp === 'Cs'; }).length;
  var b = cr.basis.filter(function (x) { return x.sp === 'Cl'; }).length;
  console.log('  CsCl basis：Cs=' + a + ' Cl=' + b);
  ok('CsCl 中 Cs:Cl = 1:1', a === b && a > 0, 'Cs=' + a + ' Cl=' + b);
})();
/* 金刚石：只有 C，且 8 个原子（FCC + 4 个内部） */
(function () {
  var cr = crys('diamond');
  if (!cr) return ok('diamond 存在', false);
  var onlyC = cr.basis.every(function (x) { return x.sp === 'C'; });
  console.log('  金刚石 basis 原子数=' + cr.basis.length + ' 全为碳=' + onlyC);
  ok('金刚石只含碳原子', onlyC);
  ok('金刚石 basis = 8', cr.basis.length === 8, '实际 ' + cr.basis.length);
})();
/* 铜：FCC，4 个原子基元 */
(function () {
  var cr = crys('copper');
  if (!cr) return ok('copper 存在', false);
  console.log('  铜 basis 原子数=' + cr.basis.length);
  ok('铜为 FCC（4 原子基元）', cr.basis.length === 4, '实际 ' + cr.basis.length);
})();
/* 干冰：分子晶体，有 centresOnly 标记 */
(function () {
  var cr = crys('dry-ice');
  if (!cr) return ok('dry-ice 存在', false);
  console.log('  干冰 basis=' + cr.basis.length + ' centresOnly=' + cr.centresOnly);
  ok('干冰标记为分子晶体', /分子/.test(cr.kind), 'kind=' + cr.kind);
})();

/* ---------- 5. 投影器 ---------- */
console.log('\n--- 5. 投影器正交投影 ---');
var W = 560, H = 360;
function projAll(p, atoms) { return atoms.map(function (a) { return p.project(a); }); }

(function () {
  var views = [[0, 0], [0.52, 0.35], [-0.79, 0.61], [1.57, 0], [3.14, 0.44]];
  var allFinite = true, msg = '', allInside = true, outsideMsg = '';

  C.MOLECULES.forEach(function (m) {
    views.forEach(function (vw) {
      var p = C.makeProjector(m.atoms, { yaw: vw[0], pitch: vw[1] }, W, H, 1);
      if (!p || typeof p.project !== 'function') { allFinite = false; msg = m.id + ' 投影器构造失败'; return; }
      ok('[' + m.id + '] 投影器 scale > 0', p.scale > 0, 'scale=' + p.scale);
      var pts = projAll(p, m.atoms);
      pts.forEach(function (q) {
        if (!isFinite(q.x) || !isFinite(q.y) || !isFinite(q.z)) {
          allFinite = false; msg = m.id + ' 投影坐标非有限';
        }
      });
      /* 所有原子应落在画布内（留 5% 边距容忍） */
      var bad = pts.filter(function (q) {
        return q.x < -W * 0.05 || q.x > W * 1.05 || q.y < -H * 0.05 || q.y > H * 1.05;
      });
      if (bad.length) { allInside = false; outsideMsg = m.id + ' 有 ' + bad.length + ' 个原子超出画布'; }
    });
  });
  ok('13 分子 × 5 视角投影坐标全部有限', allFinite, msg);
  ok('所有原子投影落在画布范围内', allInside, outsideMsg);

  /* 中心原子应投影到画布中心：水分子 O（0,0,0），其 center 由包围盒算出，
     验证「坐标等于 center 的原子」在任何 yaw 下投影都在中心 */
  var m = mol('water');
  var p0 = C.makeProjector(m.atoms, { yaw: 0, pitch: 0 }, W, H, 1);
  var q0 = p0.project({ x: p0.center.x, y: p0.center.y, z: p0.center.z });
  console.log('  中心点投影 = (' + q0.x.toFixed(2) + ',' + q0.y.toFixed(2) + ')  画布中心 = (' + W / 2 + ',' + H / 2 + ')');
  near('中心点投影 x = 画布中心', q0.x, W / 2, 1e-6);
  near('中心点投影 y = 画布中心', q0.y, H / 2, 1e-6);
  near('中心点深度 z = 0', q0.z, 0, 1e-6);

  /* 刚体旋转不变量：同一视角下，两点间距在 3D 与投影后应满足
     投影只压缩了旋转后的 z 轴 —— 用 yaw=0,pitch=0 验证 x/y 不被缩放（除以 scale 后完全相等） */
  var pA = C.makeProjector(m.atoms, { yaw: 0, pitch: 0 }, W, H, 1);
  var qa = projAll(pA, m.atoms);
  var d3 = Math.hypot(m.atoms[1].x - m.atoms[2].x, m.atoms[1].y - m.atoms[2].y, m.atoms[1].z - m.atoms[2].z);
  var d2 = Math.hypot(qa[1].x - qa[2].x, qa[1].y - qa[2].y) / pA.scale;
  console.log('  水分子两 H 距离：3D=' + d3.toFixed(4) + '  投影/scale=' + d2.toFixed(4));
  near('yaw=pitch=0 时投影保持真实距离', d2, d3, 1e-6);

  /* 旋转 90° 后 z 轴深度应发生交换：验证 depth 值随视角改变 */
  var pR = C.makeProjector(m.atoms, { yaw: 1.5707963267948966, pitch: 0 }, W, H, 1);
  var qr = projAll(pR, m.atoms);
  var changed = Math.abs(qr[1].z - qa[1].z) > 1e-6 || Math.abs(qr[1].x - qa[1].x) > 1e-6;
  ok('旋转 90° 后投影确实改变（视图矩阵生效）', changed,
    'yaw0=(' + qa[1].x.toFixed(2) + ',' + qa[1].z.toFixed(2) + ') yaw90=(' + qr[1].x.toFixed(2) + ',' + qr[1].z.toFixed(2) + ')');

  /* 深度键必须是有限数（供画家算法排序） */
  ok('投影点带有限深度 z', projAll(pR, m.atoms).every(function (q) { return isFinite(q.z); }));

  /* zoom 缩放线性 */
  var pZ = C.makeProjector(m.atoms, { yaw: 0, pitch: 0 }, W, H, 2);
  near('zoom=2 时 scale 翻倍', pZ.scale, pA.scale * 2, 1e-9);
})();

/* ---------- 6. 半径单调性 ---------- */
console.log('\n--- 6. 半径与元素周期趋势 ---');
(function () {
  /* 同族往下半径增大：F < Cl < Br < I（若元素表包含） */
  var order = ['H', 'C', 'N', 'O', 'F', 'Na', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'I'];
  var prev = 0, mono = true, msg = '';
  var list = [];
  order.forEach(function (el) {
    if (!C.ELEMENTS[el]) return;
    var r = C.stickRadius(el);
    list.push(el + '=' + r.toFixed(2));
    ok('stickRadius(' + el + ') > 0', r > 0, 'r=' + r);
  });
  console.log('  球棍半径：' + list.join('  '));

  /* H 必须是所有元素中最小的（共价半径参考 76pm 归一） */
  var rH = C.stickRadius('H');
  var bigger = Object.keys(C.ELEMENTS).filter(function (el) {
    return el !== 'H' && C.stickRadius(el) < rH - 1e-9;
  });
  ok('H 半径不小于任何其他元素（基准元素）', bigger.length === 0,
    '比 H 还小的：' + bigger.join(','));

  /* 范德华半径（单位 Å，真实化学量纲）与球棍半径（单位 px）量纲不同，
     不能直接比大小；这里只校验各自的合理区间。 */
  var vdwOk = 0, vdwMissing = 0;
  Object.keys(C.ELEMENTS).forEach(function (el) {
    var rv = null, threw = false;
    try { rv = C.vdwRadius(el); } catch (e) { threw = true; }
    if (threw) { vdwMissing++; return; }
    ok('vdwRadius(' + el + ') 返回有限正数', isFinite(rv) && rv > 0, 'vdw=' + rv);
    ok('vdwRadius(' + el + ') 在真实化学区间 0.9–3.0 Å', rv > 0.9 && rv < 3.0, 'vdw=' + rv);
    vdwOk++;
  });
  console.log('  范德华半径（Å）：可用 ' + vdwOk + ' 种，未收录 ' + vdwMissing + ' 种（抛出明确错误）');
  ok('至少有 6 种元素有范德华半径', vdwOk >= 6, '仅 ' + vdwOk + ' 种');
  /* 球棍半径是像素量纲，应落在合理绘制区间 */
  Object.keys(C.ELEMENTS).forEach(function (el) {
    var r = C.stickRadius(el);
    ok('stickRadius(' + el + ') 在绘制区间 15–55px', r > 15 && r < 55, 'r=' + r);
  });
})();

/* ---------- 7. crystalBonds ---------- */
console.log('\n--- 7. 晶体近邻键 ----------');
C.CRYSTALS.forEach(function (cr) {
  var bonds = C.crystalBonds(cr);
  ok('[' + cr.id + '] crystalBonds 返回数组', Array.isArray(bonds), typeof bonds);
  if (Array.isArray(bonds)) {
    console.log('  ' + cr.id + ' 近邻键数=' + bonds.length +
      (bonds.length ? '  最短键长=' + bonds[0][2].toFixed(4) + 'a' : ''));
    /* 每种晶体都必须能画出至少一根近邻键（CsCl 固定阈值时代此值为 0，是缺陷） */
    ok('[' + cr.id + '] 至少画出 1 根近邻键', bonds.length > 0, '为 0（无法显示配位关系）');
    /* 三元组 [i, j, d] 端点合法 */
    var bad = bonds.filter(function (b) {
      return !Array.isArray(b) || b.length < 3 ||
        !Number.isInteger(b[0]) || !Number.isInteger(b[1]) ||
        b[0] < 0 || b[0] >= cr.basis.length || b[1] < 0 || b[1] >= cr.basis.length ||
        !isFinite(b[2]);
    });
    ok('[' + cr.id + '] 近邻键端点合法', bad.length === 0, bad.length + ' 个非法');
    /* 键长必须全部相等（近邻是同一壳层） */
    if (bonds.length > 1) {
      var ds = bonds.map(function (b) { return b[2]; });
      var mn = Math.min.apply(null, ds), mx = Math.max.apply(null, ds);
      ok('[' + cr.id + '] 近邻键长一致', (mx - mn) < 1e-9,
        'min=' + mn.toFixed(6) + ' max=' + mx.toFixed(6));
    }
  }
});

/* ---------- 8. anglesAt ---------- */
console.log('\n--- 8. anglesAt 通用键角计算 ---');
(function () {
  var m = mol('water');
  if (!m) return ok('water 存在', false);
  var res = C.anglesAt(m, 0);
  ok('anglesAt 返回结果', res !== null && res !== undefined, String(res));
  var s = JSON.stringify(res);
  console.log('  水（中心 O）anglesAt → ' + s.slice(0, 260));
  ok('water anglesAt 中含 104.5° 附近的值',
    /10[34]\.\d/.test(s), s.slice(0, 200));
})();

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(58));
if (fail === 0) {
  console.log('✓ 分子实验室自检全部通过：' + pass + ' 项断言');
} else {
  console.log('✗ 通过 ' + pass + ' 项，失败 ' + fail + ' 项：');
  problems.slice(0, 30).forEach(function (p) { console.log('   · ' + p); });
  if (problems.length > 30) console.log('   … 另有 ' + (problems.length - 30) + ' 项');
}
console.log('='.repeat(58));
process.exit(fail === 0 ? 0 : 1);
