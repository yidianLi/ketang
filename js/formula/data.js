/* ============================================================
   公式实验室 · 物理关系库
   ------------------------------------------------------------
   公式库分类与条目清单：
   motion(7) dynamics(14) energy(4) orbit(3) = 28 条核心关系，
   另加近代物理组（光电效应 / 能级 / 质量亏损）。
   每条：{ id, name, tex, vars, calc, note, draw }
   vars: 滑条定义 [{k, label, min, max, step, def, unit}]
   calc: 参数 → 读数 [{label, value, unit}]
   ============================================================ */
(function (root) {
  'use strict';

  var G = 9.8;            // 重力加速度
  var G_GRAV = 6.6743e-11;
  var M_EARTH = 5.9722e24;
  var H = 6.62607015e-34, EC = 1.602176634e-19, C0 = 299792458;

  function f(v, d) {
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (d != null) return v.toFixed(d);
    if (a >= 1e5 || (a < 1e-3 && a > 0)) return v.toExponential(2);
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    return v.toFixed(2);
  }

  var SLIDER = function (k, label, min, max, step, def, unit) {
    return { k: k, label: label, min: min, max: max, step: step, def: def, unit: unit || '' };
  };
  var READ = function (label, unit) { return { label: label, unit: unit || '' }; };

  /* ---------- 每条公式的计算器与示意图 ---------- */
  var DB = [
    /* ===== 运动 ===== */
    {
      id: 'average-speed', cat: '运动', name: '平均速率',
      tex: '\\bar v=\\frac{s_{\\text{总}}}{t_{\\text{总}}}',
      vars: [SLIDER('s1', '去程', 1, 20, 1, 8, 'm'), SLIDER('s2', '回程', 0, 20, 1, 5, 'm'), SLIDER('t', '总时间', 2, 20, 1, 8, 's')],
      reads: [READ('平均速率', 'm/s'), READ('总路程', 'm')],
      calc: function (v) { return [(v.s1 + v.s2) / v.t, v.s1 + v.s2]; },
      note: '平均速率用总路程除以总时间；往返路程相加，不把位移大小当路程。',
      draw: drawPathAB
    },
    {
      id: 'average-velocity', cat: '运动', name: '平均速度',
      tex: '\\bar v_x=\\frac{\\Delta x}{\\Delta t}',
      vars: [SLIDER('s1', '去程', 1, 20, 1, 8, 'm'), SLIDER('s2', '回程', 0, 20, 1, 5, 'm'), SLIDER('t', '总时间', 2, 20, 1, 8, 's')],
      reads: [READ('平均速度', 'm/s'), READ('位移', 'm')],
      calc: function (v) { return [(v.s1 - v.s2) / v.t, v.s1 - v.s2]; },
      note: '有向位移与时间的比；去而复回时位移小于路程。',
      draw: drawPathAB
    },
    {
      id: 'acceleration-definition', cat: '运动', name: '加速度定义',
      tex: 'a=\\frac{v-v_0}{\\Delta t}',
      vars: [SLIDER('v0', '初速度', -8, 8, 1, 0, 'm/s'), SLIDER('v', '末速度', -8, 8, 1, 6, 'm/s'), SLIDER('t', '时间', 1, 10, 1, 3, 's')],
      reads: [READ('加速度', 'm/s²')],
      calc: function (v) { return [(v.v - v.v0) / v.t]; },
      note: '同一轴取有向速度；匀变速时平均加速度也是瞬时加速度。',
      draw: drawVT
    },
    {
      id: 'uniform-average', cat: '运动', name: '匀变速运动平均速度',
      tex: '\\bar v=\\frac{v_0+v}{2}',
      vars: [SLIDER('v0', '初速度', -8, 8, 1, 0, 'm/s'), SLIDER('v', '末速度', -8, 8, 1, 6, 'm/s'), SLIDER('t', '时间', 1, 10, 1, 3, 's')],
      reads: [READ('平均速度', 'm/s'), READ('位移', 'm')],
      calc: function (v) { return [(v.v0 + v.v) / 2, (v.v0 + v.v) / 2 * v.t]; },
      note: '仅限恒定加速度的一维运动。',
      draw: drawVT
    },
    {
      id: 'vertical-throw', cat: '运动', name: '竖直上抛',
      tex: 'y=v_0t-\\frac12gt^2',
      vars: [SLIDER('v0', '初速度', 2, 20, 1, 12, 'm/s')],
      reads: [READ('回到起点用时', 's'), READ('最大高度', 'm')],
      calc: function (v) { return [2 * v.v0 / G, v.v0 * v.v0 / (2 * G)]; },
      note: '竖直向上为正，忽略空气阻力，g 恒定。',
      draw: drawThrow
    },
    {
      id: 'oblique-projectile', cat: '运动', name: '斜抛运动',
      tex: '\\begin{aligned}x&=v_0\\cos\\theta\\,t\\\\y&=v_0\\sin\\theta\\,t-\\frac12gt^2\\end{aligned}',
      vars: [SLIDER('v0', '初速率', 2, 20, 1, 12, 'm/s'), SLIDER('ang', '抛射角', 5, 85, 1, 45, '°')],
      reads: [READ('同高度射程', 'm'), READ('最大高度', 'm'), READ('飞行时间', 's')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        return [v.v0 * v.v0 * Math.sin(2 * th) / G, v.v0 * v.v0 * Math.sin(th) * Math.sin(th) / (2 * G), 2 * v.v0 * Math.sin(th) / G];
      },
      note: '忽略空气阻力，地面水平；两分运动共享同一时间。',
      draw: drawProjectile
    },
    {
      id: 'velocity-compose', cat: '运动', name: '运动的合成',
      tex: '\\vec v=\\vec v_1+\\vec v_2',
      vars: [SLIDER('boat', '船相对水速率', 1, 6, 1, 3, 'm/s'), SLIDER('flow', '水流速度', 0, 6, 1, 2, 'm/s'), SLIDER('ang', '航向', 0, 180, 1, 90, '°')],
      reads: [READ('合速度大小', 'm/s'), READ('合速度方向', '°')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        var vx = v.boat * Math.cos(th) + v.flow, vy = v.boat * Math.sin(th);
        return [Math.hypot(vx, vy), Math.atan2(vy, vx) * 180 / Math.PI];
      },
      note: '同一时刻的两个分运动按矢量相加。',
      draw: drawVectors2
    },

    /* ===== 力与动力学 ===== */
    {
      id: 'density', cat: '动力学', name: '密度',
      tex: '\\rho=\\frac{m}{V}',
      vars: [SLIDER('m', '质量', 0.02, 1, 0.01, 0.2, 'kg'), SLIDER('V', '体积', 20, 250, 1, 100, 'cm³')],
      reads: [READ('密度', 'kg/m³')],
      calc: function (v) { return [v.m / (v.V * 1e-6)]; },
      note: '均匀物质的质量与体积之比；ρ 以 kg/m³ 表示。',
      draw: drawBeaker
    },
    {
      id: 'force-compose', cat: '动力学', name: '力的合成',
      tex: 'F=\\sqrt{F_1^2+F_2^2+2F_1F_2\\cos\\theta}',
      vars: [SLIDER('f1', '力F₁', 0, 20, 1, 8, 'N'), SLIDER('f2', '力F₂', 0, 20, 1, 6, 'N'), SLIDER('ang', '夹角', 0, 180, 1, 90, '°')],
      reads: [READ('合力大小', 'N')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        return [Math.sqrt(v.f1 * v.f1 + v.f2 * v.f2 + 2 * v.f1 * v.f2 * Math.cos(th))];
      },
      note: '共点力的矢量和遵守平行四边形定则。',
      draw: drawVectors2
    },
    {
      id: 'force-components', cat: '动力学', name: '力的正交分解',
      tex: '\\begin{aligned}F_x&=F\\cos\\theta\\\\F_y&=F\\sin\\theta\\end{aligned}',
      vars: [SLIDER('F', '力大小', 0, 20, 1, 10, 'N'), SLIDER('ang', '方向角', 0, 180, 1, 35, '°')],
      reads: [READ('x 分力', 'N'), READ('y 分力', 'N')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        return [v.F * Math.cos(th), v.F * Math.sin(th)];
      },
      note: '分力是同一个力的分量，不再与原力重复相加。',
      draw: drawDecompose
    },
    {
      id: 'force-equilibrium', cat: '动力学', name: '共点力平衡',
      tex: '\\sum\\vec F=\\vec 0',
      vars: [SLIDER('f1', '拉力F₁', 0, 20, 1, 8, 'N'), SLIDER('f2', '拉力F₂', 0, 20, 1, 6, 'N'), SLIDER('ang', '夹角', 0, 180, 1, 90, '°')],
      reads: [READ('第三个力大小', 'N'), READ('方向（对F₁）', '°')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        var rx = v.f1 + v.f2 * Math.cos(th), ry = v.f2 * Math.sin(th);
        return [Math.hypot(rx, ry), Math.atan2(-ry, -rx) * 180 / Math.PI];
      },
      note: '质点静止或匀速直线运动时合外力为零。',
      draw: drawVectors2
    },
    {
      id: 'newton-first', cat: '动力学', name: '牛顿第一定律',
      tex: 'F_{\\text{合}}=0\\;\\Rightarrow\\;\\vec v=\\text{恒定}',
      vars: [SLIDER('v', '速度', -5, 5, 1, 2, 'm/s'), SLIDER('m', '质量', 1, 5, 1, 2, 'kg')],
      reads: [READ('合力', 'N'), READ('动量', 'kg·m/s')],
      calc: function (v) { return [0, v.m * v.v]; },
      note: '无合外力时物体保持静止或匀速直线运动；力不是维持运动的原因。',
      draw: drawInertia
    },
    {
      id: 'newton-third', cat: '动力学', name: '牛顿第三定律',
      tex: '\\vec F_{12}=-\\vec F_{21}',
      vars: [SLIDER('F', '相互作用力', 0, 10, 1, 4, 'N'), SLIDER('m1', '物体1质量', 1, 5, 1, 2, 'kg'), SLIDER('m2', '物体2质量', 1, 5, 1, 3, 'kg')],
      reads: [READ('F₁₂', 'N'), READ('F₂₁', 'N'), READ('a₁/a₂', '')],
      calc: function (v) { return [v.F, v.F, (v.m2 / v.m1).toFixed(3) * 1]; },
      note: '作用力与反作用力等大反向，作用在不同物体上。',
      draw: drawPair
    },
    {
      id: 'apparent-weight', cat: '动力学', name: '升降机与超重失重',
      tex: 'F_N=m(g+a)',
      vars: [SLIDER('m', '质量', 20, 80, 1, 50, 'kg'), SLIDER('a', '向上加速度', -9.8, 9.8, 0.2, 2, 'm/s²')],
      reads: [READ('秤示数', 'N'), READ('重力', 'N')],
      calc: function (v) { return [v.m * (G + v.a), v.m * G]; },
      note: 'a=−g 时完全失重。秤示数是支持力，不是重力。',
      draw: drawElevator
    },
    {
      id: 'static-friction', cat: '动力学', name: '静摩擦力',
      tex: '|f_s|\\leq\\mu_sF_N',
      vars: [SLIDER('m', '质量', 1, 10, 1, 3, 'kg'), SLIDER('mu', '静摩擦因数', 0.1, 0.8, 0.1, 0.4, ''), SLIDER('F', '水平外力', -40, 40, 1, 8, 'N')],
      reads: [READ('摩擦力', 'N'), READ('最大静摩擦', 'N'), READ('状态', '')],
      calc: function (v) {
        var max = v.mu * v.m * G;
        if (Math.abs(v.F) <= max) return [v.F, max, '静止（静摩擦平衡）'];
        return [max * Math.sign(v.F), max, '已滑动'];
      },
      note: '静摩擦随平衡需要调整，最大值 μsFN；超出阈值后滑动。',
      draw: drawFriction
    },
    {
      id: 'incline-components', cat: '动力学', name: '斜面上重力分解',
      tex: '\\begin{aligned}G_\\parallel&=mg\\sin\\theta\\\\G_\\perp&=mg\\cos\\theta\\end{aligned}',
      vars: [SLIDER('m', '质量', 1, 10, 1, 2, 'kg'), SLIDER('ang', '斜面角度', 5, 75, 1, 30, '°')],
      reads: [READ('沿面分量', 'N'), READ('垂面分量', 'N'), READ('光滑面加速度', 'm/s²')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        return [v.m * G * Math.sin(th), v.m * G * Math.cos(th), G * Math.sin(th)];
      },
      note: '重力仍竖直向下，沿面与垂面分量不是额外的力。',
      draw: drawInclineDecomp
    },
    {
      id: 'torque', cat: '动力学', name: '力矩与力臂',
      tex: 'M=Fr\\sin\\theta',
      vars: [SLIDER('F', '力大小', 0, 20, 1, 8, 'N'), SLIDER('r', '作用点距轴', 0.2, 1, 0.1, 0.7, 'm'), SLIDER('ang', '力与杆夹角', 0, 180, 1, 60, '°')],
      reads: [READ('力矩', 'N·m')],
      calc: function (v) {
        var th = v.ang * Math.PI / 180;
        return [v.F * v.r * Math.sin(th)];
      },
      note: 'l 是转轴到力的作用线的垂直距离，不一般等于杆长 r。',
      draw: drawTorque
    },
    {
      id: 'lever', cat: '动力学', name: '杠杆平衡',
      tex: 'F_1l_1=F_2l_2',
      vars: [SLIDER('F2', '右侧力', 1, 20, 1, 6, 'N'), SLIDER('l1', '左侧力臂', 0.1, 1, 0.1, 0.6, 'm'), SLIDER('l2', '右侧力臂', 0.1, 1, 0.1, 0.4, 'm')],
      reads: [READ('左侧平衡力', 'N')],
      calc: function (v) { return [v.F2 * v.l2 / v.l1]; },
      note: '忽略杆重，两力的转动效果相反。',
      draw: drawLever
    },
    {
      id: 'pulley', cat: '动力学', name: '理想滑轮组',
      tex: 'F=\\frac{G}{n},\\quad s=nh',
      vars: [SLIDER('m', '物体质量', 1, 10, 1, 4, 'kg'), SLIDER('n', '承重绳段数', 1, 4, 1, 2, ''), SLIDER('h', '提升高度', 0.2, 2, 0.1, 1, 'm')],
      reads: [READ('绳端拉力', 'N'), READ('绳端移动', 'm')],
      calc: function (v) { return [v.m * G / v.n, v.n * v.h]; },
      note: '忽略动滑轮重、绳重和摩擦，n 为实际承重绳段数。',
      draw: drawPulley
    },
    {
      id: 'pulley-efficiency', cat: '动力学', name: '滑轮组机械效率',
      tex: '\\eta=\\frac{G}{G+G_{\\text{动}}}',
      vars: [SLIDER('m', '物体质量', 1, 10, 1, 4, 'kg'), SLIDER('md', '动滑轮组质量', 0.1, 3, 0.1, 1, 'kg'), SLIDER('n', '承重绳段数', 2, 4, 1, 2, '')],
      reads: [READ('机械效率', ''), READ('拉力', 'N')],
      calc: function (v) { return [v.m / (v.m + v.md), (v.m + v.md) * G / v.n]; },
      note: '只计动滑轮重时 η 与 n 无关。',
      draw: drawPulley
    },
    {
      id: 'incline-efficiency', cat: '动力学', name: '斜面机械效率',
      tex: '\\eta=\\frac{Gh}{Fs}',
      vars: [SLIDER('G', '物重', 5, 50, 1, 20, 'N'), SLIDER('h', '斜面高', 0.5, 3, 0.1, 1, 'm'), SLIDER('F', '沿面拉力', 5, 60, 1, 12, 'N'), SLIDER('s', '斜面长', 1, 8, 0.5, 3, 'm')],
      reads: [READ('机械效率', ''), READ('有用功', 'J'), READ('总功', 'J')],
      calc: function (v) { return [v.G * v.h / (v.F * v.s), v.G * v.h, v.F * v.s]; },
      note: 'η=Gh/(Fs)：有用功抬升重物，总功是沿斜面拉过的功；s 必须大于 h。',
      draw: drawInclineDecomp
    },

    /* ===== 能量 ===== */
    {
      id: 'mechanical-efficiency', cat: '能量', name: '机械效率',
      tex: '\\eta=\\frac{W_{\\text{有用}}}{W_{\\text{总}}}',
      vars: [SLIDER('wu', '有用功', 10, 200, 10, 80, 'J'), SLIDER('wx', '额外功', 0, 200, 10, 20, 'J')],
      reads: [READ('机械效率', ''), READ('总功', 'J')],
      calc: function (v) { return [v.wu / (v.wu + v.wx), v.wu + v.wx]; },
      note: '总功=有用功+额外功；有用功按任务定义。',
      draw: drawLedger
    },
    {
      id: 'spring-energy', cat: '能量', name: '弹性势能',
      tex: 'E_p=\\frac12kx^2',
      vars: [SLIDER('k', '劲度系数', 20, 200, 10, 100, 'N/m'), SLIDER('x', '形变量', 0.01, 0.3, 0.01, 0.15, 'm')],
      reads: [READ('弹性势能', 'J'), READ('弹力', 'N')],
      calc: function (v) { return [0.5 * v.k * v.x * v.x, v.k * v.x]; },
      note: '理想线性弹簧，相对自然长度的形变 x；压缩拉伸同大小等储能。',
      draw: drawSpring
    },
    {
      id: 'gravity-work', cat: '能量', name: '重力做功',
      tex: 'W_G=mg(h_1-h_2)',
      vars: [SLIDER('m', '质量', 1, 10, 1, 2, 'kg'), SLIDER('h1', '初高度', 0, 10, 1, 6, 'm'), SLIDER('h2', '末高度', 0, 10, 1, 2, 'm')],
      reads: [READ('重力做功', 'J')],
      calc: function (v) { return [v.m * G * (v.h1 - v.h2)]; },
      note: '只与起止高度有关；下降正功、上升负功。',
      draw: drawHeightWork
    },
    {
      id: 'momentum-conservation', cat: '能量', name: '动量守恒（弹性碰撞）',
      tex: 'm_1v_1=m_1v_1^{\\prime}+m_2v_2^{\\prime}',
      vars: [SLIDER('m1', '车1质量', 1, 5, 1, 2, 'kg'), SLIDER('m2', '车2质量', 1, 5, 1, 3, 'kg'), SLIDER('v1', '车1初速度', 1, 6, 1, 3, 'm/s')],
      reads: [READ('碰后v₁′', 'm/s'), READ('碰后v₂′', 'm/s'), READ('碰前动量', 'kg·m/s')],
      calc: function (v) {
        var vp1 = (v.m1 - v.m2) / (v.m1 + v.m2) * v.v1;
        var vp2 = 2 * v.m1 / (v.m1 + v.m2) * v.v1;
        return [vp1, vp2, v.m1 * v.v1];
      },
      note: '弹性碰撞另满足动能守恒，由此确定两个末速度。',
      draw: drawCollision
    },

    /* ===== 圆周与万有引力 ===== */
    {
      id: 'angular-displacement', cat: '圆周与引力', name: '平均角速度',
      tex: '\\omega=\\frac{\\Delta\\theta}{\\Delta t}',
      vars: [SLIDER('n', '转动圈数', 1, 4, 1, 2, ''), SLIDER('t', '用时', 2, 12, 1, 6, 's')],
      reads: [READ('角速度', 'rad/s'), READ('角位移', 'rad'), READ('转速', 'r/min')],
      calc: function (v) { return [v.n * 2 * Math.PI / v.t, v.n * 2 * Math.PI, v.n * 60 / v.t]; },
      note: 'θ 用弧度；匀速转动时等于瞬时角速度。',
      draw: drawWheel
    },
    {
      id: 'orbital-speed', cat: '圆周与引力', name: '圆轨道卫星速度',
      tex: 'v=\\sqrt{\\frac{GM}{r}}',
      vars: [SLIDER('M', '中心质量', 0.5, 3, 0.1, 1, 'M⊕'), SLIDER('r', '轨道中心距', 7, 40, 1, 10, '千km')],
      reads: [READ('圆轨道速率', 'km/s'), READ('公转周期', 'min')],
      calc: function (v) {
        var Mm = v.M * M_EARTH, rm = v.r * 1e6;
        var a = Math.sqrt(G_GRAV * Mm / rm);
        return [a / 1000, 2 * Math.PI * rm / a / 60];
      },
      note: '球对称中心天体、卫星质量可忽略、忽略阻力。',
      draw: drawOrbit
    },
    {
      id: 'escape-speed', cat: '圆周与引力', name: '第二宇宙速度',
      tex: 'v_2=\\sqrt{\\frac{2GM}{R}}',
      vars: [SLIDER('M', '中心质量', 0.5, 3, 0.1, 1, 'M⊕'), SLIDER('R', '天体半径', 3, 10, 1, 6, '千km')],
      reads: [READ('逃逸速率', 'km/s'), READ('同半径圆轨道速率', 'km/s')],
      calc: function (v) {
        var Mm = v.M * M_EARTH, Rm = v.R * 1e6;
        return [Math.sqrt(2 * G_GRAV * Mm / Rm) / 1000, Math.sqrt(G_GRAV * Mm / Rm) / 1000];
      },
      note: '从天体表面无后续动力逃逸的最小速率；远处剩余速率趋零。',
      draw: drawOrbit
    },

    /* ===== 近代物理（高中扩展分类） ===== */
    {
      id: 'photon-energy', cat: '近代物理', name: '光子能量',
      tex: 'E=h\\nu=\\frac{hc}{\\lambda}',
      vars: [SLIDER('nu', '频率', 1, 10, 0.1, 5, '×10¹⁴ Hz')],
      reads: [READ('光子能量', 'eV'), READ('波长', 'nm')],
      calc: function (v) {
        var f = v.nu * 1e14;
        return [H * f / EC, C0 / f * 1e9];
      },
      note: 'h=6.626×10⁻³⁴ J·s；可见光约 380–760 nm。',
      draw: drawSpectrum
    },
    {
      id: 'photoelectric-cutoff', cat: '近代物理', name: '光电效应截止频率',
      tex: '\\nu_0=\\frac{W_0}{h}',
      vars: [SLIDER('W0', '逸出功', 1, 6, 0.1, 2.3, 'eV'), SLIDER('nu', '入射频率', 1, 12, 0.1, 6, '×10¹⁴ Hz')],
      reads: [READ('截止频率', '×10¹⁴Hz'), READ('最大初动能', 'eV')],
      calc: function (v) {
        var w0 = v.W0 * EC;
        return [w0 / H / 1e14, H * v.nu * 1e14 / EC - v.W0];
      },
      note: 'ν<ν₀ 时无论光强多大都不发生光电效应。',
      draw: drawSpectrum
    },
    {
      id: 'mass-defect', cat: '近代物理', name: '质量亏损与结合能',
      tex: '\\Delta E=\\Delta m\\,c^2',
      vars: [SLIDER('dm', '质量亏损', 0.001, 0.5, 0.001, 0.03, 'u')],
      reads: [READ('结合能', 'MeV'), READ('Δm', 'kg')],
      calc: function (v) {
        return [v.dm * 931.494, v.dm * 1.66053906660e-27];
      },
      note: '1 u × c² ≈ 931.5 MeV；比结合能越大核越稳定。',
      draw: drawNucleus
    }
  ];

  /* ============================================================
     示意图绘制函数（ctx 已归一到 -160..160 × -100..100 逻辑坐标）
     ============================================================ */
  function path(c, pts, close) {
    c.beginPath();
    pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    if (close) c.closePath();
  }
  function arrowHead(c, x, y, ux, uy, size, color) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - ux * size - uy * size * 0.4, y - uy * size + ux * size * 0.4);
    c.lineTo(x - ux * size + uy * size * 0.4, y - uy * size - ux * size * 0.4);
    c.closePath(); c.fill();
  }
  function arrow(c, x1, y1, x2, y2, color, w) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < 4) return;
    c.strokeStyle = color; c.lineWidth = w || 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - dx / L * 5, y2 - dy / L * 5); c.stroke();
    arrowHead(c, x2, y2, dx / L, dy / L, 8, color);
  }
  function label(c, s, x, y, color, size, align) {
    c.fillStyle = color || '#3b3335';
    c.font = (size || 11) + 'px "Microsoft YaHei",sans-serif';
    c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }

  function drawBeaker(c, v, R) {
    // 量筒
    var x0 = -60, y0 = -50, W = 60, H = 110;
    c.strokeStyle = '#8a7259'; c.lineWidth = 2;
    path(c, [[x0, y0], [x0, y0 + H], [x0 + W, y0 + H], [x0 + W, y0]], false);
    c.stroke();
    // 液面（体积比例）
    var frac = Math.min(1, v.V / 250);
    c.fillStyle = 'rgba(91,147,173,.4)';
    c.fillRect(x0 + 2, y0 + H - H * 0.9 * frac - 2, W - 4, H * 0.9 * frac);
    // 刻度
    c.strokeStyle = '#9a8f93'; c.lineWidth = 1;
    for (var i = 1; i <= 5; i++) {
      var ty = y0 + H - H * 0.9 * i / 5;
      c.beginPath(); c.moveTo(x0, ty); c.lineTo(x0 + 10, ty); c.stroke();
    }
    label(c, 'V=' + v.V + ' cm³', x0 + W / 2, y0 + H + 14, '#3a6ea5', 11);
    // 砝码
    c.fillStyle = '#c9a17a';
    c.fillRect(40, y0 + H - 24, 36, 24);
    c.strokeStyle = '#8a6a4a'; c.strokeRect(40, y0 + H - 24, 36, 24);
    label(c, 'm=' + f(v.m, 2) + ' kg', 58, y0 + H + 14, '#7a5c44', 11);
    label(c, 'ρ = ' + f(R[0]) + ' kg/m³', 0, y0 - 22, '#b5453a', 12);
  }

  function drawPathAB(c, v, R) {
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-130, 30); c.lineTo(130, 30); c.stroke();
    var mid = (v.s1 - v.s2) / 2;
    var X = function (s) { return -130 + (s + 20) / 40 * 260; };
    arrow(c, X(0), 30, X(v.s1), 30, '#3a6ea5', 2);
    if (v.s2 > 0) arrow(c, X(v.s1), 45, X(v.s1 - v.s2), 45, '#b5453a', 2);
    label(c, '去程 ' + f(v.s1) + ' m', (X(0) + X(v.s1)) / 2, 18, '#3a6ea5');
    if (v.s2 > 0) label(c, '回程 ' + f(v.s2) + ' m', (X(v.s1) + X(v.s1 - v.s2)) / 2, 60, '#b5453a');
    label(c, 'A', X(0), 30 - 22, '#6c6165', 12);
    label(c, 'B', X(v.s1), 30 - 22, '#6c6165', 12);
  }

  function drawVT(c, v, R) {
    // v-t 图
    var x0 = -110, y0 = 50, W = 220, Hh = 80;
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + W, y0); c.moveTo(x0, y0 - Hh); c.lineTo(x0, y0 + 14); c.stroke();
    var vmax = Math.max(Math.abs(v.v0), Math.abs(v.v), 1);
    var Y = function (vv) { return y0 - (vv / vmax) * Hh * 0.8; };
    c.strokeStyle = '#3a6ea5'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(x0, Y(v.v0)); c.lineTo(x0 + W, Y(v.v)); c.stroke();
    label(c, 'v₀=' + f(v.v0), x0 - 8, Y(v.v0), '#3a6ea5', 11, 'right');
    label(c, 'v=' + f(v.v), x0 + W + 8, Y(v.v), '#3a6ea5', 11, 'left');
    label(c, 'Δt=' + f(v.t) + 's', x0 + W / 2, y0 + 12, '#9a8f93', 10);
    // 斜率示意
    if (v.t > 0) label(c, '斜率 a = ' + f((v.v - v.v0) / v.t) + ' m/s²', x0 + W / 2, y0 - Hh - 10, '#b5453a', 11);
  }

  function drawThrow(c, v, R) {
    var x0 = -60, y0 = 55;
    var Hmax = v.v0 * v.v0 / (2 * G);
    var Y = function (h) { return y0 - (h / Math.max(Hmax, 1)) * 90; };
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 - 40, y0); c.lineTo(x0 + 40, y0); c.stroke();
    // 轨迹
    c.strokeStyle = '#3a6ea5'; c.lineWidth = 2;
    c.beginPath();
    for (var t = 0; t <= 2 * v.v0 / G + 1e-6; t += 0.02) {
      var h = v.v0 * t - 0.5 * G * t * t;
      var x = x0 + Math.sin((t / (2 * v.v0 / G)) * Math.PI) * 60;
      t ? c.lineTo(x, Y(h)) : c.moveTo(x, Y(h));
    }
    c.stroke();
    label(c, 'hmax = ' + f(R[1]) + ' m', x0, Y(Hmax) - 12, '#b5453a', 11);
    label(c, '往返 ' + f(R[0]) + ' s', x0, y0 + 14, '#9a8f93', 10);
  }

  function drawProjectile(c, v, R) {
    var th = v.ang * Math.PI / 180;
    var x0 = -110, y0 = 60;
    var range = R[0], hmax = R[1];
    var X = function (x) { return x0 + (x / Math.max(range, 1)) * 220; };
    var Y = function (y) { return y0 - (y / Math.max(hmax, 1)) * 60; };
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 - 10, y0); c.lineTo(x0 + 230, y0); c.stroke();
    c.strokeStyle = '#3a6ea5'; c.lineWidth = 2;
    c.beginPath();
    for (var t = 0; t <= R[2] + 1e-6; t += 0.01) {
      var x = v.v0 * Math.cos(th) * t, y = v.v0 * Math.sin(th) * t - 0.5 * G * t * t;
      t ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
    }
    c.stroke();
    // 初速度方向
    arrow(c, X(0), Y(0), X(0) + 30 * Math.cos(th), Y(0) - 30 * Math.sin(th), '#b5453a', 2);
    label(c, 'θ=' + v.ang + '°', X(0) + 40, Y(0) - 26 * Math.sin(th) - 4, '#b5453a', 10, 'left');
    label(c, '射程 ' + f(range) + ' m', X(range / 2), y0 + 14, '#9a8f93', 10);
    label(c, '最高 ' + f(hmax) + ' m', X(range / 2), Y(hmax) - 10, '#3a6ea5', 10);
  }

  function drawVectors2(c, v, R) {
    var x0 = -30, y0 = 30;
    var th = (v.ang || 0) * Math.PI / 180;
    var S = 11;
    var ax = v.f1 != null ? v.f1 : (v.boat || 0), ay = 0;
    var bx = v.f2 != null ? v.f2 * Math.cos(th) : 0, by = v.f2 != null ? v.f2 * Math.sin(th) : (v.flow || 0);
    if (v.boat != null && v.flow != null && v.ang != null) {
      ax = v.boat * Math.cos(th) + 0; ay = v.boat * Math.sin(th);
      bx = v.flow; by = 0;
    }
    arrow(c, x0, y0, x0 + ax * S, y0 - ay * S, '#3a6ea5', 2.4);
    arrow(c, x0, y0, x0 + bx * S, y0 - by * S, '#b5453a', 2.4);
    arrow(c, x0, y0, x0 + (ax + bx) * S, y0 - (ay + by) * S, '#4d6b4a', 2.8);
    label(c, 'F₁', x0 + ax * S + 12, y0 - ay * S - 10, '#3a6ea5', 12);
    label(c, 'F₂', x0 + bx * S + 12, y0 - by * S - 10, '#b5453a', 12);
    label(c, '合力 ' + f(R[0]), x0 + (ax + bx) * S + 8, y0 - (ay + by) * S + 14, '#4d6b4a', 11);
  }

  function drawDecompose(c, v, R) {
    var th = v.ang * Math.PI / 180, S = 10;
    var x0 = -60, y0 = 30;
    arrow(c, x0, y0, x0 + v.F * Math.cos(th) * S, y0 - v.F * Math.sin(th) * S, '#3b3335', 2.6);
    arrow(c, x0, y0, x0 + v.F * Math.cos(th) * S, y0, '#3a6ea5', 2);
    arrow(c, x0, y0, x0, y0 - v.F * Math.sin(th) * S, '#b5453a', 2);
    label(c, 'Fx=' + f(R[0]) + ' N', x0 + v.F * Math.cos(th) * S / 2, y0 + 14, '#3a6ea5', 10);
    label(c, 'Fy=' + f(R[1]) + ' N', x0 - 14, y0 - v.F * Math.sin(th) * S / 2, '#b5453a', 10, 'right');
  }

  function drawInertia(c, v, R) {
    var x0 = -90, y0 = 40;
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(130, y0); c.stroke();
    for (var x = x0; x < 130; x += 10) {
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x - 6, y0 + 7);
      c.strokeStyle = 'rgba(138,114,89,.4)'; c.stroke();
    }
    c.fillStyle = '#c9a17a'; c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.5;
    var bx = x0 + 60;
    c.fillRect(bx - 18, y0 - 14, 36, 14); c.strokeRect(bx - 18, y0 - 14, 36, 14);
    if (v.v > 0.01) arrow(c, bx + 18, y0 - 7, bx + 18 + v.v * 9, y0 - 7, '#3a6ea5', 2);
    else if (v.v < -0.01) arrow(c, bx - 18, y0 - 7, bx - 18 + v.v * 9, y0 - 7, '#3a6ea5', 2);
    label(c, 'F合=0 → 速度保持 ' + f(v.v) + ' m/s', bx, y0 - 30, '#6c6165', 11);
    label(c, '动量 p=' + f(R[1]) + ' kg·m/s', bx, y0 - 48, '#9a8f93', 10);
  }

  function drawPair(c, v, R) {
    var x0 = 0, y0 = 30;
    c.fillStyle = '#c9a17a';
    c.fillRect(x0 - 62, y0 - 14, 50, 28);
    c.fillStyle = '#8f9fae';
    c.fillRect(x0 + 12, y0 - 14, 50, 28);
    arrow(c, x0 - 12, y0, x0 - 12 - v.F * 8, y0, '#b5453a', 2.4);
    arrow(c, x0 + 12, y0, x0 + 12 + v.F * 8, y0, '#3a6ea5', 2.4);
    label(c, 'F₁₂=' + f(R[0]) + ' N', x0 - 60, y0 + 28, '#b5453a', 11);
    label(c, 'F₂₁=' + f(R[1]) + ' N', x0 + 60, y0 + 28, '#3a6ea5', 11);
    label(c, 'm₁=' + v.m1 + 'kg', x0 - 37, y0, '#6c6165', 10);
    label(c, 'm₂=' + v.m2 + 'kg', x0 + 37, y0, '#6c6165', 10);
  }

  function drawElevator(c, v, R) {
    var x0 = -70, y0 = 30;
    c.strokeStyle = '#8a7259'; c.lineWidth = 1.6;
    c.strokeRect(x0 - 26, y0 - 30, 52, 60);
    c.strokeStyle = '#9a8f93';
    c.beginPath(); c.moveTo(x0, y0 - 30); c.lineTo(x0, y0 - 70); c.stroke();
    // 人
    c.fillStyle = '#8f9fae';
    c.beginPath(); c.arc(x0, y0 - 10, 6, 0, Math.PI * 2); c.fill();
    c.fillRect(x0 - 5, y0 - 4, 10, 16);
    arrow(c, x0 + 40, y0 + 20, x0 + 40, y0 + 20 - Math.max(4, R[0] / 4), '#5d7b60', 2.2);
    label(c, 'N=' + f(R[0]) + ' N', x0 + 52, y0 + 20 - Math.max(4, R[0] / 8), '#5d7b60', 11, 'left');
    arrow(c, x0 - 40, y0 - 20, x0 - 40, y0 - 20 + v.m * G / 4, '#7a5c44', 2.2);
    label(c, 'G=' + f(R[1]) + ' N', x0 - 52, y0 - 20 + v.m * G / 8, '#7a5c44', 11, 'right');
    var state = v.a > 0.01 ? '超重' : (v.a < -0.01 ? '失重' : '平衡');
    label(c, 'a=' + f(v.a) + ' m/s² · ' + state, x0, y0 + 48, '#b5453a', 11);
  }

  function drawFriction(c, v, R) {
    var x0 = -40, y0 = 40;
    c.strokeStyle = '#8a7259'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0 - 90, y0); c.lineTo(140, y0); c.stroke();
    c.fillStyle = '#c9a17a';
    c.fillRect(x0 - 20, y0 - 16, 40, 16);
    arrow(c, x0 + 20, y0 - 8, x0 + 20 + Math.abs(v.F) * 3 * Math.sign(v.F), y0 - 8, '#b5453a', 2.2);
    label(c, 'F=' + f(v.F) + ' N', x0 + 20 + Math.abs(v.F) * 1.6 * Math.sign(v.F), y0 - 20, '#b5453a', 10);
    arrow(c, x0 - 20, y0 - 8, x0 - 20 - R[0] * 3 * Math.sign(R[0] || 1), y0 - 8, '#ba8048', 2.2);
    label(c, 'f=' + f(R[0]) + ' N', x0 - 20 - R[0] * 1.6, y0 - 20, '#ba8048', 10);
    label(c, R[2] + ' · 最大静摩擦 ' + f(R[1]) + ' N', x0 + 20, y0 + 22, '#6c6165', 11);
  }

  function drawInclineDecomp(c, v, R) {
    var th = v.ang * Math.PI / 180;
    var ox = -100, oy = 55;
    c.strokeStyle = '#8a7259'; c.lineWidth = 2;
    path(c, [[ox, oy], [ox + 190 * Math.cos(th), oy - 190 * Math.sin(th)], [ox + 190, oy]], true);
    c.stroke();
    var S = 5;
    var mx = ox + 95, my = oy - 95 * Math.sin(th) - 6;
    c.fillStyle = '#c9a17a';
    c.save(); c.translate(mx, my); c.rotate(-th);
    c.fillRect(-12, -8, 24, 16); c.restore();
    arrow(c, mx, my, mx, my + v.m * G * S / 3, '#7a5c44', 2.2);
    arrow(c, mx, my, mx + v.m * G * Math.sin(th) * S / 3 * Math.cos(th), my + v.m * G * Math.sin(th) * S / 3 * Math.sin(th), '#b5453a', 2);
    label(c, 'G∥=' + f(R[0]) + ' N', mx + 46, my + 24, '#b5453a', 10);
    label(c, 'G⊥=' + f(R[1]) + ' N', mx - 48, my + 8, '#5d7b60', 10);
  }

  function drawTorque(c, v, R) {
    var x0 = 0, y0 = 30;
    var th = v.ang * Math.PI / 180;
    c.strokeStyle = '#8a7259'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + v.r * 120, y0); c.stroke();
    c.fillStyle = '#3b3335';
    c.beginPath(); c.arc(x0, y0, 4, 0, Math.PI * 2); c.fill();
    var ex = x0 + v.r * 120, ey = y0;
    arrow(c, ex, ey, ex + 30 * Math.cos(Math.PI - th), ey - 30 * Math.sin(th), '#b5453a', 2.4);
    label(c, 'F=' + f(v.F) + ' N', ex + 26, ey - 30 * Math.sin(th) - 12, '#b5453a', 10, 'left');
    label(c, 'M=' + f(R[0]) + ' N·m', x0, y0 + 26, '#6c6165', 11);
  }

  function drawLever(c, v, R) {
    var x0 = 0, y0 = 30;
    var S = 110;
    c.strokeStyle = '#8a7259'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0 - v.l1 * S, y0); c.lineTo(x0 + v.l2 * S, y0); c.stroke();
    c.fillStyle = '#3b3335';
    c.beginPath(); c.moveTo(x0, y0 + 6); c.lineTo(x0 - 6, y0 + 18); c.lineTo(x0 + 6, y0 + 18); c.closePath(); c.fill();
    arrow(c, x0 - v.l1 * S, y0 - 20, x0 - v.l1 * S, y0 - 2, '#3a6ea5', 2.2);
    arrow(c, x0 + v.l2 * S, y0 - 20, x0 + v.l2 * S, y0 - 2, '#b5453a', 2.2);
    label(c, 'F₁=' + f(R[0]) + ' N', x0 - v.l1 * S, y0 - 30, '#3a6ea5', 11);
    label(c, 'F₂=' + f(v.F2) + ' N', x0 + v.l2 * S, y0 - 30, '#b5453a', 11);
    label(c, 'l₁=' + v.l1 + 'm', x0 - v.l1 * S / 2, y0 + 14, '#9a8f93', 10);
    label(c, 'l₂=' + v.l2 + 'm', x0 + v.l2 * S / 2, y0 + 14, '#9a8f93', 10);
  }

  function drawPulley(c, v, R) {
    var n = Math.round(v.n);
    var x0 = 0, y0 = -10;
    // 横梁
    c.strokeStyle = '#8a7259'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-80, y0 - 40); c.lineTo(80, y0 - 40); c.stroke();
    // 定滑轮
    c.fillStyle = '#b09a80';
    c.beginPath(); c.arc(x0, y0 - 24, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7a6854'; c.stroke();
    // 动滑轮 + 物
    var py = y0 + 30;
    c.beginPath(); c.arc(x0, py, 10, 0, Math.PI * 2);
    c.fillStyle = '#b09a80'; c.fill(); c.stroke();
    c.fillStyle = '#c9a17a';
    c.fillRect(x0 - 14, py + 20, 28, 22);
    c.strokeStyle = '#8a6a4a'; c.strokeRect(x0 - 14, py + 20, 28, 22);
    // 绳
    c.strokeStyle = '#6c6165'; c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x0 - 12, py);
    c.lineTo(x0 - 12, y0 - 36); c.lineTo(x0 + 12, y0 - 36);
    if (n >= 2) c.lineTo(x0 + 12, py);
    c.stroke();
    label(c, 'n=' + n + ' 段', x0 + 40, y0 - 10, '#6c6165', 11, 'left');
    label(c, 'F=' + f(R[0]) + ' N', x0 - 44, y0 - 30, '#3a6ea5', 11, 'right');
    label(c, 'G=' + f(v.m * G) + ' N', x0 + 44, py + 30, '#7a5c44', 11, 'left');
  }

  function drawLedger(c, v, R) {
    var total = v.wu + v.wx;
    var x0 = -100, W = 200, y0 = 20;
    c.fillStyle = '#4d6b4a';
    c.fillRect(x0, y0, W * v.wu / Math.max(total, 1), 26);
    c.fillStyle = '#c2a878';
    c.fillRect(x0 + W * v.wu / Math.max(total, 1), y0, W * v.wx / Math.max(total, 1), 26);
    c.strokeStyle = '#8a7259'; c.strokeRect(x0, y0, W, 26);
    label(c, '有用 ' + f(v.wu) + ' J', x0 + W * v.wu / total / 2, y0 + 13, '#fff', 11);
    label(c, '额外 ' + f(v.wx) + ' J', x0 + W * v.wu / total + W * v.wx / total / 2, y0 + 13, '#6c6165', 11);
    label(c, 'η = ' + (R[0] * 100).toFixed(1) + '%', x0 + W / 2, y0 + 44, '#b5453a', 13);
  }

  function drawSpring(c, v, R) {
    var x0 = -70, y0 = 30;
    c.strokeStyle = '#8a7259'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x0 - 20, y0 - 30); c.lineTo(x0 - 20, y0 + 30); c.stroke();
    // 弹簧
    c.strokeStyle = '#5d7b60'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(x0 - 20, y0);
    var coils = 8, L = 70 + v.x * 260;
    for (var i = 0; i <= coils; i++) {
      var x = x0 - 20 + L * i / coils;
      c.lineTo(x, y0 + (i % 2 ? -9 : 9));
    }
    c.lineTo(x0 - 20 + L, y0); c.stroke();
    c.fillStyle = '#c9a17a';
    c.fillRect(x0 - 20 + L, y0 - 12, 28, 24);
    c.strokeStyle = '#8a6a4a'; c.strokeRect(x0 - 20 + L, y0 - 12, 28, 24);
    label(c, 'x=' + f(v.x) + ' m', x0 + L / 2, y0 - 20, '#6c6165', 10);
    label(c, 'Ep=' + f(R[0]) + ' J · F=' + f(R[1]) + ' N', x0 + L / 2, y0 + 34, '#b5453a', 11);
  }

  function drawHeightWork(c, v, R) {
    var x0 = -80;
    var Y = function (h) { return 55 - h * 9; };
    c.strokeStyle = '#8a7259'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x0 - 10, Y(v.h1)); c.lineTo(x0 + 30, Y(v.h1)); c.moveTo(x0 - 10, Y(v.h2)); c.lineTo(x0 + 30, Y(v.h2)); c.stroke();
    c.fillStyle = '#8f9fae';
    c.beginPath(); c.arc(x0 + 70, Y(v.h1), 7, 0, Math.PI * 2); c.fill();
    c.setLineDash([3, 4]);
    c.strokeStyle = '#9a8f93';
    c.beginPath(); c.moveTo(x0 + 70, Y(v.h1)); c.lineTo(x0 + 70, Y(v.h2)); c.stroke();
    c.setLineDash([]);
    if (v.h2 < v.h1) {
      arrow(c, x0 + 70, Y(v.h1), x0 + 70, Y(v.h2), '#b5453a', 2.2);
    } else {
      arrow(c, x0 + 70, Y(v.h2), x0 + 70, Y(v.h1), '#3a6ea5', 2.2);
    }
    label(c, 'h₁=' + v.h1 + ' m', x0 + 34, Y(v.h1), '#9a8f93', 10, 'left');
    label(c, 'h₂=' + v.h2 + ' m', x0 + 34, Y(v.h2), '#9a8f93', 10, 'left');
    label(c, 'WG=' + f(R[0]) + ' J（' + (R[0] > 0 ? '正功' : R[0] < 0 ? '负功' : '零功') + '）', x0 + 70, Y(Math.max(v.h1, v.h2)) - 20, '#b5453a', 11);
  }

  function drawCollision(c, v, R) {
    var y0 = 30;
    c.strokeStyle = '#b9a696'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-140, y0 + 16); c.lineTo(140, y0 + 16); c.stroke();
    // 碰前
    c.fillStyle = '#c9a17a'; c.fillRect(-120, y0 - 12, 30, 24);
    c.fillStyle = '#8f9fae'; c.fillRect(60, y0 - 12, 34, 24);
    arrow(c, -90, y0, -90 + v.v1 * 9, y0, '#3a6ea5', 2);
    label(c, '碰前', -90, y0 - 28, '#9a8f93', 10);
    // 碰后
    var y1 = y0 - 0;
    c.fillStyle = '#c9a17a'; c.fillRect(-30, y1 - 12, 26, 24);
    c.fillStyle = '#8f9fae'; c.fillRect(110, y1 - 12, 30, 24);
    if (Math.abs(R[0]) > 0.05) arrow(c, -17, y1 - 16, -17 + R[0] * 8, y1 - 16, R[0] > 0 ? '#3a6ea5' : '#b5453a', 2);
    if (Math.abs(R[1]) > 0.05) arrow(c, 125, y1 - 16, 125 + R[1] * 8, y1 - 16, '#4d6b4a', 2);
    label(c, '碰后', 60, y1 - 28, '#9a8f93', 10);
    label(c, 'v₁′=' + f(R[0]) + ' · v₂′=' + f(R[1]) + ' m/s', 0, y1 + 42, '#6c6165', 11);
  }

  function drawWheel(c, v, R) {
    var x0 = 0, y0 = 10;
    c.strokeStyle = '#8a7259'; c.lineWidth = 2.4;
    c.beginPath(); c.arc(x0, y0, 46, 0, Math.PI * 2); c.stroke();
    // 转过的角
    var sweep = v.n * 2 * Math.PI % (Math.PI * 2);
    c.strokeStyle = '#3a6ea5'; c.lineWidth = 5;
    c.beginPath(); c.arc(x0, y0, 46, -Math.PI / 2, -Math.PI / 2 + sweep); c.stroke();
    arrow(c, x0, y0, x0 + 46 * Math.cos(-Math.PI / 2 + sweep), y0 + 46 * Math.sin(-Math.PI / 2 + sweep), '#b5453a', 2);
    label(c, 'θ=' + f(R[1]) + ' rad', x0, y0 + 66, '#6c6165', 11);
    label(c, 'ω=' + f(R[0]) + ' rad/s', x0, y0 - 62, '#3a6ea5', 11);
  }

  function drawOrbit(c, v, R) {
    var x0 = 0, y0 = 10;
    c.fillStyle = '#d9a441';
    c.beginPath(); c.arc(x0, y0, 16, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#9a8f93'; c.setLineDash([4, 4]); c.lineWidth = 1.2;
    c.beginPath(); c.arc(x0, y0, 52, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    var sat = 52 * (R[0] > 8 ? 1 : 0.7);
    var px = x0 + 52 * Math.cos(-0.6), py = y0 + 52 * Math.sin(-0.6);
    c.fillStyle = '#3a6ea5';
    c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
    label(c, 'M=' + f(v.M) + ' M⊕', x0, y0 + 34, '#9a8f93', 10);
    label(c, 'v=' + f(R[0]) + ' km/s', px + 12, py - 10, '#3a6ea5', 11, 'left');
  }

  function drawSpectrum(c, v, R) {
    // 光谱条
    var x0 = -120, W = 240, y0 = 0;
    var bands = [[380, '#8b3fa8'], [450, '#3a6ea5'], [490, '#2f8f6b'], [540, '#8fae3a'], [590, '#e0a423'], [620, '#e07023'], [700, '#c23a3a']];
    bands.forEach(function (b, i) {
      var x = x0 + W * (b[0] - 380) / (750 - 380);
      var x2 = x0 + W * ((b[1] && bands[i + 1] ? bands[i + 1][0] : 750) - 380) / (750 - 380);
      c.fillStyle = b[1];
      c.fillRect(x, y0 - 8, Math.max(2, x2 - x), 16);
    });
    label(c, '380 nm', x0, y0 + 22, '#9a8f93', 9);
    label(c, '750 nm', x0 + W, y0 + 22, '#9a8f93', 9, 'right');
    if (R[1] != null && R[1] >= 380 && R[1] <= 750) {
      var mx = x0 + W * (R[1] - 380) / 370;
      c.strokeStyle = '#3b3335'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(mx, y0 - 16); c.lineTo(mx, y0 + 16); c.stroke();
    }
    label(c, R.map(function (x, i) { return (i ? ' · ' : '') + f(x) + (i === 0 ? ' eV' : ' nm'); }).join(''), 0, y0 + 46, '#3b3335', 11);
  }

  function drawNucleus(c, v, R) {
    var x0 = 0, y0 = 10;
    var n = 12;
    for (var i = 0; i < n; i++) {
      var a = i * 2.399963;
      var rr = 4.2 * Math.sqrt(i + 1);
      c.fillStyle = i % 2 ? '#b5453a' : '#3a6ea5';
      c.beginPath(); c.arc(x0 + rr * Math.cos(a), y0 + rr * Math.sin(a), 6, 0, Math.PI * 2); c.fill();
    }
    label(c, 'Δm=' + f(v.dm, 3) + ' u', x0, y0 + 42, '#6c6165', 11);
    label(c, 'ΔE=' + f(R[0]) + ' MeV', x0, y0 - 36, '#b5453a', 12);
  }

  /* 挂到 window */
  var CATS = ['运动', '动力学', '能量', '圆周与引力', '近代物理'];
  root.FormulaCore = {
    DB: DB,
    CATS: CATS,
    G: G,
    fmt: f
  };
})(window);
