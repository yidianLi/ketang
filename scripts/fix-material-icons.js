/* ============================================================
   fix-material-icons.js — 把连字图标换成码点 + 接本地字体
   ------------------------------------------------------------
   背景：ElectroLab / OLED Studio 用 Material Symbols 的「连字」写法
   （<span class="material-symbols-outlined">delete</span>），字体由
   fonts.googleapis.com 在线加载。离线打开时字体缺失，图标位置直接
   漏出 "delete" 这类英文单词，整个界面看着像坏了。

   做法：
     1) 把 span 里的图标名换成对应码点实体（&#xE872;），不再依赖 liga；
     2) 注入 <link> 指向本地 ai-cases/webfonts/ms-icons.css（子集字体 60KB）；
     3) 记录仍未映射的图标名，人工确认。
   用法：node scripts/fix-material-icons.js <file...>
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const MAP = require('./.icon-codepoints.json');
const CSS_REL = '../webfonts/ms-icons.css';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node scripts/fix-material-icons.js <file...>');
  process.exit(1);
}

const unknown = new Set();
let total = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let hits = 0;

  /* 1) 连字 → 码点 */
  src = src.replace(
    /(class="material-(?:symbols-outlined|symbols-rounded|symbols-sharp|icons)[^"]*"[^>]*>)(\s*)([a-z0-9_]+)(\s*)(<\/span>)/g,
    (m, open, ws1, name, ws2, close) => {
      const cp = MAP[name];
      if (!cp) { unknown.add(name); return m; }
      hits++;
      return open + '&#x' + cp.toString(16).toUpperCase() + ';' + close;
    }
  );

  /* 2) 本地字体样式表（只插一次，放在第一个 <style> 或 </head> 之前） */
  if (!src.includes('ms-icons.css')) {
    const link = '<link rel="stylesheet" href="' + CSS_REL + '">\n';
    if (src.includes('</head>')) src = src.replace('</head>', link + '</head>');
    else src = link + src;
    hits++;
  }

  total += hits;
  fs.writeFileSync(f, src);
  console.log(path.basename(f) + '  处理 ' + hits + ' 处');
}

console.log('\n合计 ' + total + ' 处');
if (unknown.size) console.log('未映射的图标名（需补子集）:', [...unknown].join(', '));
