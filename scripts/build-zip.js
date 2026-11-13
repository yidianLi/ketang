#!/usr/bin/env node
/**
 * build-zip.js — 零依赖离线打包（手写 ZIP：deflate + 中央目录）
 * ------------------------------------------------------------
 * 用法：
 *   node scripts/build-zip.js            只打包
 *   node scripts/build-zip.js --verify   打包 + 解压自检（CRC + 断链 + headless 冒烟）
 * 产物：
 *   dist/zhenli-offline-v<version>.zip
 *   dist/zhenli-offline-v<version>.zip.sha256
 *
 * 说明：PNG/woff2 等已压缩格式按 store(0) 存放，其余 deflate(8)；
 *       UTF-8 文件名（flag 0x0800）；固定 DOS 时间戳保证可重复构建。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const VERIFY = process.argv.includes('--verify');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version || '1.0.0';
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, `zhenli-offline-v${VERSION}.zip`);

/* ---------- ZIP 基础 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    /* 逐位生成：每次右移 1 位（写成 >>> 8 会得到一张全错的表，CRC 只跟自己一致） */
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xFFFFFFFF) >>> 0;
}
/* 独立实现（逐位运算，不查表）：用于交叉验证，防止查表版本写错却自证通过 */
function crc32Slow(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xEDB88320) >>> 0 : (c >>> 1) >>> 0;
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
/* 固定时间戳：2026-01-01 00:00:00（DOS 格式） */
const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

/* ---------- 收集文件（allowlist） ---------- */
const INCLUDE_ROOT = ['index.html', 'classroom.html', 'resource.html', 'knowledge.html',
  'subjects.html', 'quiz.html', 'ai-cases.html', 'terrain.html', 'circuit.html', 'mechanics.html', 'molecule.html',
  'formula.html', 'optics.html', '404.html', 'favicon.svg'];
const SKIP_DIR = /(^|[\\/])(\.git|node_modules|dist|desktop|scripts|\.workbuddy)([\\/]|$)/i;
const KEEP_AI = /(LICENSE|asset-cache|vendor|webfonts)/i;
const SKIP_FILE = /(^|[\\/])(SHM\.png|zcat-urls\.json)$/i;

function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  for (const name of fs.readdirSync(abs)) {
    const r = rel ? rel + '/' + name : name;
    if (SKIP_DIR.test(r)) continue;
    if (SKIP_FILE.test(r)) continue;
    const st = fs.statSync(path.join(ROOT, r));
    if (st.isDirectory()) walk(r, out);
    else out.push(r);
  }
}
function collectFiles() {
  const files = [];
  INCLUDE_ROOT.forEach(f => files.push(f));
  walk('css', files);
  walk('js', files);
  // assets：案例库首屏缩略图（65 张 jpg）。根目录的 shots/ 是开发期验证截图，不在此列。
  if (fs.existsSync(path.join(ROOT, 'assets'))) walk('assets', files);
  // ai-cases：全收，但排除 *.md（保留 LICENSE*）与顶层未知大文件
  (function walkAi(rel, out) {
    const abs = path.join(ROOT, rel);
    for (const name of fs.readdirSync(abs)) {
      const r = rel + '/' + name;
      if (SKIP_DIR.test(r)) continue;
      if (SKIP_FILE.test(r)) continue;
      const st = fs.statSync(path.join(ROOT, r));
      if (st.isDirectory()) walkAi(r, out);
      else if (/\.md$/i.test(name) && !/^LICENSE/i.test(name)) continue;
      else out.push(r);
    }
  })('ai-cases', files);
  return files;
}

/* ---------- 生成附带的说明文件 ---------- */
function usageText() {
  return [
    '简普 · 离线包 v' + VERSION,
    '================================================',
    '',
    '【怎么用】',
    '1. 解压本压缩包到任意文件夹（建议路径不要包含特殊字符）。',
    '2. 双击 index.html 即可在浏览器中离线使用，无需安装任何环境。',
    '3. 推荐使用 Chrome / Edge 浏览器。',
    '',
    '【包含什么】',
    '- 6 个互动实验室：地形 / 电路 / 力学 / 分子 / 数理公式 / 光学',
    '- 课堂工具箱 classroom.html：12 件课堂实操工具',
    '- 学科分级目录 subjects.html：五科 147 条互动演示，按年级分段',
    '- 资源库 resource.html（19 个直连可玩资源）· 随堂自测 quiz.html · 知识专题 knowledge.html',
    '- 案例库 ai-cases.html：69 个开源互动案例（依赖已本地化）',
    '',
    '【三条命令（可选，需要 Node.js >= 18）】',
    '- npm test        回归自检（7 套 / 1800+ 断言）',
    '- npm run check   全站断链体检',
    '- npm run zip     重新打包（开发目录下）',
    '',
    '【离线边界】',
    '- 仅「证明几何题」的页头插图由在线服务动态生成，其余全部离线可用。',
    '- 学生使用痕迹（点名名单、计分、单词进度）保存在浏览器 localStorage。',
    '',
    '生成时间：' + new Date().toISOString()
  ].join('\r\n');
}

