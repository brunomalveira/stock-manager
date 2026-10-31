# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** native notification alarms (in-app) — implemented, tests green
- **Branch:** `feat/notifications` → merging to `main` via PR
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** user verification of the notification flow
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** merge PR, then the launchd background agent (phase 2, approved) when asked; `npm run tauri build` for installers when wanted
