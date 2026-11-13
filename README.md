# 帧理 SVG 复现版（svgzhenli-clone）

零依赖纯前端教学可视化工具集：**双击 `index.html` 即可离线使用**，无构建链、无 npm 运行时依赖、`file://` 直开。

> v1.2：换肤为「奶油莫兰迪」（柔玫粉 + 近白奶底 + 大圆角，面向一线年轻女教师），并补齐正式版站点框架——统一导航 / 页脚、favicon、每页描述、404 与打印样式。

## 内容一览

| 分区 | 页面 | 说明 |
|---|---|---|
| 实验室 ×6 | `terrain / circuit / mechanics / molecule / formula / optics .html` | 各含纯内核（`js/<lab>/core.js`，Node 可测）+ 渲染层，支持 URL 深链 |
| 课堂工具箱 | `classroom.html` | 12 件课堂实操工具（点名 / 抢答 / 背诵 PK / 闪记 PK / 宣言屏 / 番茄钟 / 细胞解剖 / 方程式配平 / 遗传概率 / 气候判读 / 单词速记 / 随堂小测），深链 `#<工具id>` |
| 资源库 | `resource.html` | 1548 资源映射，26 张可点卡全部可达 |
| 学科分级目录 | `subjects.html` → `ai-cases/{math,physics,chemistry,biology,geography}learn/` | 五科同一套结构：学科切换 → 年级分段（初一～初三、高一～高三、专题）→ 左列条目 → 右内嵌演示，共 91 题；共用外壳在 `ai-cases/hub/`（`hub.css` / `hub.js` / `subjects.js` / `data/*.js`） |
| 知识专题 | `knowledge.html` | 初中物理 22 章目录 + 169 资源 |
| 案例库 | `ai-cases.html` | 69 道题（题干 + 首屏缩略图，68 张实拍图在 `assets/shots/`），5 个开源来源 + 3 道本站原创，KaTeX / MathJax / 插图均已本地化 |
| 文档 | `system-design.html` | 需求 / 架构 / 路线图（v1.2） |
| 兜底 | `404.html` | 找不到页面时的四个主入口 |

## 视觉语言（v1.2 奶油莫兰迪）

- 主色柔玫粉 `#e8879b`、辅色蜜桃 `#ef9a8e`、雾蓝 `#6e9dc4`；页面底 `#fbf9f7`、卡片纯白。
- 圆角阶梯 `--r-sm/md/lg/pill`（10/14/18/999）统一从令牌取，不再散落 7/8/9px。
- 缩略图统一按学科色相转马卡龙浅色（HSL 提亮降饱和），不再出现深蓝/橄榄底。
- 文字用暖炭灰 `#3b3335`，不用褐墨，避免「教辅/古籍」观感。

## 学科分级目录（v1.3）

同一道题在不同学段讲法不同，所以按「年级」而不是「知识块」归类：

| 学科 | 年级档位 | 题数 | 入口 |
|---|---|---|---|
| 数学 | 初一 / 初二 / 初三 / 高中（高一·高二）/ 专题 | 42（18 章节 + 24 拓展） | `ai-cases/mathlearn/` |
| 物理 | 初二 / 初三 / 高一 / 高二 / 高三 / 专题 | 31 | `ai-cases/physicslearn/` |
| 化学 | 初三 / 高一 / 高二 / 专题 | 11 | `ai-cases/chemistrylearn/` |
| 生物 | 初一 / 初二 | 2 | `ai-cases/biologylearn/` |
| 地理 | 初一 | 5 | `ai-cases/geographylearn/` |

- 除数学（自带 18 个内联互动章节）外，其余四科由 `ai-cases/hub/hub.js` 驱动：数据写在 `ai-cases/hub/data/<科>.js`，页面只是一个空壳 `<div id="hub">`。
- 顶部学科药丸、题数、顺序统一来自 `ai-cases/hub/subjects.js`；`npm run check:hubs` 会对账「数据里的实际题数 vs 清单里的 count」，并逐条校验演示页路径是否存在。
- `npm run scan:embeds` 把所有内嵌演示在目录内容区宽度下打开，检查横向溢出与元素冲出父框（`反比例函数动点探究` 的固定高度溢出就是这条抓出来的）。

## 考频 / 分值 / 优先级徽章（v1.3.1）

对标竞品「动态模型」页加入的三件套：
- 每个章节 / 条目标 **考频 %、平均分值**（近五年考卷考点权重整理的近似参考值，页面顶部有免责说明）；
- 三色优先级徽章：**重点学**（红）/ **高频**（橙）/ **查漏补缺**（蓝）；
- 年级 tab 加定位副标题（高一·高考起步…），顶部加总览卡（演示数 / 模块数 / 年级跨度）。

