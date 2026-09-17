const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nottcheee', {
  onAutoCollapse: (cb) => ipcRenderer.on('auto-collapse', cb),
  onExpand: (cb) => ipcRenderer.on('expand', cb),
  expand: () => ipcRenderer.send('pill-expand'),
  collapse: () => ipcRenderer.send('pill-collapse'),
  version: '0.1.0-electron-mvp'
});
