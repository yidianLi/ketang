'use strict';
/* 检查 ai-cases.html JS 数据里所有链接目标在磁盘上是否存在 */
const fs = require('fs');
const html = fs.readFileSync('ai-cases.html', 'utf8');
const refs = {};
function collect(re) {
  let m;
  while ((m = re.exec(html))) refs[m[1]] = 1;
}
collect(/p:\s*'([^']+)'/g);
collect(/f:\s*'([^']+\.(?:html|js)[^']*)'/g);
const miss = [];
Object.keys(refs).forEach(r => {
  const path = 'ai-cases/' + r.split('#')[0].split('?')[0];
  if (!fs.existsSync(path)) miss.push(r);
});
console.log('共 ' + Object.keys(refs).length + ' 个目标，缺失 ' + miss.length + ' 个');
miss.forEach(x => console.log('MISS', x));
