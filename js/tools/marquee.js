/* 宣言滚动屏 */
(function () {
  'use strict';
  Tools.add({
    id: 'marquee', name: '宣言滚动屏', icon: '🌌',
    mount: function (root, ctx) {
      var lines = ctx.store.get('lines', ['今天也是元气满满的一天！', '不畏难，不放弃，向前冲！', '细节决定成败，态度决定高度。']);
      var speed = ctx.store.get('speed', 40);      // px/s
      var size = ctx.store.get('size', 34);        // 字号

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🌌</span><h2>宣言滚动屏</h2></div>' +
        '<p class="cr-sub">适合投屏：班级宣言循环滚动。点击画面可全屏。</p>' +
        '<div class="cr-panel"><div class="cr-row">' +
        '<span class="cr-label">字号</span><input type="range" id="sz" min="18" max="72" value="' + size + '">' +
        '<span class="cr-label">速度</span><input type="range" id="sp" min="10" max="120" value="' + speed + '">' +
        '<button class="cr-btn" id="fs">全屏</button></div>' +
        '<textarea class="cr-ta" id="ta" rows="5"></textarea>' +
        '<div class="cr-row" style="margin-top:8px"><button class="cr-btn primary" id="apply">应用并保存</button></div></div>' +
        '<div class="marquee-mask" id="mask"><div class="marquee-inner" id="inner"></div></div></div>';

      var ta = root.querySelector('#ta'), inner = root.querySelector('#inner'),
          mask = root.querySelector('#mask');
      ta.value = lines.join('\n');

      var y = 0, last = null, raf = null;
      function render() {
        var arr = lines.filter(function (l) { return l.trim(); });
        inner.innerHTML = arr.length
          ? arr.map(function (l) { return '<div class="marquee-line">' + UI.esc(l) + '</div>'; }).join('')
          : '<div class="marquee-line">（暂无宣言）</div>';
        inner.style.fontSize = size + 'px';
      }
      function tick(ts) {
        if (last == null) last = ts;
        var dt = (ts - last) / 1000; last = ts;
        y += speed * dt;
        var h = inner.offsetHeight || 1;
        if (y > h) y = -mask.offsetHeight;
        inner.style.transform = 'translateY(' + (mask.offsetHeight - y) + 'px)';
        raf = requestAnimationFrame(tick);
      }
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) raf = requestAnimationFrame(tick);
      else inner.style.transform = 'translateY(0)';

      root.querySelector('#apply').onclick = function () {
        lines = ta.value.split('\n').filter(function (l) { return l.trim(); });
        speed = +root.querySelector('#sp').value;
        size = +root.querySelector('#sz').value;
        ctx.store.set('lines', lines); ctx.store.set('speed', speed); ctx.store.set('size', size);
        y = 0; render(); ctx.toast('已应用');
      };
      root.querySelector('#sz').oninput = function () { size = +this.value; inner.style.fontSize = size + 'px'; };
      root.querySelector('#sp').oninput = function () { speed = +this.value; };
      root.querySelector('#fs').onclick = function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else mask.requestFullscreen && mask.requestFullscreen();
      };
      render();
      return { destroy: function () { if (raf) cancelAnimationFrame(raf); } };
    }
  });
})();
