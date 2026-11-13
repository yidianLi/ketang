/* ============================================================
   gen-knowledge.js — 从 cn-math-taxonomy 裁剪五科知识点与题库
   ------------------------------------------------------------
   源数据：xiaoyang111222/cn-math-taxonomy（CC BY-NC 4.0）
   用法：node scripts/gen-knowledge.js <topics.json> <questions.json>
   产出：assets/knowledge/{subj}-topics.js / {subj}-questions.js
        （window.KB_* 形式，file:// 双击也能加载）
   幂等：重复运行直接覆盖同名文件。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const [, , TOPICS_FILE, QUESTIONS_FILE] = process.argv;
if (!TOPICS_FILE || !QUESTIONS_FILE) {
  console.error('用法: node scripts/gen-knowledge.js <topics.json> <questions.json>');
  process.exit(1);
}

/* 数学在源数据里没有 subject 字段，靠 domain 圈定 */
const MATH_DOMAINS = ['数与代数', '图形与几何', '统计与概率', '综合与实践'];
const SUBJECTS = [
  { key: 'math',      match: t => MATH_DOMAINS.includes(t.domain) },
  { key: 'physics',   match: t => t.subject === 'physics' },
  { key: 'chemistry', match: t => t.subject === 'chemistry' },
  { key: 'biology',   match: t => t.subject === 'biology' },
  { key: 'geography', match: t => t.subject === 'geography' }
];

const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));

const OUT = path.join(__dirname, '..', 'assets', 'knowledge');
fs.mkdirSync(OUT, { recursive: true });

const gradeCN = g => {
  if (g <= 6) return '小' + g;
  if (g <= 9) return '初' + (g - 6);
  return '高' + (g - 9);
};

let totalT = 0, totalQ = 0;
const summary = [];

SUBJECTS.forEach(({ key, match }) => {
  const ts = topics.filter(match);
  const ids = new Set(ts.map(t => t.id));
  const qs = questions.filter(q => ids.has(q.topicId));

  const tOut = ts.map(t => ({
    id: t.id,
    n: t.name,
    g: gradeCN(t.grade),
    sm: t.semester || '',
    ch: t.chapter || '',
    d: t.description || '',
    mc: (t.mastery_criteria || []).slice(0, 4),
    dq: t.diagnostic_question ? { q: t.diagnostic_question.question, a: t.diagnostic_question.answer } : null
  }));
  /* 题目裁剪：解析截断 300 字，numeric 题丢 verify（含代码味） */
  const qOut = qs.map(q => ({
    id: q.id,
    tid: q.topicId,
    ty: q.type,
    df: q.difficulty,
    p: q.prompt,
    ...(q.choices ? { ch: q.choices } : {}),
    a: q.answer,
    ex: (q.explanation || '').slice(0, 300)
  })).filter(q => q.ty === 'choice' || q.ty === 'numeric' || q.ty === 'short');

  const tFile = path.join(OUT, key + '-topics.js');
  const qFile = path.join(OUT, key + '-questions.js');
  fs.writeFileSync(tFile, '/* 由 scripts/gen-knowledge.js 生成 · 源: cn-math-taxonomy (CC BY-NC 4.0) · 请勿手工编辑 */\nwindow.KB_TOPICS = ' + JSON.stringify(tOut) + ';\n');
  fs.writeFileSync(qFile, '/* 由 scripts/gen-knowledge.js 生成 · 源: cn-math-taxonomy (CC BY-NC 4.0) · 请勿手工编辑 */\nwindow.KB_QUESTIONS = ' + JSON.stringify(qOut) + ';\n');

  const kb = (fs.statSync(tFile).size + fs.statSync(qFile).size) / 1024;
  totalT += tOut.length; totalQ += qOut.length;
  summary.push(`${key}: ${tOut.length} 知识点 / ${qOut.length} 题 / ${kb.toFixed(0)}KB`);
  console.log(key, tOut.length, 'topics,', qOut.length, 'questions,', kb.toFixed(0) + 'KB');
});

console.log('合计:', totalT, '知识点 /', totalQ, '题');
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  source: 'xiaoyang111222/cn-math-taxonomy (CC BY-NC 4.0)',
  generatedAt: new Date().toISOString().slice(0, 10),
  subjects: summary
}, null, 2));
