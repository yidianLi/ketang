/* ============================================================
   2D 渲染：彩色讲解图 / 试卷黑白图
   ------------------------------------------------------------
   做法：先按栅格生成一张高程分层设色 + 山体阴影底图，
   再在上面画矢量等高线、水面、剖面线、注记。
   ============================================================ */
(function (root) {
  'use strict';
  var C = root.TerrainCore, R = root.TerrainRaster;

  /* ---------- 主题跟随（结构性配色；高程色带/水体/选中红/试卷黑白不变） ---------- */
  var PAL = { canvas: '#f6f2ea', axis: '#7d7d7d', label: '#5c4433', panel: '#fff' };
  function syncCol() {
    if (!root.CanvasTheme) return;
    var p = root.CanvasTheme.palette();
    PAL.canvas = p.canvas; PAL.axis = p.axis; PAL.label = p.label; PAL.panel = p.panel;
  }

  /* ---------- 视图 ---------- */
  function View() { this.k = 0.2; this.cx = 0; this.cz = 0; this.w = 0; this.h = 0; this.px = 0; this.py = 0; }
  View.prototype.fit = function (size, w, h, pad) {
    this.w = w; this.h = h; this.cx = 0; this.cz = 0; this.px = 0; this.py = 0;
    this.k = Math.min(w, h) * (1 - (pad || 0.06)) / size;
  };
  View.prototype.w2s = function (x, z) {
    return { x: this.w / 2 + (x - this.cx) * this.k + this.px, y: this.h / 2 + (z - this.cz) * this.k + this.py };
  };
  View.prototype.s2w = function (sx, sy) {
    return { x: (sx - this.w / 2 - this.px) / this.k + this.cx, z: (sy - this.h / 2 - this.py) / this.k + this.cz };
  };

  /* ---------- 高程配色 ---------- */
  var STOPS = [
    [0, [126, 158, 106]], [200, [168, 189, 132]], [350, [203, 209, 155]],
    [500, [224, 203, 151]], [700, [211, 172, 125]], [880, [185, 138, 99]],
    [1050, [154, 111, 82]], [1200, [236, 232, 226]]
  ];
  function ramp(h) {
    if (h <= STOPS[0][0]) return STOPS[0][1];
    for (var i = 1; i < STOPS.length; i++) {
      if (h <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i];
        var t = (h - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * t,
                a[1][1] + (b[1][1] - a[1][1]) * t,
                a[1][2] + (b[1][2] - a[1][2]) * t];
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  function shadeOf(rgb, s) {
    return 'rgb(' + Math.round(C.clamp(rgb[0] * s, 0, 255)) + ',' +
                    Math.round(C.clamp(rgb[1] * s, 0, 255)) + ',' +
                    Math.round(C.clamp(rgb[2] * s, 0, 255)) + ')';
  }

  /* ---------- 底图 ---------- */
  function buildImage(grid, state) {
    var res = grid.resolution, h = grid.heights, cv = document.createElement('canvas');
    cv.width = res; cv.height = res;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(res, res);
    var d = img.data;
    var snow = state.snow || 740, water = state.water || 145;
    var step = grid.step;
    var ox = (grid.centerX || 0) - grid.size / 2;
    var oz = (grid.centerZ || 0) - grid.size / 2;
    var lx = -0.55, ly = 0.62, lz = 0.56;   // 西北方向光
    var ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;

    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var idx = j * res + i;
        var z0 = h[idx];
        var col = ramp(z0);
        // 雪线
        if (z0 > snow - 60) {
          var t = C.smooth(C.clamp((z0 - (snow - 60)) / 140, 0, 1));
          col = [col[0] + (248 - col[0]) * t, col[1] + (248 - col[1]) * t, col[2] + (250 - col[2]) * t];
        }
        // 山体阴影
        var i0 = Math.max(0, i - 1), i1 = Math.min(res - 1, i + 1);
        var j0 = Math.max(0, j - 1), j1 = Math.min(res - 1, j + 1);
        var gx = (h[j * res + i1] - h[j * res + i0]) / ((i1 - i0) * step);
        var gz = (h[j1 * res + i] - h[j0 * res + i]) / ((j1 - j0) * step);
        var n = [-gx, 1, -gz];
        var nl = Math.hypot(n[0], n[1], n[2]);
        n[0] /= nl; n[1] /= nl; n[2] /= nl;
        var diff = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
        var sh = 0.62 + diff * 0.72;
        var px = (j * res + i) * 4;
        var isWater = z0 <= water && C.inWaterFootprint(state, ox + i * step, oz + j * step);
        if (isWater) {
          var wd = C.clamp((water - z0) / 40, 0, 1);
          d[px] = 90 - wd * 20; d[px + 1] = 150 - wd * 20; d[px + 2] = 180 - wd * 10;
          d[px + 3] = 255;
        } else {
          d[px] = C.clamp(col[0] * sh, 0, 255);
          d[px + 1] = C.clamp(col[1] * sh, 0, 255);
          d[px + 2] = C.clamp(col[2] * sh, 0, 255);
          d[px + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /* ---------- 主绘制 ---------- */
  function draw(ctx, W, H, state, grid, view, opts) {
    opts = opts || {};
    var exam = opts.style === 'exam';
    syncCol();
    var texel = view.k * grid.step;

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = exam ? '#fff' : PAL.canvas;
    ctx.fillRect(0, 0, W, H);

    // 图幅范围
    var tl = view.w2s(-state.size / 2, -state.size / 2);
    var br = view.w2s(state.size / 2, state.size / 2);
    var mw = br.x - tl.x, mh = br.y - tl.y;

    ctx.save();
    ctx.beginPath();
    ctx.rect(tl.x, tl.y, mw, mh);
    ctx.clip();

    if (!exam) {
      var img = opts.imageCache;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, tl.x - texel / 2, tl.y - texel / 2, mw + texel, mh + texel);
    }

    var levels = R.levelsFor(grid, state.interval, state.water, false);
    var cache = opts.contourCache;

    // 水面
    var waterLines = cache(grid, state.water);
    ctx.beginPath();
    waterLines.forEach(function (line) {
      if (line.length < 3) return;
      var c0 = centroid(line);
      if (!C.inWaterFootprint(state, c0.x, c0.z)) return;
      line.forEach(function (p, i) {
        var s = view.w2s(p.x, p.z);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.closePath();
    });
    if (exam) {
      ctx.fillStyle = '#f2f5f6';
      ctx.fill('evenodd');
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(86,150,180,.82)';
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(56,108,134,.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 等高线
    var labels = [];
    levels.forEach(function (level) {
      var isIndex = Math.abs(level % (state.interval * 5)) < 1e-6;
      var lines = cache(grid, level);
      ctx.beginPath();
      lines.forEach(function (line) {
        for (var i = 0; i < line.length; i++) {
          var s = view.w2s(line[i].x, line[i].z);
          if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
        }
      });
      if (exam) {
        ctx.strokeStyle = isIndex ? '#111' : PAL.axis;
        ctx.lineWidth = isIndex ? 1.7 : 0.75;
      } else {
        ctx.strokeStyle = isIndex ? '#6b4a35' : PAL.axis;
        ctx.lineWidth = isIndex ? 1.7 : 0.85;
      }
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (opts.labels && isIndex && !(exam && opts.examHideIndexLabels)) {
        lines.forEach(function (line) {
          var lab = pickLabelSpot(line, view, labels);
          if (lab) labels.push(lab, level);
        });
      }
    });

    // 高程注记
    if (opts.labels) {
      for (var li = 0; li < labels.length; li += 2) {
        var spot = labels[li], lv = labels[li + 1];
        ctx.save();
        ctx.translate(spot.x, spot.y);
        ctx.rotate(spot.angle);
        var txt = String(lv);
        ctx.font = (exam ? '600 11px' : '10px') + ' "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = exam ? '#fff' : 'rgba(255,253,250,.92)';
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = exam ? '#111' : PAL.label;
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
    }

    // 剖面线
    if (state.section && opts.showSection !== false) {
      var a = view.w2s(state.section[0].x, state.section[0].z);
      var b = view.w2s(state.section[1].x, state.section[1].z);
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = exam ? '#333' : '#c0392b';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.fillStyle = exam ? '#333' : '#c0392b';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', a.x, a.y);
      ctx.fillText('B', b.x, b.y);
      ctx.restore();
    }

    // 元件标记
    if (opts.showMarkers) {
      state.peaks.forEach(function (c) {
        var s = view.w2s(c.x, c.z);
        var sel = opts.selectedId === c.id;
        ctx.beginPath();
        ctx.arc(s.x, s.y, sel ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = sel ? '#c0392b' : PAL.label;
        ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.font = '11px "Microsoft YaHei",sans-serif';
          ctx.fillStyle = '#3a2c24';
          ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
          var nm = c.name || typeName(c.type);
          ctx.strokeText(nm, s.x + 9, s.y - 4);
          ctx.fillText(nm, s.x + 9, s.y - 4);
        }
      });
    }

    ctx.restore();   // 取消裁剪

    // 图框
    ctx.strokeStyle = exam ? '#333' : 'rgba(120,96,80,.45)';
    ctx.lineWidth = exam ? 1.4 : 1;
    ctx.strokeRect(tl.x, tl.y, mw, mh);

    drawCompass(ctx, W, H, exam);
    drawScale(ctx, W, H, view, exam);
    if (exam) drawLegend(ctx, W, H, state);
    ctx.restore();
  }

  function centroid(line) {
    var sx = 0, sz = 0;
    for (var i = 0; i < line.length; i++) { sx += line[i].x; sz += line[i].z; }
    return { x: sx / line.length, z: sz / line.length };
  }

  var TYPE_NAME = { mountain: '山头', plateau: '高原', basin: '盆地', ridge: '山脊', valley: '山谷', slope: '坡面', fan: '冲积扇', cliff: '陡崖', river: '河流', lake: '湖泊' };
  function typeName(t) { return TYPE_NAME[t] || '地形'; }

  /* 在折线上挑一个不与已有注记冲突的位置 */
  function pickLabelSpot(line, view, placed) {
    if (line.length < 12) return null;
    var pts = [];
    for (var i = 0; i < line.length; i++) pts.push(view.w2s(line[i].x, line[i].z));
    var total = 0;
    for (var k = 1; k < pts.length; k++) total += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
    if (total < 110) return null;
    var tries = Math.min(3, Math.max(1, Math.floor(total / 200)));
    for (var t = 1; t <= tries; t++) {
      var target = total * (t / (tries + 1));
      var acc = 0, idx = 1;
      for (; idx < pts.length; idx++) {
        acc += Math.hypot(pts[idx].x - pts[idx - 1].x, pts[idx].y - pts[idx - 1].y);
        if (acc >= target) break;
      }
      idx = Math.min(idx, pts.length - 2);
      var p = pts[idx];
      if (p.x < 34 || p.y < 20 || p.x > view.w - 34 || p.y > view.h - 20) continue;
      var dx = pts[idx + 1].x - pts[idx - 1].x, dy = pts[idx + 1].y - pts[idx - 1].y;
      var ang = Math.atan2(dy, dx);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      var clash = false;
      for (var q = 0; q < placed.length; q += 2) {
        if (Math.hypot(placed[q].x - p.x, placed[q].y - p.y) < 52) { clash = true; break; }
      }
      if (!clash) return { x: p.x, y: p.y, angle: ang };
    }
    return null;
  }

  function drawCompass(ctx, W, H, exam) {
    var x = W - 40, y = 44;
    ctx.save();
    ctx.globalAlpha = exam ? 0.9 : 0.75;
    ctx.strokeStyle = exam ? '#333' : PAL.label;
    ctx.fillStyle = exam ? '#333' : PAL.label;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - 18); ctx.lineTo(x - 6, y + 8); ctx.lineTo(x, y + 2); ctx.lineTo(x + 6, y + 8);
    ctx.closePath(); ctx.stroke();
    ctx.font = 'bold 10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('N', x, y - 20);
    ctx.restore();
  }

  function drawScale(ctx, W, H, view, exam) {
    // 取一个好看的整数米长度
    var targetPx = 130;
    var meters = targetPx / view.k;
    var pow = Math.pow(10, Math.floor(Math.log10(meters)));
    var mult = meters / pow;
    var nice = mult >= 5 ? 5 : mult >= 2 ? 2 : 1;
    var len = nice * pow;
    var px = len * view.k;
    var x0 = 24, y0 = H - 30;
    ctx.save();
    ctx.strokeStyle = exam ? '#333' : PAL.label;
    ctx.fillStyle = exam ? '#333' : PAL.label;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x0 + px, y0);
    ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y0 + 4);
    ctx.moveTo(x0 + px, y0 - 4); ctx.lineTo(x0 + px, y0 + 4);
    ctx.moveTo(x0 + px / 2, y0 - 3); ctx.lineTo(x0 + px / 2, y0 + 3);
    ctx.stroke();
    ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(len >= 1000 ? (len / 1000) + ' km' : len + ' m', x0, y0 + 6);
    ctx.restore();
  }

  function drawLegend(ctx, W, H, state) {
    var items = [
      ['等高距 ' + state.interval + ' m', 'line'],
      ['剖面线 A—B', 'dash'],
      [state.water ? ('水面 ' + state.water + ' m') : '干涸', 'water']
    ];
    ctx.save();
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    var x = W - 138, y = H - 74;
    ctx.strokeStyle = PAL.axis; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 122, 58);
    ctx.fillStyle = PAL.panel; ctx.fillRect(x, y, 122, 58);
    ctx.strokeRect(x, y, 122, 58);
    items.forEach(function (it, i) {
      var yy = y + 16 + i * 16;
      ctx.strokeStyle = PAL.label; ctx.fillStyle = PAL.label;
      ctx.lineWidth = i === 0 ? 1.7 : 1.1;
      if (it[1] === 'dash') {
        ctx.save(); ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(x + 8, yy); ctx.lineTo(x + 36, yy); ctx.stroke();
        ctx.restore();
      } else if (it[1] === 'water') {
        ctx.fillStyle = '#f2f5f6';
        ctx.fillRect(x + 8, yy - 4, 28, 9);
        ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 0.9;
        ctx.strokeRect(x + 8, yy - 4, 28, 9);
      } else {
        ctx.beginPath(); ctx.moveTo(x + 8, yy); ctx.lineTo(x + 36, yy); ctx.stroke();
      }
      ctx.fillStyle = PAL.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it[0], x + 44, yy);
    });
    ctx.restore();
  }

  root.TerrainRender2D = {
    View: View,
    draw: draw,
    buildImage: buildImage,
    typeName: typeName,
    ramp: ramp
  };
})(window);
