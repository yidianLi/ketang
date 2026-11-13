#!/usr/bin/env node
/**
 * gen-tongjiang.js — 把铜匠实验室（tongjiang-lab）的课程并入四科学科目录
 * ------------------------------------------------------------
 * 数据源：ai-cases/tongjiang/catalog.json（来自 smithjohn78390/tongjiang-lab，CC BY-NC 4.0）
 * 做三件事：
 *   1) 解析 catalog.json，按 textbook 字段把每门课映射到年级档（高一/高二/高三）；
 *   2) 在 vm 里执行现有 data/{physics,chemistry,biology,geography}.js 拿到 SUBJECT，
 *      把铜匠条目合并进对应年级（已有年级追加到末尾，没有的年级新建追加），
 *      序列化写回原文件（JSON.stringify 的产物本身就是合法的对象字面量）；
 *   3) 更新 subjects.js 的 count 与 hint。
 *
 * 用法：node scripts/gen-tongjiang.js   （重跑安全：合并来源始终是磁盘上的旧文件 + catalog）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HUB = path.join(ROOT, 'ai-cases', 'hub');
const TJ = path.join(ROOT, 'ai-cases', 'tongjiang');
const catalog = JSON.parse(fs.readFileSync(path.join(TJ, 'catalog.json'), 'utf8'));

/* ---------- 教材册 → 年级档 / 分组名 ---------- */
function gradeOf(t0) {
  const s = t0.replace(/\s+/g, '');
  if (/选择性必修(第三册|3)/.test(s)) return '高三';
  if (/选择性必修(第二册|2)/.test(s)) return '高二';
  if (/选择性必修(第一册|1)/.test(s)) return '高二';
  if (/必修第三册/.test(s)) return '高二';
  return '高一'; // 必修第一册 / 第二册 / 必修1 / 必修2
}
function groupOf(t0) {
  const m = t0.replace(/\s+/g, '').match(/^(选择性必修第[一二三]册|选择性必修[1-3]|必修第[一二三]册|必修[1-2])/);
  return m ? m[1] : '3D 课程';
}

/* ---------- catalog → 条目（按学科、按年级分桶） ---------- */
const BUCKET = { physics: {}, chemistry: {}, biology: {}, geography: {} };
let count = 0;
catalog.forEach(c => {
  const sub = { chem: 'chemistry', phys: 'physics', bio: 'biology', geo: 'geography' }[c.subject];
  if (!sub) { console.warn('未知学科', c.subject, c.slug); return; }
  const t0 = (c.textbook && c.textbook[0]) || '';
  const grade = gradeOf(t0);
  const steps = c.steps || [];
  const d = c.question
    + (steps.length ? `（${steps.length} 步：${steps.slice(0, 3).join('→')}${steps.length > 3 ? '→…' : ''}）` : '');
  const item = {
    k: 'tj-' + c.slug,
    kind: 'lab',
    group: groupOf(t0),
    t: c.title,
    f: '../tongjiang/courses/' + path.basename(c.file || c.slug + '.html'),
    src: '铜匠实验室',
    d
  };
  (BUCKET[sub][grade] = BUCKET[sub][grade] || []).push(item);
  count++;
});
console.log('catalog 解析：' + count + ' 门');
for (const sub in BUCKET) {
  console.log('  ' + sub + '：' + Object.entries(BUCKET[sub]).map(([g, a]) => g + ' ' + a.length).join(' / '));
}

/* ---------- 合并进各科数据文件（幂等：先剔除已接入的 tj 条目再合并） ---------- */
const SUBJ_KEYS = ['physics', 'chemistry', 'biology', 'geography'];
const GRADE_ORDER = ['初一', '初二', '初三', '高一', '高二', '高三', '专题'];
/* 生成器新建年级档的定位副标题——幂等重跑也不会丢 */
const GRADE_HINTS = {
  biology: { '高一': '必修1 · 分子与细胞', '高二': '选择性必修1 · 稳态与调节' },
  geography: { '高一': '必修一 · 自然地理基础', '高二': '选择性必修1 · 自然地理', '高三': '选择性必修3 · 资源与国家安全' }
};
const counts = {};
SUBJ_KEYS.forEach(key => {
  const file = path.join(HUB, 'data', key + '.js');
  const srcText = fs.readFileSync(file, 'utf8');

  // 保留文件头部注释块
  const headerMatch = srcText.match(/^\/\*[\s\S]*?\*\//);
  const header = headerMatch ? headerMatch[0] : '';

  const ctx = { window: {} };
  vm.runInNewContext(srcText, ctx);
  const S = ctx.window.SUBJECT;

  // 幂等：去掉上一轮接入的条目，只保留手工策展内容
  S.grades.forEach(g => {
    g.items = g.items.filter(it => it.kind !== 'lab' && !/^tj-/.test(it.k));
  });
  S.grades = S.grades.filter(g => g.items.length > 0 || !/^g-tj-/.test(g.id));

  const buckets = BUCKET[key];
  Object.keys(buckets).forEach(grade => {
    let g = S.grades.find(x => x.label === grade);
    if (!g) {
      g = { id: 'g-tj-' + grade, label: grade, hint: '3D 互动课', items: [] };
      S.grades.push(g);
    }
    g.items = g.items.concat(buckets[grade]);
  });

  // 年级档固定顺序（Object.keys 的桶序会把高二排到高一前面）
  S.grades.sort((a, b) => GRADE_ORDER.indexOf(a.label) - GRADE_ORDER.indexOf(b.label));
  // 新建年级档套用定位副标题
  Object.keys(GRADE_HINTS[key] || {}).forEach(label => {
    const g = S.grades.find(x => x.label === label);
    if (g) g.hint = GRADE_HINTS[key][label];
  });

  const out = header + '\n\nwindow.SUBJECT = ' + JSON.stringify(S, null, 2) + ';\n';
  fs.writeFileSync(file, out);
  counts[key] = S.grades.reduce((n, g) => n + g.items.length, 0);
  console.log(key + ' → ' + counts[key] + ' 条，写入 ' + path.relative(ROOT, file));
});

/* ---------- subjects.js 对账 ---------- */
const REG = path.join(HUB, 'subjects.js');
let regText = fs.readFileSync(REG, 'utf8');
SUBJ_KEYS.forEach(key => {
  const re = new RegExp("(key: '" + key + "',[\\s\\S]*?count: )(\\d+)");
  regText = regText.replace(re, '$1' + counts[key]);
});
fs.writeFileSync(REG, regText);
console.log('subjects.js 计数已更新：' + JSON.stringify(counts));
