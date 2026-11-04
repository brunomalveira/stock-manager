# RECORD — how this app was built

The build record for **Stock manager**: the idea, the implementation, and
every problem hit along the way with its fix. Current status lives in
`STATE.md`; ground rules and scope live in `AGENTS.md`.

## a) The idea

- A **simple, local-only, cross-platform** desktop app to track item
  quantities in stock. Single user, offline, no server, no accounts — all
  data in a local SQLite database on the user's machine.
- Quantities have an optional **consumption rate** (per day), which enables
  the headline feature: a **projection** of how much is left and how many
  days until it runs out, with a **low-stock alarm** (native notification)
  before that happens.
- Desktop only (Windows/macOS/Linux; the primary machine is macOS), English
  UI. Nothing leaves the machine.

## b) How it was implemented

### Stack

- **Tauri 2** — Rust core + system webview (small binaries, no bundled
  browser). Bundle identifier `com.brunomalveira.stockmanager` — immutable
  (it keys the app-data directory; changing it orphans the user's data).
- **Vite + TypeScript**, plain DOM (no UI framework).
- **SQLite** via the official `tauri-plugin-sql`; DB file in the OS
  app-data directory.
- **Package manager:** npm. Tests: Vitest + `cargo test`.

### Architecture

- `src-tauri/src/lib.rs` — the whole backend in one file:
  `migrations()` is the **single source of truth for the schema** (guarded
  by `#[rustfmt::skip]`, shared with the integration tests), plugin
  registration (sql, notification, dialog, autostart), the app/File/Edit
  menus + per-row context menus, the tray (close = hide), macOS
  `RunEvent::Reopen`, and two file-I/O commands for CSV.
- `src/` — a thin frontend plus **pure logic modules, each unit-tested**:
  `projection.ts` (days-to-empty math), `alerts.ts` (alarm rule +
  anti-spam), `csv.ts` (RFC 4180 parse/serialize).
- Tests: Vitest for pure modules + `cargo test` integration tests applying
  the real migrations against in-memory SQLite
  (`min_connections(1)` — see problems table).
- Definition of done: `cargo test` + `npm test` + `npm run build` +
  hand-exercise the flow + restart and confirm persistence.

### Feature-by-feature

| Feature | How |
|---|---|
| Items CRUD | One screen, sheet form, ± quick adjust; `quantity REAL` with `CHECK (quantity >= 0)` enforced in DB and UI; every quantity change is a **stock event** (`last_stocked_at` resets → projection restarts) |
| Consumption alarm | `remaining ≈ quantity − consumed_per_day × days_since(last_stocked_at)`; alert when days-to-zero ≤ `alert_threshold_days`; in-app timer every 5 min; **max 1 notification per item per day** (`last_alerted_at`); row-level ⚠ warning in the list |
| Native notifications | `tauri-plugin-notification`; permission checked at startup |
| macOS UI | Overlay title bar + hiddenTitle, transparent window, sidebar vibrancy (`windowEffects`); glass toolbar + sheet (glass on controls, never on content); `html.macos` UA gate keeps the solid fallback on Linux/Windows |
| Semantic colors | `--label`, `--separator`, `--accent`, … in `styles.css` with a dark-mode pass; `DESIGN.md` token spec at the root (validated with `@google/design.md lint`) |
| Menus | App/File/Edit submenus + ⌘N Add Item via the Tauri menu API; per-row right-click context menus (`ContextMenu::popup`, takes `tauri::Window`) |
| Background running | `CloseRequested` → `prevent_close()` + hide (closing never quits); tray icon (Open / Quit); Dock click reopens via `RunEvent::Reopen` (macOS-gated) |
| Launch at login | `tauri-plugin-autostart` + `--hidden` arg (autostart relaunches with the window hidden); gear-button settings sheet with the toggle |
| CSV export/import | Portable columns only (`name, quantity, unit, notes, consumed_per_day, alert_threshold_days`) — app-internal timestamps stay out of the file; pure `csv.ts` (RFC 4180 quoting, per-row errors instead of throwing); import **merges by name** (existing items update user-meaningful fields only → re-import is idempotent; new items are stocked now with fresh timestamps) after a confirm showing counts; native save/open dialogs (`tauri-plugin-dialog`) + two Rust file commands (no fs-scope gymnastics); File menu + settings-sheet buttons |
| Setup script | `npm run setup` (`scripts/setup.sh`): checks Node ≥ 20.12 (Vite 8/rolldown floor), cargo, and per-OS system libs; **prints** the exact install command for missing toolchains (never installs them — no remote code, no shell-profile edits); auto-repairs npm/cli#4828 by loading rolldown's native binding; idempotent |

### Workflow

- **One branch per feature** (`feat/<keyword>`) → pushed → **PR opened and
  merged by the human** on GitHub.
- **Design decisions** (channels, autonomy levels, UX, close-behavior):
  options + recommendation + tradeoffs presented first, the human decides —
  never decided unilaterally. Anything outside the agreed scope starts with
  an ask (out-of-scope list lives in AGENTS.md).
- Atomic commits (`git add <files>`, never `git add .`) with a
  `Developed-by: AI-Jupiter` trailer; doc commits may land directly on
  `main`.
- Harness: `docs/harness/` (SUPERPOWERS = which skill when, TESTING = test
  layers, _INDEX), `.agents/rules/` (binding rules), `.agents/skills/`
  (git-commit, apple-design, excalidraw-diagram-generator), `.codegraph/`
  (gitignored except `.gitignore`).

## c) Problems hit, and how to solve or avoid them

| # | Problem | Fix / prevention |
|---|---|---|
| 1 | TS type errors on the scaffold: the sql plugin exports a default `Database` class (no `load`/named exports); `closest()` returns `Element` | `import Database from "@tauri-apps/plugin-sql"`; cast `closest<HTMLElement>(...)` results |
| 2 | Writes fail with `sql.execute not allowed` | `sql:default` deliberately omits execute — add `sql:allow-execute` to `capabilities/default.json`. Plugin defaults are narrow; wire every plugin in four pieces (Rust crate + `.plugin(init)`, JS package, capability, specific allows) |
| 3 | `write_file` refuses after `git checkout`/merge (stale tracking) | Read the file fresh after any branch switch before rewriting |
| 4 | `patch` can't find `old_string` on a feature branch | The branch was cut from a stale `main` and a sibling PR merged first — reconcile: `git fetch && git merge origin/main` into the branch, resolve, push |
| 5 | `cargo test` fails on column order | `ALTER TABLE ADD COLUMN` appends — physical order ≠ logical order. Compare column names as a **set**, not a sequence |
| 6 | `Menu::popup` doesn't exist as written | `popup` lives on the **`ContextMenu`** trait (import it) and takes **`tauri::Window`**, not `WebviewWindow` — a compile error otherwise |
| 7 | Port 1420 already in use | An orphan server (old preview or a hidden background app) holds it — `ss -tlnp | grep 1420`, kill the PID, relaunch. Quit the background app (tray → Quit or `pkill`) before re-running `tauri dev` |
| 8 | Mac: `failed to run 'cargo metadata' … os error 2` | cargo not installed — install rustup, then `source "$HOME/.cargo/env"` in new terminals |
| 9 | Mac: `node:util does not provide 'styleText'` (rolldown/Vite) | Node < 20.12 — the floor is **20.12**; upgrade to Node 22 (`brew install node@22` or nvm). Not "latest": `brew upgrade node` grabbed Node 26 and broke rolldown the other way |
| 10 | Mac: `Cannot find native binding … @rolldown/binding-*` | npm/cli#4828 — stale `node_modules` after a Node bump: `rm -rf node_modules package-lock.json && npm install` (automated by `npm run setup`) |
| 11 | Mac: clone "no permission" on a public repo | The README's SSH URL requires a registered key even for public repos — use the HTTPS URL while the repo is public; set up SSH then flip it private |
| 12 | `Failed to resolve import "@tauri-apps/plugin-autostart"` with a clean file | Dep-cache poisoning: `npm install` ran before the dep landed in `package.json`, so Vite blacklisted it — add the dep, kill the dev server, `rm -rf node_modules/.vite`, restart |
| 13 | Closing the window doesn't stop the app | By design (background running): close = hide. To fully quit: tray → Quit, ⌘Q, or `pkill stock-manager`. Data is safe either way (DB on disk) |
| 14 | `Failed to open database: Cannot read properties of undefined (reading 'invoke')` in the dev log | A plain **browser tab** at `localhost:1420` (no Tauri runtime) — the design preview, not the app. Close the tab; the app window is unaffected |
| 15 | Ubuntu: tray icon appears, Dock icon doesn't | GNOME tracks **windows**, not processes — a hidden window means no Dock presence. User decision: keep as-is on Ubuntu (the tray is the standard affordance); macOS Docks running apps with no windows |
| 16 | Setup script flagged every healthy install as broken | rolldown binding packages are named **`platform-arch-ABI`** (`binding-linux-x64-gnu`) — probing `platform-arch` resolves a package that never exists. Detect by **loading the binding** (`import('rolldown')`), never by name |
| 17 | `Database.load()` fails with "migration was previously applied but has been modified" | sqlx **checksums each migration's SQL text** — even re-indenting an applied migration breaks it. Migrations live in one `#[rustfmt::skip]` function; existing ones are immutable; always add a new migration |
| 18 | In-memory SQLite test pool wipes the DB mid-test | The pool closes idle connections — pin `min_connections(1)` (a single shared connection) |

## d) Referencing this project in another session

- **Desktop Project `stock-manager`** — registered in the desktop app's
  Projects (there is no `/project` slash command): ask Hermes in chat —
  "switch to the stock-manager project" — and the chat's workspace moves
  to this repo. Opening/working in the repo directory also anchors a
  session (AGENTS.md auto-loads as project context).
- **`AGENTS.md`** — the charter: read before any change (ground rules, data
  model, scope in/out, commands, definition of done).
- **`docs/project/STATE.md`** — current status (phase, branch, blockers,
  next step); replaced in place at session close.
- **This file** — the build record + troubleshooting table; start here when
  debugging (the problem is probably row N above).
- Remote: `git@github.com:brunomalveira/stock-manager.git` (public only as
  the Mac-access workaround — flip private once SSH works on the Mac).
