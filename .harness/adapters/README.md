# Agent-Host Adapters

The harness core is plain Markdown and YAML so it can work in any editor or agent host. Agent-specific files are generated from `.harness/skills/` rather than edited directly.

| Host | Skill destination | Invocation |
| --- | --- | --- |
| Codex, Windsurf, Auggie, Amp | `.agents/skills/` | Agent discovers skill or invoke by name |
| Cursor | `.cursor/skills/` | Agent discovers skill or invoke by name |
| Claude Code | `.claude/skills/` | Invoke by name |
| Cline | `.cline/skills/` | Invoke by name |
| VS Code with GitHub Copilot | `.github/skills/` | Agent discovers skill or invoke by name |
| VS Code without a skill-aware agent | Keep core artifacts open and run the workflow manually | Use tasks, terminal, and the work-item template |
| Devin or remote agent | Supply the repository plus a work-item path as the task contract | Require evidence in the work item |

Run `node .harness/scripts/install-skill-adapters.mjs --tool <host>` after cloning or when a skill changes. Supported hosts: `agents`, `claude`, `cline`, `cursor`, `github`, and `all`. The optional `--root <path>` installs into a different checkout and is useful for validation.

External skills use a separate source-maintenance flow. Read `.harness/workflows/skill-source-maintenance.md`; never manually copy BMad, Impeccable, or Caveman between host directories.
