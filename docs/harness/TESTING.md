# TESTING.md — Stock manager

Test layers, commands, and the rules for extending them. Sources: the
Tauri testing docs (tauri.app/develop/tests — mock runtime + WebDriver)
and the WebdriverIO Tauri guide; adapted to this repo's harness.

## Layers

| Layer | What it covers | Command | Needs |
|---|---|---|---|
| 1. Rust integration (`src-tauri/tests/`) | the real migrations, schema shape, the app's SQL (CRUD, CHECK constraint, nullable optionals) | `cargo test` (inside `src-tauri/`) | in-memory SQLite only — no app, no GUI |
| 2. Frontend unit (`src/*.test.ts`) | pure feature logic: projection math, alert rule, formatting | `npm test` | nothing — plain Vitest, no Tauri runtime |
| 3. E2E WebDriver (planned) | full feature flows in the real app: add → edit → +/- → delete → restart persistence | wdio against a built binary | built binary + WebdriverIO setup (see below) |

## Rules

1. **Layers 1 and 2 run in the Definition of done** — no change is finished until `cargo test` and `npm test` pass (see AGENTS.md).
2. **Pure logic lives in exported modules** (e.g. `src/projection.ts`), never inside DOM/event code — that is what makes layer 2 possible. When adding decision logic, put it in a pure function and test it there.
3. **When the app's SQL changes, update the layer-1 tests** — they replicate the app's statements; keep both in sync.
4. **Applied migrations are immutable down to whitespace** — sqlx checksums their SQL text; re-indenting breaks every `Database.load()` (see AGENTS.md). Always add a new migration instead.
5. A new feature ships with: at least one layer-1 test if it touches SQL or schema, at least one layer-2 test if it has decision logic, and a layer-3 scenario when it is a user-visible flow.

## Layer 3 — E2E WebDriver (planned, not wired)

Recommended stack per the Tauri docs: **WebdriverIO + `@wdio/tauri-service`** —
embedded WebDriver server, works on Windows/Linux/macOS, no external driver:

```bash
npm create wdio@latest ./   # pick Desktop Testing → Tauri
```

Config points `appBinaryPath` at the built binary; optional plugins:
`tauri-plugin-wdio-webdriver` (embedded server) and `tauri-plugin-wdio`
(`browser.tauri.execute()`, IPC/command mocking, log capture). CI runs via
GitHub Actions with `xvfb-run` on Linux (tauri.app/develop/tests/webdriver/ci).

Wire this up when the first E2E scenario is actually needed — it requires a
built binary and two small plugins, so it is not part of the everyday loop.
