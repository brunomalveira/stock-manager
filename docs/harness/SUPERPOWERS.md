# SUPERPOWERS.md — Stock manager

Adapted from `csa_ai_boundary_system` (`docs/harness/SUPERPOWERS.md`).

## Skills configuration and usage in development environment

Process skills (superpowers) live in the agent runtime, not in this repo.
`.agents/skills/` carries the repo-local catalog (git-commit,
excalidraw-diagram-generator); the agent runtime provides the process skills
(TDD, debugging, review, ...).

## Skill usage rules for this repository

| Skill | Use When | Note for coding flow |
|---|---|---|
| spike | validate an idea before building it | throwaway experiment — keep it out of the repo (scratch dir) |
| test-driven-development | any feature or bugfix | failing test → minimal code → green |
| systematic-debugging | any bug or unexpected behavior | root cause before proposing fixes |
| requesting-code-review | before claiming a task done | pre-commit review, security scan, quality gates |
| simplify-code | after a chunk of changes lands | cleanup pass, one concern at a time |
| dogfood | QA of the running app | exploratory testing with evidence |
| excalidraw-diagram-generator | planning UI/architecture | `.excalidraw` files under `docs/diagrams/` |
| git-commit | any commit task (mandatory per `.agents/rules/git-commit-rule.md`) | staging + conventional message generation |

## Precedence

1. **User instructions** (chat, `AGENTS.md`, direct requests) take precedence over skills.
2. **Skills** override default behavior.
3. On conflict, the repo contract (`AGENTS.md`, Definition of done) wins for repository matters; the skill governs process.
