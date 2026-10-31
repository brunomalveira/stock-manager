---
id: harness-binding-rule
name: Harness Binding Rule
version: 1.0.0
description: Mandatory rule to read the harness docs and STATE.md before any change
trigger:
  - keywords:
    - harness
    - before implementing
    - new session
    - start task
    - continue work
    - update state
    - close session
  - patterns:
    - ".*docs/harness.*"
    - ".*STATE.md.*"
action: "read_docs"
docs:
  - docs/harness/_INDEX.md
  - docs/project/STATE.md
enforcement: mandatory
priority: high
---

# Harness Binding Rule

## Rule: read the harness docs and STATE.md before any change

**Trigger:** the start of any session or task in this repository.

**Action:** read, in order, before touching any file:

1. `docs/harness/_INDEX.md` — points to every binding document.
2. `docs/project/STATE.md` — single status registry: current phase, branch in progress, blockers, next step.
3. Only then the docs required by the task (e.g. `AGENTS.md` before coding, the `git-commit` skill before any commit).

**Rationale:** the harness keeps agent work consistent across sessions —
branch discipline, git discipline, state persistence, and skill usage are
defined there, not improvised. Reading the index first prevents acting on a
stale picture of the repository.

**Session close:** replace the status block in `STATE.md` **in place** —
current/vigent status only, no history entry.

*Adapted from `csa_ai_boundary_system` (`.agents/rules/harness-binding-rule.md`).*
