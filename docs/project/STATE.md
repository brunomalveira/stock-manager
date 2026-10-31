# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-10-31
- **Phase:** bootstrap — harness and docs in place, app not scaffolded yet
- **Branch:** `main`
- **In progress:** nothing
- **Blockers:** none
- **Commit authorization:** granted for bootstrap/docs commits
- **Next step:** scaffold the Tauri 2 app, wire `tauri-plugin-sql` + the `items` migration per `AGENTS.md`
