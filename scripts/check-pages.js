#!/usr/bin/env node
/**
 * 全站链接体检
 * ------------------------------------------------------------
 * 扫描顶层页面里的本地 href / src，校验目标文件是否存在；
 * 对带 #锚点 的链接，额外校验目标文件中存在对应 id。
 * 用法：node scripts/check-pages.js
 * 退出码：0 = 无断链；1 = 存在断链（便于提交前检查）
 *
 * 说明：由 JS 动态拼接的路径（如 ai-cases.html 的 'ai-cases/' + p）
 *       无法静态解析，本脚本只校验字面量引用。
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* 支持 --root <dir>：校验任意目录（用于打包自检），默认为项目根 */
const rootArg = (() => {
  const i = process.argv.indexOf('--root');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
})();

const ROOT = rootArg ? path.resolve(rootArg) : path.resolve(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const ATTR_RE = /(?:href|src)\s*=\s*"([^"]+)"/g;
const SKIP = /^(?:https?:|data:|mailto:|tel:|javascript:|blob:|#)/i;

/** 去掉 <script>...</script> 与 <style>...</style> 内容，
 *  避免把 JS 拼接出的 href="..." 模板串当成静态引用误报 */
function stripDynamic(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, '<script></script>')
             .replace(/<style\b[\s\S]*?<\/style>/gi, '<style></style>');
}

const cache = new Map();
function readPage(abs) {
  if (!cache.has(abs)) cache.set(abs, fs.readFileSync(abs, 'utf8'));
  return cache.get(abs);
}
function hasId(abs, id) {
  const s = readPage(abs);
  const re = new RegExp('id\\s*=\\s*["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
  return re.test(s);
}

const problems = [];
let checked = 0;

for (const page of pages) {
  const abs = path.join(ROOT, page);
  const html = stripDynamic(readPage(abs));
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(html))) {
    const raw = m[1].trim();
    if (!raw || SKIP.test(raw)) continue;
    if (raw.includes('${')) continue; // 跳过模板字符串残留

    checked++;
    const hashIdx = raw.indexOf('#');
    const filePart = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
    const anchor = hashIdx >= 0 ? raw.slice(hashIdx + 1) : '';

    if (filePart === '') { // 纯锚点，指向自身
      if (anchor && !hasId(abs, anchor)) {
        problems.push(`${page} -> #${anchor}（当前页无此 id）`);
      }
      continue;
    }

    let target;
    try {
      target = path.resolve(path.dirname(abs), decodeURI(filePart));
    } catch (e) {
      problems.push(`${page} -> ${raw}（URL 编码非法）`);
      continue;
    }

    if (!fs.existsSync(target)) {
      problems.push(`${page} -> ${raw}（文件不存在）`);
      continue;
    }
    if (anchor && target.endsWith('.html') && !hasId(target, anchor)) {
      problems.push(`${page} -> ${raw}（目标页无 id=${anchor}）`);
    }
  }
}

console.log(`\n=== 链接体检：${pages.length} 个顶层页面，${checked} 个本地引用 ===`);
if (problems.length === 0) {
  console.log('✓ 未发现断链');
  process.exit(0);
}
console.log(`✗ 发现 ${problems.length} 处问题：`);
problems.forEach(p => console.log('  - ' + p));
process.exit(1);
