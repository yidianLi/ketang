/* 背诵小组 PK */
(function () {
  'use strict';
  Tools.add({
    id: 'recite-pk', name: '背诵小组 PK', icon: '📋',
    mount: function (root, ctx) {
      var sa = ctx.store.get('sa', 0), sb = ctx.store.get('sb', 0);
      var turn = ctx.store.get('turn', 'a');
      var used = ctx.store.get('used', []);
      var limit = 30, remain = 0, timer = null;
      var pool = (window.RECITE || []).slice();

      function nextTitle() {
        var left = pool.filter(function (t) { return used.indexOf(t) < 0; });
        if (!left.length) { used = []; left = pool.slice(); }
        var t = left[Math.floor(Math.random() * left.length)];
        used.push(t);
        ctx.store.set('used', used);
        return t;
      }

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">📋</span><h2>背诵小组 PK</h2></div>' +
        '<p class="cr-sub">两组轮流背诵，裁判点「流利 +1」或「卡壳 −1」；每题限时 ' + limit + ' 秒。</p>' +
        '<div class="cr-panel"><div class="cr-score">' +
        '<div class="t" id="ca"><span class="cr-label">A 组</span><b id="va">0</b></div>' +
        '<div class="t" id="cb"><span class="cr-label">B 组</span><b id="vb">0</b></div></div>' +
        '<p class="cr-hint" style="text-align:center;margin-top:8px" id="msg">轮到 A 组</p></div>' +
        '<div class="cr-panel">' +
        '<div class="cr-big" id="title" style="font-size:26px">点击「抽题开始」</div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn primary" id="draw">抽题开始</button>' +
        '<button class="cr-btn" id="pass" disabled>流利 +1</button>' +
        '<button class="cr-btn" id="fail" disabled>卡壳 −1</button>' +
        '<button class="cr-btn" id="reset">重新开赛</button></div>' +
        '<p class="cr-hint" style="text-align:center;margin-top:8px"><span class="cr-timer" id="tm">00:30</span></p></div></div>';

      var va = root.querySelector('#va'), vb = root.querySelector('#vb'),
          msg = root.querySelector('#msg'), title = root.querySelector('#title'),
          tm = root.querySelector('#tm'), pass = root.querySelector('#pass'),
          fail = root.querySelector('#fail'), draw = root.querySelector('#draw');

      function render() {
        va.textContent = sa; vb.textContent = sb;
        root.querySelector('#ca').classList.toggle('hot', turn === 'a');
        root.querySelector('#cb').classList.toggle('hot', turn === 'b');
        msg.textContent = '轮到 ' + (turn === 'a' ? 'A' : 'B') + ' 组 · 已用 ' + used.length + '/' + pool.length + ' 题';
      }
      function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

      pass.onclick = function () {
        if (turn === 'a') sa++; else sb++;
        ctx.store.set('sa', sa); ctx.store.set('sb', sb);
        ctx.sfx.ok(); stopTimer();
        turn = PkCore.nextTurn(turn); ctx.store.set('turn', turn);
        pass.disabled = fail.disabled = true; title.textContent = '点击「抽题开始」';
        render();
      };
      fail.onclick = function () {
        if (turn === 'a') sa--; else sb--;
        ctx.store.set('sa', sa); ctx.store.set('sb', sb);
        ctx.sfx.buzz(); stopTimer();
        turn = PkCore.nextTurn(turn); ctx.store.set('turn', turn);
        pass.disabled = fail.disabled = true; title.textContent = '点击「抽题开始」';
        render();
      };
      draw.onclick = function () {
        title.textContent = nextTitle();
        pass.disabled = fail.disabled = false;
        ctx.sfx.ding();
        stopTimer();
        remain = limit;
        tm.textContent = UI.fmtTime(remain);
        timer = setInterval(function () {
          remain = PomoCore.tick(remain);
          tm.textContent = UI.fmtTime(Math.max(0, remain));
          tm.classList.toggle('low', remain <= 5);
          if (remain <= 5 && remain > 0) ctx.sfx.tick();
          if (remain <= 0) { stopTimer(); ctx.sfx.buzz(); msg.textContent = '时间到！请裁判判定'; }
        }, 1000);
      };
      root.querySelector('#reset').onclick = function () {
        UI.modal('<h3>重新开赛？</h3><p>比分与已背题目都会清空。</p>', [
          { txt: '取消' },
          { txt: '确定', primary: true, onClick: function () {
            sa = sb = 0; used = []; turn = 'a';
            ctx.store.set('sa', 0); ctx.store.set('sb', 0); ctx.store.set('used', []); ctx.store.set('turn', 'a');
            title.textContent = '点击「抽题开始」'; pass.disabled = fail.disabled = true; stopTimer(); render();
          } }
        ]);
      };
      render();
      return { destroy: stopTimer };
    }
  });
})();
