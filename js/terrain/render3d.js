/* ============================================================
   3D 地形预览：原生 WebGL（不依赖 Three.js）
   ------------------------------------------------------------
   顶点色不做，全部放到片元里算：
     · 高程分层设色 + 平行光 + 环境光
     · 等高线在着色器里用 fract(高度/等高距) 画，fwidth 抗锯齿
     · 支持「分层切面」：超过切面高度的部分直接丢弃
   ============================================================ */
(function (root) {
  'use strict';
  var C = root.TerrainCore;

  var VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNrm;',
    'uniform mat4 uMVP;',
    'uniform float uVEx;',
    'varying vec3 vN;',
    'varying vec3 vP;',
    'void main(){',
    '  vec3 p = vec3(aPos.x, aPos.y * uVEx, aPos.z);',
    '  vP = vec3(aPos.x, aPos.y, aPos.z);',
    '  vN = normalize(vec3(aNrm.x, aNrm.y / uVEx, aNrm.z));',
    '  gl_Position = uMVP * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FS = [
    '#ifdef GL_OES_standard_derivatives',
    '#extension GL_OES_standard_derivatives : enable',
    '#endif',
    'precision highp float;',
    'varying vec3 vN;',
    'varying vec3 vP;',
    'uniform float uInterval;',
    'uniform vec3 uLight;',
    'uniform float uSnow;',
    'uniform float uSlice;',
    'uniform float uShowContour;',
    'uniform float uWater;',
    'uniform float uFlat;',
    '',
    'vec3 ramp(float h){',
    '  if (h < 200.0) return mix(vec3(0.49,0.62,0.42), vec3(0.66,0.74,0.52), clamp(h/200.0,0.0,1.0));',
    '  if (h < 350.0) return mix(vec3(0.66,0.74,0.52), vec3(0.80,0.82,0.61), (h-200.0)/150.0);',
    '  if (h < 500.0) return mix(vec3(0.80,0.82,0.61), vec3(0.88,0.80,0.59), (h-350.0)/150.0);',
    '  if (h < 700.0) return mix(vec3(0.88,0.80,0.59), vec3(0.83,0.67,0.49), (h-500.0)/200.0);',
    '  if (h < 880.0) return mix(vec3(0.83,0.67,0.49), vec3(0.73,0.54,0.39), (h-700.0)/180.0);',
    '  return mix(vec3(0.73,0.54,0.39), vec3(0.92,0.90,0.87), clamp((h-880.0)/220.0,0.0,1.0));',
    '}',
    '',
    'void main(){',
    '  if (uFlat > 0.5) { gl_FragColor = vec4(0.30, 0.52, 0.64, 0.78); return; }',
    '  if (vP.y > uSlice) discard;',
    '  vec3 n = normalize(vN);',
    '  vec3 base = ramp(vP.y);',
    '  if (vP.y > uSnow - 60.0) base = mix(base, vec3(0.97,0.97,0.98), clamp((vP.y-(uSnow-60.0))/140.0,0.0,1.0));',
    '  float diff = max(dot(n, normalize(uLight)), 0.0);',
    '  float sky = 0.5 + 0.5 * n.y;',
    '  vec3 col = base * (0.42 + 0.66 * diff) + base * sky * 0.12;',
    '  // 等高线',
    '  if (uShowContour > 0.5) {',
    '    float f = vP.y / uInterval;',
    '#ifdef GL_OES_standard_derivatives',
    '    float w = fwidth(f) * 1.2;',
    '#else',
    '    float w = 0.10;',
    '#endif',
    '    float d = abs(fract(f - 0.5) - 0.5);',
    '    float line = 1.0 - smoothstep(0.0, w, d);',
    '    float idx = mod(floor(f + 0.5), 5.0);',
    '    float strength = idx < 0.5 ? 0.85 : 0.45;',
    '    col = mix(col, vec3(0.32,0.20,0.13), line * strength);',
    '  }',
    '  // 水下',
    '  if (vP.y < uWater) col = mix(col, vec3(0.25,0.45,0.58), 0.55);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function mat4() { return new Float32Array(16); }
  function identity(m) { m.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return m; }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }
  function lookAt(out, eye, center, up) {
    var z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    var l = Math.hypot(z0, z1, z2); z0 /= l; z1 /= l; z2 /= l;
    var x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    l = Math.hypot(x0, x1, x2) || 1; x0 /= l; x1 /= l; x2 /= l;
    var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;
    return out;
  }
  function mul(out, a, b) {
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        out[i * 4 + j] = a[0 * 4 + j] * b[i * 4 + 0] + a[1 * 4 + j] * b[i * 4 + 1] +
                         a[2 * 4 + j] * b[i * 4 + 2] + a[3 * 4 + j] * b[i * 4 + 3];
      }
    }
    return out;
  }

  function Renderer(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    this.ok = !!this.gl;
    if (!this.ok) return;
    var gl = this.gl;
    this.uintExt = gl.getExtension('OES_element_index_uint');
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);
    this.loc = {
      aPos: gl.getAttribLocation(prog, 'aPos'),
      aNrm: gl.getAttribLocation(prog, 'aNrm'),
      uMVP: gl.getUniformLocation(prog, 'uMVP'),
      uVEx: gl.getUniformLocation(prog, 'uVEx'),
      uInterval: gl.getUniformLocation(prog, 'uInterval'),
      uLight: gl.getUniformLocation(prog, 'uLight'),
      uSnow: gl.getUniformLocation(prog, 'uSnow'),
      uSlice: gl.getUniformLocation(prog, 'uSlice'),
      uShowContour: gl.getUniformLocation(prog, 'uShowContour'),
      uWater: gl.getUniformLocation(prog, 'uWater'),
      uFlat: gl.getUniformLocation(prog, 'uFlat')
    };
    this.posBuf = gl.createBuffer();
    this.nrmBuf = gl.createBuffer();
    this.idxBuf = gl.createBuffer();
    this.wPosBuf = gl.createBuffer();
    this.wIdxBuf = gl.createBuffer();
    this.yaw = -0.6; this.pitch = 0.78; this.dist = 1.9; this.vEx = 2.0;
    this.slice = 9999; this.showContour = 1;
  }

  Renderer.prototype.setData = function (grid, state) {
    if (!this.ok) return;
    var gl = this.gl, res = grid.resolution, h = grid.heights, step = grid.step;
    var ox = (grid.centerX || 0) - grid.size / 2;
    var oz = (grid.centerZ || 0) - grid.size / 2;
    var n = res * res;
    var pos = new Float32Array(n * 3);
    var nrm = new Float32Array(n * 3);
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var k = j * res + i;
        pos[k * 3] = ox + i * step;
        pos[k * 3 + 1] = h[k] - C.BASE_LEVEL;
        pos[k * 3 + 2] = oz + j * step;
        var i0 = Math.max(0, i - 1), i1 = Math.min(res - 1, i + 1);
        var j0 = Math.max(0, j - 1), j1 = Math.min(res - 1, j + 1);
        var gx = (h[j * res + i1] - h[j * res + i0]) / ((i1 - i0) * step);
        var gz = (h[j1 * res + i] - h[j0 * res + i]) / ((j1 - j0) * step);
        var nl = Math.hypot(gx, 1, gz);
        nrm[k * 3] = -gx / nl;
        nrm[k * 3 + 1] = 1 / nl;
        nrm[k * 3 + 2] = -gz / nl;
      }
    }
    var idx = this.uintExt ? new Uint32Array((res - 1) * (res - 1) * 6) : new Uint16Array((res - 1) * (res - 1) * 6);
    var p = 0;
    for (var jj = 0; jj < res - 1; jj++) {
      for (var ii = 0; ii < res - 1; ii++) {
        var a = jj * res + ii, b = a + 1, c2 = a + res, d = c2 + 1;
        idx[p++] = a; idx[p++] = c2; idx[p++] = b;
        idx[p++] = b; idx[p++] = c2; idx[p++] = d;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.count = idx.length;

    // 水面：一整块平面，靠深度测试只露出盆地里的部分
    var half = grid.size / 2;
    var wy = (state.water || 0) - C.BASE_LEVEL;
    var wp = new Float32Array([
      -half, wy, -half, half, wy, -half, half, wy, half, -half, wy, half
    ]);
    var wn = new Float32Array([0,1,0, 0,1,0, 0,1,0, 0,1,0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, wp, gl.STATIC_DRAW);
    this.wNrm = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wNrm);
    gl.bufferData(gl.ARRAY_BUFFER, wn, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    this.size = grid.size;
    this.water = state.water;
    this.interval = state.interval;
    this.snow = state.snow;
  };

  Renderer.prototype.render = function (state) {
    if (!this.ok || !this.count) return;
    var gl = this.gl, cw = this.canvas.width, ch = this.canvas.height;
    gl.viewport(0, 0, cw, ch);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var sky = 0.94;
    gl.clearColor(sky * 0.84, sky * 0.89, sky * 0.95, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(this.loc.aPos);
    gl.vertexAttribPointer(this.loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nrmBuf);
    gl.enableVertexAttribArray(this.loc.aNrm);
    gl.vertexAttribPointer(this.loc.aNrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);

    var R = this.size * this.dist * 0.55;
    var eye = [
      Math.cos(this.pitch) * Math.sin(this.yaw) * R,
      Math.sin(this.pitch) * R + 160,
      Math.cos(this.pitch) * Math.cos(this.yaw) * R
    ];
    var proj = perspective(mat4(), 0.72, cw / ch, 10, R * 12);
    var view = lookAt(mat4(), eye, [0, 0, 0], [0, 1, 0]);
    var mvp = mul(mat4(), proj, view);

    gl.uniformMatrix4fv(this.loc.uMVP, false, mvp);
    gl.uniform1f(this.loc.uVEx, this.vEx);
    gl.uniform1f(this.loc.uInterval, this.interval || 100);
    gl.uniform3f(this.loc.uLight, -0.5, 0.72, 0.4);
    gl.uniform1f(this.loc.uSnow, this.snow || 740);
    gl.uniform1f(this.loc.uSlice, this.slice === null ? 99999 : this.slice);
    gl.uniform1f(this.loc.uShowContour, this.showContour ? 1 : 0);
    gl.uniform1f(this.loc.uWater, this.water || 0);
    gl.uniform1f(this.loc.uFlat, 0);
    gl.drawElements(gl.TRIANGLES, this.count, this.uintExt ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);

    // 水面
    gl.uniform1f(this.loc.uFlat, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wPosBuf);
    gl.vertexAttribPointer(this.loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wNrm);
    gl.vertexAttribPointer(this.loc.aNrm, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wIdxBuf);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.BLEND);
  };

  root.TerrainRender3D = { Renderer: Renderer };
})(window);
