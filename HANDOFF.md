# NOTTCHEEE Handoff

Windows port of NotchOwl (tasks + focus timer + notes + calendar + insights in a top-center pill). Electron MVP now, Tauri/Rust port later on a faster machine.

## State

- Repo: https://github.com/FYI88/NOTCHE — branch `main`, last push `d72bcdb` ("NOTTCHEEE v3...").
- Uncommitted changes: pill redesign (SVG owl, status dot, gradient shell) + FLIP morph fixes + emoji cleanup (inline SVG sprite `#i-*`, `ICON` map, soft chime + sound toggle `nc.sound.v1`, quiet toast copy). Run `git status` in this folder.
- Plans live in conversation only (no plan files). Locked decisions: localStorage persistence, calendar stays mock, pill-only redesign scope, zero-emoji icon system.

## Run / build

- `npm start` — run pill (window 340x60 collapsed, 1080x460 open, `Alt+N` toggles, tray icon).
- `npm run dist` — NSIS installer to `dist\NOTTCHEEE Setup 0.1.0.exe` (~76MB, unsigned, default Electron icon).
- Stack: Electron 33 + plain HTML/CSS/JS, no framework. Storage: localStorage keys `nc.tasks.v1`, `nc.notes.v1`, `nc.timer.v1`, `nc.hist.v1`.
- No Rust downloads needed locally. `dist/` is gitignored, rebuild with `npm run dist`.

## Key files

- `mockup.html` — entire UI. Pill: `.pill-mini` overlay + `#pill-timer`, `#pill-task`, `#pill-dot`. Morph: `setPanel()` FLIP (measure `scrollHeight` at full width with transitions off, animate to it, settle `height:auto`). Morph rules: never animate `width`/`height` against live grid content, never use responsive breakpoints against the fixed window (caused the scrollbar incident), settle open height to `auto` not `''`.
- `main.js` — top-center transparent window, tray, `Alt+N`, autostart, `pill-expand`/`pill-collapse` IPC resize.
- `preload.js` — `window.nottcheee` bridge.

## Open issues (ranked)

1. Default Electron icon + unsigned build triggers SmartScreen. Needs real icon (256px PNG to ICO) and cert (~$200/yr).
2. Calendar is static mock data. Real connect needs Google Cloud OAuth keys from user, ~4 hrs.
3. Timer dies with app quit (no background service); persists seconds across restart only.
4. No updater feed wired (`publish: never`); no auto-update.
5. Git push auth: machine caches a different GitHub account in Credential Manager; pushing to FYI88 repos requires clearing it first, then signing in as FYI88 in the popup.

## Suggested skills

- `adhd` — user reads with ADHD shaping (lead with next action, numbered steps, one next action at end, max 5 items per list, specific time estimates, no preamble or pleasantries). Off only on "stop adhd mode".
