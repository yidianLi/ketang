/* ============================================================
   wordrap.js — 喊麦读单词 / 喊麦读词语
   ------------------------------------------------------------
   形态对齐市面"早读喊麦课件"（WordRap 等），但完全本地化：
   - 鼓点 BGM 由 Web Audio 实时合成（底鼓/军鼓/踩镲），无音频文件
   - 朗读走系统 TTS（speechSynthesis），英语/中文各配音色
   - 词表一行一条「内容 释义」，可任意粘贴教材词表
   调度用 JS 时钟驱动：音频上下文被浏览器挂起（无手势/无头）时
   节拍、词卡与朗读照常推进，鼓点在上下文 running 时自动加入。
   纯逻辑（解析/时间轴/阶段）在 cores.js 的 RapCore，Node 可测。
   ============================================================ */
(function () {
  'use strict';

  var LEAD = 4;   /* 开喊前 4 拍倒计时（3 · 2 · 1 · GO） */

  function makeRap(cfg) {
    return {
      id: cfg.id, name: cfg.name, icon: cfg.icon,
      mount: function (root, ctx) {
        var lang = cfg.lang;
        var hint = cfg.hint;

        root.innerHTML =
          '<div class="cr-wrap">' +
          '<div class="cr-title"><span class="ic">' + cfg.icon + '</span><h2>' + cfg.name + '</h2></div>' +
          '<p class="cr-sub">粘贴词表 → 选节奏 → 开喊。鼓点由浏览器实时合成、朗读用系统语音，免登录、离线可用、不限次数。</p>' +
          '<div class="cr-panel rap-panel">' +
          '<div class="rap-side">' +
          '<label class="cr-label">词表（一行一条：内容 释义，释义可省）</label>' +
          '<textarea class="cr-ta" id="rta" rows="9" spellcheck="false"></textarea>' +
          '<div class="cr-row">' +
          '<button class="cr-btn" id="rload">载入示例词包</button>' +
          '<button class="cr-btn" id="rclear">清空</button></div>' +
          '<div class="cr-row">' +
          '<label class="cr-label">节奏 <select class="cr-select" id="rbpm">' +
          '<option value="88">慢 · 88</option><option value="108" selected>中 · 108</option>' +
          '<option value="128">快 · 128</option><option value="152">燃 · 152</option></select></label>' +
          '<label class="cr-label">每词 <select class="cr-select" id="rreps">' +
          '<option value="1">1 遍</option><option value="2" selected>2 遍</option><option value="3">3 遍</option></select></label>' +
          '<label class="cr-label">语速 <select class="cr-select" id="rrate">' +
          '<option value="0.8">慢</option><option value="1" selected>正常</option>' +
          '<option value="1.15">快</option><option value="1.3">很快</option></select></label>' +
          '</div>' +
          '<div class="cr-row">' +
          '<label class="cr-label"><input type="checkbox" id="rdmv" checked> 鼓点 BGM</label>' +
          '<label class="cr-label"><input type="checkbox" id="rtts" checked> 语音朗读</label>' +
          '</div>' +
          '<div class="cr-row">' +
          '<button class="cr-btn primary" id="rgo">▶ 开喊</button>' +
          '<button class="cr-btn" id="rstop" disabled>■ 停止</button></div>' +
          '<p class="cr-hint" id="rmsg">' + hint + '</p>' +
          '</div>' +
          '<div class="rap-stage">' +
          '<div class="rap-phase" id="rphase">READY</div>' +
          '<div class="rap-word" id="rword">READY?</div>' +
          '<div class="rap-zh" id="rzh"></div>' +
          '<div class="rap-bar"><i id="rbar"></i></div>' +
          '<div class="rap-list" id="rlist"></div>' +
          '</div></div>';

        var ta = root.querySelector('#rta'), msg = root.querySelector('#rmsg'),
            wordEl = root.querySelector('#rword'), zhEl = root.querySelector('#rzh'),
            phaseEl = root.querySelector('#rphase'), barEl = root.querySelector('#rbar'),
            listEl = root.querySelector('#rlist'),
            goBtn = root.querySelector('#rgo'), stopBtn = root.querySelector('#rstop');

        /* ---------- 鼓点合成（Web Audio，无文件） ---------- */
        var ac = null, noiseBuf = null, drumGain = null;
        function audio() {
          if (ac) return ac;
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          try { ac = new AC(); } catch (e) { ac = null; return null; }
          drumGain = ac.createGain();
          drumGain.gain.value = 0.9;
          drumGain.connect(ac.destination);
          var len = Math.floor(ac.sampleRate * 0.25);
          noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
          var d = noiseBuf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          return ac;
        }
        function at(t) { return Math.max(ac.currentTime + 0.01, t); }
        function kick(t) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(150, t);
          o.frequency.exponentialRampToValueAtTime(52, t + 0.11);
          g.gain.setValueAtTime(0.55, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          o.connect(g); g.connect(drumGain);
          o.start(t); o.stop(t + 0.2);
        }
        function snare(t) {
          var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
          s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 1700;
          g.gain.setValueAtTime(0.32, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          s.connect(f); f.connect(g); g.connect(drumGain);
          s.start(t); s.stop(t + 0.14);
        }
        function hat(t) {
          var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
          s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
          g.gain.setValueAtTime(0.1, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
          s.connect(f); f.connect(g); g.connect(drumGain);
          s.start(t); s.stop(t + 0.06);
        }
        function drumOn() { return root.querySelector('#rdmv').checked; }
        /* 音频上下文可出声才排鼓点，否则只留视觉节拍 */
        function drums(b, t0) {
          if (!drumOn() || !ac || ac.state !== 'running') return;
          if (b < LEAD) { kick(at(t0)); return; }
          var wb = b - LEAD;
          kick(at(t0));
          if (wb % 2 === 1) snare(at(t0));
          hat(at(t0 + tl.secPerBeat / 2));
          hat(at(t0 + tl.secPerBeat / 4 * 3));
        }

        /* ---------- 朗读 ---------- */
        function speak(text, isZh) {
          if (!root.querySelector('#rtts').checked || !window.speechSynthesis) return;
          try {
            speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(text);
            u.lang = isZh ? 'zh-CN' : lang;
            u.rate = parseFloat(root.querySelector('#rrate').value) || 1;
            var vs = speechSynthesis.getVoices() || [];
            for (var i = 0; i < vs.length; i++) {
              var v = (vs[i].lang || '').toLowerCase();
              if (!isZh && v.indexOf('en') === 0) { u.voice = vs[i]; break; }
              if (isZh && (v.indexOf('zh') === 0 || v.indexOf('cmn') === 0)) { u.voice = vs[i]; break; }
            }
            speechSynthesis.speak(u);
          } catch (e) { /* 语音不可用不影响节拍 */ }
        }

        /* ---------- JS 时钟调度器 ---------- */
        var timer = null, words = [], tl = null, startMs = 0, lastBeat = -1;

        function clearAll() {
          if (timer) { clearInterval(timer); timer = null; }
          try { speechSynthesis.cancel(); } catch (e) {}
        }
        function markList(idx) {
          var chips = listEl.children;
          for (var i = 0; i < chips.length; i++) {
            chips[i].className = idx < 0 ? '' : (i < idx ? 'done' : (i === idx ? 'cur' : ''));
          }
        }
        function doBeat(b) {
          if (b < LEAD) {
            wordEl.textContent = ['3', '2', '1', 'GO!'][b] || '';
            wordEl.classList.add('hot');
            zhEl.textContent = '预备——';
            phaseEl.textContent = 'COUNT-IN';
            return;
          }
          var wb = b - LEAD;
          for (var k = 0; k < tl.events.length; k++) {
            var ev = tl.events[k];
            if (ev.beat !== wb) continue;
            var item = words[ev.i];
            var last = ev.rep === tl.reps - 1;
            wordEl.textContent = item.w;
            wordEl.classList.add('hot');
            zhEl.textContent = last && ev.rep > 0 && item.zh ? item.zh : '';
            phaseEl.textContent = RapCore.phaseName(wb / tl.totalBeats);
            markList(ev.i);
            barEl.style.width = Math.min(100, wb / tl.totalBeats * 100) + '%';
            /* 首遍读词条本体；末遍若有释义改读释义加深理解 */
            var sayZh = last && ev.rep > 0 && !!item.zh;
            speak(sayZh ? item.zh : item.w, sayZh);
          }
        }
        function tick() {
          var msPerBeat = tl.secPerBeat * 1000;
          var b = Math.floor((performance.now() - startMs) / msPerBeat);
          while (lastBeat + 1 <= b) {
            lastBeat++;
            doBeat(lastBeat);
            if (lastBeat >= tl.totalBeats + LEAD - 1) { finish(); return; }
          }
        }
        function finish() {
          clearAll();
          goBtn.disabled = false;
          stopBtn.disabled = true;
          phaseEl.textContent = 'DONE';
          wordEl.textContent = '喊完啦！';
          wordEl.classList.remove('hot');
          barEl.style.width = '100%';
          markList(-1);
          var chips = listEl.children;
          for (var i = 0; i < chips.length; i++) chips[i].className = 'done';
          ctx.sfx.ding();
          msg.textContent = '一轮结束 · 换个节奏或词表再来，早读效果最好。';
        }
        function stop() {
          clearAll();
          goBtn.disabled = false;
          stopBtn.disabled = true;
          wordEl.textContent = 'READY?';
          wordEl.classList.remove('hot');
          zhEl.textContent = '';
          phaseEl.textContent = 'READY';
          barEl.style.width = '0';
          markList(-1);
        }

        function start() {
          words = RapCore.parse(ta.value);
          if (!words.length) { ctx.toast('先粘贴或载入一张词表'); return; }
          tl = RapCore.timeline(words.length,
            parseInt(root.querySelector('#rbpm').value, 10),
            4, parseInt(root.querySelector('#rreps').value, 10));
          /* 尝试解锁音频；被挂起也不阻塞节拍与朗读 */
          if (audio() && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
          listEl.innerHTML = '';
          words.forEach(function (w) {
            var s = document.createElement('span');
            s.textContent = w.w;
            listEl.appendChild(s);
          });
          barEl.style.width = '0';
          goBtn.disabled = true;
          stopBtn.disabled = false;
          var min = (tl.duration + LEAD * tl.secPerBeat) / 60;
          msg.textContent = words.length + ' 条 · ' + tl.bpm + ' BPM · 每词读 ' + tl.reps +
            ' 遍 · 约 ' + (Math.round(min * 10) / 10) + ' 分钟';
          startMs = performance.now() + 300;   /* 留 0.3s 起手缓冲 */
          lastBeat = -1;
          timer = setInterval(tick, 25);
        }

        /* ---------- 交互 ---------- */
        function words2text(list) {
          return (list || []).map(function (x) { return x.w + (x.zh ? ' ' + x.zh : ''); }).join('\n');
        }
        function renderCount() {
          if (timer) return;
          var n = RapCore.parse(ta.value).length;
          msg.textContent = n ? ('已就绪 ' + n + ' 条 · 开喊前有 ' + LEAD + ' 拍倒计时') : hint;
        }

        ta.value = words2text(cfg.preset);
        renderCount();
        goBtn.onclick = start;
        stopBtn.onclick = stop;
        root.querySelector('#rload').onclick = function () { ta.value = words2text(cfg.preset); renderCount(); };
        root.querySelector('#rclear').onclick = function () { ta.value = ''; renderCount(); ta.focus(); };
        ta.addEventListener('input', renderCount);

        /* 预热音色列表（Chrome 需要一次触发才返回 voices） */
        if (window.speechSynthesis) { try { speechSynthesis.getVoices(); } catch (e) {} }

        return {
          destroy: function () {
            clearAll();
            if (ac) { try { ac.close(); } catch (e) {} ac = null; }
          }
        };
      }
    };
  }

  Tools.add(makeRap({
    id: 'rap-en', name: '喊麦读单词', icon: '🎤', lang: 'en-US',
    preset: window.RAP_EN || [],
    hint: '一行一条「单词 释义」，例：apple 苹果。可直接粘贴教材词表或听写表；朗读用英语音色。'
  }));
  Tools.add(makeRap({
    id: 'rap-cn', name: '喊麦读词语', icon: '📢', lang: 'zh-CN',
    preset: window.RAP_CN || [],
    hint: '一行一条「词语 释义」，只写词语也行。适合生字词、成语、古诗名句全班齐读；朗读用中文音色。'
  }));
})();
