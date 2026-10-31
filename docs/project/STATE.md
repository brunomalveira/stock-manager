# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** complete — CRUD, consumption alarm, notifications, macOS UI, background running, launch at login, CSV export/import, `npm run setup` environment script (all merged to `main`)
- **Branch:** `main`
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** nothing — no approved implementation steps pending
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** nothing pending; open items are decisions/housekeeping — build the macOS bundle on the Mac, flip the repo to private once SSH is on the Mac, and out-of-scope features need an explicit ask (see AGENTS.md)
