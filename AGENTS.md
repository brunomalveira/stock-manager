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
- **Package manager:** npm.

## Project layout (Tauri 2 + Vite)

```
src/                  # frontend: index.html, TypeScript, CSS
src-tauri/            # Rust core
  src/                # main.rs, lib.rs (commands, plugin registration)
  tauri.conf.json     # app config — identifier below must stay stable
  capabilities/       # Tauri 2 permission files
  migrations are defined in the plugin setup (see Data model)
```

The bundle identifier is `com.brunomalveira.stockmanager`. Changing it changes the app-data path and orphans the user's data — do not change it.

## Commands

```bash
npm install           # first setup (frontend deps)
npm run tauri dev     # run the app with hot reload — main development loop
npm run tauri build   # produce installers/bundles for the current OS
npm run build         # typecheck + build the frontend only
cargo test            # Rust unit tests (run inside src-tauri/), when tests exist
```

Toolchain prerequisites: Node.js ≥ 20, Rust (stable), Tauri CLI v2 (devDependency `@tauri-apps/cli`).

- **Linux build deps:** `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
- **Windows:** WebView2 (preinstalled on Win 10/11) + MSVC Build Tools.
- **macOS:** Xcode Command Line Tools.
- Tauri does not cross-compile bundles: build on the target OS.

## Data model (v1)

Single `items` table, created via a `migrations` list passed to `tauri-plugin-sql`:

```sql
CREATE TABLE items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  quantity   REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit       TEXT NOT NULL DEFAULT 'unit',  -- 'unit', 'kg', 'l', 'box', ...
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,                 -- ISO 8601
  updated_at TEXT NOT NULL                  -- ISO 8601
);
```

- `quantity` is REAL because units like kg allow decimals; display trims trailing zeros (`2` not `2.0`).
- Only new migrations may be added; existing ones are immutable.

## Scope

**v1 (MVP) — items CRUD only:**
- One screen: list of items (name, quantity + unit), sorted by name.
- Add an item (name, quantity, unit, notes).
- Edit any field; quick quantity adjust (+/-) is welcome if trivial.
- Delete an item — with a confirmation step.

**Out of scope for v1 (do not build without asking):**
- Stock movements / in-out history log
- Low-stock thresholds and alerts
- Categories, tags, filtering beyond basic search
- CSV export, backup/restore
- Multi-user anything, network anything

## Conventions

- TypeScript in strict mode; no `any`.
- All SQL is parameterized (`$1, $2` placeholders via plugin-sql) — never interpolate user input into SQL strings.
- Errors surfaced by Rust/plugins are shown to the user as a visible message; never swallow them silently.
- Keep the UI minimal and keyboard-friendly; no spinner libraries, no CSS frameworks.
- Timestamps written in ISO 8601 (UTC) in the DB, formatted for the locale only at display time.

## Definition of done (verify before finishing any change)

1. `npm run tauri dev` starts without errors and no console errors appear in devtools.
2. The changed flow was exercised by hand: add → edit → delete an item, then restart the app and confirm the data persisted.
3. `npm run build` (typecheck) passes.
4. No new dependencies were added, or each one is justified in the summary.
