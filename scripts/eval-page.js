/* 通用：打开一个页面，执行一段 JS 表达式并把结果打到 stdout。
   用法：node scripts/eval-page.js <页面路径> <宽度> "<表达式>"
   用途：量元素盒子、断言渲染结果，替代肉眼看截图。 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = 9300 + (process.pid % 300);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const target = process.argv[2];
const WIDTH = +(process.argv[3] || 1280);
const EXPR = process.argv[4] || 'document.title';

const getJson = u => new Promise((s, j) => {
  http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { s(JSON.parse(d)); } catch (e) { j(e); } }); }).on('error', j);
});

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    '--allow-file-access-from-files', '--disable-gpu', '--hide-scrollbars',
    `--user-data-dir=${path.join(os.tmpdir(), 'ev' + Date.now())}`, 'about:blank',
  ], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  let ver;
  for (let i = 0; i < 80; i++) {
    try { ver = await getJson(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(150); }
  }
  if (!ver) { console.error('Chrome 未启动'); process.exit(1); }

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  let id = 0; const pend = new Map();
  const send = (method, params = {}, sid) => {
    const i = ++id; const o = { id: i, method, params };
    if (sid) o.sessionId = sid;
    ws.send(JSON.stringify(o));
    return new Promise((s, j) => pend.set(i, { s, j }));
  };
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const { s, j } = pend.get(m.id); pend.delete(m.id);
      m.error ? j(new Error(m.error.message)) : s(m.result);
    }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride',
    { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);

  const url = 'file:///' + path.resolve(ROOT, target).replace(/\\/g, '/');
  await send('Page.navigate', { url }, sessionId);
  await sleep(1600);

  /* 表达式可以是一个 Promise：先 await 再序列化，方便验证动画等异步行为 */
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const v = await (${EXPR});
        if (typeof v === 'undefined') return '';
        return typeof v === 'string' ? v : JSON.stringify(v, null, 1);
      } catch (e) { return 'ERR ' + e.message; }
    })()`,
    returnByValue: true, awaitPromise: true,
  }, sessionId).catch(e => ({ result: { value: 'CDP 错误: ' + e.message } }));

  console.log(r.result.value);
  process.exit(0);
})();
