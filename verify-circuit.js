/* 电路求解内核自检 */
global.window = global;
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/js/circuit/core.js', 'utf8'));

const CC = CircuitCore;
let fail = 0;
function check(name, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol);
  if (!ok) { fail++; console.log('  ✗', name, 'got=' + got, 'want=' + want); }
  else console.log('  ✓', name, '=', got.toFixed(6));
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1. 串联：9V(0.5Ω) + 100Ω + 200Ω
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'r1', type: 'resistor', x: 4, z: 2, rot: 0, r: 100 },
      { id: 'r2', type: 'resistor', x: 8, z: 2, rot: 0, r: 200 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  const I = s.readings.find(r => r.id === 'bat').i;
  check('串联电流', Math.abs(I), 9 / 300.5, 1e-6);
  check('r1 电流', Math.abs(s.readings.find(r => r.id === 'r1').i), 9 / 300.5, 1e-6);
  console.log('   电阻分压 r1=' + s.readings.find(r => r.id === 'r1').v.toFixed(3) + 'V r2=' + s.readings.find(r => r.id === 'r2').v.toFixed(3) + 'V');
}

// 2. 分压器 + 电压表
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'r1', type: 'resistor', x: 4, z: 2, rot: 0, r: 100 },
      { id: 'r2', type: 'resistor', x: 8, z: 2, rot: 0, r: 200 },
      { id: 'vm', type: 'voltmeter', x: 9, z: 4, rot: 90 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] },
      { id: 'w4', pts: [{ x: 9, z: 2 }, { x: 9, z: 4 }] },
      { id: 'w5', pts: [{ x: 9, z: 6 }, { x: 9, z: 6 }, { x: 14, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  const v2 = s.readings.find(r => r.id === 'r2').v;
  check('R2 分压（接电压表）', v2, 9 * 200 / 300.5, 0.02);
  const ivm = s.readings.find(r => r.id === 'vm').i;
  check('电压表电流 < 10µA', Math.abs(ivm), 0, 1e-5);
}

// 3. 并联双灯
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'b1', type: 'bulb', x: 5, z: 1, rot: 0, r: 100 },
      { id: 'b2', type: 'bulb', x: 5, z: 7, rot: 0, r: 100 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 3, z: 4 }, { x: 3, z: 1 }, { x: 5, z: 1 }] },
      { id: 'w2', pts: [{ x: 7, z: 1 }, { x: 10, z: 1 }, { x: 10, z: 4 }] },
      { id: 'w3', pts: [{ x: 0, z: 4 }, { x: 3, z: 4 }, { x: 3, z: 7 }, { x: 5, z: 7 }] },
      { id: 'w4', pts: [{ x: 7, z: 7 }, { x: 10, z: 7 }, { x: 10, z: 4 }] },
      { id: 'w5', pts: [{ x: 10, z: 4 }, { x: 10, z: 10 }, { x: 0, z: 10 }, { x: 0, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  const i1 = Math.abs(s.readings.find(r => r.id === 'b1').i);
  check('并联每支路电流', i1, 9 / (0.5 + 50) / 2, 1e-6);
}

// 4. 二极管正向 / 反向
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 5, r: 0.5 },
      { id: 'd1', type: 'diode', x: 4, z: 2, rot: 0, vf: 0.7 },
      { id: 'r1', type: 'resistor', x: 8, z: 2, rot: 0, r: 100 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] }
    ]
  };
  const s1 = CC.solve(st);
  check('二极管正向电流', Math.abs(s1.readings.find(r => r.id === 'd1').i), (5 - 0.7) / 108.5, 1e-4);
  st.comps[1].reversed = true;
  const s2 = CC.solve(st);
  check('二极管反向截止', Math.abs(s2.readings.find(r => r.id === 'r1').i), 0, 1e-7);
}

// 5. 开关断开
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'sw', type: 'switch', x: 4, z: 2, rot: 0, closed: false },
      { id: 'b1', type: 'bulb', x: 8, z: 2, rot: 0, r: 100 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  check('开关断开无电流', Math.abs(s.readings.find(r => r.id === 'b1').i), 0, 1e-9);
  st.comps[1].closed = true;
  const s2 = CC.solve(st);
  check('开关闭合有电流', Math.abs(s2.readings.find(r => r.id === 'b1').i), 9 / 100.5, 1e-4);
}

// 6. LED + 限流电阻
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 5, r: 0.5 },
      { id: 'r1', type: 'resistor', x: 4, z: 2, rot: 0, r: 220 },
      { id: 'led', type: 'led', x: 8, z: 2, rot: 0, vf: 2.0 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  check('LED 电流', Math.abs(s.readings.find(r => r.id === 'led').i), (5 - 2) / 228.5, 1e-4);
}

// 7. 悬空不炸
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'r1', type: 'resistor', x: 20, z: 12, rot: 0, r: 100 }
    ],
    wires: []
  };
  const s = CC.solve(st);
  console.log('  · 悬空元件:', s.ok ? '正常返回（悬空不接入）' : '返回错误：' + s.message);
}

// 8. 电流表读数
{
  const st = {
    comps: [
      { id: 'bat', type: 'battery', x: 0, z: 4, rot: 90, v: 9, r: 0.5 },
      { id: 'am', type: 'ammeter', x: 4, z: 2, rot: 0 },
      { id: 'b1', type: 'bulb', x: 8, z: 2, rot: 0, r: 100 }
    ],
    wires: [
      { id: 'w1', pts: [{ x: 0, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 2 }] },
      { id: 'w2', pts: [{ x: 6, z: 2 }, { x: 8, z: 2 }] },
      { id: 'w3', pts: [{ x: 10, z: 2 }, { x: 14, z: 2 }, { x: 14, z: 6 }, { x: 0, z: 6 }] }
    ]
  };
  const s = CC.solve(st);
  check('电流表读数', Math.abs(s.readings.find(r => r.id === 'am').i), 9 / 100.5, 1e-4);
}

console.log('\n' + (fail ? '失败 ' + fail + ' 项' : '全部通过'));
process.exit(fail ? 1 : 0);
