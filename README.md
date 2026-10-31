# Stock manager

Small, local-only desktop app to keep track of item quantities in stock.
Single user, offline, no server — all data lives in a local SQLite database.

**Stack:** Tauri 2 · Vite + TypeScript · SQLite (`tauri-plugin-sql`)

## Development

```bash
npm install
npm run tauri dev     # run the app with hot reload
npm run tauri build   # bundle installers for the current OS
npm run build         # typecheck + build the frontend only
```

See `AGENTS.md` for ground rules, the data model, v1 scope, and the
definition of done. Current status lives in `docs/project/STATE.md`.
