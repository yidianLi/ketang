#!/usr/bin/env node
/**
 * 统一回归自检入口
 * ------------------------------------------------------------
 * 依次执行 6 套内核自检，汇总断言数并给出统一退出码。
 * 用法：  node scripts/test-all.js        或   npm test
 * 退出码：0 = 全部通过；1 = 有失败（便于 CI / 提交前钩子）
 *
 * 设计要点：
 * - 用 process.execPath 启动子进程，保证与当前 Node 版本一致（Windows 沙箱下无需额外配置 PATH）。
 * - 仅依赖 Node 内置模块，不引入任何第三方包，维持"零依赖"承诺。
 * - 汇总行从子进程输出中解析"通过/失败"数字，缺失时退化为 PASS/FAIL。
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { name: 'verify-terrain', label: '地形内核' },
  { name: 'verify-circuit', label: '电路内核' },
  { name: 'verify-mech', label: '力学内核' },
  { name: 'verify-mol', label: '分子内核' },
  { name: 'verify-formula', label: '公式内核' },
  { name: 'verify-optics', label: '光学内核' },
  { name: 'verify-classroom', label: '课堂工具' }
];

function extractCounts(out) {
  // 匹配 "633 通过 / 0 失败"、"36 通过 / 0 失败" 等
  const m = out.match(/(\d+)\s*通过\s*[\/／]\s*(\d+)\s*失败/);
  if (m) return { pass: Number(m[1]), fail: Number(m[2]), derived: false };
  // 匹配 "33 项断言"
  const a = out.match(/(\d+)\s*项断言/);
  if (a) return { pass: Number(a[1]), fail: 0, derived: false };
  // 兜底：按通过的 ✓ 记号计数（标注为估算，避免与显式数字混淆）
  const ticks = (out.match(/[✓✔]/g) || []).length;
  if (ticks > 0) return { pass: ticks, fail: 0, derived: true };
  return null;
}

function lastSummary(out) {
  const lines = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/通过|失败|PASS|FAIL|✓|✗/.test(lines[i])) return lines[i].slice(0, 60);
  }
  return lines[lines.length - 1] ? lines[lines.length - 1].slice(0, 60) : '';
}

let totalPass = 0;
let totalFail = 0;
let suitesFailed = 0;
let anyDerived = false;
const rows = [];

SUITES.forEach((suite, i) => {
  const file = path.join(ROOT, suite.name + '.js');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [file], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024
  });
  const ms = Date.now() - t0;
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0;
  const counts = extractCounts(out);
  if (counts) { totalPass += counts.pass; totalFail += counts.fail; if (counts.derived) anyDerived = true; }
  if (!ok) suitesFailed++;

  rows.push({
    idx: `${i + 1}/${SUITES.length}`,
    name: suite.name,
    label: suite.label,
    status: ok ? 'PASS' : 'FAIL',
    counts: counts ? `${counts.derived ? '~' : ''}${counts.pass}/${counts.fail}` : '-',
    ms,
    summary: lastSummary(out)
  });

  if (!ok) {
    console.error(`\n----- ${suite.name} 输出 -----\n${out.trim()}\n`);
  }
});

console.log('\n=== svgzhenli-clone 回归自检 ===');
console.log('序号   套件             说明       结果   通过/失败   耗时      摘要');
console.log('-'.repeat(96));
rows.forEach(r => {
  console.log(
    r.idx.padEnd(6) + r.name.padEnd(17) + r.label.padEnd(9) +
    r.status.padEnd(7) + r.counts.padEnd(11) + (r.ms + 'ms').padEnd(9) + r.summary
  );
});
console.log('-'.repeat(96));
console.log(`汇总：${SUITES.length} 套 / ${SUITES.length - suitesFailed} 通过 / ${suitesFailed} 失败` +
  (totalPass ? `  ·  断言 ${totalPass} 通过 / ${totalFail} 失败` : '') +
  (anyDerived ? '（~ 为按 ✓ 计数估算）' : ''));

process.exit(suitesFailed === 0 ? 0 : 1);
