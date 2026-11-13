/* ============================================================
   subjects.js — 五个学科目录的统一清单
   ------------------------------------------------------------
   顶部那排「数学 / 物理 / 化学 / 生物 / 地理」药丸就是从这里来的，
   五个学科页共用同一份清单，保证顺序、名称、题数完全一致。
   count 由 scripts/check-hubs.js 对照各 data/*.js 自动校验，
   改数据时记得同步这里（校验不过会直接报错）。
   ============================================================ */
window.HUB_SUBJECTS = [
  { key: 'math',      name: '数学', href: '../mathlearn/index.html',      count: 42, hint: '初一～高三 · 18 个互动章节 + 24 道拓展题' },
  { key: 'physics',   name: '物理', href: '../physicslearn/index.html',   count: 41, hint: '初二～高三 · 力学 / 电学 / 近代物理 + 10 门 3D 实验课' },
  { key: 'chemistry', name: '化学', href: '../chemistrylearn/index.html', count: 37, hint: '初三～高二 · 分子晶体结构 + 25 门 3D 实验课 + 通用分子查看器' },
  { key: 'biology',   name: '生物', href: '../biologylearn/index.html',   count: 7,  hint: '初一～高二 · 细胞解剖、遗传概率 + 3D 实验课' },
  { key: 'geography', name: '地理', href: '../geographylearn/index.html', count: 20, hint: '初一～高三 · 等高线判读、气候类型 + 15 门 3D 课' }
];
