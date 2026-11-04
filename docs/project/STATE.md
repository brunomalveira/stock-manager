# STATE.md — Stock manager

Single status registry for agent sessions. Replaced in place at every session
close — current status only, no history chain.

## Current status

- **Updated:** 2026-11-04
- **Phase:** complete — v1 and the stock-table rework merged to `main` (rework via PR #12)
- **Branch:** `main`
- **Remote:** `git@github.com:brunomalveira/stock-manager.git` (private, GitHub)
- **Latest rework (PR #12):** Quantity = projected current stock (whole units; one day of consumption ticks off at 23:59 local); Stock alarm = rounded days-to-empty only; new Last refill column (amount set at the last stock event + absolute date); ± quick-adjust buttons removed (Edit restocks); alarm state = bold red Quantity and alarm values, row tint and ⚠ prefix kept; unit label pluralizes everywhere it displays ("1 unit"/"3 units"; kg etc. unchanged); notification body uses whole numbers
- **In progress:** nothing — the user hand-tested and merged the rework before the app was stopped
- **Blockers:** none
- **Commit authorization:** granted for feature/fix commits on feature branches
- **Next step:** after the merge, housekeeping unchanged — build the macOS bundle on the Mac, flip the repo to private once SSH is on the Mac; out-of-scope features need an explicit ask (see AGENTS.md)
