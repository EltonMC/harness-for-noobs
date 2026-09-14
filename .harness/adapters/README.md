# Agent-Host Adapters

The Harness core is plain Markdown, YAML, and Node scripts. Host-specific files are generated or small and versioned.

| Host | Instructions | Skills | Enforced guardrails |
| --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` imports `AGENTS.md` | `.claude/skills` | `.claude/settings.json` permissions and hooks, Git hooks, CI |
| Codex | `AGENTS.md` | `.agents/skills` | `.codex/config.toml` sandbox and approvals, Git hooks, CI |
| Cursor | `AGENTS.md` | `.agents/skills` | Git hooks, CI |
| GitHub Copilot | `AGENTS.md` | `.agents/skills` | Git hooks, CI |
| Cline | `AGENTS.md` | `.cline/skills` | Git hooks, CI |
| Remote agent (Devin, cloud) | Repository plus a work-item path | — | CI and protected `main` |

`npm run harness -- setup --agents <list>` installs Harness skills (`.harness/skills/`) and external skills for the selected hosts. Edit skills only in `.harness/skills/`, then rerun setup. Never copy external skills manually; see `.harness/workflows/skill-source-maintenance.md`.

Agent hooks exist only where the host supports them. Git hooks and CI apply to every host and remain the enforced boundary.
