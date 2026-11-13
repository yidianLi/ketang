# 简普 · 教学可视化平台

零依赖纯前端教学可视化平台：**双击 `index.html` 即可离线使用**，无构建链、无 npm 运行时依赖、`file://` 直开。

## 内容一览

| 分区 | 页面 | 说明 |
|---|---|---|
| 实验室 ×6 | `terrain / circuit / mechanics / molecule / formula / optics .html` | 各含纯内核（`js/<lab>/core.js`，Node 可测）+ 渲染层，支持 URL 深链 |
| 课堂工具箱 | `classroom.html` | 12 件课堂实操工具（点名 / 抢答 / 背诵 PK / 闪记 PK / 宣言屏 / 番茄钟 / 细胞解剖 / 方程式配平 / 遗传概率 / 气候判读 / 单词速记 / 随堂小测），深链 `#<工具id>` |
| 资源库 | `resource.html` | 1548 资源映射，26 张可点卡全部可达 |
| 学科分级目录 | `subjects.html` → `ai-cases/{math,physics,chemistry,biology,geography}learn/` | 五科同一套结构：学科切换 → 年级分段（初一～高三、专题）→ 左列条目 → 右内嵌演示，精选 93 条 + 铜匠实验室 54 门 3D 实验课；共用外壳在 `ai-cases/hub/` |
| 分子 3D 实验室 | `ai-cases/molecule3d/` | 29 个结构离线内嵌（26 小分子 + DNA / 血红素 / C60），球棍 / 空间填充 / 线框切换 |
| 3D 地形课 | `ai-cases/china-terrain/` | 中国三维地势图，等高线 / 剖面 / 水位模拟 |
| 知识专题 | `knowledge.html` | 157 张知识卡，点击出正文：定义、掌握标准、诊断题、章节例题 |
| 随堂自测 | `quiz.html` | 五科题库（5453 题），逐题判定 + 解析 + 错题回链知识点 |
| 案例库 | `ai-cases.html` | 69 道互动题（题干 + 首屏缩略图），KaTeX / MathJax / 插图均已本地化 |
| 兜底 | `404.html` | 找不到页面时的四个主入口 |

## 技术要点

- **零第三方运行时依赖**：全部 vendor 库本地化在 `ai-cases/vendor/`，断网可用
- **纯内核可测**：每个实验室的核心逻辑独立成 `core.js`，Node 直接跑断言
- **体检工具**：`npm test`（回归自检）、`npm run check`（全站断链）、`npm run check:hubs`（学科目录对账）、`npm run zip`（离线包）
- **桌面壳（可选）**：`desktop/` Electron 封装

## 开发

```bash
npm test          # 回归自检（7 套 / 1800+ 断言）
npm run check     # 全站断链体检
npm run zip       # 打离线包
```

## 第三方资源与许可

全部第三方库、素材与数据来源及许可见 `ai-cases/tongjiang/THIRD_PARTY_NOTICES.md`。
