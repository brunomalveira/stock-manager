---
name: git-commit
description: 'Execute git commit with conventional commit message analysis, intelligent atomic staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Mandatory atomic commits (per file or strict semantic group), (2) Auto-detecting type and scope, (3) Generating conventional commit messages from diff, (4) Interactive sequential commits.'
license: MIT
metadata:
  version: 0.2.1
  category: development
  adapted_from: csa_ai_boundary_system .agents/skills/git-commit v0.2.0 (Spec/Issue trailers made optional — personal project, no spec or Jira tracking)
---

# Git Commit with Conventional Commits (Atomic Edition)

## Overview

Create standardized, semantic git commits using the Conventional Commits specification. Analyze actual diffs to create **strictly atomic commits**—breaking down changes per file or by tightly-coupled semantic units (e.g., a component and its corresponding test).

---

## Core Rule: Atomic Commits Only

> **NEVER** use `git add .`, `git add -A`, or commit unrelated changes together. 
> Every commit must represent **one single logical change**.

### Allowed Semantic Grouping:
- **Single File**: Preferred default for independent changes.
- **Code + Test Pair**: E.g., `user.service.ts` + `user.service.spec.ts`.
- **Interface/Type + Implementation**: E.g., `user.types.ts` + `user.service.ts` (if changed together for the exact same feature).
- **Translation / I18n**: Locale files updated for the exact same key/feature.

If different files address different topics or concerns, they **MUST** be committed in separate runs/commits.

---

## Conventional Commit Format

```text
<type>[optional scope]: <description>

[optional body]

<footer>
```

## Commit Types

| Type | Purpose |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactor (no feature/fix) |
| `perf` | Performance improvement |
| `test` | Add/update tests |
| `docs` | Documentation only |
| `build` | Build system/dependencies |
| `ci` | CI/config changes |
| `chore` | Maintenance/misc |
| `style` | Formatting/style (no logic) |
| `security` | Fixes or improvements to security |
| `infra` | Infrastructure changes or provisioning |
| `release` | Release tags, version bumps, or deployments |

## Breaking Changes

```text
# Exclamation mark after type/scope
feat!: remove deprecated endpoint

# BREAKING CHANGE footer
feat: allow config to extend other configs

BREAKING CHANGE: `extends` key behavior changed

```

---

## Workflow (Sequential & Atomic Execution)

### 1. Analyze Working Directory & Diff

```bash
# Check modified, untracked, and staged files
git status --porcelain

# Check unstaged diffs
git diff

# Check staged diffs (if any)
git diff --staged

```

### 2. Group Files Atomically

Classify the list of changed files into **independent atomic groups**.

**Grouping Example:**

* Group 1 (Doc): `README.md` $\rightarrow$ `docs: update setup guide`
* Group 2 (Feature + Test): `src/auth.ts`, `src/auth.test.ts` $\rightarrow$ `feat(auth): add JWT validation`
* Group 3 (Chore): `.eslintrc.json` $\rightarrow$ `chore: update linter rules`

### 3. Stage & Commit Loop (Repeat for each atomic group)

For **EACH** identified atomic group:

1. **Stage only the files belonging to the group:**
```bash
git add path/to/file1 path/to/file2

```


2. **Verify security rules before committing:**
**NEVER COMMIT SECRETS**:
```text
- .env / *.env.*
- *.pem / *.key / *.crt
- secrets.json
- API tokens / passwords / private keys
- Cloud credentials / JWT secrets

```


3. **Validate message prerequisites:**
* **Type**: Correct commit type for the file/group change.
* **Scope**: Affected module or file name.
* **Description**: Concise English summary, imperative mood, no ending period, $\le 72$ characters.
* **Issue ID**: Optional — this project has no issue tracker; omit the trailer if there is no issue.


4. **Execute Commit:**

```bash
git commit -m "$(cat <<'EOF'
<type>[scope]: <description>

<optional body explaining WHY and HOW>

Developed-by: AI-<MODEL_NAME>
EOF
)"

```

5. **Repeat** the process for any remaining files until `git status --porcelain` is clean.

---

## Best Practices

* **One file, one commit** whenever possible (unless code + test are tightly coupled).
* Present tense: "add" not "added".
* Imperative mood: "fix bug" not "fixes bug".
* Keep description under 72 characters.
* Generate commit messages **ONLY in English**.

---

## Git Safety Protocol

* **NEVER** update git config.
* **NEVER** run destructive commands (`--force`, `reset --hard`) without explicit request.
* **NEVER** skip hooks (`--no-verify`) unless user explicitly asks.
* **NEVER** force push to main/master.
* If a commit fails due to git hooks, fix the issue and create a **NEW** commit (do not `--amend`).

---

## Golden Rule

> Make every Git change small, safe, traceable, tested, and easy to review.
