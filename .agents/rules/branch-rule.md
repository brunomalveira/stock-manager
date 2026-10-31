---
id: branch-rule
name: Feature Branch Rule
version: 1.0.0
description: Simplified branch model — feature branches from main, never direct code commits on main
trigger:
  - keywords:
    - branch
    - feature
    - implement
    - merge
  - patterns:
    - ".*feat/.*"
    - ".*git checkout.*"
    - ".*git merge.*"
action: "enforce"
enforcement: mandatory
priority: high
---

# Feature Branch Rule

## Rule: feature branches from `main`, never direct code commits on `main`

**Branch model:**

```text
main ─────────────── always-integratable base
   └── feat/<keyword> ── one branch per feature/change
```

**Rules:**

1. **Code work happens on `feat/<keyword>` branches** created from `main` — never implement features directly on `main`.
2. **One branch per feature** — mixed work is split into separate branches.
3. **Doc-only and chore commits** (AGENTS.md, harness docs, .gitignore) may land directly on `main`.
4. **Merge back:** `feat/*` → `main` only after the Definition of done in `AGENTS.md` is met.
5. **Never `--force` push** to `main`; a rejected push is investigated, not forced.

**Enforcement:** before writing code, verify the branch (`git branch --show-current`); if on `main`, create the feature branch first.

*Adapted from `csa_ai_boundary_system` (`.agents/rules/branch-rule.md`) — spec-based naming replaced by a lightweight feature-branch model.*
