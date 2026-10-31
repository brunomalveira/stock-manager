# AGENTS.md — Stock manager

Instructions for coding agents (and humans) working in this repository.

## What this is

"Stock manager" — a small, local-only desktop app to keep track of the quantity of items in stock. Single user, offline, no server, no accounts, no telemetry. All data lives in a local SQLite database on the user's machine.

## Ground rules

- Runs 100% locally. Never add network calls, analytics, auto-updaters, or cloud sync.
- Keep it simple: prefer the smallest change that works. No new frameworks or dependencies without a stated reason.
- UI and code in English.
- Target platforms: Windows, macOS, Linux (desktop only — no mobile builds).
- User data is precious: never destroy or recreate the database on schema changes; changes are additive migrations only.
- Quantities can never go negative — enforce this in both the UI and the database.

## Harness

Imported from the CSA workspace (`csa_ai_boundary_system`) and adapted for this project:

- `docs/harness/_INDEX.md` — harness index: read it before any change.
- `docs/harness/SUPERPOWERS.md` — which skills to use when, and precedence.
- `docs/harness/TESTING.md` — test layers, commands, and extension rules.
- `docs/project/STATE.md` — single status registry (phase, branch, blockers, next step). Replaced in place at session close; no history.
- `.agents/rules/` — binding rules: `harness-binding-rule.md`, `branch-rule.md`, `git-commit-rule.md`.
- `.agents/skills/git-commit/` — atomic conventional commits (mandatory for any commit; see `.agents/rules/git-commit-rule.md`).
- `.agents/skills/excalidraw-diagram-generator/` — planning/architecture diagrams as `.excalidraw` files under `docs/diagrams/`.
- `.codegraph/` — local CodeGraph index data (gitignored except `.gitignore`). Generate a fresh index here once the first code lands — never copy an index built for another codebase.

Branch model: code work happens on `feat/<keyword>` branches from `main`; doc-only and chore commits may land directly on `main`.

## Stack

- **Tauri 2** — Rust core + system webview (small binaries, no bundled browser).
- **Frontend:** Vite + TypeScript, plain DOM (no UI framework unless discussed first).
- **Database:** SQLite through the official `tauri-plugin-sql` plugin (Rust crate `tauri-plugin-sql` with the `sqlite` feature, JS package `@tauri-apps/plugin-sql`). DB file stored in the OS app-data directory — never inside the install dir or the repo.
- **Notifications:** `tauri-plugin-notification` (native OS notifications — local only, no network, no accounts).
- **Testing:** Vitest (frontend unit) + `cargo test` integration tests over the real migrations — see `docs/harness/TESTING.md`.
- **Package manager:** npm.

## Project layout (Tauri 2 + Vite)

```
src/                  # frontend: index.html, TypeScript, CSS, pure logic modules (*.ts) + unit tests (*.test.ts)
src-tauri/            # Rust core
  src/                # main.rs, lib.rs (migrations, plugin registration)
  tests/              # integration tests: migrations + app SQL against in-memory SQLite
  tauri.conf.json     # app config — identifier below must stay stable
  capabilities/       # Tauri 2 permission files
  migrations are defined in lib.rs::migrations() (see Data model)
```

The bundle identifier is `com.brunomalveira.stockmanager`. Changing it changes the app-data path and orphans the user's data — do not change it.

## Commands

```bash
npm install           # first setup (frontend deps)
npm run tauri dev     # run the app with hot reload — main development loop
npm run tauri build   # produce installers/bundles for the current OS
npm run build         # typecheck + build the frontend only
npm test              # frontend unit tests (Vitest) — projection math, alert rule
cargo test            # Rust integration tests (run inside src-tauri/) — migrations + app SQL
```

Toolchain prerequisites: Node.js ≥ 20, Rust (stable), Tauri CLI v2 (devDependency `@tauri-apps/cli`).

