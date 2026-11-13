/* 分组挑战 · 知识抢答 */
(function () {
  'use strict';
  Tools.add({
    id: 'quiz-buzzer', name: '分组抢答', icon: '🏆',
    mount: function (root, ctx) {
      var teams = ctx.store.get('teams', null) || ScoreCore.initTeams(4);
      var limit = ctx.store.get('limit', 20);
      var hot = -1, remain = 0, timer = null;
      var bank = (window.QUIZBANK || []).filter(function (q) { return q.subject === '物理'; });
      var qi = -1, qEl = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🏆</span><h2>分组抢答</h2></div>' +
        '<p class="cr-sub">按键盘 <b>1-6</b> 抢答（对应组号），抢中后倒计时作答；也可主持人随机出题。</p>' +
        '<div class="cr-panel">' +
        '<div class="cr-row"><span class="cr-label">组数</span>' +
        '<select class="cr-select" id="cnt">' +
        [2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (n === teams.length ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
        '</select>' +
        '<span class="cr-label">答题时限</span>' +
        '<select class="cr-select" id="lim">' +
        [10, 20, 30, 45].map(function (n) { return '<option value="' + n + '"' + (n === limit ? ' selected' : '') + '>' + n + ' 秒</option>'; }).join('') +
        '</select>' +
        '<button class="cr-btn" id="question">随机出题</button>' +
        '<button class="cr-btn" id="stop">结束抢答</button></div>' +
        '<div class="cr-q" id="q" hidden></div>' +
        '<div class="cr-score" id="score"></div>' +
        '<div class="cr-row" style="margin-top:12px"><span class="cr-timer" id="tm">--</span>' +
        '<span class="cr-hint" id="msg">待抢答</span></div></div>' +
        '<div class="cr-panel"><p class="cr-hint">计分操作：点击各组卡片的 +1 / −1；改名直接点击组名输入。</p>' +
        '<div class="cr-row"><button class="cr-btn" id="clear">清零</button></div></div></div>';

      var scoreEl = root.querySelector('#score'), tmEl = root.querySelector('#tm'),
          msgEl = root.querySelector('#msg'), qEl2 = root.querySelector('#q');

      function renderScores(hotIdx) {
        scoreEl.innerHTML = '';
        teams.forEach(function (t, i) {
          var d = document.createElement('div');
          d.className = 't' + (i === hotIdx ? ' hot' : '');
          d.innerHTML =
            '<input class="cr-input" style="width:90px;text-align:center" value="' + UI.esc(t.name) + '" data-name="' + i + '">' +
            '<b>' + t.score + '</b>' +
            '<div style="margin-top:6px;display:flex;gap:6px;justify-content:center">' +
            '<button class="cr-btn" data-plus="' + i + '">+1</button>' +
            '<button class="cr-btn" data-minus="' + i + '">−1</button></div>';
          scoreEl.appendChild(d);
        });
        scoreEl.querySelectorAll('[data-name]').forEach(function (inp) {
          inp.onchange = function () {
            teams[+inp.getAttribute('data-name')].name = inp.value.trim() || '未命名';
            ctx.store.set('teams', teams);
          };
        });
        scoreEl.querySelectorAll('[data-plus]').forEach(function (b) {
          b.onclick = function () { teams = ScoreCore.apply(teams, +b.getAttribute('data-plus'), 1); ctx.store.set('teams', teams); renderScores(hot); };
        });
        scoreEl.querySelectorAll('[data-minus]').forEach(function (b) {
          b.onclick = function () { teams = ScoreCore.apply(teams, +b.getAttribute('data-minus'), -1); ctx.store.set('teams', teams); renderScores(hot); };
        });
      }

      function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
      function release() { stopTimer(); hot = -1; remain = 0; tmEl.textContent = '--'; msgEl.textContent = '待抢答'; renderScores(-1); }
      function startTimer() {
        stopTimer();
        remain = limit;
        tmEl.textContent = UI.fmtTime(remain);
        timer = setInterval(function () {
          remain = PomoCore.tick(remain);
          tmEl.textContent = UI.fmtTime(Math.max(0, remain));
          tmEl.classList.toggle('low', remain <= 5);
          if (remain <= 5 && remain > 0) ctx.sfx.tick();
          if (remain <= 0) {
            ctx.sfx.buzz();
            release();
            msgEl.textContent = '超时！';
          }
        }, 1000);
      }
      function buzz(i) {
        if (hot >= 0) return;
        hot = i;
        ctx.sfx.ding();
        msgEl.textContent = teams[i].name + ' 抢答成功！';
        renderScores(hot);
        startTimer();
      }

      function onKey(e) {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= teams.length) { e.preventDefault(); buzz(n - 1); }
        if (e.key === 'Escape') release();
      }
      document.addEventListener('keydown', onKey);

      root.querySelector('#cnt').onchange = function () {
        var n = +this.value;
        teams = ScoreCore.initTeams(n);
        ctx.store.set('teams', teams);
        release();
      };
      root.querySelector('#lim').onchange = function () { limit = +this.value; ctx.store.set('limit', limit); };
      root.querySelector('#question').onclick = function () {
        if (!bank.length) { ctx.toast('题库为空'); return; }
        qi = Math.floor(Math.random() * bank.length);
        qEl2.hidden = false;
        qEl2.textContent = '【' + bank[qi].subject + '】' + bank[qi].q;
      };
      root.querySelector('#stop').onclick = release;
      root.querySelector('#clear').onclick = function () {
        UI.modal('<h3>清零所有小组得分？</h3><p>组名会保留。</p>', [
          { txt: '取消' },
          { txt: '清零', primary: true, onClick: function () { teams.forEach(function (t) { t.score = 0; }); ctx.store.set('teams', teams); renderScores(hot); ctx.toast('已清零'); } }
        ]);
      };

      renderScores(-1);
      return { destroy: function () { document.removeEventListener('keydown', onKey); stopTimer(); } };
    }
  });
})();
