/* ============================================================
   tools/index.js — 注册器 + hash 路由 + 挂载/卸载
   深链：classroom.html#<id>；无效 id 回落 #rollcall
   ============================================================ */
(function () {
  'use strict';
  var Tools = {
    _m: {}, _order: [],
    add: function (d) { this._m[d.id] = d; this._order.push(d.id); },
    get: function (id) { return this._m[id]; },
    list: function () { return this._order.map(function (id) { return Tools._m[id]; }); }
  };
  window.Tools = Tools;

  var cur = null, curId = null, stage = null, tabsEl = null;

  function currentId() {
    var id = (location.hash || '').replace(/^#/, '').split(/[?&]/)[0];
    if (!id || !Tools.get(id)) return 'rollcall';
    return id;
  }

  function route() {
    if (!stage) return;
    var id = currentId();
    if (id === curId) return;
    if (cur && cur.destroy) { try { cur.destroy(); } catch (e) {} }
    cur = null;
    if (id !== currentId()) return;   // 期间 hash 又变了
    curId = id;
    stage.innerHTML = '';
    var def = Tools.get(id);
    var ctx = {
      store: Store(id),
      sfx: Sfx,
      ui: UI,
      toast: UI.toast,
      go: function (h) { location.hash = h; }
    };
    var t0 = performance.now();
    cur = def.mount(stage, ctx) || {};
    document.title = def.name + ' · 课堂工具';
    var btns = document.querySelectorAll('.ctab');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-id') === id;
      btns[i].classList.toggle('on', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (window.console && console.debug) console.debug('[tool]', id, Math.round(performance.now() - t0) + 'ms');
  }

  function buildTabs() {
    tabsEl.innerHTML = '';
    Tools.list().forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'ctab';
      b.setAttribute('data-id', d.id);
      b.setAttribute('role', 'tab');
      b.textContent = d.icon + ' ' + d.name;
      b.onclick = function () { if (currentId() !== d.id) location.hash = d.id; };
      tabsEl.appendChild(b);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    stage = document.getElementById('stage');
    tabsEl = document.getElementById('tabs');
    buildTabs();
    route();
    // 无 hash 时补一个可分享的深链
    if (!location.hash) {
      try { history.replaceState(null, '', '#rollcall'); } catch (e) { location.hash = 'rollcall'; }
    }
  });
  window.addEventListener('hashchange', route);
})();
