#!/usr/bin/env node
/**
 * 学科分级目录体检
 * ------------------------------------------------------------
 * 1) 读 ai-cases/hub/data/*.js，统计每个学科的题目数；
 * 2) 与 ai-cases/hub/subjects.js 里写的 count 对账，不一致直接失败；
 * 3) 逐条校验条目里的 f（演示页路径）在磁盘上真实存在（忽略 ?query 与 #hash）；
 * 4) 校验每个 tab 内条目 key 唯一、同一年级内不重名。
 *
 * 用法：node scripts/check-hubs.js
 * 退出码：0 = 通过；1 = 有问题
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HUB = path.join(ROOT, 'ai-cases', 'hub');
const DATA = path.join(HUB, 'data');

const problems = [];
const info = [];

/* ---------- 学科清单 ---------- */
const ctxRegistry = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(HUB, 'subjects.js'), 'utf8'), ctxRegistry);
const REGISTRY = ctxRegistry.window.HUB_SUBJECTS || [];
if (!REGISTRY.length) problems.push('subjects.js 没有导出 HUB_SUBJECTS');

const byKey = new Map(REGISTRY.map(s => [s.key, s]));

/* ---------- 逐个数据文件 ---------- */
const files = fs.readdirSync(DATA).filter(f => f.endsWith('.js')).sort();
files.forEach(file => {
  const key = path.basename(file, '.js');
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(DATA, file), 'utf8'), ctx);
  const S = ctx.window.SUBJECT;
  if (!S) { problems.push(file + ' 没有导出 SUBJECT'); return; }

  const baseDir = path.join(ROOT, 'ai-cases', key + 'learn');
  const pagePath = path.join(baseDir, 'index.html');
  if (!fs.existsSync(pagePath)) problems.push(key + '：缺少 ' + path.relative(ROOT, pagePath));

  const keys = new Set();
  let total = 0;
  const gradeInfo = [];

  S.grades.forEach(g => {
    const names = new Set();
    g.items.forEach(it => {
      total++;
      if (!it.k) problems.push(key + ' / ' + g.label + '：有条目缺 k');
      if (keys.has(it.k)) problems.push(key + '：key 重复 ' + it.k);
      keys.add(it.k);
      if (names.has(it.t)) problems.push(key + ' / ' + g.label + '：标题重复 ' + it.t);
      names.add(it.t);
      if (!it.d) problems.push(key + ' / ' + it.t + '：缺「想一想」文案');

      /* 路径存在性：去掉 ?query / #hash 后按目录解析 */
      const raw = String(it.f || '').split(/[?#]/)[0];
      const abs = path.resolve(baseDir, decodeURIComponent(raw));
      if (!fs.existsSync(abs)) problems.push(key + ' / ' + it.t + '：找不到文件 ' + it.f);
    });
    gradeInfo.push(g.label + ' ' + g.items.length);
  });

  const reg = byKey.get(key);
  if (!reg) problems.push('subjects.js 里没有学科 ' + key);
  else if (reg.count !== total) problems.push(key + '：subjects.js 写 ' + reg.count + ' 题，实际 ' + total + ' 题');
  else if (reg.href !== '../' + key + 'learn/index.html') problems.push(key + '：subjects.js 的 href 不对（' + reg.href + '）');

  info.push(key + '（' + S.name + '）：' + total + ' 题 — ' + gradeInfo.join(' / '));
});

/* ---------- 数学：章节模块 + 拓展条目都写在自己的页面里 ---------- */
(function checkMath(){
  const p = path.join(ROOT, 'ai-cases', 'mathlearn', 'index.html');
  if (!fs.existsSync(p)) { problems.push('缺少 ai-cases/mathlearn/index.html'); return; }
  const html = fs.readFileSync(p, 'utf8');
  const mods = (html.match(/data-target="module-/g) || []).length;
  const ext = (html.match(/\{\s*k:'/g) || []).length;
  const total = mods + ext;
  const reg = byKey.get('math');
  if (reg && reg.count !== total) problems.push('math：subjects.js 写 ' + reg.count + ' 题，实际 ' + total + ' 题（' + mods + ' 章节 + ' + ext + ' 拓展）');
  info.push('math（数学）：' + total + ' 题 — ' + mods + ' 个互动章节 + ' + ext + ' 道拓展题');
})();

/* ---------- 输出 ---------- */
console.log('学科分级目录体检');
console.log('='.repeat(56));
info.forEach(l => console.log('  ' + l));
console.log('='.repeat(56));
console.log('学科数：' + (files.length + 1) + '（含数学）；总题数：' + info.reduce((n, l) => n + (+l.split('：')[1].split(' 题')[0]), 0));

if (problems.length) {
  console.log('\n发现 ' + problems.length + ' 个问题：');
  problems.forEach(p => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('✓ 全部通过：题数与 subjects.js 一致，演示页路径全部存在');
