/* 气候类型判读：气温曲线 + 降水柱状双轴图 */
(function () {
  'use strict';
  Tools.add({
    id: 'climate', name: '气候类型判读', icon: '🌦️',
    mount: function (root, ctx) {
      var current = null, answered = 0, correct = 0;
      var score = ctx.store.get('score', { answered: 0, correct: 0 });

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">🌦️</span><h2>气候类型判读</h2></div>' +
        '<p class="cr-sub">看气温曲线 + 降水柱状图判断气候类型；答后给出判读依据。</p>' +
        '<div class="cr-panel climate-wrap"><canvas id="cv" height="300"></canvas>' +
        '<div class="cr-row" style="margin-top:10px" id="opts"></div>' +
        '<p class="cr-hint" id="msg">累计：' + score.correct + ' / ' + score.answered + ' 正确</p></div>' +
        '<div class="cr-panel"><div class="cr-row"><span class="cr-label">判读依据（当前图）</span></div><p class="cr-hint" id="basis">先抽一题</p></div></div>';

      var cv = root.querySelector('#cv'), ctx2d = cv.getContext('2d'),
          opts = root.querySelector('#opts'), msg = root.querySelector('#msg'),
          basis = root.querySelector('#basis');
      var data = window.CLIMATES || [];

      function fit() {
        var dpr = window.devicePixelRatio || 1;
        cv.width = cv.clientWidth * dpr;
        cv.height = 300 * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function draw(c) {
        fit();
        var W = cv.clientWidth, H = 300;
        var pad = { l: 44, r: 46, t: 18, b: 26 };
        var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
        var p = window.CanvasTheme ? CanvasTheme.palette() : { canvas: '#ffffff', ink: '#3b3335', muted: '#9a8f93', line: '#f1e7e6', axis: '#7d7d7d', label: '#5c4433', accent: '#e8879b', info: '#4a6b8a' };
        ctx2d.fillStyle = p.canvas;
        ctx2d.fillRect(0, 0, W, H);
        var tMin = Math.min(-10, Math.floor(Math.min.apply(null, c.temp) / 10) * 10);
        var tMax = Math.max(10, Math.ceil(Math.max.apply(null, c.temp) / 10) * 10);
        var rMax = Math.max(60, Math.ceil(Math.max.apply(null, c.rain) / 50) * 50);
        var X = function (i) { return pad.l + iw * (i + 0.5) / 12; };
        var Yt = function (t) { return pad.t + ih * (1 - (t - tMin) / (tMax - tMin)); };
        var Yr = function (r) { return pad.t + ih * (1 - r / rMax); };
        // 网格
        ctx2d.strokeStyle = p.line; ctx2d.lineWidth = 1;
        for (var t = tMin; t <= tMax; t += 10) {
          ctx2d.beginPath(); ctx2d.moveTo(pad.l, Yt(t)); ctx2d.lineTo(W - pad.r, Yt(t)); ctx2d.stroke();
          ctx2d.fillStyle = p.muted; ctx2d.font = '10px sans-serif'; ctx2d.textAlign = 'right';
          ctx2d.fillText(t + '°', pad.l - 5, Yt(t) + 3);
        }
        // 降水柱
        ctx2d.fillStyle = 'rgba(90,140,190,.4)';
        for (var i = 0; i < 12; i++) {
          var bw = iw / 12 * 0.5;
          ctx2d.fillRect(X(i) - bw / 2, Yr(c.rain[i]), bw, pad.t + ih - Yr(c.rain[i]));
        }
        // 气温曲线
        ctx2d.strokeStyle = p.accent; ctx2d.lineWidth = 2.2;
        ctx2d.beginPath();
        for (var j = 0; j < 12; j++) {
          if (j) ctx2d.lineTo(X(j), Yt(c.temp[j])); else ctx2d.moveTo(X(0), Yt(c.temp[0]));
        }
        ctx2d.stroke();
        ctx2d.fillStyle = p.accent;
        for (var k = 0; k < 12; k++) { ctx2d.beginPath(); ctx2d.arc(X(k), Yt(c.temp[k]), 3, 0, Math.PI * 2); ctx2d.fill(); }
        // 月份轴
        ctx2d.fillStyle = p.label; ctx2d.textAlign = 'center';
        for (var m = 0; m < 12; m++) ctx2d.fillText(m + 1, X(m), H - 8);
        ctx2d.textAlign = 'left';
        ctx2d.fillStyle = p.muted;
        ctx2d.fillText('℃', 4, pad.t + 8);
        ctx2d.save(); ctx2d.translate(W - 8, pad.t); ctx2d.rotate(Math.PI / 2);
        ctx2d.fillText('降水 mm →', 0, 8); ctx2d.restore();
      }

      function newQuestion() {
        var idx = Math.floor(Math.random() * data.length);
        current = data[idx];
        draw(current);
        basis.textContent = '图已生成，选择你判断的气候类型';
        msg.textContent = '累计：' + score.correct + ' / ' + score.answered + ' 正确';
        var wrongs = data.filter(function (d) { return d.id !== current.id; })
          .sort(function () { return Math.random() - 0.5; }).slice(0, 3);
        var all = wrongs.concat([current]).sort(function () { return Math.random() - 0.5; });
        opts.innerHTML = '';
        all.forEach(function (d) {
          var b = document.createElement('button');
          b.className = 'cr-btn';
          b.textContent = d.name;
          b.onclick = function () { answer(d, b); };
          opts.appendChild(b);
        });
      }

      function answer(d, btn) {
        score.answered++;
        var ok = d.id === current.id;
        if (ok) { score.correct++; ctx.sfx.ok(); btn.classList.add('right'); }
        else {
          ctx.sfx.buzz(); btn.classList.add('wrong');
          opts.querySelectorAll('.cr-btn').forEach(function (b) {
            if (b.textContent === current.name) b.classList.add('right');
          });
        }
        ctx.store.set('score', score);
        msg.textContent = (ok ? '✓ 正确！' : '✗ 应为 ' + current.name + '。') + ' 累计：' + score.correct + ' / ' + score.answered;
        basis.textContent = current.basis + '。（' + ClimateCore.basis(ClimateCore.features(current.temp, current.rain)).join('；') + '）';
        opts.querySelectorAll('.cr-btn').forEach(function (b) { b.disabled = true; });
        var next = document.createElement('button');
        next.className = 'cr-btn primary';
        next.textContent = '下一题 →';
        next.onclick = newQuestion;
        opts.appendChild(next);
      }

      if (window.CanvasTheme) CanvasTheme.on(function () { if (current) draw(current); });
      var first = document.createElement('button');
      first.className = 'cr-btn primary'; first.textContent = '抽一题';
      first.onclick = newQuestion;
      opts.appendChild(first);
      return { destroy: function () {} };
    }
  });
})();
