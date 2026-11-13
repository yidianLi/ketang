/* ============================================================
   i18n-apply.js — 把案例页里的英文界面文案换成中文（v2）
   ------------------------------------------------------------
   为什么不用简单全局替换：这些案例是单文件应用，英文单词同时出现在
   CSS 类名、JS 变量、material-icons 连字名里，直接文本替换会把功能改坏。

   做法：按 <script>/<style> 边界把文件切成「标记段」和「代码段」，
   分段处理——
     标记段：只替换 标签之间的文本节点 / placeholder / title / aria-label
     代码段：只替换 引号里整串相等 的字面量（'Reset' → '重置'）
   全程整串精确匹配，不做子串替换，所以 'Reset' 不会误伤 'ResetBtn'。

   安全阀：处理完若长度变化超过 LIMIT，直接放弃写入并报错，
   避免「替换串里带 $ 触发 String.replace 特殊语义」这类事故把文件写坏。

   用法：
     node scripts/i18n-apply.js scripts/i18n/<name>.json <file...> [--dry]
   ============================================================ */
'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const files = args.filter(a => !a.startsWith('--'));
const dictPath = files.shift();
const LIMIT = 0.25;

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const missing = new Set();

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function has(k) { return Object.prototype.hasOwnProperty.call(dict, k); }

/* 标记段：文本节点 + 属性 */
function doMarkup(seg, stat) {
  let s = seg.replace(/>([^<>]+)</g, (m, inner) => {
    const t = inner.trim();
    if (!t || !has(t)) {
      if (t && /[A-Za-z]{3,}/.test(t)) missing.add(t);
      return m;
    }
    stat.n++;
    const lead = inner.match(/^\s*/)[0];
    const tail = inner.match(/\s*$/)[0];
    return '>' + lead + dict[t] + tail + '<';
  });

  s = s.replace(/(placeholder|title|aria-label)="([^"]*)"/g, (m, attr, val) => {
    const t = val.trim();
    if (!has(t)) return m;
    stat.n++;
    return attr + '="' + dict[t] + '"';
  });

  return s;
}

/* 代码段：整串相等的引号字面量 */
function doCode(seg, stat) {
  let s = seg;
  for (const k of Object.keys(dict)) {
    const zh = dict[k];
    for (const q of ["'", '"']) {
      const needle = q + k + q;
      if (!s.includes(needle)) continue;
      const before = s;
      s = s.split(needle).join(q + zh + q);
      if (s !== before) stat.n += (before.split(needle).length - 1);
    }
  }
  return s;
}

let grand = 0;
let fatal = false;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const pieces = [];
  let last = 0, m;
  while ((m = re.exec(src))) {
    pieces.push({ kind: 'markup', text: src.slice(last, m.index) });
    pieces.push({ kind: 'code', text: m[0] });
    last = m.index + m[0].length;
  }
  pieces.push({ kind: 'markup', text: src.slice(last) });

  const stat = { n: 0 };
  const out = pieces.map(p => (p.kind === 'markup' ? doMarkup(p.text, stat) : doCode(p.text, stat))).join('');

  const delta = Math.abs(out.length - src.length) / src.length;
  console.log((dry ? '[dry] ' : '') + f + '  替换 ' + stat.n + ' 处  体积 ' + src.length + ' → ' + out.length + ' (' + (delta * 100).toFixed(1) + '%)');

  if (delta > LIMIT) {
    console.error('  ✗ 变化超过 ' + (LIMIT * 100) + '%，已放弃写入（原文件未改动）');
    fatal = true;
    continue;
  }
  grand += stat.n;
  if (!dry) fs.writeFileSync(f, out);
}

console.log('\n合计替换 ' + grand + ' 处');
if (missing.size) {
  const rest = [...missing].filter(t => /[A-Za-z]{3,}/.test(t));
  if (rest.length) {
    console.log('\n未翻译的文本节点（人工确认是否为术语/图标名）：');
    rest.slice(0, 60).forEach(t => console.log('  · ' + t));
  }
}
process.exit(fatal ? 2 : 0);
