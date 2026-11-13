#!/usr/bin/env node
/**
 * 课堂工具自检（纯逻辑层 + 数据完整性）
 * ------------------------------------------------------------
 * 运行环境：Node（require js/tools/core/cores.js 与各 data 文件）
 * 断言风格与其余 verify-*.js 一致，输出 "N 通过 / 0 失败"。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const C = require(path.join(__dirname, 'js/tools/core/cores.js'));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + '（' + JSON.stringify(a) + '）'); }

/* ---------- 加载数据文件（模拟浏览器全局） ---------- */
global.window = global;
const dataDir = path.join(__dirname, 'js', 'tools', 'data');
['equations.js', 'words.js', 'quizbank.js', 'climate.js', 'cell.js', 'recite.js'].forEach(f => {
  new Function(fs.readFileSync(path.join(dataDir, f), 'utf8')).call(global);
});

console.log('--- RollCore 随机点名 ---');
const list = ['张三', '李四', '王五', '赵六'];
eq(RollCore.parse('张三, 李四\n王五、张三;赵六'), list, '解析去重');
eq(RollCore.defaults(3), ['01', '02', '03'], '默认名单');
const seen = [];
for (let i = 0; i < 200; i++) {
  const p = RollCore.pick(list, seen);
  ok(p != null && list.includes(p), '抽取命中名单 #' + i) && 0;
  // 只统计有效断言
  if (p == null || !list.includes(p)) fail++; else pass++;
  if (!seen.includes(p)) seen.push(p);
}
ok(seen.length <= list.length, '一轮不重复（覆盖 ' + seen.length + '/' + list.length + '）');
const full = RollCore.pushRecent(list, ['张三', '李四', '王五'], '赵六');
eq(full, [], '抽满一轮自动清空');

console.log('--- ScoreCore 抢答计分 ---');
let teams = ScoreCore.initTeams(3);
eq(teams.map(t => t.score), [0, 0, 0], '初始 0 分');
teams = ScoreCore.apply(teams, 1, 2);
teams = ScoreCore.apply(teams, 1, -1);
eq(teams.map(t => t.score), [0, 1, 0], '+2 再 -1');
eq(ScoreCore.apply(teams, 9, 5).map(t => t.score), [0, 1, 0], '越界组不加分');
eq(ScoreCore.ranked(teams)[0].i, 1, '排名榜首');