数据字段：mathlearn 用 MOD_META 表 + EXT 条目的 fq/sc/tag；四科 hub 用 data/*.js 的同名字段，渲染在 hub.js。

## 铜匠实验室 3D 课程接入（v1.4.0）

接入 [tongjiang-lab（铜匠实验室）](https://github.com/smithjohn78390/tongjiang-lab) 的 **54 门高中 3D 互动课**（2026-10 开源，CC BY-NC 4.0）：

| 学科 | 接入数 | 年级分布 | 代表课程 |
|---|---|---|---|
| 化学 | 25 | 高一 18 / 高二 7 | 高炉炼铁、氯碱工业、侯氏制碱、合成氨、中和滴定 |
| 地理 | 14 | 高一 6 / 高二 7 / 高三 1 | 水循环、三圈环流、洋流与厄尔尼诺、喀斯特地貌 |
| 物理 | 10 | 高一 4 / 高二 3 / 高三 2 | 光电效应、电容器充放电、自感涡流、布朗运动 |
| 生物 | 5 | 高一 4 / 高二 1 | 有丝分裂、跨膜运输、神经冲动、酶活性 |

- 课件在 `ai-cases/tongjiang/courses/`：每门课一个 ~1MB 单文件 HTML（three.js 已内联），离线双击可用、iframe 可嵌；
- 条目按 catalog.json 的 textbook 字段自动映射年级（`scripts/gen-tongjiang.js`，catalog 更新后重跑即可）；
- 条目描述 = 引导问题 + 分步教学路径，来源标「铜匠实验室」；
- 导航分档显示：同一年级里「精选互动演示」（带考频徽章）与「3D 实验课 · 铜匠实验室」（可折叠、按教材册分组）两个区块，窄屏自动合并为单行；
- **许可**：课件内容 CC BY-NC 4.0（非商业教学免费，需署名），原始许可见 `ai-cases/tongjiang/LICENSE`。

## 中文界面与外文案例本地化

- 案例库中原本 7 个纯英文页面已全部中文化：电学实验室（ElectroLab）、OLED 屏幕工作室、PhysiXlab 及其 4 个子模拟。
- 做法不是整篇取代：只替换「标记之间的文本」与「整串相等的引号字面量」，JS 变量、CSS 类名、图标连字名不动（见 `scripts/i18n-apply.js`，带体积变化熔断）。
- 电学实验室顶部「保存模板」把当前电路存进浏览器 localStorage（可命名 / 载入 / 删除，上限 30 个），不产生文件、不上传。
- 图标原本走 Google Material Symbols 在线字体，离线会漏出 `delete`、`expand_more` 这类单词；已改为本地子集字体 + 码点（60KB / 69 字形，见 `ai-cases/webfonts/ms-icons.*`），并移除了会误伤图标的 Google IconChecker 脚本。

## 明 / 暗主题

- 右上角按钮循环 **浅色 → 深色 → 跟随系统**；`localStorage` 记忆（`file://` 下异常自动降级内存）。
- `?theme=light|dark|auto` 可强制本次主题（分享 / 截图友好）。
- 6 实验室画布结构性配色（底 / 网格 / 轴 / 标签）跟随主题，语义色（原子 / 元件 / 高程）保持不变。

## 三条命令（可选，需要 Node ≥ 18，零第三方依赖）

```bash
npm test        # 回归自检：7 套 / 1849 断言
npm run check   # 全站断链体检
npm run zip     # 打离线 ZIP 并自检（CRC + 解压断链 + headless 冒烟）→ dist/
npm run serve   # 本地静态服务器（默认 5178，个别需要 http 的场景）
```

## 目录结构（关键）

```
css/tokens.css        设计令牌唯一来源（浅/深两套值）
js/theme.js           主题引导（head 同步，零 FOUC）
js/canvas-theme.js    画布取色缓存（getComputedStyle 仅在主题变化时调用）
js/<lab>/core.js      6 套纯内核（勿动，test-all 直接测它们）
js/tools/core/cores.js  课堂工具纯逻辑（Node 可测）
js/tools/*.js         12 个工具模块（Tools.add({id,name,icon,mount}) 契约）
ai-cases/vendor/      KaTeX / MathJax / Three / p5 等本地依赖
desktop/              可选 Electron 桌面壳（不进入 ZIP，详见其 README）
```

## 离线边界（诚实清单）

- 仅「证明几何题」的页头插图由在线服务动态生成，其余全部离线可用。
- 学生使用痕迹（点名名单 / 计分 / 单词进度）保存在浏览器 localStorage。

## 打包分发

`npm run zip` 产出 `dist/zhenli-offline-v1.2.0.zip`（≈12MB）+ SHA256，解压后双击 `index.html` 使用；
需要桌面 App 时用 `desktop/`（`npm i && npm start`，可再 `electron-builder` 出 .exe）。

## v1.4.2 · GitHub 资源接入（2026-11-13）

本轮从 GitHub 接入四类资源，详见 `github-gap-report.html`：

1. **知识点 + 题库**：cn-math-taxonomy（CC BY-NC 4.0）1350 个知识点 / 5453 道题
   - `knowledge.html`：157 张知识卡点击即出正文（定义、掌握标准、诊断题），题目卡展示章节例题
   - `quiz.html`（新）：五科随堂自测，逐题判定 + 解析 + 错题回链知识点
   - 数据在 `assets/knowledge/*.js`，由 `scripts/gen-knowledge.js` 生成
2. **地理 3D 地形课**：china-terrain-3d（MIT）接入 `ai-cases/china-terrain/`，
   注册为地理·初一「中国三维地势图 · 三级阶梯」，支持等高线 / 剖面 / 水位模拟
3. **分子 3D 实验室**：`ai-cases/molecule3d/`（3Dmol.js BSD-3）
   29 个结构全部内嵌离线可用：26 个小分子（RDKit ETKDG+MMFF 生成）+ DNA / 血红素 / C60
   注册为化学·初三「分子与结构」组首条
4. **SVG 图标体系**：`assets/icons/` 29 枚（Tabler MIT + BioIcons CC0），
   知识专题页 emoji 图标全部替换为矢量图标

许可红线：PhET（GPL-3.0）与无 LICENSE 仓库只作参考不搬运；
全部第三方署名见 `ai-cases/tongjiang/THIRD_PARTY_NOTICES.md`。
