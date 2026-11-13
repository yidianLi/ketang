/**
 * 用 CDP 精确控制视口截整页，避免 headless 的 --window-size 最小宽度限制。
 *
 * 用法：node scripts/shot-page.js <页面> <宽> <高> <输出> [--theme=dark] [--mobile] [--full]
 * 例：  node scripts/shot-page.js ai-cases.html 390 900 /tmp/m.png --mobile --full
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const [PAGE, W, H, OUT] = process.argv.slice(2);
const FLAGS = process.argv.slice(6);
const THEME = (FLAGS.find(f => f.startsWith('--theme=')) || '').split('=')[1] || '';
const MOBILE = FLAGS.includes('--mobile');
const FULL = FLAGS.includes('--full');
const Q = (FLAGS.find(f => f.startsWith('--q=')) || '').slice(4);
const JS = (FLAGS.find(f => f.startsWith('--js=')) || '').slice(5);
const DPR = +(FLAGS.find(f => f.startsWith('--dpr=')) || '').split('=')[1] || (MOBILE ? 2 : 1);
const PORT = 9488;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((res, rej) => {
  http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--enable-unsafe-swiftshader', `--remote-debugging-port=${PORT}`, '--allow-file-access-from-files',
    '--hide-scrollbars', `--user-data-dir=${path.join(require('os').tmpdir(), 'sp-' + Date.now())}`, 'about:blank'], { stdio: 'ignore' });
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
      const t = setTimeout(() => { pending.delete(mid); reject(new Error('timeout ' + method)); }, 20000);
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
  await send('Emulation.setDeviceMetricsOverride',
    { width: +W, height: +H, deviceScaleFactor: DPR, mobile: MOBILE }, sessionId);

  const url = 'file:///' + path.join(ROOT, PAGE).replace(/\\/g, '/') + (THEME ? '?theme=' + THEME : '');
  await send('Page.navigate', { url }, sessionId);
  await sleep(2800);

  if (Q) {
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('q');
        if (!el) return 'no #q';
        el.value = ${JSON.stringify(Q)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return 'typed';
      })()`,
      returnByValue: true,
    }, sessionId);
    console.log('搜索输入:', r.result.value);
    await sleep(700);
  }

  /* --js=... 注入一段脚本，用来把页面调到某个状态再截图（勾选项、拖滑块、点按钮） */
  if (JS) {
    const r = await send('Runtime.evaluate', { expression: JS, returnByValue: true }, sessionId).catch(e => ({
      result: { value: 'ERR ' + e.message },
    }));
    console.log('注入结果:', r.result.value);
    await sleep(600);
  }

  if (FULL) {
    const m = await send('Page.getLayoutMetrics', {}, sessionId);
    const h = Math.ceil(m.cssContentSize.height);
    await send('Emulation.setDeviceMetricsOverride', { width: +W, height: h, deviceScaleFactor: DPR, mobile: MOBILE }, sessionId);
    await sleep(900);
  }

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: FULL }, sessionId);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('已保存', OUT);
  process.exit(0);
})();
