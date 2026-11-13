/* ============================================================
   公式实验室 · 迷你 TeX 排版器
   ------------------------------------------------------------
   支持子集（覆盖原站公式库全部用到的记号）：
   · \frac{a}{b} 分式          · \sqrt{a}、\sqrt[n]{a} 根号
   · x^2 / x_1 上下标（可嵌套）
   · \bar v \vec v 向量/平均
   · 希腊字母 \rho \eta \mu \omega \theta \pi \lambda \nu \Delta \Sigma…
   · \text{...}、\mathrm{...} 直立文本
   · \begin{aligned} 多行对齐
   · \cdot \times \pm \le \ge \Rightarrow \in \approx \propto
   输出：测量后的绘制树（render(ctx, x, y) + measure()），
   绘制到 Canvas 2D，字号以基准字号缩放。
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- 词法 ---------- */
  function tokenize(src) {
    var out = [], i = 0;
    while (i < src.length) {
      var c = src[i];
      if (c === '\\') {
        var m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
        out.push({ t: 'cmd', v: m[1] });
        i += m[0].length;
      } else if ('{}^_'.indexOf(c) >= 0) {
        out.push({ t: c });
        i++;
      } else if (c === ' ') {
        i++;   // TeX 空格忽略，间距用 \, \;
      } else {
        out.push({ t: 'ch', v: c });
        i++;
      }
    }
    return out;
  }

  /* ---------- 语法：递归下降 ---------- */
  function parse(src) {
    var toks = tokenize(src);
    var pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }

    function parseGroup() {   // 到 } 为止
      var items = [];
      while (pos < toks.length && peek().t !== '}') {
        items.push(withScripts());
      }
      return { t: 'seq', items: items };
    }
    function parseArg() {
      var tk = peek();
      if (!tk) return { t: 'seq', items: [] };
      if (tk.t === '{') { next(); var g = parseGroup(); next(); return g; }
      return parseAtom();
    }
    function parseAtom() {
      var tk = next();
      if (!tk) return { t: 'seq', items: [] };
      if (tk.t === '{') {
        var g = parseGroup(); pos++; return g;
      }
      if (tk.t === 'ch') return { t: 'ch', v: tk.v };
      // cmd
      var name = tk.v;
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        var a = parseArg(), b = parseArg();
        return { t: 'frac', a: a, b: b };
      }
      if (name === 'sqrt') {
        // 可选 [n]
        var idx = null;
        if (peek() && peek().t === 'ch' && peek().v === '[') {
          pos++;
          idx = [];
          while (pos < toks.length && peek().t !== 'ch' || (peek() && peek().v !== ']')) {
            if (!peek() || peek().t === '}') break;
            idx.push(parseAtom());
          }
          pos++;   // ]
          idx = { t: 'seq', items: idx };
        }
        var body = parseArg();
        return { t: 'sqrt', body: body, idx: idx };
      }
      if (name === 'text' || name === 'mathrm' || name === 'operatorname' || name === 'mathbf') {
        var arg = parseArg();
        return { t: 'text', body: arg, bold: name === 'mathbf' };
      }
      if (name === 'bar' || name === 'vec' || name === 'hat' || name === 'dot') {
        return { t: 'accent', kind: name, body: parseArg() };
      }
      if (name === 'begin') {
        var env = parseArg();
        var envName = flatten(env).trim();
        if (envName === 'aligned' || envName === 'matrix' || envName === 'cases') {
          var rows = [];
          var cur = [];
          while (pos < toks.length) {
            var tk2 = peek();
            if (tk2.t === 'cmd' && (tk2.v === '\\' || tk2.v === 'cr')) {
              next(); rows.push(cur); cur = [];
              continue;
            }
            if (tk2.t === 'cmd' && tk2.v === 'end') {
              next(); parseArg(); break;
            }
            if (tk2.t === 'ch' && tk2.v === '&') { next(); cur.push({ t: 'align-break' }); continue; }
            cur.push(withScripts());
          }
          rows.push(cur);
          return { t: 'env', name: envName, rows: rows };
        }
        return { t: 'text', body: env };
      }
      if (name === 'left' || name === 'right') {
        var d = next();
        if (d && d.t === 'ch' && d.v === '.') return { t: 'skip' };
        return { t: 'bigdelim', v: d ? d.v : '' };
      }
      return { t: 'sym', v: name };
    }

    function withScripts() {
      var base = parseAtom();
      var tk = peek();
      while (tk && (tk.t === '^' || tk.t === '_')) {
        next();
        var arg = parseArg();
        if (tk.t === '^') base = { t: 'sup', base: base, sup: arg };
        else base = { t: 'sub', base: base, sub: arg };
        tk = peek();
      }
      return base;
    }

    var items = [];
    while (pos < toks.length) {
      items.push(withScripts());
    }
    return { t: 'seq', items: items };
  }

  function flatten(node) {
    if (!node) return '';
    if (node.t === 'seq') return node.items.map(flatten).join('');
    if (node.t === 'ch') return node.v;
    if (node.t === 'sym') return GREEK[node.v] || FUNCS[node.v] || node.v;
    if (node.t === 'text') return flatten(node.body);
    if (node.t === 'sup') return flatten(node.base) + '^' + flatten(node.sup);
    if (node.t === 'sub') return flatten(node.base) + '_' + flatten(node.sub);
    if (node.t === 'frac') return flatten(node.a) + '/' + flatten(node.b);
    if (node.t === 'accent') return flatten(node.body);
    if (node.t === 'env') return node.rows.map(function (r) {
      return r.map(function (c) { return Array.isArray(c) ? '' : flatten(c); }).join('');
    }).join(' ');
    return '';
  }

  /* ---------- 符号表 ---------- */
  var GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
    tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  };
  var FUNCS = {
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
    approx: '≈', equiv: '≡', propto: '∝',
    Rightarrow: '⇒', leftarrow: '←', rightarrow: '→', Leftrightarrow: '⇔',
    in: '∈', notin: '∉', infty: '∞', partial: '∂', nabla: '∇',
    sum: '∑', prod: '∏', int: '∫', degree: '°', circ: '°',
    quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '',
    ldots: '…', cdots: '⋯', perp: '⊥', parallel: '∥', angle: '∠',
    langle: '⟨', rangle: '⟩', lbrace: '{', rbrace: '}', '|': '|'
  };

  /* ---------- 布局与测量 ----------
     节点渲染为 { w, asc, desc, draw(ctx, x, baselineY, fs) } */
  function layout(node, fs) {
    switch (node.t) {
      case 'skip':
        return { w: 0, asc: 0, desc: 0, draw: function () {} };

      case 'seq': {
        var parts = node.items.map(function (n) { return layout(n, fs); })
          .filter(function (p) { return p; });
        var w = 0, asc = 0, desc = 0;
        parts.forEach(function (p) { w += p.w; asc = Math.max(asc, p.asc); desc = Math.max(desc, p.desc); });
        return {
          w: w, asc: asc, desc: desc,
          draw: function (c, x, y, s) {
            var cx = x;
            parts.forEach(function (p) { p.draw(c, cx, y, s); cx += p.w; });
          }
        };
      }

      case 'ch': {
        var isOp = '+-=*/<>'.indexOf(node.v) >= 0;
        var sp = isOp ? fs * 0.22 : 0;
        return {
          w: measureChar(node.v, fs) + sp * 2, asc: fs * 0.72, desc: fs * 0.22,
          draw: function (c, x, y, s) {
            c.save();
            c.fillStyle = c.__texColor || '#3b3335';
            c.font = font(fs * s);
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            c.fillText(node.v, x + sp * s, y);
            c.restore();
          }
        };
      }

      case 'sym': {
        var v = GREEK[node.v] || FUNCS[node.v];
        if (v != null) {
          var w2 = measureChar(v, fs) + fs * 0.08;
          return {
            w: w2, asc: fs * 0.75, desc: fs * 0.22,
            draw: function (c, x, y, s) {
              c.save();
              c.fillStyle = c.__texColor || '#3b3335';
              c.font = font(fs * s);
              c.textAlign = 'left'; c.textBaseline = 'alphabetic';
              c.fillText(v, x + fs * 0.04 * s, y);
              c.restore();
            }
          };
        }
        // 未知命令按函数名直立输出（如 \sin）
        return {
          w: measureChar(node.v, fs * 0.92), asc: fs * 0.72, desc: fs * 0.22,
          draw: function (c, x, y, s) {
            c.save();
            c.fillStyle = c.__texColor || '#3b3335';
            c.font = font(fs * 0.92 * s);
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            c.fillText(node.v, x, y);
            c.restore();
          }
        };
      }

      case 'text': {
        var txt = flatten(node);
        return {
          w: measureChar(txt, fs * 0.94), asc: fs * 0.72, desc: fs * 0.22,
          draw: function (c, x, y, s) {
            c.save();
            c.fillStyle = c.__texColor || '#3b3335';
            c.font = (node.bold ? '600 ' : '') + font(fs * 0.94 * s);
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            c.fillText(txt, x, y);
            c.restore();
          }
        };
      }

      case 'frac': {
        var A = layout(node.a, fs * 0.82);
        var B = layout(node.b, fs * 0.82);
        var w3 = Math.max(A.w, B.w) + fs * 0.24;
        return {
          w: w3, asc: A.asc + B.desc + fs * 0.36, desc: B.asc + A.desc + fs * 0.36,
          draw: function (c, x, y, s) {
            var mid = y - A.asc * s + fs * 0.18 * s;
            A.draw(c, x + (w3 - A.w) / 2, y - B.desc - fs * 0.18, s);
            B.draw(c, x + (w3 - B.w) / 2, y + A.asc + fs * 0.18, s);
            c.save();
            c.strokeStyle = c.__texColor || '#3b3335';
            c.lineWidth = Math.max(1, fs * 0.055 * s);
            c.beginPath(); c.moveTo(x + fs * 0.06, mid); c.lineTo(x + w3 - fs * 0.06, mid); c.stroke();
            c.restore();
          }
        };
      }

      case 'sqrt': {
        var body = layout(node.body, fs * 0.9);
        var iw = node.idx ? layout(node.idx, fs * 0.6).w : 0;
        var w4 = body.w + fs * 0.6 + iw;
        var h = body.asc + fs * 0.22;
        return {
          w: w4, asc: h + fs * 0.1, desc: body.desc,
          draw: function (c, x, y, s) {
            var top = y - h;
            c.save();
            c.strokeStyle = c.__texColor || '#3b3335';
            c.lineWidth = Math.max(1, fs * 0.05 * s);
            c.beginPath();
            c.moveTo(x, y - body.asc * 0.4);
            c.lineTo(x + fs * 0.14, y - body.asc * 0.42);
            c.lineTo(x + fs * 0.3, top + fs * 0.05);
            c.lineTo(x + fs * 0.42, y + body.desc + fs * 0.06);
            c.lineTo(x + w4, top + fs * 0.02);
            c.stroke();
            c.restore();
            body.draw(c, x + fs * 0.5 + iw, y, s);
            if (node.idx) {
              var il = layout(node.idx, fs * 0.6);
              il.draw(c, x + fs * 0.16, y - body.asc * 0.72, s);
            }
          }
        };
      }

      case 'sup': case 'sub': {
        var base = layout(node.base, fs);
        var sc = layout(node.t === 'sup' ? node.sup : node.sub, fs * 0.68);
        var up = node.t === 'sup';
        var dy = (up ? -fs * 0.48 : fs * 0.3);
        return {
          w: base.w + sc.w + fs * 0.02,
          asc: base.asc + (up ? fs * 0.38 : 0),
          desc: base.desc + (up ? 0 : fs * 0.24),
          draw: function (c, x, y, s) {
            base.draw(c, x, y, s);
            sc.draw(c, x + base.w, y + dy * s, s);
          }
        };
      }

      case 'accent': {
        var inner = layout(node.body, fs);
        return {
          w: inner.w, asc: inner.asc + fs * 0.3, desc: inner.desc,
          draw: function (c, x, y, s) {
            inner.draw(c, x, y, s);
            c.save();
            c.strokeStyle = c.__texColor || '#3b3335';
            c.lineWidth = Math.max(1, fs * 0.05 * s);
            c.beginPath();
            if (node.kind === 'bar') {
              c.moveTo(x, y - inner.asc - fs * 0.1);
              c.lineTo(x + inner.w, y - inner.asc - fs * 0.1);
            } else if (node.kind === 'vec') {
              var ay = y - inner.asc - fs * 0.12;
              c.moveTo(x, ay);
              c.lineTo(x + inner.w - 1, ay);
              c.lineTo(x + inner.w - 5, ay - 3.4);
              c.moveTo(x + inner.w - 1, ay);
              c.lineTo(x + inner.w - 5, ay + 3.4);
            } else {
              c.moveTo(x + inner.w * 0.5 - 3, y - inner.asc - fs * 0.08);
              c.lineTo(x + inner.w * 0.5, y - inner.asc - fs * 0.26);
              c.lineTo(x + inner.w * 0.5 + 3, y - inner.asc - fs * 0.08);
            }
            c.stroke();
            c.restore();
          }
        };
      }

      case 'env': {
        // aligned：多行，按 & 对齐点分列
        var rows = node.rows.map(function (row) {
          var cols = [[]];
          row.forEach(function (n) {
            if (n.t === 'align-break') cols.push([]);
            else cols[cols.length - 1].push(layout(n, fs));
          });
          return cols;
        });
        var nCols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        var colW = [];
        for (var ci = 0; ci < nCols; ci++) {
          colW[ci] = 0;
          rows.forEach(function (r) {
            if (r[ci]) {
              var cw = r[ci].reduce(function (a, p) { return a + p.w; }, 0);
              colW[ci] = Math.max(colW[ci], cw);
            }
          });
        }
        var rowH = rows.map(function (r) {
          var a = 0, d = 0;
          r.forEach(function (col) { col.forEach(function (p) { a = Math.max(a, p.asc); d = Math.max(d, p.desc); }); });
          return { a: a, d: d };
        });
        var totalH = rowH.reduce(function (acc, rh) { return acc + rh.a + rh.d + fs * 0.16; }, 0);
        var totalW = colW.reduce(function (a, b) { return a + b; }, 0) + fs * 0.3 * (nCols - 1);
        return {
          w: totalW, asc: totalH * 0.62, desc: totalH * 0.42,
          draw: function (c, x, y, s) {
            var cy = y - rowH[0].a;
            rows.forEach(function (r, ri) {
              var cx = x;
              r.forEach(function (col, coi) {
                if (col) {
                  var wsum = col.reduce(function (a, p) { return a + p.w; }, 0);
                  var startX = (coi % 2 === 0) ? cx : cx + colW[coi] - wsum;  // 偶列左对齐，奇列右对齐
                  col.forEach(function (p) { p.draw(c, startX, cy, s); startX += p.w; });
                }
                cx += colW[coi] + fs * 0.3;
              });
              if (ri < rowH.length - 1) cy += rowH[ri].a + rowH[ri].d + fs * 0.16;
            });
          }
        };
      }

      case 'bigdelim':
        return layout({ t: 'ch', v: node.v }, fs * 1.3);

      case 'align-break':
        return null;
    }
    return null;
  }

  function font(fs) { return fs + 'px "Times New Roman",Georgia,serif'; }
  function measureChar(s, fs) {
    if (s == null) return 0;
    s = String(s);
    // 无 DOM 时的字符宽度估算（Canvas 环境下用真实 measure 更准，这里给保守近似）
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (/[A-Z]/.test(ch)) w += fs * 0.72;
      else if (/[a-z0-9]/.test(ch)) w += fs * 0.5;
      else if (/[αβγδεζηθκλμνξπρστυφχψΩΔΘΛΣΠΦΨ]/.test(ch)) w += fs * 0.56;
      else if ('·×÷±≤≥≠≈⇒→←∈∑∫'.indexOf(ch) >= 0) w += fs * 0.62;
      else if ('()[]{}'.indexOf(ch) >= 0) w += fs * 0.34;
      else if (' '.indexOf(ch) >= 0) w += fs * 0.28;
      else w += fs * 0.4;
    }
    return w;
  }

  /* 对外：parse → layout 一次完成 */
  function tex(src, fontSize) {
    return layout(parse(src), fontSize || 22);
  }

  /* 在画布上居中绘制，返回实际宽度 */
  function draw(c, src, cx, baselineY, fontSize, color) {
    var L = tex(src, fontSize);
    c.save();
    if (color) c.__texColor = color;
    L.draw(c, cx - L.w / 2, baselineY, 1);
    c.restore();
    c.__texColor = null;
    return L.w;
  }

  root.MiniTeX = {
    parse: parse,
    tex: tex,
    draw: draw
  };
})(window);
