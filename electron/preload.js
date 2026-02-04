// 预加载脚本 - 安全地暴露必要的 API 给渲染进程
const { contextBridge } = require('electron');

// 暴露平台信息
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});
