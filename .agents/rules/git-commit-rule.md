---
id: git-commit-rule
name: Git Commit Skill Rule
version: 1.1.0
description: Mandatory rule to invoke git-commit skill for all commit-related tasks
trigger:
  - keywords:
    - commit
    - git commit
    - commit message
    - conventional commit
    - stage and commit
    - commit changes
    - create commit
  - patterns:
    - ".*commit.*"
    - ".*git.*commit.*"
    - ".*conventional.*commit.*"
action: "invoke_skill"
skill: "git-commit"
enforcement: mandatory
priority: high
---

# Git Commit Skill Rule

## Rule: always use `git-commit` skill for commit-related tasks

**Trigger:** any user request mentioning commit, git commit, commit message, conventional commit, or committing changes.

**Action:** before responding to any commit-related request, invoke the `git-commit` skill to handle commit message generation and staging.

**Rationale:** the `git-commit` skill provides:
- Conventional commit message analysis and generation
- Intelligent atomic staging (per file or semantic group)
- Auto-detection of commit type and scope
- Interactive sequential commits for multiple changes

**Repository precedence:** commit conventions live in `AGENTS.md` (root) —
Conventional Commits, atomic staging, `Developed-by: AI-<MODEL>` trailer.
This project has no spec files and no issue tracker: omit `Spec name` and
`Issue` trailers. The skill executes the staging and message generation;
`AGENTS.md` (Definition of done) defines when a commit may happen. On
conflict, `AGENTS.md` wins.

**Enforcement:** this rule is mandatory. Do not handle commit-related requests without first loading the `git-commit` skill.

*Adapted from `csa_ai_boundary_system` (`.agents/rules/git-commit-rule.md` v1.0.0) — `GIT.md` references replaced by this repo's `AGENTS.md`.*