/* ---------- 打包 ---------- */
function build() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = collectFiles().sort();
  // 附带说明 + 清单
  files.push('__usage__/使用说明.txt');

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let count = 0;

  files.forEach(rel => {
    let data;
    if (rel === '__usage__/使用说明.txt') data = Buffer.from(usageText(), 'utf8');
    else data = fs.readFileSync(path.join(ROOT, rel));

    const nameBuf = Buffer.from(rel.split(path.sep).join('/'), 'utf8');
    const store = /\.(png|jpe?g|gif|woff2?|ttf|mp3|zip|ico)$/i.test(rel) || data.length < 512;
    let method = 0, payload = data;
    if (!store) {
      try { payload = zlib.deflateRawSync(data, { level: 9 }); method = 8; }
      catch (e) { payload = data; method = 0; }
      if (payload.length >= data.length) { payload = data; method = 0; }
    }
    const crc = crc32(data);
    const flags = 0x0800;               // UTF-8 文件名

    localParts.push(Buffer.from([
      0x50, 0x4B, 0x03, 0x04,           // local file header
      ...u16(20), ...u16(flags), ...u16(method),
      ...u16(DOS_TIME), ...u16(DOS_DATE),
      ...u32(crc), ...u32(payload.length), ...u32(data.length),
      ...u16(nameBuf.length), ...u16(0)
    ]), nameBuf, payload);

    centralParts.push(Buffer.from([
      0x50, 0x4B, 0x01, 0x02,           // central directory
      ...u16(20), ...u16(20), ...u16(flags), ...u16(method),
      ...u16(DOS_TIME), ...u16(DOS_DATE),
      ...u32(crc), ...u32(payload.length), ...u32(data.length),
      ...u16(nameBuf.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0),
      ...u32(offset)
    ]), nameBuf);

    offset += 30 + nameBuf.length + payload.length;
    count++;
  });

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.from([
    0x50, 0x4B, 0x05, 0x06,
    ...u16(0), ...u16(0), ...u16(count), ...u16(count),
    ...u32(centralBuf.length), ...u32(offset), ...u16(0)
  ]);

  const zip = Buffer.concat([...localParts, centralBuf, eocd]);
  fs.writeFileSync(OUT, zip);
  const sha = crypto.createHash('sha256').update(zip).digest('hex');
  fs.writeFileSync(OUT + '.sha256', sha + '  ' + path.basename(OUT) + '\n');

  const mb = (zip.length / 1024 / 1024).toFixed(1);
  console.log(`✓ 打包完成：${path.relative(ROOT, OUT)}（${count} 个文件，${mb} MB）`);
  console.log(`  SHA256: ${sha.slice(0, 32)}…`);
  return zip;
}

/* ---------- 自检 ---------- */
function verify(zip) {
  console.log('--- 自检：CRC 校验 ---');
  // 逐条读取并校验
  let pos = 0, files = 0, bad = 0;
  while (pos < zip.length && zip.readUInt32LE(pos) === 0x04034B50) {
    const method = zip.readUInt16LE(pos + 8);
    const csize = zip.readUInt32LE(pos + 18);
    const usize = zip.readUInt32LE(pos + 22);
    const nlen = zip.readUInt16LE(pos + 26);
    const elen = zip.readUInt16LE(pos + 28);
    const name = zip.slice(pos + 30, pos + 30 + nlen).toString('utf8');
    const dataStart = pos + 30 + nlen + elen;
    let payload = zip.slice(dataStart, dataStart + csize);
    if (method === 8) payload = zlib.inflateRawSync(payload);
    const stored = zip.readUInt32LE(pos + 14);
    // 双重校验：查表实现 + 逐位实现都必须与写入值一致，避免「自己验自己」
    if (crc32(payload) !== stored || crc32Slow(payload) !== stored || payload.length !== usize) bad++;
    files++;
    pos = dataStart + csize;
  }
  if (bad) { console.error(`✗ ${bad} 个文件 CRC 不通过`); process.exit(1); }
  console.log(`✓ ${files} 个条目 CRC 全部通过`);

  console.log('--- 自检：解压 + 断链体检 ---');
  const tmp = path.join(require('os').tmpdir(), 'zhenli-zip-' + Date.now());
  // 用 Node 解压（避免依赖系统 unzip）
  pos = 0;
  while (pos < zip.length && zip.readUInt32LE(pos) === 0x04034B50) {
    const method = zip.readUInt16LE(pos + 8);
    const csize = zip.readUInt32LE(pos + 18);
    const nlen = zip.readUInt16LE(pos + 26);
    const elen = zip.readUInt16LE(pos + 28);
    const name = zip.slice(pos + 30, pos + 30 + nlen).toString('utf8');
    const dataStart = pos + 30 + nlen + elen;
    let payload = zip.slice(dataStart, dataStart + csize);
    if (method === 8) payload = zlib.inflateRawSync(payload);
    const dest = path.join(tmp, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, payload);
    pos = dataStart + csize;
  }
  const { spawnSync } = require('child_process');
  const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-pages.js'), '--root', tmp], { encoding: 'utf8' });
  console.log((check.stdout || '').trim().split(/\r?\n/).slice(-2).join('\n'));
  if (check.status !== 0) { console.error('✗ 解压副本存在断链'); process.exit(1); }

  console.log('--- 自检：headless 冒烟（可选）---');
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  const browser = candidates.find(p => fs.existsSync(p));
  if (!browser) { console.log('SKIP：未找到 Chrome/Edge，跳过冒烟'); }
  else {
    const indexHtml = path.join(tmp, 'index.html');
    const r = spawnSync(browser, ['--headless=new', '--disable-gpu', '--virtual-time-budget=3000',
      '--dump-dom', 'file:///' + indexHtml.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const dom = r.stdout || '';
    if (dom.includes('地形实验室') && dom.includes('课堂工具箱')) console.log('✓ index.html 冒烟通过（首页内容完整）');
    else { console.error('✗ 冒烟失败：页面内容缺失'); process.exit(1); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('✓ 临时目录已清理');
}

if (VERIFY) verify(build());
else build();
