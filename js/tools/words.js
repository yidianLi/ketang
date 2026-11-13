/* 单词速记卡：艾宾浩斯复习 */
(function () {
  'use strict';
  Tools.add({
    id: 'words', name: '单词速记卡', icon: '🃏',
    mount: function (root, ctx) {
      var base = window.WORDS || [];
      var state = ctx.store.get('state', {});   // { en: {box, due} }
      var today = UI.today();
      var cur = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🃏</span><h2>单词速记卡</h2></div>' +
        '<p class="cr-sub">共 ' + base.length + ' 词 · 点击卡片翻面；「记得」进入下一复习间隔（1/2/4/7/15 天），「忘了」明天再来。</p>' +
        '<div class="cr-panel">' +
        '<div class="cr-flip" id="card" tabindex="0" role="button" aria-label="单词卡，点击翻面">' +
        '<div class="inner"><div class="face front"><div class="en" id="fe">—</div><div class="zh" id="fp"></div></div>' +
        '<div class="face back"><div class="en" id="be">—</div><div class="zh" id="bz"></div><div class="ex" id="bx"></div></div></div></div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn" id="bad">忘了</button>' +
        '<button class="cr-btn primary" id="good">记得</button>' +
        '<button class="cr-btn" id="next">跳过</button></div>' +
        '<p class="cr-hint" style="text-align:center;margin-top:8px" id="msg"></p></div></div>';

      var card = root.querySelector('#card'), fe = root.querySelector('#fe'), fp = root.querySelector('#fp'),
          be = root.querySelector('#be'), bz = root.querySelector('#bz'), bx = root.querySelector('#bx'),
          msg = root.querySelector('#msg');

      function merged() {
        return base.map(function (w) {
          var s = state[w.en] || {};
          return { en: w.en, zh: w.zh, pos: w.pos, ex: w.ex, box: s.box || 0, due: s.due || 0 };
        });
      }
      function pick() {
        var m = merged();
        var due = WordCore.due(m, today);
        if (!due.length) {
          m.sort(function (a, b) { return a.due - b.due; });
          due = m.slice(0, 5);
        }
        if (!due.length) return null;
        return due[Math.floor(Math.random() * due.length)];
      }
      function render() {
        var m = merged();
        var dueN = WordCore.due(m, today).length;
        msg.textContent = '今日待复习 ' + dueN + ' 词 · 已学进度：' +
          m.filter(function (w) { return (state[w.en] || {}).box > 0; }).length + ' / ' + m.length;
        cur = pick();
        card.classList.remove('flipped');
        if (!cur) { fe.textContent = '全部完成！'; fp.textContent = '明天再来复习'; return; }
        fe.textContent = cur.en;
        fp.textContent = '点击翻面看意思';
        be.textContent = cur.en;
        bz.textContent = cur.pos + ' ' + cur.zh;
        bx.textContent = cur.ex || '';
      }
      function save(w) { state[w.en] = { box: w.box, due: w.due }; ctx.store.set('state', state); }
      card.onclick = function () { card.classList.toggle('flipped'); };
      card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } };
      root.querySelector('#good').onclick = function () { if (!cur) return; save(WordCore.next(cur, true, today)); ctx.sfx.ok(); render(); };
      root.querySelector('#bad').onclick = function () { if (!cur) return; save(WordCore.next(cur, false, today)); ctx.sfx.buzz(); render(); };
      root.querySelector('#next').onclick = render;
      render();
      return {};
    }
  });
})();
