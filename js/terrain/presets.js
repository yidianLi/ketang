/* ============================================================
   预置地形模板（对应原站的「教学模板」）
   ============================================================ */
(function (root) {
  'use strict';

  function mk(type, id, name, extra) {
    var d = root.TerrainCore.defaults()[type];
    var o = {
      id: id, type: type, name: name || d.name,
      x: 0, z: 0,
      height: d.height, width: d.width, length: d.length,
      shape: d.shape === undefined ? 0.3 : d.shape,
      detail: d.detail === undefined ? 0.3 : d.detail,
      seed: 2.1
    };
    for (var k in d) if (k !== 'name' && k !== 'label') o[k] = d[k];
    if (extra) for (var j in extra) o[j] = extra[j];
    return o;
  }

  var PRESETS = [
    {
      id: 'twin-peak', name: '双峰 · 鞍部与山谷',
      note: '两座山头之间的鞍部，是等高线判读最经典的题面。',
      build: function () {
        return {
          version: 3, title: '双峰 · 鞍部与山谷', size: 2400, centerX: 0, centerZ: 0,
          environment: 'lake',
          peaks: [
            mk('mountain', 'west', '山头 01', { x: -400, z: -200, height: 980, width: 1880, length: 1740, shape: 0.25, detail: 0.65, seed: 2.1 }),
            mk('mountain', 'east', '山头 02', { x: 350, z: -380, height: 790, width: 1700, length: 1570, shape: 0.4, detail: 0.65, seed: 7.8 })
          ],
          section: [{ x: -950, z: -200 }, { x: 900, z: -200 }],
          water: 145, snow: 740, interval: 100
        };
      }
    },
    {
      id: 'ridge-valley', name: '山脊与山谷',
      note: '同一座山体上，等高线向低处凸出是山脊，向高处凸出是山谷。',
      build: function () {
        return {
          version: 3, title: '山脊与山谷', size: 3000, centerX: 0, centerZ: 0,
          environment: 'plain',
          peaks: [
            mk('mountain', 'm1', '主峰', { x: 0, z: -300, height: 900, width: 2200, length: 2000, shape: 0.35, detail: 0.6, seed: 3.4 }),
            mk('ridge', 'r1', '东侧山脊', { x: 620, z: 250, height: 720, width: 760, length: 1800, shape: 0.35, rotation: 200 }),
            mk('valley', 'v1', '西侧山谷', { x: -600, z: 300, height: 150, width: 620, length: 1600, shape: 0.4, rotation: 190 })
          ],
          section: [{ x: -1100, z: 320 }, { x: 1100, z: 320 }],
          water: 160, snow: 780, interval: 50
        };
      }
    },
    {
      id: 'plateau-cliff', name: '高原与陡崖',
      note: '台面平坦、边缘密集，陡崖处等高线重合。',
      build: function () {
        return {
          version: 3, title: '高原与陡崖', size: 3400, centerX: 0, centerZ: 0,
          environment: 'plain',
          peaks: [
            mk('plateau', 'p1', '中央高原', { x: -300, z: -200, height: 780, width: 2200, length: 1900, shape: 0.62, detail: 0.12, seed: 4.2 }),
            mk('cliff', 'c1', '东南陡崖', { x: 900, z: 400, height: 700, width: 900, length: 1100, shape: 0.8, rotation: 320, cliffBottomLevel: 260 })
          ],
          section: [{ x: -1400, z: 400 }, { x: 1400, z: 400 }],
          water: 150, snow: 900, interval: 50
        };
      }
    },
    {
      id: 'piedmont-fan', name: '山前冲积扇',
      note: '山口向外扇形展开，等高线呈弧形并向下游变稀疏。',
      build: function () {
        return {
          version: 3, title: '山前冲积扇', size: 4200, centerX: 0, centerZ: 0,
          environment: 'plain',
          peaks: [
            mk('mountain', 'm1', '北侧山地', { x: 0, z: -1400, height: 1150, width: 3200, length: 2000, shape: 0.3, detail: 0.55, seed: 5.1 }),
            mk('fan', 'f1', '冲积扇 01', { x: -600, z: 700, height: 520, width: 1800, length: 1900, shape: 0.5, rotation: 180, fanToeLevel: 210, fanProfile: 'concave', seed: 2.4 }),
            mk('fan', 'f2', '冲积扇 02', { x: 700, z: 800, height: 470, width: 1500, length: 1700, shape: 0.45, rotation: 175, fanToeLevel: 200, fanProfile: 'concave', seed: 6.2 }),
            mk('river', 'w1', '扇面河道', { x: -560, z: 1400, height: 40, width: 420, length: 1600, shape: 0.4, rotation: 180, waterLevel: 200, bedReferenceLevel: 200 })
          ],
          section: [{ x: -1500, z: 0 }, { x: 0, z: 1900 }],
          water: 200, snow: 1000, interval: 50
        };
      }
    },
    {
      id: 'basin-lake', name: '盆地与湖泊',
      note: '四周高中间低，湖面等高线是闭合的平直曲线。',
      build: function () {
        return {
          version: 3, title: '盆地与湖泊', size: 3200, centerX: 0, centerZ: 0,
          environment: 'lake',
          peaks: [
            mk('basin', 'b1', '中央盆地', { x: 0, z: 0, height: 120, width: 2000, length: 1700, shape: 0.45, detail: 0.25, seed: 3.9 }),
            mk('lake', 'l1', '湖盆', { x: 0, z: 0, height: 55, width: 1200, length: 950, shape: 0.3, detail: 0.15, waterLevel: 150, bedReferenceLevel: 150 }),
            mk('river', 'w1', '入湖河流', { x: 0, z: -900, height: 30, width: 420, length: 1400, shape: 0.55, waterLevel: 152, bedReferenceLevel: 152 }),
            mk('mountain', 'm1', '北侧山地', { x: -200, z: -1300, height: 820, width: 2400, length: 1500, shape: 0.3, detail: 0.5, seed: 1.7 })
          ],
          section: [{ x: -1300, z: 0 }, { x: 1300, z: 0 }],
          water: 150, snow: 800, interval: 50
        };
      }
    },
    {
      id: 'exam-composite', name: '综合题图（多要素）',
      note: '山头 + 山脊 + 山谷 + 陡崖 + 河流 + 湖泊，适合出综合判读题。',
      build: function () {
        return {
          version: 3, title: '综合题图', size: 4600, centerX: 0, centerZ: 0,
          environment: 'lake',
          peaks: [
            mk('mountain', 'm1', '主峰', { x: -900, z: -900, height: 1120, width: 2400, length: 2100, shape: 0.28, detail: 0.6, seed: 2.6 }),
            mk('mountain', 'm2', '次峰', { x: 1000, z: -1200, height: 880, width: 2000, length: 1800, shape: 0.38, detail: 0.55, seed: 8.3 }),
            mk('ridge', 'r1', '连接山脊', { x: 100, z: -700, height: 760, width: 700, length: 1600, shape: 0.4, rotation: 105 }),
            mk('valley', 'v1', '东南山谷', { x: 700, z: 200, height: 170, width: 700, length: 2000, shape: 0.45, rotation: 25 }),
            mk('cliff', 'c1', '西侧陡崖', { x: -1500, z: 400, height: 620, width: 800, length: 1200, shape: 0.75, rotation: 80, cliffBottomLevel: 240 }),
            mk('river', 'w1', '出山河流', { x: 900, z: 700, height: 45, width: 500, length: 2200, shape: 0.5, rotation: 15, waterLevel: 165, bedReferenceLevel: 165 }),
            mk('lake', 'l1', '下游湖泊', { x: 400, z: 1500, height: 50, width: 1000, length: 800, shape: 0.3, detail: 0.12, waterLevel: 165, bedReferenceLevel: 165 })
          ],
          section: [{ x: -2000, z: 0 }, { x: 2000, z: 0 }],
          water: 165, snow: 950, interval: 100
        };
      }
    }
  ];

  root.TerrainPresets = PRESETS;
})(window);
