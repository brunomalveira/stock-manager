# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** macOS UI treatment (vibrancy + toolbar) + native notifications — reconciled on `feat/macos-ui`
- **Branch:** `feat/macos-ui` → merging to `main` via PR
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **In progress:** user verification of the new UI + notifications in one branch
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** merge this PR; later: planned UI steps (semantic colors, menu bar, DESIGN.md tokens) and the launchd agent (phase 2) when asked
