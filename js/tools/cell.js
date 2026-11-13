/* 细胞结构解剖图：SVG 热区 + 弹层释义 */
(function () {
  'use strict';
  Tools.add({
    id: 'cell', name: '细胞结构解剖', icon: '🔬',
    mount: function (root, ctx) {
      var cur = ctx.store.get('set', 'animal');

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🔬</span><h2>细胞结构解剖</h2></div>' +
        '<p class="cr-sub">点击细胞上的结构，弹出「功能 + 考点」；动物/植物对照记忆。</p>' +
        '<div class="cr-panel"><div class="cr-row">' +
        '<button class="cr-btn" data-set="animal">动物细胞</button>' +
        '<button class="cr-btn" data-set="plant">植物细胞</button>' +
        '<span class="cr-hint" id="hint"></span></div>' +
        '<div class="cell-wrap" id="cv"></div></div></div>';

      var cv = root.querySelector('#cv'), hint = root.querySelector('#hint');
      var selEl = null;

      function render() {
        var set = (window.CELL_SETS || {})[cur];
        if (!set) { cv.textContent = '数据缺失'; return; }
        hint.textContent = set.name + ' · ' + set.items.length + ' 个结构';
        var svg = '<svg viewBox="0 0 640 420" role="img" aria-label="' + set.name + '模式图">';
        svg += '<ellipse cx="320" cy="210" rx="300" ry="192" fill="none"/>';
        set.items.forEach(function (it, i) {
          if (it.ring) {
            svg += '<ellipse class="hot" data-i="' + i + '" cx="' + it.cx + '" cy="' + it.cy + '" rx="' + it.rx + '" ry="' + it.ry +
              '" fill="none" stroke="' + (cur === 'plant' && it.id === 'wall' ? '#8a6a4a' : '#c98a72') + '" stroke-width="7" opacity=".9"/>';
          } else {
            svg += '<ellipse class="hot" data-i="' + i + '" cx="' + it.cx + '" cy="' + it.cy + '" rx="' + it.rx + '" ry="' + it.ry +
              '" fill="' + (it.id === 'vac' ? 'rgba(150,190,220,.35)' : 'rgba(200,150,110,.45)') +
              '" stroke="#8a6a52" stroke-width="1.5"/>';
            svg += '<text x="' + it.cx + '" y="' + (it.cy + 4) + '" text-anchor="middle" font-size="11" fill="#3b3335" pointer-events="none">' + UI.esc(it.name.slice(0, 4)) + '</text>';
          }
        });
        svg += '</svg>';
        cv.innerHTML = svg;
        selEl = null;
        cv.querySelectorAll('.hot').forEach(function (el) {
          el.addEventListener('click', function () {
            if (selEl) selEl.classList.remove('sel');
            selEl = el; el.classList.add('sel');
            var it = set.items[+el.getAttribute('data-i')];
            ctx.sfx.tick();
            UI.modal(
              '<h3>' + UI.esc(it.name) + '</h3>' +
              '<p><b>功能：</b>' + UI.esc(it.func) + '</p>' +
              '<p><b>考点：</b>' + UI.esc(it.point) + '</p>',
              [{ txt: '关闭', primary: true }]
            );
          });
        });
      }

      root.querySelectorAll('[data-set]').forEach(function (b) {
        b.onclick = function () {
          cur = b.getAttribute('data-set');
          ctx.store.set('set', cur);
          root.querySelectorAll('[data-set]').forEach(function (x) { x.classList.toggle('primary', x === b); });
          render();
        };
      });
      root.querySelector('[data-set="' + cur + '"]').classList.add('primary');
      render();
      return {};
    }
  });
})();
