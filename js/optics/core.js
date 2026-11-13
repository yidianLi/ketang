/* ============================================================
 * 简普 · 光学实验室内核  (optics-core-v1)
 * 薄透镜成像：1/u + 1/v = 1/f
 * 纯逻辑、零依赖、IIFE 暴露 window.Optics
 *
 * 坐标约定（屏幕坐标，y 向下为正）：
 *   透镜中心在 (cx, cy)，主光轴为 y = cy 的水平线。
 *   实物在透镜左侧：物距 u > 0 时物体横坐标为 cx - u*pxPerCm。
 *   凸透镜 f > 0。
 *   calc：返回像距 v（>0 实像在右侧，<0 虚像在左侧）、放大率 m、类型与应用。
 *   intersect：由两条特殊光线的折射后直线求像的屏幕坐标。
 * ============================================================ */
(function (global) {
  'use strict';

  var EPS = 1e-9;

  /**
   * 薄透镜成像计算。
   * @param {number} f 焦距 (cm)，凸透镜为正
   * @param {number} u 物距 (cm)，实物为正，u>0
   * @returns {{v:number,m:number,type:string,app:string}}
   *   v  像距：>0 实像（异侧），<0 虚像（同侧），Infinity 平行光不成像
   *   m  放大率 = -v/u（正=正立，负=倒立）
   *   type 'real' | 'virtual' | 'parallel'
   *   app  应用：照相机/测焦距/投影仪/放大镜/探照灯
   */
  function calc(f, u) {
    var v, m, type, app;
    if (Math.abs(u - f) < EPS) {
      v = Infinity; m = Infinity; type = 'parallel'; app = '探照灯 / 平行光';
    } else {
      v = (u * f) / (u - f);
      m = -v / u;
      type = v > 0 ? 'real' : 'virtual';
      if (Math.abs(u - 2 * f) < EPS) app = '测焦距';
      else if (u > 2 * f) app = '照相机';
      else if (u > f && u < 2 * f) app = '投影仪';
      else app = '放大镜';
    }
    return { v: v, m: m, type: type, app: app };
  }

  /**
   * 像的性质中文描述。
   * @param {{v:number,m:number,type:string}} r calc 的返回（至少需要 type / m）
   */
  function nature(r) {
    if (r.type === 'parallel') return '不成像（平行光）';
    var orient = r.type === 'real' ? '倒立' : '正立';
    var size = Math.abs(r.m) > 1.05 ? '放大'
             : (Math.abs(r.m) < 0.95 ? '缩小' : '等大');
    var kind = r.type === 'real' ? '实像' : '虚像';
    return orient + ' ' + size + ' ' + kind;
  }

  /**
   * 光路求交：由两条特殊光线求像的屏幕坐标。
   *   光线 1（平行于主光轴）：物体顶端 (objX, objY) 入射到透镜 (cx, objY)，
   *           折射后过右侧焦点 (cx + fPx, cy)。
   *   光线 2（过光心）：物体顶端 (objX, objY) 经光心 (cx, cy) 直线不偏折。
   * 两条折射后直线交点即像的位置。
   * @param {number} fPx  焦距的像素长度
   * @param {number} cx   透镜中心横坐标（屏幕像素）
   * @param {number} cy   主光轴纵坐标（屏幕像素）
   * @param {number} objX 物体顶端横坐标
   * @param {number} objY 物体顶端纵坐标
   * @returns {{ix:number,iy:number,isReal:boolean}}
   */
  function intersect(fPx, cx, cy, objX, objY) {
    var kR = (cy - objY) / fPx;            // 折射光线 1 斜率（指向右侧焦点）
    var kG = (cy - objY) / (cx - objX);    // 折射光线 2 斜率（过光心直线）
    var denom = kR - kG;
    var ix = cx + (cy - objY) / denom;     // denom≈0 时即 u=f 平行光
    var iy = cy + kG * (ix - cx);
    var isReal = ix > cx;
    return { ix: ix, iy: iy, isReal: isReal };
  }

  /**
   * 由物距求出物体顶端横坐标（屏幕像素）。
   */
  function objX(cx, u, pxPerCm) { return cx - u * pxPerCm; }

  /**
   * 由像的屏幕横坐标反推像距（cm，带符号）。
   */
  function vFromX(ix, cx, pxPerCm) { return (ix - cx) / pxPerCm; }

  var Optics = {
    calc: calc,
    nature: nature,
    intersect: intersect,
    objX: objX,
    vFromX: vFromX,
    EPS: EPS,
    version: 'optics-core-v1'
  };

  global.Optics = Optics;
  if (typeof module !== 'undefined' && module.exports) module.exports = Optics;
})(typeof window !== 'undefined' ? window : globalThis);
