/**
 * 内嵌页横向溢出扫描
 * ------------------------------------------------------------
 * 把学科目录里所有 iframe 演示页在「目录右侧内容区」的宽度下打开，
 * 检查是否有元素横向溢出视口（scrollWidth > clientWidth）。
 * 用法：node scripts/scan-embeds.js [宽度]    默认 900（≈1440 屏下内容区宽度）
 */
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const W = +(process.argv[2] || 900);
const PORT = 9300 + (process.pid % 300);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((s, j) => {
  http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { s(JSON.parse(d)); } catch (e) { j(e); } }); }).on('error', j);
});

/* 收集所有演示页（含查询串，因为不同参数对应不同题面） */
function collect() {
  const list = [];
  const DATA = path.join(ROOT, 'ai-cases', 'hub', 'data');
  fs.readdirSync(DATA).filter(f => f.endsWith('.js')).forEach(file => {
    const key = path.basename(file, '.js');
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(DATA, file), 'utf8'), ctx);
    const base = path.join(ROOT, 'ai-cases', key + 'learn');
    ctx.window.SUBJECT.grades.forEach(g => g.items.forEach(it => {
      if (it.newwin) return;
      list.push({ key: key + ' / ' + it.t, abs: path.resolve(base, it.f) });
    }));
  });
  return list;
}

(async () => {
  const pages = collect();
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
    '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(os.tmpdir(), 'se-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  let ver;
  for (let i = 0; i < 60; i++) { try { ver = await getJson(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(200); } }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  const send = (method, params = {}, sid) => {
    const mid = ++id; const p = { id: mid, method, params };
    if (sid) p.sessionId = sid;
    ws.send(JSON.stringify(p));
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { pending.delete(mid); reject(new Error('timeout ' + method)); }, 15000);
      pending.set(mid, { resolve: v => { clearTimeout(t); resolve(v); }, reject: e => { clearTimeout(t); reject(e); } });
    });
  };
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);

  const bad = [];
  const warns = [];
  for (const p of pages) {
    const url = 'file:///' + p.abs.replace(/\\/g, '/');
    try {
      await send('Page.navigate', { url }, sessionId);
    } catch (e) { bad.push([p.key, '导航失败 ' + e.message]); continue; }
    await sleep(1300);
    let r;
    try {
      r = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const de = document.documentElement;
          const cw = de.clientWidth;
          const over = [];
          document.querySelectorAll('body *').forEach(el => {
            const b = el.getBoundingClientRect();
            if (b.width > 0 && b.height > 0 && b.right > cw + 2) {
              over.push((el.tagName.toLowerCase()) + '.' + String(el.className || '').split(' ')[0] + '@' + Math.round(b.right));
            }
          });
          return { sw: de.scrollWidth, cw, over: over.slice(0, 4), vover: (function () {
            /* 子元素冲出父框（父框 overflow:visible）——像「固定高度 + 文字溢出」那类错位 */
            const out = [];
            document.querySelectorAll('body *').forEach(el => {
              const cs = getComputedStyle(el);
              if (cs.overflow !== 'visible') return;
              const b = el.getBoundingClientRect();
              if (b.height <= 0 || b.height > 800) return;
              let maxBottom = 0;
              for (const c of el.children) {
                const cb = c.getBoundingClientRect();
                if (cb.height > 0) maxBottom = Math.max(maxBottom, cb.bottom);
              }
              if (maxBottom > b.bottom + 10) {
                out.push(el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0] + ' 溢出 ' + Math.round(maxBottom - b.bottom) + 'px');
              }
            });
            return out.slice(0, 3);
          })() };
        })()`
      }, sessionId);
    } catch (e) { bad.push([p.key, '求值失败 ' + e.message]); continue; }
    const v = r.result.value;
    if (v.sw > v.cw + 2) bad.push([p.key, 'scrollWidth ' + v.sw + ' > ' + v.cw + '  ' + v.over.join(' | ')]);
    if (v.vover && v.vover.length) warns.push([p.key, v.vover.join(' | ')]);
  }

  console.log(`扫描 ${pages.length} 个内嵌演示（视口 ${W}px）`);
  if (warns.length) {
    console.log(`\n提示：${warns.length} 个页面有元素冲出父框（多为 100vh 固定高度布局或画布外延，未必是错）：`);
    warns.forEach(([k, v]) => console.log('  ! ' + k + '\n      ' + v));
  }
  if (!bad.length) console.log('✓ 没有横向溢出');
  else {
    console.log(`发现 ${bad.length} 个横向溢出：`);
    bad.forEach(([k, v]) => console.log('  ✗ ' + k + '\n      ' + v));
  }
  process.exit(bad.length ? 1 : 0);
})();
