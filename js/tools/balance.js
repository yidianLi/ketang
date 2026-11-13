/* 化学方程式配平：解析 + 自动配平 + 例题 */
(function () {
  'use strict';
  Tools.add({
    id: 'balance', name: '化学方程式配平', icon: '⚖️',
    mount: function (root, ctx) {
      var lastResult = null;

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">⚖️</span><h2>化学方程式配平</h2></div>' +
        '<p class="cr-sub">输入方程式（如 <code>Fe + O2 -&gt; Fe3O4</code>），自动用元素守恒配平；支持括号，如 <code>Ca(OH)2</code>。</p>' +
        '<div class="cr-panel"><div class="cr-row">' +
        '<input class="cr-input" id="eq" style="flex:1;min-width:260px" placeholder="Fe + O2 -> Fe3O4">' +
        '<button class="cr-btn primary" id="go">配平</button></div>' +
        '<div class="cr-big" id="out" style="font-size:24px;min-height:60px">等待输入…</div>' +
        '<p class="cr-hint" id="why"></p></div>' +
        '<div class="cr-panel"><div class="cr-row"><span class="cr-label">例题（点击载入）</span></div>' +
        '<div class="cr-row" id="eqs" style="gap:6px"></div></div></div>';

      var eq = root.querySelector('#eq'), out = root.querySelector('#out'), why = root.querySelector('#why');

      function show(s, cls) { out.className = 'cr-big ' + (cls || ''); out.style.fontSize = '24px'; out.textContent = s; }

      function doBalance() {
        var s = eq.value.trim();
        if (!s) return;
        try {
          var r = BalanceCore.solve(s);
          if (!r) { show('无法配平：请检查元素是否守恒或化学式是否正确', 'cr-bad'); why.textContent = ''; return; }
          var nLeft = BalanceCore.parse(s).left.length;
          var lhs = [], rhs = [];
          r.species.forEach(function (sp, i) {
            var c = r.coeffs[i] === 1 ? '' : r.coeffs[i];
            (i < nLeft ? lhs : rhs).push(c + sp);
          });
          show(lhs.join(' + ') + ' = ' + rhs.join(' + '), 'cr-ok');
          why.textContent = '检验：' + r.elements.map(function (e) {
            var l = 0, rt = 0;
            r.species.forEach(function (sp, i) {
              var n = (BalanceCore.atomsOf(sp)[e] || 0) * r.coeffs[i];
              if (i < nLeft) l += n; else rt += n;
            });
            return e + '：' + l + ' = ' + rt;
          }).join('，');
        } catch (err) {
          show('解析失败', 'cr-bad');
          why.textContent = err.message;
        }
      }

      var eqsEl = root.querySelector('#eqs');
      (window.EQUATIONS || []).forEach(function (x) {
        var b = document.createElement('button');
        b.className = 'cr-btn';
        b.style.fontSize = '12px';
        b.textContent = x.name;
        b.title = x.eq;
        b.onclick = function () { eq.value = x.eq; doBalance(); };
        eqsEl.appendChild(b);
      });

      root.querySelector('#go').onclick = doBalance;
      eq.addEventListener('keydown', function (e) { if (e.key === 'Enter') doBalance(); });
      if (window.EQUATIONS && window.EQUATIONS.length) { eq.value = window.EQUATIONS[0].eq; doBalance(); }
      return {};
    }
  });
})();
