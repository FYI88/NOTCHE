#!/usr/bin/env node
// Generates build/icon.ico + build/icon.png from the NOTTCHEEE owl SVG.
// Run: node scripts/generate-icon.js   (uses Electron offscreen rendering)
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'build');
const ICO_PATH = path.join(OUT_DIR, 'icon.ico');
const PNG_PATH = path.join(OUT_DIR, 'icon.png');
const MASTER = 256;
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// The app's own owl mark (same geometry as mockup.html .owlmark), 24x24 viewBox.
const OWL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#f5c86e"/>
  <circle cx="8.5" cy="10.5" r="2.3" fill="#20242c"/>
  <circle cx="15.5" cy="10.5" r="2.3" fill="#20242c"/>
  <circle cx="9.2" cy="9.8" r=".75" fill="#fff"/>
  <circle cx="16.2" cy="9.8" r=".75" fill="#fff"/>
  <path d="M10.4 15.4l1.6 1.3 1.6-1.3" stroke="#20242c" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function htmlFor(size) {
  // Padding: owl fills 80% of the canvas so small sizes stay readable.
  const pad = Math.round(size * 0.1);
  const inner = size - 2 * pad;
  return `<!doctype html><html><body style="margin:0;background:transparent;">
  <div style="width:${size}px;height:${size}px;overflow:hidden;">
    <div style="width:${inner}px;height:${inner}px;margin:${pad}px;">${OWL_SVG.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
  </div>
  </body></html>`;
}

// PNG IHDR: bytes 16-19 width, 20-23 height (big-endian).
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

async function loadWithRetry(win, srcPath, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    try {
      await win.loadFile(srcPath);
      return;
    } catch (e) {
      if (i === tries) throw e;
      await sleep(400);
    }
  }
}

async function renderMaster() {
  const srcPath = path.join(OUT_DIR, 'icon-src.html');
  fs.writeFileSync(srcPath, htmlFor(MASTER));
  const win = new BrowserWindow({
    width: MASTER, height: MASTER, useContentSize: true, show: false, frame: false,
    transparent: true, resizable: false,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  });
  try {
    await loadWithRetry(win, srcPath);
    await sleep(400); // let the offscreen painter produce a frame
    const image = await win.webContents.capturePage();
    if (image.isEmpty()) throw new Error('capturePage returned empty image');
    // Windows DPI scaling makes the capture larger than MASTER (e.g. 320x322 at 125%).
    // Crop to a square and downscale -- the oversize capture is free supersampling.
    const { width: cw, height: ch } = image.getSize();
    const side = Math.min(cw, ch);
    const square = image.crop({ x: 0, y: 0, width: side, height: side });
    const buf = square.resize({ width: MASTER, height: MASTER, quality: 'best' }).toPNG();
    const dim = pngSize(buf);
    if (!dim || dim.w !== MASTER || dim.h !== MASTER) {
      throw new Error(`master size mismatch: got ${dim ? dim.w + 'x' + dim.h : 'unknown'}`);
    }
    return buf;
  } finally {
    win.destroy();
    try { fs.unlinkSync(srcPath); } catch (_) {}
  }
}

// --- ICO assembly (hand-rolled: PNG-compressed entries, valid for all sizes) ---
function buildIco(pngs) {
  const count = pngs.length;
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);    // reserved
  dir.writeUInt16LE(1, 2);    // type: icon
  dir.writeUInt16LE(count, 4);

  let offset = 6 + 16 * count;
  const headers = [], blobs = [];
  for (const { size, buf } of pngs) {
    const h = Buffer.alloc(16);
    h.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    h.writeUInt8(size >= 256 ? 0 : size, 1); // height
    h.writeUInt8(0, 2);            // palette
    h.writeUInt8(0, 3);            // reserved
    h.writeUInt16LE(1, 4);         // color planes
    h.writeUInt16LE(32, 6);        // bits per pixel
    h.writeUInt32LE(buf.length, 8);
    h.writeUInt32LE(offset, 12);
    offset += buf.length;
    headers.push(h); blobs.push(buf);
  }
  return Buffer.concat([dir, ...headers, ...blobs]);
}

app.whenReady().then(async () => {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const masterBuf = await renderMaster();
    const master = nativeImage.createFromBuffer(masterBuf);

    // Downscale master to every target size (high-quality interpolation).
    const results = [];
    for (const size of SIZES) {
      let buf;
      if (size === MASTER) {
        buf = masterBuf;
      } else {
        buf = master.resize({ width: size, height: size, quality: 'best' }).toPNG();
      }
      const dim = pngSize(buf);
      if (!dim || dim.w !== size || dim.h !== size) {
        throw new Error(`resize to ${size} produced ${dim ? dim.w + 'x' + dim.h : 'unknown'}`);
      }
      console.log(`sized ${size}px (${buf.length} bytes)`);
      results.push({ size, buf });
    }

    fs.writeFileSync(PNG_PATH, masterBuf); // 256px master
    fs.writeFileSync(ICO_PATH, buildIco(results));
    console.log(`wrote ${ICO_PATH} and ${PNG_PATH}`);
    app.quit();
  } catch (e) {
    console.error('FAILED:', e.message);
    app.exit(1);
  }
});
