/* ============================================================
   分子实验室 · 数据与几何内核
   ------------------------------------------------------------
   元素表、分子库、晶体晶胞均还原自原站 MoleculeLabView：
   · 半径：共价半径 pm → 球棍半径 r = (pm/76)^0.35 × 32（原站 On 函数）
   · 空间构型：甲烷正四面体 (±1,±1,±1)/√3、氨三角锥（键角107°）、
     水 104.5° 折线、乙烷交错构象
   · 晶体：NaCl/金刚石/铜 面心立方基矢 on=[000,.5 0 .5,0 .5 .5,.5 .5 0]
     CsCl 体心、干冰分子中心
   · 3D：yaw/pitch 正交投影 + 深度排序，painter's algorithm
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- 元素表 ---------- */
  function E(name, Z, valence, color, dark, light, kind, text) {
    return { name: name, Z: Z, valence: valence, color: color, dark: dark, light: light, kind: kind || 'covalent', text: text || '#fff' };
  }
  var ELEMENTS = {
    H: E('氢', 1, 1, '#ececea', '#b4b6b4', '#ffffff', 'covalent', '#343a35'),
    C: E('碳', 6, 4, '#555856', '#292e2b', '#989c98'),
    N: E('氮', 7, 3, '#537daf', '#305582', '#9ebfe6'),
    O: E('氧', 8, 2, '#d45a51', '#9f342e', '#f3a59b'),
    F: E('氟', 9, 1, '#84b2a2', '#466f60', '#c8e6d9', 'covalent', '#173c2d'),
    Na: E('钠', 11, 0, '#8276a7', '#51456e', '#b9aed6', 'metal'),
    Mg: E('镁', 12, 0, '#8caa7b', '#58704c', '#c9dcb8', 'metal', '#283d1e'),
    Al: E('铝', 13, 0, '#a8adb4', '#6c737f', '#e2e5e9', 'metal', '#28313e'),
    Si: E('硅', 14, 4, '#9a8d79', '#665b4b', '#d0c3ad'),
    P: E('磷', 15, 3, '#d99054', '#995727', '#f1c69f', 'covalent', '#48280f'),
    S: E('硫', 16, 2, '#dcc45e', '#9a812b', '#f9eaa3', 'covalent', '#453708'),
    Cl: E('氯', 17, 1, '#789454', '#4b6236', '#b5ce97'),
    K: E('钾', 19, 0, '#a1789b', '#70466a', '#d7b4d0', 'metal'),
    Ca: E('钙', 20, 0, '#87976c', '#556143', '#c4cdaa', 'metal'),
    Br: E('溴', 35, 1, '#a56552', '#68382b', '#daa28c'),
    I: E('碘', 53, 1, '#917498', '#5b4163', '#c6abce')
  };
  var COVALENT_PM = {
    H: 31, C: 76, N: 71, O: 66, F: 57, Na: 166, Mg: 141, Al: 121, Si: 111,
    P: 107, S: 105, Cl: 102, K: 203, Ca: 176, Br: 120, I: 139
  };
  var VDW_PM = { H: 110, C: 170, N: 155, O: 152, F: 147, S: 180, Cl: 175, Br: 183, I: 198 };

  /* 原站半径公式：r = (pm/76)^0.35 × 32 */
  function stickRadius(el) {
    return Math.pow((COVALENT_PM[el] || 76) / 76, 0.35) * 32;
  }
  /* 空间填充半径：范德华 pm → Å */
  function vdwRadius(el) {
    var v = VDW_PM[el];
    if (v == null) throw new Error(el + ' 尚无本批已核实的范德华半径');
    return v / 100;
  }

  /* ---------- 分子库 ---------- */
  function A(el, x, y, z) { return { el: el, x: x || 0, y: y || 0, z: z || 0 }; }
  function B(a, b, order) { return { a: a, b: b, order: order || 1 }; }

  var half = Math.PI * 104.5 / 360;    // 水的半键角
  var tetra = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  // 氨：键角107°，N 在锥顶
  var cN = Math.cos(Math.PI * 107 / 180);
  var hz = Math.sqrt((cN + 0.5) / (1 - cN));
  var nh3H = [0, 1, 2].map(function (i) {
    return A('H', Math.cos(i * 2 * Math.PI / 3), -hz, Math.sin(i * 2 * Math.PI / 3));
  });
  // 乙烷交错构象
  var ethAtoms = [A('C', -0.75, 0), A('C', 0.75, 0)];
  var ethBonds = [B(0, 1)];
  for (var ee = 0; ee < 2; ee++) {
    for (var k = 0; k < 3; k++) {
      var ang = (k * 120 + ee * 60) * Math.PI / 180;
      ethAtoms.push(A('H', (ee ? 1 : -1) * 1.15, Math.cos(ang) * 1.05, Math.sin(ang) * 1.05));
      ethBonds.push(B(ee, ethAtoms.length - 1));
    }
  }

  var MOLECULES = [
    {
      id: 'water', name: '水', formula: 'H2O', shape: '折线形',
      atoms: [A('O'), A('H', -Math.sin(half), Math.cos(half)), A('H', Math.sin(half), Math.cos(half))],
      bonds: [B(0, 1), B(0, 2)],
      desc: '一个水分子由 2 个氢原子和 1 个氧原子构成。',
      high: '水分子的空间结构呈折线形。平面画布上的连线只表示连接关系，不能用拖动后的夹角判断真实键角。'
    },
    {
      id: 'oxygen', name: '氧气', formula: 'O2', shape: '双原子分子',
      atoms: [A('O', -0.7), A('O', 0.7)], bonds: [B(0, 1, 2)],
      desc: '一个氧分子由 2 个氧原子构成，是单质的分子。',
      high: '两氧原子之间用双键表示。球棍模型的棍不是实际存在的棒。'
    },
    {
      id: 'carbon-dioxide', name: '二氧化碳', formula: 'CO2', shape: '直线形',
      atoms: [A('C'), A('O', -1.15), A('O', 1.15)], bonds: [B(0, 1, 2), B(0, 2, 2)],
      desc: '二氧化碳含 1 个碳原子和 2 个氧原子。',
      high: '直线形，碳与两个氧分别以双键连接。'
    },
    {
      id: 'methane', name: '甲烷', formula: 'CH4', shape: '正四面体形',
      atoms: [A('C')].concat(tetra.map(function (v) { return A('H', v[0] * 0.75, v[1] * 0.75, v[2] * 0.75); })),
      bonds: [1, 2, 3, 4].map(function (i) { return B(0, i); }),
      desc: '甲烷含 1 个碳原子和 4 个氢原子。',
      high: '四个氢位于正四面体的四个顶点。平面十字形画法不等于分子的真实形状。'
    },
    {
      id: 'hydrogen', name: '氢气', formula: 'H2', shape: '双原子分子',
      atoms: [A('H', -0.35), A('H', 0.35)], bonds: [B(0, 1)],
      desc: '一个氢分子由 2 个氢原子构成。',
      high: '两氢原子以单键连接。元素符号 H 与分子式 H₂ 不同。'
    },
    {
      id: 'nitrogen', name: '氮气', formula: 'N2', shape: '双原子分子',
      atoms: [A('N', -0.55), A('N', 0.55)], bonds: [B(0, 1, 3)],
      desc: '一个氮分子由 2 个氮原子构成。',
      high: '两氮原子之间以三键连接。'
    },
    {
      id: 'chlorine', name: '氯气', formula: 'Cl2', shape: '双原子分子',
      atoms: [A('Cl', -0.9), A('Cl', 0.9)], bonds: [B(0, 1)],
      desc: '一个氯分子由 2 个氯原子构成。',
      high: '氯气是单质；氯化氢是化合物。'
    },
    {
      id: 'hydrogen-chloride', name: '氯化氢', formula: 'HCl', shape: '双原子分子',
      atoms: [A('H', -0.6), A('Cl', 0.65)], bonds: [B(0, 1)],
      desc: '氯化氢含 1 个氢原子和 1 个氯原子。',
      high: '分子模型不同于盐酸溶液模型。'
    },
    {
      id: 'ammonia', name: '氨', formula: 'NH3', shape: '三角锥形',
      atoms: [A('N')].concat(nh3H),
      bonds: [1, 2, 3].map(function (i) { return B(0, i); }),
      desc: '氨含 1 个氮原子和 3 个氢原子。',
      high: '三角锥形。这里只显示原子和化学键，不显示孤电子对。'
    },
    {
      id: 'ethane', name: '乙烷', formula: 'C2H6', shape: '每个碳近似四面体',
      atoms: ethAtoms, bonds: ethBonds,
      desc: '乙烷含 2 个碳原子和 6 个氢原子。',
      high: '两碳以单键连接。三维参考采用一种交错构象。'
    },
    {
      id: 'ethylene', name: '乙烯', formula: 'C2H4', shape: '平面结构',
      atoms: [A('C', -0.65), A('C', 0.65), A('H', -1.25, -1), A('H', -1.25, 1), A('H', 1.25, -1), A('H', 1.25, 1)],
      bonds: [B(0, 1, 2), B(0, 2), B(0, 3), B(1, 4), B(1, 5)],
      desc: '乙烯含 2 个碳原子和 4 个氢原子。',
      high: '含碳碳双键，六个原子处于同一平面。'
    },
    {
      id: 'acetylene', name: '乙炔', formula: 'C2H2', shape: '直线形',
      atoms: [A('C', -0.6), A('C', 0.6), A('H', -1.7), A('H', 1.7)],
      bonds: [B(0, 1, 3), B(0, 2), B(1, 3)],
      desc: '乙炔含 2 个碳原子和 2 个氢原子。',
      high: '含碳碳三键，四个原子在一条直线上。'
    },
    {
      id: 'methanol', name: '甲醇', formula: 'CH3OH', shape: '甲基 + 羟基',
      /* 甲基按正四面体精确摆位：C–H ≡ 1.09 Å，与 C–O 方向夹角 109.47°，
         三个 H 相隔 120°（避免手摆造成的键长/键角不一致） */
      atoms: [A('C', -0.7), A('O', 0.72), A('H', 0.72, 0.95),
        A('H', -1.0633, 1.0277, 0), A('H', -1.0633, -0.5138, 0.89), A('H', -1.0633, -0.5138, -0.89)],
      bonds: [B(0, 1), B(1, 2), B(0, 3), B(0, 4), B(0, 5)],
      desc: '甲醇含 1 个碳、4 个氢和 1 个氧。',
      high: '羟基（—OH）连在饱和碳上，是醇类的官能团。'
    }
  ];

  /* ---------- 键角计算 ---------- */
  function vec(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
  function vlen(v) { return Math.hypot(v[0], v[1], v[2]); }
  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  /* 求分子所有以 centerIdx 为顶点的键角 */
  function anglesAt(mol, centerIdx) {
    var out = [];
    var neighbors = [];
    mol.bonds.forEach(function (b) {
      if (b.a === centerIdx) neighbors.push(b.b);
      else if (b.b === centerIdx) neighbors.push(b.a);
    });
    for (var i = 0; i < neighbors.length; i++) {
      for (var j = i + 1; j < neighbors.length; j++) {
        var v1 = vec(mol.atoms[neighbors[i]], mol.atoms[centerIdx]);
        var v2 = vec(mol.atoms[neighbors[j]], mol.atoms[centerIdx]);
        var l1 = vlen(v1), l2 = vlen(v2);
        if (l1 < 1e-9 || l2 < 1e-9) continue;
        var cos = Math.max(-1, Math.min(1, vdot(v1, v2) / (l1 * l2)));
        out.push({
          atoms: [neighbors[i], centerIdx, neighbors[j]],
          degrees: Math.acos(cos) * 180 / Math.PI,
          label: mol.atoms[neighbors[i]].el + '—' + mol.atoms[centerIdx].el + '—' + mol.atoms[neighbors[j]].el
        });
      }
    }
    return out;
  }

  /* ---------- 晶体晶胞 ---------- */
  var FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
  function site(sp, x, y, z) { return { sp: sp, x: x, y: y, z: z }; }

  var CRYSTALS = [
    {
      id: 'sodium-chloride', name: '氯化钠', formula: 'NaCl',
      kind: '离子晶体', cell: '立方晶胞 · 氯化钠型',
      basis: FCC.map(function (v) { return site('Cl', v[0], v[1], v[2]); })
        .concat([[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5], [0.5, 0.5, 0.5]].map(function (v) { return site('Na', v[0], v[1], v[2]); })),
      species: {
        Na: { label: 'Na⁺', name: '钠离子', color: '#7b69a1', r: 51 / 283 },
        Cl: { label: 'Cl⁻', name: '氯离子', color: '#789559', r: 90.5 / 283 }
      },
      summary: 'Na⁺、Cl⁻交替排列。每个钠离子的最近邻是 6 个氯离子，反之亦然。',
      note: 'NaCl 表示离子数的最简比，不表示一个独立分子。'
    },
    {
      id: 'cesium-chloride', name: '氯化铯', formula: 'CsCl',
      kind: '离子晶体', cell: '立方晶胞 · 氯化铯型',
      basis: [site('Cl', 0, 0, 0), site('Cs', 0.5, 0.5, 0.5)],
      species: {
        Cs: { label: 'Cs⁺', name: '铯离子', color: '#9b779c', r: Math.sqrt(0.75) * 174 / 355 },
        Cl: { label: 'Cl⁻', name: '氯离子', color: '#789559', r: Math.sqrt(0.75) * 181 / 355 }
      },
      summary: '体心的一种离子周围有 8 个异种离子。',
      note: '氯化铯型结构。中心与顶点粒子不同，不能称为体心立方金属晶格。'
    },
    {
      id: 'diamond', name: '金刚石', formula: 'C',
      kind: '共价晶体', cell: '金刚石立方晶胞',
      basis: FCC.map(function (v) { return site('C', v[0], v[1], v[2]); })
        .concat(FCC.map(function (v) { return site('C', (v[0] + 0.25) % 1, (v[1] + 0.25) % 1, (v[2] + 0.25) % 1); })),
      species: { C: { label: 'C', name: '碳原子', color: '#414744', r: Math.sqrt(3) / 8 } },
      summary: '每个碳与 4 个最近的碳形成四面体方向的共价连接。',
      note: '每晶胞计入 8 个碳原子；是延伸网络，不是 C₈ 分子。'
    },
    {
      id: 'copper', name: '铜', formula: 'Cu',
      kind: '金属晶体', cell: '面心立方常规晶胞',
      basis: FCC.map(function (v) { return site('Cu', v[0], v[1], v[2]); }),
      species: { Cu: { label: 'Cu', name: '铜原子', color: '#b78162', r: Math.SQRT2 / 4 } },
      summary: '铜原子占据顶点和面心，每个原子的最近邻有 12 个。',
      note: '画面 14 个球，每晶胞只计入 4 个铜原子。'
    },
    {
      id: 'dry-ice', name: '干冰', formula: 'CO2',
      kind: '分子晶体', cell: '立方晶胞 · 分子中心示意',
      basis: FCC.map(function (v) { return site('CO2', v[0], v[1], v[2]); }),
      species: { CO2: { label: 'CO₂', name: '二氧化碳分子中心', color: '#7e929a', r: 0.14 } },
      centresOnly: true,
      summary: '每个球代表一个完整 CO₂ 分子的中心，每晶胞共计 4 个。',
      note: '干冰 I 相的分子中心教学示意，省略分子取向。'
    }
  ];

  /* 晶胞近邻键线：距离小于阈值的三维近邻画虚线 */
  /* 晶胞内的近邻连线。
     不能用一个固定阈值：NaCl 最近邻 0.5a、CsCl 体心-顶点为 0.866a、金刚石 0.433a，
     固定 0.72 会让 CsCl 一根键都画不出来。
     做法：先求全体原子对的最短距离 dmin，取 (dmin, dmin*1.12] 区间内的对作为近邻键，
     再手工并入金刚石/干冰中“同种中心 + 基元内”的次级键。 */
  function crystalBonds(cr) {
    var b = cr.basis, out = [], n = b.length;
    var dmin = Infinity;
    var all = [];
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var d = Math.hypot(b[i].x - b[j].x, b[i].y - b[j].y, b[i].z - b[j].z);
        all.push([i, j, d]);
        if (d < dmin) dmin = d;
      }
    }
    if (!isFinite(dmin)) return out;
    var cut = dmin * 1.12;
    for (var k = 0; k < all.length; k++) {
      if (all[k][2] <= cut) out.push(all[k]);
    }
    return out;
  }

  /* ---------- 3D 投影（原站 fa 函数还原） ---------- */
  function makeProjector(atoms3d, view, width, height, zoom) {
    // 中心
    var cx = 0, cy = 0, cz = 0;
    ['x', 'y', 'z'].forEach(function (ax) {
      var mn = Infinity, mx = -Infinity;
      atoms3d.forEach(function (a) {
        var v = (a[ax] || 0) - (a.radius || 0), w = (a[ax] || 0) + (a.radius || 0);
        mn = Math.min(mn, v); mx = Math.max(mx, w);
      });
      var c = (mn + mx) / 2;
      if (ax === 'x') cx = c; else if (ax === 'y') cy = c; else cz = c;
    });
    var radius = 0.001;
    atoms3d.forEach(function (a) {
      radius = Math.max(radius, Math.hypot(a.x - cx, a.y - cy, a.z - cz) + (a.radius || 0));
    });
    var k = Math.min(width / (radius * 2), height / (radius * 2), 260) * (zoom || 1);
    var cyaw = Math.cos(view.yaw), syaw = Math.sin(view.yaw);
    var cpit = Math.cos(view.pitch), spit = Math.sin(view.pitch);
    return {
      scale: k, center: { x: cx, y: cy, z: cz }, radius: radius,
      project: function (a) {
        var dx = a.x - cx, dy = a.y - cy, dz = a.z - cz;
        var ex = dx * cyaw + dz * syaw;
        var ez = -dx * syaw + dz * cyaw;
        return {
          x: width / 2 + ex * k,
          y: height / 2 + (dy * cpit - ez * spit) * k,
          z: dy * spit + ez * cpit
        };
      }
    };
  }

  root.MolCore = {
    ELEMENTS: ELEMENTS,
    MOLECULES: MOLECULES,
    CRYSTALS: CRYSTALS,
    stickRadius: stickRadius,
    vdwRadius: vdwRadius,
    anglesAt: anglesAt,
    crystalBonds: crystalBonds,
    makeProjector: makeProjector
  };
})(window);
