/**
 * 用 Headless Chrome + CDP 给每个案例页截首屏图，输出 JPEG。
 * 零依赖：Node 22 自带全局 WebSocket。
 *
 * 用法：
 *   node scripts/shoot-cases.js                 # 全量
 *   node scripts/shoot-cases.js --only 1,27,62  # 只截指定序号（从 1 开始）
 *   node scripts/shoot-cases.js --force         # 已存在也重截
 *
 * 输出：assets/shots/case-01.jpg ...
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'shots');
/* 用随机端口，避免和上一次残留的实例抢 9333 而连到已失效的 target */
const PORT = 9300 + (process.pid % 300);
const W = 1000, H = 625;
const QUALITY = 76;
const SETTLE_MS = 700;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(p => fs.existsSync(p));
if (!CHROME) { console.error('未找到 Chrome'); process.exit(1); }

const args = process.argv.slice(2);
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const ONLY = onlyArg ? new Set(onlyArg.split(',').map(s => +s.trim())) : null;
const FORCE = args.includes('--force');
const NO_SCROLL = args.includes('--no-scroll');

/* 把视口滚到页面里最大的 canvas / svg 上，让缩略图落在真正的画面主体而不是一排滑块。
   保留 70px 上边距，避免标题被完全切掉。 */
const FOCUS_JS = `(() => {
  const cands = [];
  document.querySelectorAll('canvas, svg, iframe').forEach(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    if (r.width < 220 || r.height < 140) return;
    cands.push({ el, area: r.width * r.height, top: r.top + window.scrollY });
  });
  if (!cands.length) return 0;
  cands.sort((a, b) => b.area - a.area);
  const y = Math.max(0, cands[0].top - 70);
  window.scrollTo(0, y);
  return Math.round(y);
})()`;

/* ---------- 读取案例清单 ---------- */
const page = fs.readFileSync(path.join(ROOT, 'ai-cases.html'), 'utf8');
const CASES = eval(page.match(/var CASES = (\[[\s\S]*?\n\]);/)[1]);

/* ---------- CDP 客户端 ---------- */
function getJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.listeners.slice().forEach(l => l(msg));
      }
    });
  }
  static connect(url) {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => res(new CDP(ws)));
      ws.addEventListener('error', rej);
    });
  }
  send(method, params = {}, sessionId, timeout = 12000) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('cdp timeout: ' + method));
      }, timeout);
      this.pending.set(id, {
        resolve: v => { clearTimeout(t); resolve(v); },
        reject: e => { clearTimeout(t); reject(e); },
      });
    });
  }
  once(method, sessionId, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { off(); reject(new Error('timeout ' + method)); }, timeout);
      const fn = msg => {
        if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) { off(); resolve(msg.params); }
      };
      const off = () => { clearTimeout(t); this.listeners = this.listeners.filter(x => x !== fn); };
      this.listeners.push(fn);
    });
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 很多仿真页默认是空画布，要先「应用数值」再「开始 / Run」才动起来。
   只点看起来像启动按钮的那一个，找不到就跳过，不猜别的。 */
function clickExpr(reSrc) {
  return `(() => {
    const re = new RegExp(${JSON.stringify(reSrc)}, 'i');
    const btns = Array.from(document.querySelectorAll('button, [role=button], a.btn, .btn'));
    const t = btns.find(b => {
      if (b.disabled) return false;
      const r = b.getBoundingClientRect();
      if (r.width < 20 || r.height < 12) return false;
      return re.test((b.innerText || '').trim());
    });
    if (!t) return '';
    t.click();
    return (t.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 20);
  })()`;
}
const APPLY_JS = clickExpr('^(应用数值|应用|确定|设置数值|Set Values|Apply)');
const START_JS = clickExpr('^(开始|运行|播放|投放|起飞|Run|Start|Play|Launch)');

