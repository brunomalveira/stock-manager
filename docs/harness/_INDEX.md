# Harness Index — Stock manager

Before implementing any change, agents MUST read the following:

| Document | Purpose |
|---|---|
| `AGENTS.md` (root) | Entry point: ground rules, stack, data model, scope, Definition of done |
| `SUPERPOWERS.md` (this dir) | Skills usage table + precedence |
| `docs/project/STATE.md` | Single status registry — current phase, branch, blockers, next step |

Session lifecycle (folded from CSA's `STATE-PROCESS.md`): read `STATE.md`
before any task; close every session by replacing its status block **in
place** — current status only, no history chain.

## Harness rules (`.agents/rules/`)

| Rule | Constraint |
|---|---|
| `harness-binding-rule.md` | Read `_INDEX.md` + `STATE.md` before touching any file |
| `branch-rule.md` | Code work on `feat/<keyword>` from `main`; doc/chore commits may land directly on `main` |
| `git-commit-rule.md` | Invoke the `git-commit` skill for all commit-related tasks (mandatory) |

## Skills

Repo-local skill catalog lives in `.agents/skills/` (git-commit,
excalidraw-diagram-generator). Process skills (TDD, debugging, review, ...)
live in the agent runtime — see `SUPERPOWERS.md`.

*Adapted from `csa_ai_boundary_system` (`docs/harness/_INDEX.md`).*
