# Run doc

Static app: `mockup.html` is a fully standalone HTML/CSS/JS page. No build, no dependencies, no server config.

## How to preview

Open `mockup.html` directly (registered preview serves it statically). When `window.nottcheee` (the Electron bridge from `preload.js`) is absent, the page adds `body.preview` and shows a desktop backdrop so it reads as the real floating pill.

## Electron run (real app)

- `npm start` — runs the actual top-center pill window (window chrome, tray, Alt+N).
- `npx electron scripts/generate-icon.js` — regenerates `build/icon.ico` + `build/icon.png` (already committed artifacts; only needed if the owl SVG changes).
- `npm run dist` — NSIS installer to `dist/` (gitignored).
