# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** complete — CRUD, consumption alarm, notifications, macOS UI, background running, launch at login (all merged to `main`)
- **Branch:** `main`
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** nothing
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** build the macOS bundle on the Mac (`npm run tauri build`); the stock database is per-machine — items entered here do not appear on the Mac; pending UI features: none (out-of-scope list in AGENTS.md needs an explicit ask)
