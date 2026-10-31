#!/usr/bin/env bash
# One-command environment setup for this repo (`npm run setup`).
#
# Checks the toolchain — Node >= 20.12 (Vite 8 / rolldown requirement), cargo
# (Tauri core), and the per-OS system libraries — and prints the exact
# install command for anything missing. The script never installs toolchains
# itself: it never runs remote code and never touches your shell profile.
# The only automated steps are the project-local `npm install` and the
# npm/cli#4828 repair (remove node_modules + package-lock.json when the
# rolldown native binding is missing after a Node bump).
#
# Usage:  npm run setup     (or: bash scripts/setup.sh)
# Windows: run inside WSL or Git Bash.

set -uo pipefail

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
TOOLCHAIN_MISSING=0

section() { printf '\n%s%s%s\n' "$BOLD" "$*" "$RESET"; }
ok()      { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
bad()     { printf '  %s✗%s %s\n' "$RED" "$RESET" "$*"; }
hint()    { printf '    %s→%s %s\n' "$YELLOW" "$RESET" "$*"; }

cd "$(dirname "$0")/.."

section "Toolchain"

# --- Node >= 20.12 (Vite 8 / rolldown need styleText) ---
if command -v node >/dev/null 2>&1; then
  read -r NODE_MAJOR NODE_MINOR <<<"$(node -p '[process.versions.node.split(".")[0], process.versions.node.split(".")[1]].join(" ")')"
  if [ "$NODE_MAJOR" -gt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 12 ]; }; then
    ok "node $(node -v)"
  else
    bad "node $(node -v) — Vite 8 needs >= 20.12 (older Node lacks node:util styleText)"
    hint "nvm:      nvm install 22 && nvm use 22"
    hint "homebrew: brew install node@22"
    TOOLCHAIN_MISSING=1
  fi
else
  bad "node not found"
  hint "nvm:      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash  →  nvm install 22"
  hint "homebrew: brew install node@22"
  TOOLCHAIN_MISSING=1
fi

# --- cargo (builds the Rust core) ---
if command -v cargo >/dev/null 2>&1; then
  ok "cargo $(cargo --version 2>/dev/null | awk '{print $2}')"
else
  bad "cargo not found — needed to build the Tauri core"
  hint "rustup:   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  →  source \"\$HOME/.cargo/env\""
  TOOLCHAIN_MISSING=1
fi

if [ "$TOOLCHAIN_MISSING" -eq 1 ]; then
  printf '\n%sFix the toolchain command(s) above, then re-run: npm run setup%s\n' "$RED" "$RESET"
  exit 1
fi

section "System libraries"

case "$(uname -s)" in
  Linux)
    MISSING_LIBS=0
    for lib in glib-2.0 gtk+-3.0 webkit2gtk-4.1 ayatana-appindicator3-0.1 librsvg-2.0 libsoup-3.0; do
      if pkg-config --exists "$lib" 2>/dev/null; then
        ok "$lib"
      else
        bad "$lib not found (pkg-config)"
        MISSING_LIBS=1
      fi
    done
    if [ "$MISSING_LIBS" -eq 1 ]; then
      hint "Ubuntu/Debian: sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \\"
      hint "               libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev"
    fi
    ;;
  Darwin)
    if xcode-select -p >/dev/null 2>&1; then
      ok "Xcode command line tools"
    else
      bad "Xcode command line tools not found"
      hint "run: xcode-select --install"
    fi
    ;;
  *)
    bad "unsupported OS for a native build — use WSL or Git Bash on Windows"
    ;;
esac

section "npm install"

# The real check: can rolldown actually load its native binding? (This is the
# exact failure npm/cli#4828 produces after a Node bump — binding packages are
# named platform-arch-ABI, e.g. binding-linux-x64-gnu, so probing
# platform-arch is wrong.)
if node -e "import('rolldown').then(() => process.exit(0)).catch(() => process.exit(1))" >/dev/null 2>&1; then
  ok "rolldown native binding present"
  npm install
else
  bad "rolldown cannot load its native binding (npm/cli#4828 — stale node_modules after a Node bump)"
  hint "removing node_modules + package-lock.json and reinstalling"
  rm -rf node_modules package-lock.json
  npm install
fi

if [ $? -ne 0 ]; then
  printf '\n%snpm install failed — fix the error above and re-run: npm run setup%s\n' "$RED" "$RESET"
  exit 1
fi

printf '\n%s✓ environment ready%s\n\n' "$GREEN" "$RESET"
printf 'Next steps:\n'
printf '  npm run tauri dev    # run the app (dev)\n'
printf '  npm run tauri build  # bundle for the current OS\n'
