/* 闪记 PK：双人同屏抢答 */
(function () {
  'use strict';
  Tools.add({
    id: 'flashcard-pk', name: '闪记 PK', icon: '⚡',
    mount: function (root, ctx) {
      var pa = ctx.store.get('pa', 0), pb = ctx.store.get('pb', 0);
      var round = null, hideTimer = null, claimed = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">⚡</span><h2>闪记 PK</h2></div>' +
        '<p class="cr-sub">中文闪现 0.8 秒后隐藏并给出 3 个英文选项，A 按键盘 <b>A</b>、B 按键盘 <b>L</b> 抢答，抢到后点选答案；对 +1，错则对方 +1。</p>' +
        '<div class="cr-panel"><div class="cr-score">' +
        '<div class="t" id="ka"><span class="cr-label">A（按 A 键抢答）</span><b id="pa">0</b></div>' +
        '<div class="t" id="kb"><span class="cr-label">B（按 L 键抢答）</span><b id="pb">0</b></div></div></div>' +
        '<div class="cr-panel"><div class="cr-big" id="stage2" style="min-height:110px">按「开始回合」</div>' +
        '<div class="cr-row" style="justify-content:center" id="opts"></div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn primary" id="go">开始回合</button>' +
        '<button class="cr-btn" id="reset">清零比分</button></div>' +
        '<p class="cr-hint" style="text-align:center;margin-top:8px" id="msg"></p></div></div>';

      var stage2 = root.querySelector('#stage2'), opts = root.querySelector('#opts'),
          msg = root.querySelector('#msg'), paEl = root.querySelector('#pa'), pbEl = root.querySelector('#pb');

      function render() { paEl.textContent = pa; pbEl.textContent = pb; }

      function newRound() {
        clearTimeout(hideTimer);
        claimed = null;
        round = FlashCore.makeRound(window.WORDS || [], 'zh');
        if (!round) { ctx.toast('词库为空'); return; }
        opts.innerHTML = '';
        stage2.classList.add('rolling');
        stage2.textContent = round.item.zh;
        msg.textContent = '记住它…';
        hideTimer = setTimeout(function () {
          stage2.classList.remove('rolling');
          stage2.textContent = '？ ? ？';
          msg.textContent = 'A 按 A 键 / B 按 L 键抢答';
        }, 800);
      }

      function showOptions() {
        opts.innerHTML = '';
        round.options.forEach(function (w, i) {
          var b = document.createElement('button');
          b.className = 'cr-btn';
          b.textContent = w.en;
          b.onclick = function () { judge(i); };
          opts.appendChild(b);
        });
      }

      function judge(i) {
        var right = FlashCore.judge(round, i);
        if (right) {
          if (claimed === 'a') pa++; else pb++;
          msg.textContent = (claimed === 'a' ? 'A' : 'B') + ' 组答对 +1！' + round.item.en + ' = ' + round.item.zh;
          ctx.sfx.ok();
        } else {
          if (claimed === 'a') pb++; else pa++;
          msg.textContent = (claimed === 'a' ? 'A' : 'B') + ' 组答错，对方 +1。正确：' + round.item.en;
          ctx.sfx.buzz();
        }
        opts.querySelectorAll('.cr-btn').forEach(function (b, bi) {
          if (bi === round.answer) b.classList.add('right');
          else if (bi === i) b.classList.add('wrong');
          b.disabled = true;
        });
        ctx.store.set('pa', pa); ctx.store.set('pb', pb);
        round = null;
        render();
      }

      function claim(side) {
        if (!round || stage2.textContent === round.item.zh || claimed) return;  // 闪现阶段/已抢答
        if (stage2.textContent.indexOf('？') < 0) return;
        claimed = side;
        ctx.sfx.ding();
        msg.textContent = (side === 'a' ? 'A' : 'B') + ' 组抢到，请点选答案';
        showOptions();
      }

      function onKey(e) {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        var k = e.key.toLowerCase();
        if (k === 'a') claim('a');
        else if (k === 'l') claim('b');
      }
      document.addEventListener('keydown', onKey);

      root.querySelector('#go').onclick = newRound;
      root.querySelector('#reset').onclick = function () {
        pa = pb = 0; ctx.store.set('pa', 0); ctx.store.set('pb', 0);
        msg.textContent = ''; stage2.textContent = '按「开始回合」'; opts.innerHTML = ''; render();
      };
      render();
      return { destroy: function () { document.removeEventListener('keydown', onKey); clearTimeout(hideTimer); } };
    }
  });
})();
