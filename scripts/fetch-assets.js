// 一次性脚本：下载插图 + 改写 src（幂等，执行后保留备查）
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'ai-cases');
const cache = path.join(dir, 'asset-cache');
if (!fs.existsSync(cache)) fs.mkdirSync(cache);

const urls = JSON.parse(fs.readFileSync(path.join(__dirname, 'zcat-urls.json'), 'utf8'));
const ok = [], bad = [];
for (const u of urls) {
  const name = u.split('/').pop().replace(/[?&=]/g, '_');
  const dest = path.join(cache, name);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
    try {
      execFileSync('curl', ['-sL', '--max-time', '40', '-o', dest, u], { stdio: 'pipe' });
    } catch (e) { /* ignore */ }
  }
  const good = fs.existsSync(dest) && fs.statSync(dest).size > 1000 && (function () {
    const b = fs.readFileSync(dest);
    return b.slice(1, 4).toString() === 'PNG' || (b[0] === 0xFF && b[1] === 0xD8) /* JPEG */;
  })();
  (good ? ok : bad).push(name);
}
console.log('downloaded ok:', ok.length, 'bad:', bad, bad.length ? bad : '');

// 改写 src
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let total = 0;
for (const f of files) {
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const u of urls) {
    const name = u.split('/').pop().replace(/[?&=]/g, '_');
    if (!ok.includes(name)) continue;
    const rel = 'asset-cache/' + name;
    if (s.includes(u)) { s = s.split(u).join(rel); n++; }
  }
  if (n) { fs.writeFileSync(p, s); total += n; console.log(f, '->', n); }
}
console.log('rewritten refs total:', total);
