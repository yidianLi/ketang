# 帧理桌面壳（可选）

本目录是可选的 Electron 包装，**不会进入离线 ZIP**。网页本身双击 `index.html` 即可全功能离线使用；
桌面壳只是提供独立窗口、任务栏图标与原生体验。

## 使用

```bash
cd desktop
npm install          # 首次需联网下载 Electron（约 100MB）
npm start            # 打开窗口，加载 ../index.html
```

## 打包 .exe（可选）

```bash
npm i -D electron-builder
npx electron-builder --win
```

产物在 `desktop/dist/`（NSIS 安装包 / 便携版），不影响主工程。

## 说明

- `main.js` 关闭了 Node 集成、开启 contextIsolation，与纯静态页面保持同等安全模型。
- 外部链接（如案例页里的 GitHub 链接）会交给系统浏览器打开。
