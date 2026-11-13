/* 随堂小测：5 科题库 · 即时批改 · 错题回顾 · CSV 导出 */
(function () {
  'use strict';
  Tools.add({
    id: 'quiz', name: '随堂小测', icon: '✏️',
    mount: function (root, ctx) {
      var bank = window.QUIZBANK || [];
      var subjects = [];
      bank.forEach(function (q) { if (subjects.indexOf(q.subject) < 0) subjects.push(q.subject); });
      var answers = [], qs = [], idx = 0, phase = 'pick';

      root.innerHTML =
        '<div class="cr-wrap">' +
        '<div class="cr-title"><span class="ic">✏️</span><h2>随堂小测</h2></div>' +
        '<p class="cr-sub">每科 10 题，即时批改；结束后可回看错题、导出 CSV。</p>' +
        '<div class="cr-panel" id="pick"><div class="cr-row"><span class="cr-label">选择科目</span></div>' +
        '<div class="cr-row" id="subs" style="gap:6px"></div></div>' +
        '<div class="cr-panel" id="run" hidden>' +
        '<div class="cr-row"><span class="cr-pill" id="pos"></span><span class="cr-label" id="subject"></span></div>' +
        '<div class="cr-q" id="q"></div><div id="opts"></div>' +
        '<p class="cr-hint" id="why"></p></div>' +
        '<div class="cr-panel" id="done" hidden><div class="cr-big" id="score"></div>' +
        '<div class="cr-row" style="justify-content:center">' +
        '<button class="cr-btn primary" id="review">错题回顾</button>' +
        '<button class="cr-btn" id="csv">导出 CSV</button>' +
        '<button class="cr-btn" id="again">再来一次</button></div>' +
        '<p class="cr-hint" style="text-align:center" id="dmsg"></p></div></div>';

        var pick = root.querySelector('#pick'), run = root.querySelector('#run'),
            done = root.querySelector('#done'), subs = root.querySelector('#subs');

        subjects.forEach(function (s) {
          var b = document.createElement('button');
          b.className = 'cr-btn primary';
          b.textContent = s + '（10 题）';
          b.onclick = function () { start(s); };
          subs.appendChild(b);
        });

        function start(subject) {
          qs = bank.filter(function (q) { return q.subject === subject; });
          answers = new Array(qs.length);
          idx = 0; phase = 'run';
          pick.hidden = true; done.hidden = true; run.hidden = false;
          renderQ();
        }
        function renderQ() {
          var q = qs[idx];
          root.querySelector('#pos').textContent = '第 ' + (idx + 1) + ' / ' + qs.length + ' 题';
          root.querySelector('#subject').textContent = q.subject;
          root.querySelector('#q').textContent = q.q;
          root.querySelector('#why').textContent = '';
          var oe = root.querySelector('#opts');
          oe.innerHTML = '';
          q.opts.forEach(function (o, i) {
            var b = document.createElement('button');
            b.className = 'cr-opt';
            b.textContent = String.fromCharCode(65 + i) + '. ' + o;
            b.onclick = function () { pickOpt(i); };
            oe.appendChild(b);
          });
        }
        function pickOpt(i) {
          answers[idx] = i;
          var q = qs[idx];
          var bs = root.querySelectorAll('#opts .cr-opt');
          bs.forEach(function (b, bi) {
            b.disabled = true;
            if (bi === q.a) b.classList.add('right');
            else if (bi === i) b.classList.add('wrong');
          });
          root.querySelector('#why').textContent = (i === q.a ? '✓ 正确。' : '✗ 错误。') + '解析：' + q.why;
          if (i === q.a) ctx.sfx.ok(); else ctx.sfx.buzz();
          var next = document.createElement('button');
          next.className = 'cr-btn primary';
          next.style.marginTop = '6px';
          next.textContent = idx + 1 < qs.length ? '下一题 →' : '查看成绩 →';
          next.onclick = function () {
            if (idx + 1 < qs.length) { idx++; renderQ(); }
            else finish();
          };
          root.querySelector('#why').appendChild(document.createElement('br'));
          root.querySelector('#why').appendChild(next);
        }
        function finish() {
          phase = 'done';
          run.hidden = true; done.hidden = false;
          var r = QuizCore.grade(qs, answers);
          root.querySelector('#score').textContent = r.right + ' / ' + r.total;
          root.querySelector('#score').className = 'cr-big ' + (r.right / r.total >= 0.6 ? 'cr-ok' : 'cr-bad');
          root.querySelector('#dmsg').textContent = r.wrong.length ? '有 ' + r.wrong.length + ' 道错题，可回顾或导出。' : '全对！太棒了！';
          if (r.right / r.total >= 0.6) ctx.sfx.ok(); else ctx.sfx.buzz();
          ctx.store.set('last', { subject: qs[0].subject, right: r.right, total: r.total, at: Date.now() });
        }
        root.querySelector('#review').onclick = function () {
          var r = QuizCore.grade(qs, answers);
          var html = '<h3>错题回顾（' + r.wrong.length + ' 题）</h3>';
          if (!r.wrong.length) html += '<p>没有错题，满分通过！</p>';
          r.wrong.forEach(function (i) {
            var q = qs[i];
            html += '<p><b>' + q.q + '</b><br>你的答案：' + (answers[i] == null ? '未答' : q.opts[answers[i]]) +
              '<br><span class="cr-ok">正确：' + q.opts[q.a] + '</span><br><span class="cr-hint">' + UI.esc(q.why) + '</span></p>';
          });
          UI.modal(html, [{ txt: '关闭', primary: true }]);
        };
        root.querySelector('#csv').onclick = function () {
          var rows = [['序号', '科目', '题目', '你的答案', '正确答案', '是否正确', '解析']];
          qs.forEach(function (q, i) {
            rows.push([i + 1, q.subject, q.q, answers[i] == null ? '' : q.opts[answers[i]], q.opts[q.a],
              answers[i] === q.a ? '对' : '错', q.why]);
          });
          var csv = '\uFEFF' + rows.map(function (r) {
            return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
          }).join('\r\n');
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '随堂小测_' + (qs[0] ? qs[0].subject : '成绩') + '.csv';
          document.body.appendChild(a); a.click(); a.remove();
          ctx.toast('已导出 CSV');
        };
        root.querySelector('#again').onclick = function () {
          done.hidden = true; pick.hidden = false;
        };
        return {};
    }
  });
})();
