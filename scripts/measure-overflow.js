/**
 * 在指定视口宽度下找出所有横向溢出视口的元素。
 * 用法：node scripts/measure-overflow.js [宽度] [页面]
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 9477;
const W = +(process.argv[2] || 390);
const PAGE = process.argv[3] || 'ai-cases.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((res, rej) => {
  http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
    '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(require('os').tmpdir(), 'm-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 2, mobile: true }, sessionId);

  const url = 'file:///' + path.join(ROOT, PAGE).replace(/\\/g, '/');
  await send('Page.navigate', { url }, sessionId);
  await sleep(2500);

  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.right > vw + 1 && b.width > 0) {
          out.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 40), right: Math.round(b.right), w: Math.round(b.width) });
        }
      });
      return JSON.stringify({ vw, scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, list: out.slice(0, 20) }, null, 1);
    })()`,
    returnByValue: true,
  }, sessionId);
  console.log(r.result.value);
  process.exit(0);
})();
