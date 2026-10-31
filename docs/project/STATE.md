# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** v1 complete — items CRUD + stock consumption alarm (user-verified in dev)
- **Branch:** `feat/stock-alarm` → merging to `main` via PR
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** nothing
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** merge `feat/stock-alarm` → `main` via PR, then `npm run tauri build` for installers when wanted
