const { app, BrowserWindow, Tray, Menu, globalShortcut, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');

let win = null;
let tray = null;
const isDev = process.argv.includes('--dev');

function getTopCenterBounds(w, h) {
  const primary = screen.getPrimaryDisplay();
  const { width, x, y } = primary.workArea;
  return { x: Math.round(x + width / 2 - w / 2), y: Math.round(y + 8), width: w, height: h };
}

function createWindow() {
  const bounds = getTopCenterBounds(340, 60);
  win = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, 'mockup.html'));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  win.on('blur', () => {
    if (!isDev) win.webContents.send('auto-collapse');
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  );
  tray = new Tray(icon);
  tray.setToolTip('NOTTCHEEE');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => { win.show(); win.webContents.send('expand'); } },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => (win.isVisible() ? win.hide() : win.show()));
}

ipcMain.on('pill-expand', () => { if(win) win.setBounds(getTopCenterBounds(1080, 460)); });
ipcMain.on('pill-collapse', () => { if(win) win.setBounds(getTopCenterBounds(340, 60)); });

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.setLoginItemSettings({ openAtLogin: true });
  globalShortcut.register('Alt+N', () => {
    if (!win) return;
    win.isVisible() ? win.hide() : win.show();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
