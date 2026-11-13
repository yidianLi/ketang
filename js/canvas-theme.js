/* ============================================================
   canvas-theme.js — 画布跟随明暗主题（零依赖）
   ------------------------------------------------------------
   依赖 js/theme.js（其派发 document 'themechange'）。
   渲染器用法：

     function syncCol(){
       var p = CanvasTheme.palette();
       COL.ink = p.ink; COL.paper = p.canvas; ...
     }
     CanvasTheme.on(function(){ syncCol(); draw(); });
     syncCol();            // 首帧前

   palette() 结果被缓存，仅主题变化时失效 —— 绝不在绘制循环里
   反复调用 getComputedStyle，避免每帧强制样式重算。
   ============================================================ */
(function () {
  'use strict';

  var cached = null;

  function read() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, fb) {
      var x = cs.getPropertyValue(n);
      x = x && x.trim();
      return x || fb;
    }
    return {
      dark: document.documentElement.getAttribute('data-theme') === 'dark',
      ink: v('--ink', '#3b3335'),
      ink2: v('--ink-2', '#6c6165'),
      muted: v('--muted', '#9a8f93'),
      line: v('--line', '#f1e7e6'),
      line2: v('--line-2', '#e6d6d8'),
      panel: v('--panel', '#ffffff'),
      canvas: v('--canvas', '#ffffff'),
      canvas2: v('--canvas-2', '#fff'),
      grid: v('--canvas-grid', '#f6eef0'),
      axis: v('--canvas-axis', '#7d7d7d'),
      label: v('--canvas-label', '#5c4433'),
      accent: v('--accent', '#e8879b'),
      accent2: v('--accent-2', '#ef9a8e'),
      danger: v('--danger', '#e8879b'),
      ok: v('--ok', '#3fae5a'),
      warn: v('--warn', '#e08a2c')
    };
  }

  window.CanvasTheme = {
    palette: function () { return cached || (cached = read()); },
    on: function (fn) {
      document.addEventListener('canvas-theme', fn);
      document.addEventListener('themechange', function () {
        window.CanvasTheme.refresh();
      });
    },
    refresh: function () {
      cached = null;
      document.dispatchEvent(new CustomEvent('canvas-theme'));
    }
  };

  document.addEventListener('themechange', function () {
    window.CanvasTheme.refresh();
  });
})();
