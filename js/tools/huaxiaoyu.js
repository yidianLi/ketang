/* 课程生活华小鱼：番茄钟 + 任务打卡 */
(function () {
  'use strict';
  Tools.add({
    id: 'huaxiaoyu', name: '课程生活华小鱼', icon: '🐟',
    mount: function (root, ctx) {
      var phase = ctx.store.get('phase', 'work');
      var remain = ctx.store.get('remain', PomoCore.WORK);
      var tasks = ctx.store.get('tasks', [
        { t: '预习今天第一节课', done: false },
        { t: '完成 10 道口算', done: false },
        { t: '阅读 20 分钟', done: false }
      ]);
      var timer = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🐟</span><h2>课程生活华小鱼</h2></div>' +
        '<p class="cr-sub">番茄钟 25 分钟专注 + 5 分钟休息，小鱼陪全班一起游；下面是今日任务打卡。</p>' +
        '<div class="cr-panel">' +
        '<div class="fish"><div class="body"><span class="eye"></span></div></div>' +
        '<div class="cr-big" id="tm">25:00</div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn primary" id="go">开始</button>' +
        '<button class="cr-btn" id="skip">跳到下一阶段</button>' +
        '<button class="cr-btn" id="rz">复位</button></div>' +
        '<p class="cr-hint" style="text-align:center;margin-top:8px" id="msg"></p></div>' +
        '<div class="cr-panel"><div class="cr-row"><span class="cr-label">今日任务</span>' +
        '<span style="flex:1"></span><input class="cr-input" id="nt" placeholder="添加任务…" style="width:220px">' +
        '<button class="cr-btn" id="add">添加</button></div><div id="list"></div></div></div>';

      var tm = root.querySelector('#tm'), msg = root.querySelector('#msg'),
          go = root.querySelector('#go'), list = root.querySelector('#list');

      function render() {
        tm.textContent = UI.fmtTime(Math.max(0, remain));
        msg.textContent = phase === 'work' ? '🐟 专注中 — 专心做事，小鱼才游得欢' : '🏖 休息一下，远眺放松眼睛';
        go.textContent = timer ? '暂停' : '开始';
      }
      function renderList() {
        list.innerHTML = '';
        tasks.forEach(function (t, i) {
          var row = document.createElement('div');
          row.className = 'cr-row';
          row.style.marginBottom = '6px';
          row.innerHTML =
            '<input type="checkbox" id="ck' + i + '"' + (t.done ? ' checked' : '') + '>' +
            '<label for="ck' + i + '" style="' + (t.done ? 'text-decoration:line-through;color:var(--muted)' : '') + '">' + UI.esc(t.t) + '</label>' +
            '<span style="flex:1"></span><button class="cr-btn" data-del="' + i + '">删除</button>';
          list.appendChild(row);
        });
        list.querySelectorAll('[data-del]').forEach(function (b) {
          b.onclick = function () { tasks.splice(+b.getAttribute('data-del'), 1); ctx.store.set('tasks', tasks); renderList(); };
        });
        list.querySelectorAll('input[type=checkbox]').forEach(function (ck) {
          ck.onchange = function () {
            tasks[+ck.id.slice(2)].done = ck.checked;
            ctx.store.set('tasks', tasks);
            if (ck.checked) ctx.sfx.ok();
            renderList();
          };
        });
      }

      function stop() { if (timer) { clearInterval(timer); timer = null; } render(); }
      function switchPhase() {
        phase = PomoCore.nextPhase(phase);
        remain = PomoCore.initial(phase);
        ctx.store.set('phase', phase); ctx.store.set('remain', remain);
        ctx.sfx.ding();
        ctx.toast(phase === 'work' ? '休息结束，开始专注！' : '专注完成，休息 5 分钟！');
        stop();
      }
      go.onclick = function () {
        if (timer) { stop(); return; }
        timer = setInterval(function () {
          remain = PomoCore.tick(remain);
          ctx.store.set('remain', remain);
          if (remain <= 0) switchPhase(); else render();
        }, 1000);
        render();
      };
      root.querySelector('#skip').onclick = function () { stop(); switchPhase(); };
      root.querySelector('#rz').onclick = function () {
        stop(); phase = 'work'; remain = PomoCore.WORK;
        ctx.store.set('phase', phase); ctx.store.set('remain', remain); render();
      };
      root.querySelector('#add').onclick = function () {
        var v = root.querySelector('#nt').value.trim();
        if (!v) return;
        tasks.push({ t: v, done: false });
        ctx.store.set('tasks', tasks);
        root.querySelector('#nt').value = '';
        renderList();
      };

      render(); renderList();
      return { destroy: stop };
    }
  });
})();
