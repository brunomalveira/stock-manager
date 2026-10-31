# Stock manager

Small, local-only desktop app to keep track of item quantities in stock.
Single user, offline, no server — all data lives in a local SQLite database.

**Stack:** Tauri 2 · Vite + TypeScript · SQLite (`tauri-plugin-sql`) · native OS notifications

## Development

```bash
npm install
npm run tauri dev     # run the app with hot reload
npm run tauri build   # bundle installers for the current OS
npm run build         # typecheck + build the frontend only
npm test              # frontend unit tests (Vitest)
cargo test            # integration tests (run inside src-tauri/)
```

## Building on macOS

macOS bundles can only be built on a Mac (Tauri does not cross-compile).

**One-time prerequisites:**

```bash
xcode-select --install                                               # Xcode Command Line Tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh       # Rust (rustup)
brew install node                                                    # Node.js 20+ (or nvm)
```

**Build:**

```bash
git clone git@github.com:brunomalveira/stock-manager.git    # SSH — needs your key on this machine
# or, while the repo is public (no auth needed):
git clone https://github.com/brunomalveira/stock-manager.git
cd stock-manager
npm install
npm run tauri build
```

**Result:**

- `src-tauri/target/release/bundle/macos/Stock Manager.app` — drag to `/Applications`
- `src-tauri/target/release/bundle/dmg/Stock Manager_<version>.dmg`

Notes:

- A locally-built, unsigned app opens fine on the same Mac — no Gatekeeper or
  notarization step needed. Moving the `.dmg` to *another* Mac triggers
  Gatekeeper; signing/notarization is out of scope until needed.
- The database is per-machine (stored in the OS app-data directory) — it
  starts empty on a new machine.

## Updating the macOS app

There is no auto-updater (the app is local-only by design) — updates are manual:

```bash
git pull
npm install        # only needed if package.json / package-lock.json changed
npm run tauri build
```

Then replace the app in `/Applications` with the fresh
`src-tauri/target/release/bundle/macos/Stock Manager.app`.

Your data survives updates: the SQLite database lives in the OS app-data
directory (`~/Library/Application Support/com.brunomalveira.stockmanager/`)
and schema migrations apply automatically at first launch of the new version.

See `AGENTS.md` for ground rules, the data model, scope, and the definition
of done. Current status lives in `docs/project/STATE.md`. Test layers and
rules live in `docs/harness/TESTING.md`.
