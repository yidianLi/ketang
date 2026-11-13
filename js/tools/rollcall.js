/* 课堂随机点名 */
(function () {
  'use strict';
  Tools.add({
    id: 'rollcall', name: '随机点名', icon: '🎲',
    mount: function (root, ctx) {
      var names = ctx.store.get('names', null) || RollCore.defaults(40);
      var recent = ctx.store.get('recent', []);
      var timer = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🎲</span><h2>随机点名</h2></div>' +
        '<p class="cr-sub">一轮之内不重复，抽满自动重新开始；名单保存在本机。</p>' +
        '<div class="cr-panel"><div class="cr-big" id="nm">准备就绪</div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn primary big" id="go">开始点名</button>' +
        '<button class="cr-btn" id="reset">重置本轮</button>' +
        '</div><p class="cr-hint" style="text-align:center;margin-top:10px" id="st"></p></div>' +
        '<div class="cr-panel"><div class="cr-row"><span class="cr-label">名单（每行一个或用逗号分隔）</span>' +
        '<span class="spacer" style="flex:1"></span><button class="cr-btn" id="save">保存名单</button></div>' +
        '<textarea class="cr-ta" id="ta" rows="7"></textarea></div></div>';

      var nm = root.querySelector('#nm'), st = root.querySelector('#st'), ta = root.querySelector('#ta');
      ta.value = names.join('\n');

      function sync() {
        st.textContent = '本轮已抽 ' + recent.length + ' / ' + names.length + ' 人' +
          (recent.length ? ' · 最近：' + recent.slice(-3).join('、') : '');
      }
      function flash(final) {
        var n = 0, total = final ? 18 : 16;
        nm.classList.add('rolling');
        timer = setInterval(function () {
          nm.textContent = names[Math.floor(Math.random() * names.length)];
          ctx.sfx.roll();
          if (++n >= total) {
            clearInterval(timer); timer = null;
            var picked = RollCore.pick(names, recent);
            if (picked == null) { nm.textContent = '名单为空'; return; }
            recent = RollCore.pushRecent(names, recent, picked);
            ctx.store.set('recent', recent);
            nm.classList.remove('rolling');
            nm.textContent = picked;
            ctx.sfx.ding();
            sync();
          }
        }, 60);
      }

      root.querySelector('#go').onclick = function () {
        if (timer) return;
        names = RollCore.parse(ta.value);
        if (!names.length) { ctx.toast('名单为空，请先填写'); return; }
        flash(true);
      };
      root.querySelector('#reset').onclick = function () {
        recent = []; ctx.store.set('recent', recent); nm.textContent = '准备就绪'; sync();
      };
      root.querySelector('#save').onclick = function () {
        names = RollCore.parse(ta.value);
        if (!names.length) { ctx.toast('名单为空'); return; }
        ctx.store.set('names', names);
        recent = [];
        ctx.store.set('recent', recent);
        ctx.toast('已保存 ' + names.length + ' 个名字');
        sync();
      };
      sync();
      return { destroy: function () { if (timer) clearInterval(timer); } };
    }
  });
})();