async function waitPort(retries = 60) {
  for (let i = 0; i < retries; i++) {
    try { return await getJson(`http://127.0.0.1:${PORT}/json/version`); }
    catch { await sleep(200); }
  }
  throw new Error('Chrome 调试端口未就绪');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = path.join(require('os').tmpdir(), 'jianpu-shoot-' + Date.now());
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--allow-file-access-from-files',
    '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--mute-audio',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  const cleanup = () => { try { chrome.kill(); } catch {} };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  let cdp;
  try {
    const ver = await waitPort();
    cdp = await CDP.connect(ver.webSocketDebuggerUrl);
  } catch (e) {
    console.error(e.message); cleanup(); process.exit(1);
  }

  /* 建一个干净的页面 target；页面崩了要重建，旧 session 已失效 */
  let targetId = null, sessionId = null;
  async function newPage() {
    if (targetId) { try { await cdp.send('Target.closeTarget', { targetId }, null, 4000); } catch {} }
    const t = await cdp.send('Target.createTarget', { url: 'about:blank' });
    targetId = t.targetId;
    const a = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    sessionId = a.sessionId;
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  }
  await newPage();

  const results = [];
  const failed = [];
  for (let i = 0; i < CASES.length; i++) {
    const no = i + 1;
    if (ONLY && !ONLY.has(no)) continue;
    const slug = 'case-' + String(no).padStart(2, '0');
    const out = path.join(OUT, slug + '.jpg');
    if (!FORCE && fs.existsSync(out)) { results.push({ no, slug, skip: true }); continue; }

    const [rel, hash] = CASES[i].p.split('#');
    const file = path.join(ROOT, 'ai-cases', rel);
    const url = 'file:///' + file.replace(/\\/g, '/').replace(/ /g, '%20') + (hash ? '#' + hash : '');

    try {
      const loaded = cdp.once('Page.loadEventFired', sessionId, 20000).catch(() => null);
      await cdp.send('Page.navigate', { url }, sessionId, 20000);
      // 有些页面挂着长连接 / 大 vendor 脚本，load 可能迟迟不触发；
      // 最多等 5s 就往下走，截图不依赖严格 load。
      await Promise.race([loaded, sleep(5000)]);
      await sleep(SETTLE_MS);
      if (!NO_SCROLL) {
        const applied = await cdp.send('Runtime.evaluate', { expression: APPLY_JS, returnByValue: true }, sessionId, 8000)
          .then(r => r.result.value).catch(() => '');
        if (applied) await sleep(600);
        const started = await cdp.send('Runtime.evaluate', { expression: START_JS, returnByValue: true }, sessionId, 8000)
          .then(r => r.result.value).catch(() => '');
        await sleep(started ? 1100 : 300);
        await cdp.send('Runtime.evaluate', { expression: FOCUS_JS, returnByValue: true }, sessionId, 8000).catch(() => null);
        await sleep(350);
      }
      // 顺便确认页面不是空白
      const probe = await cdp.send('Runtime.evaluate', {
        expression: 'document.body ? document.body.innerText.trim().length : 0',
        returnByValue: true,
      }, sessionId, 8000).catch(() => ({ result: { value: 0 } }));

      const shot = await cdp.send('Page.captureScreenshot',
        { format: 'jpeg', quality: QUALITY, captureBeyondViewport: false }, sessionId, 20000);
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(out, buf);
      results.push({ no, slug, kb: +(buf.length / 1024).toFixed(1), text: probe.result.value, name: CASES[i].n });
      process.stdout.write(`  ${slug}  ${(buf.length / 1024).toFixed(0)}KB  ${CASES[i].n}\n`);
    } catch (e) {
      failed.push({ no, slug, name: CASES[i].n, err: e.message });
      process.stdout.write(`  ${slug}  ✗ ${e.message}  ${CASES[i].n}\n`);
      await newPage().catch(() => {});
    }
  }

  const done = results.filter(r => r.kb);
  const total = done.reduce((s, r) => s + r.kb, 0);
  console.log(`\n完成 ${done.length} 张，合计 ${(total / 1024).toFixed(2)} MB，平均 ${(total / done.length || 0).toFixed(0)} KB`);
  if (failed.length) {
    console.log(`\n失败 ${failed.length} 张（渲染进程崩溃或超时）：`);
    failed.forEach(f => console.log(`  ${f.slug}  ${f.err}  ${f.name}`));
  }
  const thin = done.filter(r => r.kb < 8 || r.text < 20);
  if (thin.length) {
    console.log('\n疑似空白/异常：');
    thin.forEach(r => console.log(`  ${r.slug} ${r.kb}KB 文本${r.text}字  ${r.name}`));
  }
  cleanup();
  process.exit(0);
})();
