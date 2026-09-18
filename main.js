const { app, BrowserWindow, Tray, Menu, globalShortcut, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');

let win = null;
let tray = null;
let fsHidden = false;
let winHiddenByUs = false;
const isDev = process.argv.includes('--dev');

// Fullscreen auto-hide: poll the primary display; when a window covers the full
// work area, something is fullscreen (game/video) — stash the pill, restore after.
setInterval(() => {
  if (!win || win.isDestroyed() || !win.isVisible()) { fsHidden = false; return; }
  const b = win.getBounds();
  const wa = screen.getPrimaryDisplay().workArea;
  const covers = b.x <= wa.x && b.y <= wa.y && b.x + b.width >= wa.x + wa.width && b.y + b.height >= wa.y + wa.height;
  if (covers && !fsHidden) {
    fsHidden = true;
    if (win.isVisible()) { winHiddenByUs = true; win.hide(); }
  } else if (!covers && fsHidden) {
    fsHidden = false;
    if (winHiddenByUs) { winHiddenByUs = false; win.show(); }
  }
}, 2000);

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
    icon: path.join(__dirname, 'build', 'icon.ico'),
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
  const icon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16, quality: 'best' }));
  tray.setToolTip('NOTTCHEEE');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => { win.show(); win.webContents.send('expand'); } },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => { if (fsHidden) return; win.isVisible() ? win.hide() : win.show(); });
}

ipcMain.on('pill-expand', () => { if(win) win.setBounds(getTopCenterBounds(1080, 460)); });
ipcMain.on('pill-collapse', () => { if(win) win.setBounds(getTopCenterBounds(340, 60)); });
ipcMain.on('set-autostart', (e, on) => app.setLoginItemSettings({ openAtLogin: !!on }));

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Autostart is owned by the renderer's persisted pref, synced via set-autostart.
  globalShortcut.register('Alt+N', () => {
    if (!win) return;
    win.isVisible() ? win.hide() : win.show();
  });
  globalShortcut.register('Alt+Shift+N', () => {
    if (!win) return;
    const { clipboard } = require('electron');
    const text = clipboard.readText().trim();
    if (!text) return;
    if (!win.isVisible()) win.show();
    win.webContents.send('clipboard-capture', text.slice(0, 2000));
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
