# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** CSV export/import — implemented on `feat/csv-import-export`
- **Branch:** `feat/csv-import-export` → merging to `main` via PR
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** user verification of the CSV flows
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** merge this PR; out-of-scope list needs an explicit ask (movements, categories, raw-DB backup); the stock database is per-machine — CSV export/import is the way to move stock lists between machines
