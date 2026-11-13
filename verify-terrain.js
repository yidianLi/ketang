/* 数学层自检：直接在主上下文里跑（避免 vm 沙箱拖慢全局访问） */
global.window = global;
const fs = require('fs');
['core.js', 'raster.js', 'presets.js'].forEach(f => eval(fs.readFileSync(__dirname + '/js/terrain/' + f, 'utf8')));

const C = TerrainCore, R = TerrainRaster, P = TerrainPresets;
let fail = 0;
function check(name, cond, extra) {
  if (!cond) { fail++; console.log('  ✗', name, extra === undefined ? '' : extra); }
  else console.log('  ✓', name, extra === undefined ? '' : extra);
}

P.forEach(preset => {
  const st = preset.build();
  console.log('\n[' + preset.name + '] 范围 ' + st.size + 'm，元件 ' + st.peaks.length + ' 个');
  let t0 = Date.now();
  const g = R.buildGrid(st, 193);
  const dt = Date.now() - t0;
  check('高程范围合理', g.min > -50 && g.max > 200 && g.max < 2000,
    'min=' + g.min.toFixed(1) + ' max=' + g.max.toFixed(1) + ' 全量栅格 ' + dt + 'ms');
  check('有起伏', g.max - g.min > 100, 'relief=' + (g.max - g.min).toFixed(0) + 'm');

  // 性能断言：单次计时会被 JIT 预热不足 / GC / 机器负载打进红色，取 3 次最快值判定。
  // 阈值仍为 120ms —— 真实能力看得到，偶发抖动不再误报。
  R.buildGrid(st, 32);                      // 预热
  const dragTimes = [];
  for (let i = 0; i < 3; i++) {
    const t = Date.now();
    R.buildGrid(st, 97);
    dragTimes.push(Date.now() - t);
  }
  const gDrag = R.buildGrid(st, 97);        // 供后续等高线断言用同一档精度
  const dragBest = Math.min.apply(null, dragTimes);
  check('拖动档栅格够快', dragBest < 120,
    dragBest + 'ms @97²（3 次：' + dragTimes.join('/') + '）');

  const levels = R.levelsFor(g, st.interval, st.water, false);
  check('等高线层数正常', levels.length > 3 && levels.length < 40, levels.length + ' 层');
  t0 = Date.now();
  let total = 0, count = 0;
  levels.forEach(l => { const ls = R.contour(g, l); count += ls.length; ls.forEach(x => total += x.length); });
  check('等高线全部可追踪', count > 0 && total > 50, count + ' 条 / ' + total + ' 点，' + (Date.now() - t0) + 'ms');

  if (st.water > g.min && st.water < g.max) {
    const wl = R.contour(g, st.water);
    check('水面等值线', wl.length > 0, wl.length + ' 条');
  } else {
    console.log('  · 水面 ' + st.water + 'm 在图幅高程区间外，跳过水面检查');
  }

  if (st.section) {
    const prof = R.sectionProfile(g, st.section[0], st.section[1], 241);
    const hs = prof.points.map(p => p.h);
    check('剖面采样', prof.points.length >= 241,
      prof.points.length + ' 点，落差 ' + (Math.max(...hs) - Math.min(...hs)).toFixed(0) + 'm' +
      (prof.points.length > 241 ? '（含陡崖断点）' : ''));
  }
});

console.log('\n[单峰单调性]');
const st = {
  version: 3, size: 2000, centerX: 0, centerZ: 0, environment: 'plain', water: 145, snow: 900, interval: 100,
  peaks: [{ id: 'a', type: 'mountain', x: 0, z: 0, height: 900, width: 1400, length: 1400, shape: 0.3, detail: 0, seed: 2.1 }],
  section: [{ x: -900, z: 0 }, { x: 900, z: 0 }]
};
check('峰顶高于远处', C.sampleAt(st, 0, 0) > C.sampleAt(st, 900, 900) + 100,
  'peak=' + C.sampleAt(st, 0, 0).toFixed(1));
let mono = true;
for (let r = 30; r <= 900; r += 30) if (C.sampleAt(st, r, 0) > C.sampleAt(st, r - 30, 0) + 1) mono = false;
check('径向单调下降', mono);

console.log('\n[坡形对照] 500m 等高线的横向位置');
['uniform', 'concave', 'convex'].forEach(prof => {
  const s2 = JSON.parse(JSON.stringify(st));
  s2.peaks = [{ id: 's', type: 'slope', x: 0, z: 0, height: 700, width: 1200, length: 1600,
    shape: 0.5, detail: 0, rotation: 0, slopeBottomLevel: 185, slopeProfile: prof }];
  // 沿坡面中线从坡顶(185+515=700)向下找 500m 等值线所在位置
  let pos = [];
  for (let z = 800; z >= -800; z -= 4) if (Math.abs(C.sampleAt(s2, 0, z) - 500) < 3) pos.push(z);
  console.log('  ' + prof.padEnd(8), '500m 出现在 z =', pos.slice(0, 6).join(', '));
});

console.log('\n' + (fail ? '失败 ' + fail + ' 项' : '全部通过'));
process.exit(fail ? 1 : 0);
