/* ============================================================
   cores.js — 课堂工具纯逻辑层（浏览器与 Node 双端可跑）
   window.XxxCore 挂载；Node 下 module.exports 一并导出。
   所有函数无 DOM、无存储副作用，便于 verify-classroom.js 断言。
   ============================================================ */
(function (root) {
  'use strict';

  /* ================= 随机点名 ================= */
  var RollCore = {
    defaults: function (n) {
      n = n || 40;
      var a = [];
      for (var i = 1; i <= n; i++) a.push(i < 10 ? '0' + i : '' + i);
      return a;
    },
    parse: function (text) {
      var seen = {}, out = [];
      String(text || '').split(/[\n,，、;；\t]+/).forEach(function (s) {
        s = s.trim();
        if (s && !seen[s]) { seen[s] = 1; out.push(s); }
      });
      return out;
    },
    pick: function (list, recent, rand) {
      if (!list.length) return null;
      var pool = list.filter(function (n) { return recent.indexOf(n) < 0; });
      if (!pool.length) { pool = list.slice(); recent.length = 0; }
      var r = rand ? rand() : Math.random();
      return pool[Math.floor(r * pool.length)];
    },
    pushRecent: function (list, recent, name) {
      recent.push(name);
      if (recent.length >= list.length) return [];   // 一轮抽满自动清空
      return recent;
    }
  };

  /* ================= 抢答计分 ================= */
  var ScoreCore = {
    initTeams: function (n, names) {
      var out = [];
      for (var i = 0; i < n; i++) {
        out.push({ name: (names && names[i]) || '第' + (i + 1) + '组', score: 0 });
      }
      return out;
    },
    apply: function (teams, idx, delta) {
      var out = teams.map(function (t) { return { name: t.name, score: t.score }; });
      if (idx >= 0 && idx < out.length) out[idx].score += delta;
      return out;
    },
    ranked: function (teams) {
      return teams.map(function (t, i) { return { i: i, name: t.name, score: t.score }; })
        .sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    }
  };

  /* ================= 背诵 PK ================= */
  var PkCore = {
    result: function (a, b) { return a > b ? 'a' : b > a ? 'b' : 'draw'; },
    nextTurn: function (turn) { return turn === 'a' ? 'b' : 'a'; }
  };

  /* ================= 闪记 PK ================= */
  var FlashCore = {
    makeRound: function (pool, field, rand) {
      if (!pool || pool.length < 4) return null;
      var r = rand || Math.random;
      var idx = Math.floor(r() * pool.length);
      var item = pool[idx];
      var others = pool.filter(function (_, i) { return i !== idx; });
      // 洗牌取 2 个干扰项
      for (var i = others.length - 1; i > 0; i--) {
        var j = Math.floor(r() * (i + 1));
        var t = others[i]; others[i] = others[j]; others[j] = t;
      }
      var opts = [item].concat(others.slice(0, 2));
      // 选项洗牌
      for (var k = opts.length - 1; k > 0; k--) {
        var j2 = Math.floor(r() * (k + 1));
        var t2 = opts[k]; opts[k] = opts[j2]; opts[j2] = t2;
      }
      return { item: item, field: field || 'zh', options: opts, answer: opts.indexOf(item) };
    },
    judge: function (round, idx) { return !!round && idx === round.answer; }
  };

  /* ================= 番茄钟 ================= */
  var PomoCore = {
    WORK: 25 * 60, BREAK: 5 * 60,
    tick: function (remain) { return remain - 1; },
    nextPhase: function (phase) { return phase === 'work' ? 'break' : 'work'; },
    initial: function (phase) { return phase === 'break' ? 5 * 60 : 25 * 60; }
  };

  /* ================= 化学方程式配平 ================= */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
  // 有理数（分数）
  function F(n, d) { d = d || 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function fAdd(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fSub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fMul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function fDiv(a, b) { return F(a.n * b.d, a.d * b.n); }
  function fVal(a) { return a.n / a.d; }

  function atomsOf(formula) {
    var s = formula.replace(/^\d+/, '');       // 去掉误写的前导系数
    var i = 0;
    function readNum() {
      var d = '';
      while (i < s.length && /[0-9]/.test(s[i])) { d += s[i]; i++; }
      return d ? parseInt(d, 10) : 1;
    }
    function parseGroup() {
      var local = {};
      while (i < s.length) {
        var c = s[i];
        if (c === '(') {
          i++;
          var inner = parseGroup();
          var num = readNum();
          for (var k in inner) local[k] = (local[k] || 0) + inner[k] * num;
        } else if (c === ')') { i++; break; }
        else if (c === '·' || c === '.') { throw new Error('暂不支持结晶水（·）'); }
        else if (/[A-Z]/.test(c)) {
          var el2 = c; i++;
          while (i < s.length && /[a-z]/.test(s[i])) { el2 += s[i]; i++; }
          var n2 = readNum();
          local[el2] = (local[el2] || 0) + n2;
        } else if (/[0-9]/.test(c)) { throw new Error('位置不对的数字：' + c); }
        else { throw new Error('无法识别的字符：' + c); }
      }
      return local;
    }
    var counts = parseGroup();
    if (i < s.length) throw new Error('多余的右括号');
    return counts;
  }

  var BalanceCore = {
    atomsOf: atomsOf,
    gcd: gcd, lcm: lcm,
    parse: function (eq) {
      var m = String(eq).split(/->|→|＝|=/);
      if (m.length !== 2) throw new Error('方程式需要 “->” 分隔两侧');
      var side = function (str) {
        return str.split('+').map(function (t) { return t.trim(); }).filter(Boolean);
      };
      var left = side(m[0]), right = side(m[1]);
      if (!left.length || !right.length) throw new Error('左右两侧都不能为空');
      left.forEach(function (t) { atomsOf(t); });
      right.forEach(function (t) { atomsOf(t); });
      return { left: left, right: right };
    },
    /* 返回 {coeffs:[左…右…], elements:[…]}；解不了返回 null */
    solve: function (eq) {
      var parsed = BalanceCore.parse(eq);
      var species = parsed.left.concat(parsed.right);
      var elements = [];
      var seen = {};
      species.forEach(function (t) {
        var a = atomsOf(t);
        for (var e in a) if (!seen[e]) { seen[e] = 1; elements.push(e); }
      });
      var rows = elements.length, cols = species.length;
      var A = [];
      for (var r = 0; r < rows; r++) {
        A.push([]);
        for (var c = 0; c < cols; c++) {
          var cnt = atomsOf(species[c])[elements[r]] || 0;
          A[r][c] = F(c < parsed.left.length ? cnt : -cnt, 1);
        }
      }
      // RREF（部分消元）
      var pivotCols = [], row = 0;
      for (var col = 0; col < cols && row < rows; col++) {
        var piv = -1;
        for (var rr = row; rr < rows; rr++) if (fVal(A[rr][col]) !== 0) { piv = rr; break; }
        if (piv < 0) continue;
        var tmp = A[row]; A[row] = A[piv]; A[piv] = tmp;
        var pv = A[row][col];
        for (var cc = 0; cc < cols; cc++) A[row][cc] = fDiv(A[row][cc], pv);
        for (var r2 = 0; r2 < rows; r2++) {
          if (r2 !== row && fVal(A[r2][col]) !== 0) {
            var factor = A[r2][col];
            for (var c3 = 0; c3 < cols; c3++) A[r2][c3] = fSub(A[r2][c3], fMul(factor, A[row][c3]));
          }
        }
        pivotCols.push(col); row++;
      }
      if (pivotCols.length >= cols) return null;   // 只有零解
      // 取一个自由列
      var freeCol = -1;
      for (var c4 = 0; c4 < cols; c4++) if (pivotCols.indexOf(c4) < 0) { freeCol = c4; break; }
      var vec = [];
      for (var c5 = 0; c5 < cols; c5++) vec.push(F(0, 1));
      vec[freeCol] = F(1, 1);
      for (var rr2 = 0; rr2 < pivotCols.length; rr2++) {
        vec[pivotCols[rr2]] = fSub(F(0, 1), A[rr2][freeCol]);
      }
      // 扩到最小正整数
      var L = 1;
      vec.forEach(function (v) { L = lcm(L, v.d); });
      var ints = vec.map(function (v) { return Math.round(fVal(v) * L); });
      var g0 = 0;
      ints.forEach(function (v) { g0 = gcd(g0, v); });
      ints = ints.map(function (v) { return v / g0; });
      if (ints.filter(function (v) { return v < 0; }).length > 0 &&
          ints.filter(function (v) { return v > 0; }).length === 0) {
        ints = ints.map(function (v) { return -v; });
      }
      if (ints.filter(function (v) { return v <= 0; }).length > 0) return null; // 需要全部为正
      // 验证守恒（直接按元素清点）
      for (var r3 = 0; r3 < rows; r3++) {
        var sum = 0;
        for (var c6 = 0; c6 < cols; c6++) {
          sum += (c6 < parsed.left.length ? 1 : -1) * (atomsOf(species[c6])[elements[r3]] || 0) * ints[c6];
        }
        if (sum !== 0) return null;
      }
      return { coeffs: ints, elements: elements, species: species };
    },
    /* 用系数检查手写方程是否守恒 */
    check: function (eq, coeffs) {
      var sol = BalanceCore.solve(eq);
      if (!sol) return { balanced: false, reason: '无法配平' };
      if (!coeffs) return { balanced: true, coeffs: sol.coeffs, species: sol.species };
      for (var i = 0; i < sol.coeffs.length; i++) {
        if (Number(coeffs[i]) !== sol.coeffs[i]) return { balanced: false, coeffs: sol.coeffs, species: sol.species };
      }
      return { balanced: true, coeffs: sol.coeffs, species: sol.species };
    }
  };

  /* ================= 遗传概率 ================= */
  var GenCore = {
    genes: function (g) {
      var out = [];
      for (var i = 0; i < g.length; i += 2) out.push([g[i], g[i + 1]]);
      return out;
    },
    gametes: function (g) {
      var gs = GenCore.genes(g);
      var out = [''];
      gs.forEach(function (pair) {
        var next = [];
        out.forEach(function (pre) {
          pair.forEach(function (al) { next.push(pre + al); });
        });
        out = next;
      });
      return out;
    },
    pair: function (g1, g2) {
      var a = GenCore.gametes(g1), b = GenCore.gametes(g2);
      var cells = [], gCount = {}, pCount = {};
      a.forEach(function (ga) {
        b.forEach(function (gb) {
          var geno = '';
          var genes1 = GenCore.genes(g1), genes2 = GenCore.genes(g2);
          var pheno = '';
          for (var i = 0; i < genes1.length; i++) {
            var al = [ga[i], gb[i]].sort(function (x, y) {
              var ux = x === x.toUpperCase(), uy = y === y.toUpperCase();
              return ux === uy ? (x < y ? -1 : 1) : (ux ? -1 : 1);
            });
            geno += al[0] + al[1];
            pheno += (ga[i] === ga[i].toUpperCase() || gb[i] === gb[i].toUpperCase()) ? 'D' : 'r';
          }
          gCount[geno] = (gCount[geno] || 0) + 1;
          pCount[pheno] = (pCount[pheno] || 0) + 1;
          cells.push({ ga: ga, gb: gb, geno: geno, pheno: pheno });
        });
      });
      return { cells: cells, genotype: gCount, phenotype: pCount };
    },
    ratio: function (counts) {
      var keys = Object.keys(counts);
      if (!keys.length) return '';
      var g = 0;
      keys.forEach(function (k) { g = gcd(g, counts[k]); });
      return keys.map(function (k) { return counts[k] / g; }).join(' : ');
    }
  };

  /* ================= 气候特征（判读依据） ================= */
  var ClimateCore = {
    features: function (temp, rain) {
      var minT = 999, maxT = -999, minI = 0, maxI = 0, annual = 0;
      for (var i = 0; i < 12; i++) {
        if (temp[i] < minT) { minT = temp[i]; minI = i; }
        if (temp[i] > maxT) { maxT = temp[i]; maxI = i; }
        annual += rain[i];
      }
      var summer = 0;
      for (var j = 4; j <= 8; j++) summer += rain[j];   // 5-9 月（北半球夏季）
      return {
        coldest: minT, warmest: maxT, coldestIdx: minI, warmestIdx: maxI,
        annual: Math.round(annual),
        summerFrac: annual ? Math.round(summer / annual * 100) : 0,
        south: minI >= 6,                    // 最冷月在 7/8 月附近 → 南半球
        yearRain: annual > 1500,
        monthsAbove22: temp.filter(function (t) { return t >= 22; }).length
      };
    },
    basis: function (f) {
      var out = [];
      out.push('最冷月 ' + f.coldest + '℃（' + (f.coldestIdx + 1) + ' 月）· 最热月 ' + f.warmest + '℃');
      out.push('年降水约 ' + f.annual + ' mm，5–9 月占 ' + f.summerFrac + '%');
      if (f.south) out.push('最冷月出现在年中 → 南半球');
      else out.push(f.coldest >= 15 ? '最冷月 ≥15℃ → 热带' : f.coldest <= 0 ? '最冷月 ≤0℃ → 温带/寒带' : '最冷月 0~15℃ → 亚热带/温带海洋');
      return out;
    }
  };

  /* ================= 单词记忆（艾宾浩斯） ================= */
  var WordCore = {
    INTERVALS: [1, 2, 4, 7, 15],
    due: function (list, today) {
      return list.filter(function (w) { return (w.due || 0) <= today; });
    },
    next: function (w, ok, today) {
      var out = { en: w.en, zh: w.zh, pos: w.pos, ex: w.ex, box: w.box || 0, due: w.due || 0 };
      if (ok) {
        out.box = Math.min((w.box || 0) + 1, WordCore.INTERVALS.length - 1);
        out.due = today + WordCore.INTERVALS[out.box];
      } else {
        out.box = 0;
        out.due = today + 1;
      }
      return out;
    }
  };

  /* ================= 随堂小测判分 ================= */
  var QuizCore = {
    grade: function (questions, answers) {
      var wrong = [];
      var right = 0;
      questions.forEach(function (q, i) {
        if (answers[i] === q.a) right++; else wrong.push(i);
      });
      return { right: right, total: questions.length, wrong: wrong };
    }
  };

  var API = {
    RollCore: RollCore, ScoreCore: ScoreCore, PkCore: PkCore, FlashCore: FlashCore,
    PomoCore: PomoCore, BalanceCore: BalanceCore, GenCore: GenCore,
    ClimateCore: ClimateCore, WordCore: WordCore, QuizCore: QuizCore
  };

  for (var k in API) root[k] = API[k];
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
