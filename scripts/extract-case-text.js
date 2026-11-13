/**
 * 抽取 ai-cases.html 里 CASES 数组指向的每个案例页面文本，
 * 作为撰写「题目式题干」的素材。输出 scripts/.case-text.md
 *
 * 用法：node scripts/extract-case-text.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'ai-cases.html');
const CASES_DIR = path.join(ROOT, 'ai-cases');

const html = fs.readFileSync(SRC, 'utf8');
const m = html.match(/var CASES = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('未找到 CASES 数组'); process.exit(1); }
const CASES = eval(m[1]);

function clean(s) {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(re, s) {
  const x = s.match(re);
  return x ? clean(x[1]) : '';
}

const out = [];
const missing = [];

CASES.forEach((c, i) => {
  const rel = c.p.split('#')[0];
  const fp = path.join(CASES_DIR, rel);
  const rec = { i: i + 1, title: c.n, cat: c.c, src: c.s, path: c.p, tech: c.tech.join('/') };
  if (!fs.existsSync(fp)) { missing.push(c.p); out.push({ ...rec, error: 'MISSING' }); return; }
  const h = fs.readFileSync(fp, 'utf8');
  rec.doctitle = pick(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i, h);
  rec.h1 = pick(/<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i, h);
  rec.h2 = (h.match(/<h2[^>]*>([\s\S]{0,200}?)<\/h2>/gi) || [])
    .slice(0, 4).map(x => clean(x)).join(' | ');
  rec.desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]{0,300}?)["']/i, h);
  const body = clean(h.replace(/[\s\S]*?<body[^>]*>/i, ''));
  rec.head = body.slice(0, 420);
  out.push(rec);
});

const lines = [];
lines.push('# 案例题干素材（自动抽取）\n');
lines.push(`共 ${CASES.length} 条，缺失 ${missing.length} 条\n`);
out.forEach(r => {
  lines.push(`## ${r.i}. ${r.title}  \`${r.cat}\` · ${r.src} · ${r.tech}`);
  lines.push(`- 路径：\`${r.path}\``);
  if (r.error) { lines.push('- ⚠️ 文件缺失\n'); return; }
  if (r.doctitle) lines.push(`- title：${r.doctitle}`);
  if (r.h1) lines.push(`- h1：${r.h1}`);
  if (r.h2) lines.push(`- h2：${r.h2}`);
  if (r.desc) lines.push(`- desc：${r.desc}`);
  if (r.head) lines.push(`- 首屏文本：${r.head}`);
  lines.push('');
});

fs.writeFileSync(path.join(__dirname, '.case-text.md'), lines.join('\n'), 'utf8');
console.log(`已输出 ${out.length} 条，缺失 ${missing.length} 条`);
if (missing.length) console.log('缺失：', missing);
