# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** v1 complete — CRUD, consumption alarm, native notifications, macOS UI treatment (all merged to `main`)
- **Branch:** `main`
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** nothing
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** build the macOS bundle on the Mac (`npm run tauri build`); later: planned UI steps and the launchd agent (phase 2) when asked