- **Linux build deps:** `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
- **Windows:** WebView2 (preinstalled on Win 10/11) + MSVC Build Tools.
- **macOS:** Xcode Command Line Tools.
- Tauri does not cross-compile bundles: build on the target OS.

## Data model

Single `items` table, created via the migrations list in `lib.rs::migrations()`:

```sql
CREATE TABLE items (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  quantity             REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit                 TEXT NOT NULL DEFAULT 'unit',  -- 'unit', 'kg', 'l', 'box', ...
  notes                TEXT NOT NULL DEFAULT '',
  consumed_per_day     REAL,          -- optional; NULL = no projection for this item
  alert_threshold_days REAL,          -- optional; NULL = no alarm for this item
  last_stocked_at      TEXT,          -- set on every quantity change (stock event)
  last_alerted_at      TEXT,          -- anti-spam state; set when the alarm notification fires
  created_at           TEXT NOT NULL, -- ISO 8601
  updated_at           TEXT NOT NULL  -- ISO 8601
);
```

- `quantity` is REAL because units like kg allow decimals; display trims trailing zeros (`2` not `2.0`).
- Alarm projection: `remaining ≈ quantity − consumed_per_day × days_since(last_stocked_at)`; days-to-zero = `remaining / consumed_per_day`; alert when days-to-zero ≤ `alert_threshold_days`.
- Alarm re-alert rule: at most one notification per item per day (`last_alerted_at`); a quantity change (stock event) resets it.
- Migrations so far: 1 creates the table; 2–4 add the alarm columns; 5 backfills `last_stocked_at` from `created_at`; 6 adds `last_alerted_at` (anti-spam state).
- Only new migrations may be added; existing ones are immutable. sqlx checksums each migration's SQL text — **even re-indenting an applied migration breaks every `Database.load()`** ("migration was previously applied but has been modified"). Never touch an applied migration's string; add a new migration instead.

## Scope

**v1 — items CRUD + stock consumption alarm + native notifications:**
- One screen: list of items (name, quantity + unit), sorted by name.
- Add an item (name, quantity, unit, notes).
- Edit any field; quick quantity adjust (+/-).
- Delete an item — with a confirmation step.
- Consumption projection & alarm (optional per item): consumed-per-day +
  alert-threshold fields; projection of remaining stock since
  `last_stocked_at`; row-level warning when days-to-zero ≤ threshold.
- Native OS notifications when an item crosses its threshold (in-app timer,
  checked every 5 min; at most one alert per item per day). Phase 2 (launchd
  background agent) is approved and built when asked.

**Out of scope (do not build without asking):**
- Stock movements / in-out history log
- Remote alert channels (email/WhatsApp) — decided against; alerts stay local
- Categories, tags, filtering beyond basic search
- CSV export, backup/restore
- Multi-user anything, network anything

## Conventions

- TypeScript in strict mode; no `any`.
- Pure logic lives in exported modules (e.g. `src/projection.ts`, `src/alerts.ts`), never inside DOM/event code — see `docs/harness/TESTING.md`.
- All SQL is parameterized (`$1, $2` placeholders via plugin-sql) — never interpolate user input into SQL strings.
- Errors surfaced by Rust/plugins are shown to the user as a visible message; never swallow them silently.
- Keep the UI minimal and keyboard-friendly; no spinner libraries, no CSS frameworks.
- Timestamps written in ISO 8601 (UTC) in the DB, formatted for the locale only at display time.

## Definition of done (verify before finishing any change)

1. `cargo test` (inside `src-tauri/`) and `npm test` pass — add tests for new logic per `docs/harness/TESTING.md`.
2. `npm run build` (typecheck) passes.
3. `npm run tauri dev` starts without errors and no console errors appear in devtools.
4. The changed flow was exercised by hand: add → edit → delete an item, then restart the app and confirm the data persisted.
5. No new dependencies were added, or each one is justified in the summary.
