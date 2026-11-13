/**
 * desktop/main.js — Electron 桌面壳（可选，不属于离线 ZIP 的一部分）
 * ------------------------------------------------------------
 * 启动方式（在 desktop/ 目录下）：
 *   npm install     # 首次：下载 Electron（需要联网，约 100MB）
 *   npm start       # 打开桌面窗口，加载 ../index.html
 * 打包安装包：
 *   npx electron-builder --win    # 需 npm i -D electron-builder
 */
'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    autoHideMenuBar: true,
    title: '简普实验室',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  // 外部链接交给系统浏览器，窗口内不跳走
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