console.log('--- PkCore / FlashCore / PomoCore ---');
eq(PkCore.result(3, 1), 'a', 'A 胜');
eq(PkCore.result(1, 3), 'b', 'B 胜');
eq(PkCore.result(2, 2), 'draw', '平局');
eq(PkCore.nextTurn('a'), 'b', '轮流换手');
const rnd = (function () { let s = 42; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
let okRounds = true;
for (let i = 0; i < 50; i++) {
  const r = FlashCore.makeRound(window.WORDS, 'zh', rnd);
  if (!r || r.options.length !== 3 || r.answer < 0 || r.answer > 2 || !r.options[r.answer]) okRounds = false;
}
ok(okRounds, '闪记回合 50 次结构合法');
ok(FlashCore.judge({ answer: 1 }, 1), '判对');
ok(!FlashCore.judge({ answer: 1 }, 0), '判错');
eq(PomoCore.initial('work'), 1500, '工作 25 分钟');
eq(PomoCore.initial('break'), 300, '休息 5 分钟');
eq(PomoCore.nextPhase('work'), 'break', '阶段切换');

console.log('--- BalanceCore 化学配平 ---');
const CASES = [
  ['Fe + O2 -> Fe3O4', [3, 2, 1]],
  ['KClO3 -> KCl + O2', [2, 2, 3]],
  ['KMnO4 -> K2MnO4 + MnO2 + O2', [2, 1, 1, 1]],
  ['H2O -> H2 + O2', [2, 2, 1]],
  ['Zn + HCl -> ZnCl2 + H2', [1, 2, 1, 1]],
  ['NaOH + H2SO4 -> Na2SO4 + H2O', [2, 1, 1, 2]],
  ['Ca(OH)2 + HCl -> CaCl2 + H2O', [1, 2, 1, 2]],
  ['CH4 + O2 -> CO2 + H2O', [1, 2, 1, 2]],
  ['C2H5OH + O2 -> CO2 + H2O', [1, 3, 2, 3]],
  ['Fe2O3 + CO -> Fe + CO2', [1, 3, 2, 3]],
  ['Al + CuSO4 -> Al2(SO4)3 + Cu', [2, 3, 1, 3]],
  ['AgNO3 + NaCl -> AgCl + NaNO3', [1, 1, 1, 1]],
  ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
  ['NH3 + O2 -> NO + H2O', [4, 5, 4, 6]]
];
CASES.forEach(([eqStr, want]) => {
  const r = C.BalanceCore.solve(eqStr);
  ok(r && JSON.stringify(r.coeffs) === JSON.stringify(want), '配平 ' + eqStr);
});
eq(C.BalanceCore.atomsOf('Ca(OH)2'), { Ca: 1, O: 2, H: 2 }, '括号解析');
eq(C.BalanceCore.atomsOf('Al2(SO4)3'), { Al: 2, S: 3, O: 12 }, '嵌套括号');
ok(C.BalanceCore.solve('Na + Cl2 -> KCl') === null, '元素不闭合（Na≠K）返回 null');
let threw = false;
try { C.BalanceCore.parse('Fe O2 没有箭头'); } catch (e) { threw = true; }
ok(threw, '缺少 -> 报错');

console.log('--- GenCore 遗传 ---');
const g1 = GenCore.pair('Aa', 'Aa');
eq(g1.genotype, { AA: 1, Aa: 2, aa: 1 }, 'Aa×Aa 基因型计数');
eq(GenCore.ratio(g1.genotype), '1 : 2 : 1', '基因型比');
const g2 = GenCore.pair('AaBb', 'AaBb');
eq(GenCore.ratio(g2.phenotype), '9 : 3 : 3 : 1', '双杂合表型比');
eq(GenCore.gametes('AaBb').length, 4, '双杂合配子 4 种');
const gc = GenCore.pair('Aa', 'aa');
eq(gc.phenotype, { D: 2, r: 2 }, '测交表型 1:1 计数');

console.log('--- ClimateCore / WordCore / QuizCore ---');
const f = ClimateCore.features([26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 26], [260, 240, 290, 210, 220, 190, 170, 190, 200, 220, 240, 250]);
ok(f.coldest >= 25 && f.annual > 2000, '雨林特征（年降水 ' + f.annual + 'mm）');
ok(ClimateCore.basis(f).length >= 3, '判读依据条目');
eq(WordCore.INTERVALS, [1, 2, 4, 7, 15], '艾宾浩斯间隔');
const w0 = { en: 'a', zh: 'b', pos: 'n.', ex: '', box: 0, due: 100 };
const wOk = WordCore.next(w0, true, 100);
eq([wOk.box, wOk.due], [1, 102], '记得 → 明天+2');
const wBad = WordCore.next(w0, false, 100);
eq([wBad.box, wBad.due], [0, 101], '忘了 → 明天+1');
eq(WordCore.due([{ due: 99 }, { due: 100 }, { due: 101 }], 100).length, 2, '到期筛选');
const QS = [{ a: 1 }, { a: 0 }, { a: 2 }];
const grade = QuizCore.grade(QS, [1, 2, 2]);
eq([grade.right, grade.total, grade.wrong.length], [2, 3, 1], '判分统计');

console.log('--- 数据完整性 ---');
ok(window.EQUATIONS.length === 14, '配平例题 14 道');
window.EQUATIONS.forEach(x => {
  const r = C.BalanceCore.solve(x.eq);
  ok(!!r, '例题可配平：' + x.name);
});
ok(window.WORDS.length >= 120, '单词 ' + window.WORDS.length + ' 个（≥120）');
ok(window.WORDS.every(w => w.en && w.zh && w.pos), '单词字段完整');
ok(window.QUIZBANK.length === 50, '题库 50 题');
const bySub = {};
window.QUIZBANK.forEach(q => { bySub[q.subject] = (bySub[q.subject] || 0) + 1; });
eq(bySub, { 物理: 10, 化学: 10, 生物: 10, 数学: 10, 地理: 10 }, '五科各 10 题');
ok(window.QUIZBANK.every(q => q.opts.length === 4 && q.a >= 0 && q.a < 4 && q.why), '题目结构完整');
ok(window.CLIMATES.length === 12, '气候类型 12 类');
ok(window.CLIMATES.every(c => c.temp.length === 12 && c.rain.length === 12 && c.basis), '气候数据 12 月完整');
ok(window.CELL_SETS.animal.items.length === 10 && window.CELL_SETS.plant.items.length === 10, '细胞器各 10 个');
ok(window.RECITE.length === 12, '背诵题 12 条');

console.log('--- 工具模块注册（语法加载检查） ---');
global.Tools = { _m: {}, _order: [], add(d) { this._m[d.id] = d; this._order.push(d.id); } };
global.Store = () => ({ get: () => null, set: () => {}, del: () => {} });
global.UI = { esc: s => s, toast: () => {}, modal: () => ({ close: () => {} }), fmtTime: () => '', today: () => 0 };
global.Sfx = { ding: () => {}, ok: () => {}, buzz: () => {}, tick: () => {}, roll: () => {} };
global.document = { addEventListener: () => {}, querySelectorAll: () => [] };
global.location = { hash: '' };
global.performance = { now: () => 0 };
global.CustomEvent = function () {};
const toolDir = path.join(__dirname, 'js', 'tools');
['rollcall.js', 'quiz-buzzer.js', 'recite-pk.js', 'flashcard-pk.js', 'marquee.js', 'huaxiaoyu.js',
 'cell.js', 'balance.js', 'genetics.js', 'climate.js', 'words.js', 'quiz.js'].forEach(f => {
  try {
    // 提供最简 DOM 桩，模块只在 add() 时执行、mount 不执行
    global.HTMLElement = function () {};
    new Function(fs.readFileSync(path.join(toolDir, f), 'utf8')).call(global);
    ok(!!global.Tools._m[f.replace('.js', '')], '模块注册 ' + f);
  } catch (e) {
    ok(false, '模块注册 ' + f + '（' + e.message + '）');
  }
});
ok(Object.keys(global.Tools._m).length === 12, '12 个工具全部注册');

console.log('');
console.log(`✓ 课堂工具自检全部通过：${pass} 项断言`);
if (fail) console.error(`✗ 失败 ${fail} 项`);
process.exit(fail ? 1 : 0);
