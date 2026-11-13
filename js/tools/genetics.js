/* 遗传概率演练：庞纳特方格 */
(function () {
  'use strict';
  Tools.add({
    id: 'genetics', name: '遗传概率演练', icon: '🧬',
    mount: function (root, ctx) {
      var opts1 = ['AA', 'Aa', 'aa'];
      var opts2 = ['AA', 'Aa', 'aa', 'AABB', 'AaBB', 'AaBb', 'Aabb', 'aaBb', 'aabb'];

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🧬</span><h2>遗传概率演练</h2></div>' +
        '<p class="cr-sub">选两个亲本基因型做杂交，自动生成庞纳特方格、基因型比与表型比。</p>' +
        '<div class="cr-panel"><div class="cr-row">' +
        '<span class="cr-label">亲本 1（♂）</span><select class="cr-select" id="g1">' +
        opts1.map(function (g) { return '<option value="' + g + '"' + (g === 'Aa' ? ' selected' : '') + '>' + g + '</option>'; }).join('') +
        '</select><span class="cr-label">×</span>' +
        '<span class="cr-label">亲本 2（♀）</span><select class="cr-select" id="g2">' +
        opts2.map(function (g) { return '<option value="' + g + '"' + (g === 'Aa' ? ' selected' : '') + '>' + g + '</option>'; }).join('') +
        '</select><button class="cr-btn primary" id="go">杂交</button></div>' +
        '<div id="res"></div></div>' +
        '<div class="cr-panel"><div class="cr-row"><span class="cr-label">经典例题（点击载入）</span></div><div class="cr-row" id="probs" style="gap:6px"></div></div></div>';

      var g1 = root.querySelector('#g1'), g2 = root.querySelector('#g2'), res = root.querySelector('#res');

      function phenoName(ph) {
        // D=显性 r=隐性；给一个可读名
        var n = '';
        for (var i = 0; i < ph.length; i++) n += ph[i] === 'D' ? '显' : '隐';
        return n;
      }
      function run() {
        var a = g1.value, b = g2.value;
        var r = GenCore.pair(a, b);
        var n = a.length > 2 || b.length > 2 ? 16 : 4;
        var html = '<div class="cr-row" style="margin-top:8px"><span class="cr-pill">' + a + ' × ' + b +
          ' → 共 ' + r.cells.length + ' 种组合</span></div>';
        // 方格
        var gs1 = GenCore.gametes(a), gs2 = GenCore.gametes(b);
        html += '<div style="overflow:auto"><table class="punnett"><tr><th>♀ \\ ♂</th>';
        gs1.forEach(function (gm) { html += '<th>' + gm + '</th>'; });
        html += '</tr>';
        gs2.forEach(function (gf, row) {
          html += '<tr><th>' + gf + '</th>';
          gs1.forEach(function (gm, col) {
            html += '<td>' + r.cells[row * gs1.length + col].geno + '</td>';
          });
          html += '</tr>';
        });
        html += '</table></div>';
        html += '<p><b>基因型比</b>（' + Object.keys(r.genotype).map(function (k) { return k + ' ' + r.genotype[k]; }).join('，') + '）→ <b>' + GenCore.ratio(r.genotype) + '</b></p>';
        html += '<p><b>表型比</b>：' + Object.keys(r.phenotype).map(function (k) {
          return phenoName(k) + ' ' + r.phenotype[k];
        }).join('，') + ' → <b>' + GenCore.ratio(r.phenotype) + '</b></p>';
        var pK = Object.keys(r.phenotype);
        if (pK.length === 2) {
          html += '<p class="cr-hint">' + phenoName(pK[0]) + ' 概率 ' + Math.round(r.phenotype[pK[0]] / r.cells.length * 100) + '%，' +
            phenoName(pK[1]) + ' 概率 ' + Math.round(r.phenotype[pK[1]] / r.cells.length * 100) + '%</p>';
        }
        res.innerHTML = html;
      }

      var probs = [
        ['豌豆圆粒 Aa × Aa', 'Aa', 'Aa'],
        ['白化病携带者 Aa × aa', 'Aa', 'aa'],
        ['Aa × AA', 'Aa', 'AA'],
        ['两对相对性状 AaBb × AaBb', 'AaBb', 'AaBb'],
        ['AaBb × aabb（测交）', 'AaBb', 'aabb'],
        ['果蝇红眼 Aa × Aa（简化）', 'Aa', 'Aa'],
        ['ABO 简化模型 Ai × Ai → 用 Aa 模拟', 'Aa', 'Aa'],
        ['自由组合 AaBB × Aabb', 'AaBB', 'Aabb']
      ];
      var probsEl = root.querySelector('#probs');
      probs.forEach(function (p) {
        var btn = document.createElement('button');
        btn.className = 'cr-btn';
        btn.style.fontSize = '12px';
        btn.textContent = p[0];
        btn.onclick = function () { g1.value = p[1]; g2.value = p[2]; run(); };
        probsEl.appendChild(btn);
      });

      root.querySelector('#go').onclick = run;
      run();
      return {};
    }
  });
})();
