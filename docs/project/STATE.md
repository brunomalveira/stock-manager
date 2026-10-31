# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** background running (close = hide, tray, alarms keep firing) — implementing on `feat/background-running`
- **Branch:** `feat/background-running` → merging to `main` via PR
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** user verification of the background behavior
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** merge this PR; later: planned UI steps and the launchd agent (phase 2b, restart-survival) when asked
