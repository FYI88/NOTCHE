const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nottcheee', {
  onAutoCollapse: (cb) => ipcRenderer.on('auto-collapse', cb),
  onExpand: (cb) => ipcRenderer.on('expand', cb),
  onClipboardCapture: (cb) => ipcRenderer.on('clipboard-capture', (e, text) => cb(text)),
  expand: () => ipcRenderer.send('pill-expand'),
  collapse: () => ipcRenderer.send('pill-collapse'),
  setAutostart: (on) => ipcRenderer.send('set-autostart', !!on),
  version: '0.2.0-island'
});
