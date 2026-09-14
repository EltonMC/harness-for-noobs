# Managed Skill Source Maintenance

## Purpose

Keep external agent skills current without letting unreviewed upstream content reach `main`, and keep every installed skill loadable.

## Managed sources

- BMad: the exact `bmad-method` installer version, installed with the `essential` skill profile.
- Impeccable: the exact Git revision of `pbakaus/impeccable`, using its host-specific skill folders (`.agents/skills/impeccable` for Codex, Cursor, Copilot, and Cline; `.claude/skills/impeccable` for Claude Code). Its optional subagents are not installed; the skill has a documented degraded mode.
- Caveman: the exact Git revision of `JuliusBrussee/caveman`.

The immutable state is `.harness/skill-sources.lock.json`, mirrored in `skills-lock.json`. Do not edit either by hand.

## Installation

`npm run harness -- setup [--agents claude-code,codex,…]` installs only the directories of the selected agents (recorded in the ignored `.harness/.local-state.json`):

| Agent | Directory |
| --- | --- |
| Claude Code | `.claude/skills` |
| Codex, Cursor, GitHub Copilot | `.agents/skills` |
| Cline | `.cline/skills` |

Pinned Git sources are fetched into `.harness/.skill-cache/<id>` and copied to each selected directory. Verification proves, offline, that each source matches its locked content digest, each copy matches its source, and each skill's `SKILL.md` declares the expected `name` and a `description`. A digest match without a loadable skill is a failure.

## Weekly check

`.github/workflows/skill-source-maintenance.yml` runs the Harness tests, installs the locked sources in a runner, and reports whether a newer upstream exists. An available update is a signal, not authorization.

## Prepare an update

1. Read the report and each upstream release note.
2. On a dedicated branch: `npm run harness -- update-skills --apply`. It rejects local drift, resolves candidate content digests, installs them, re-verifies, and writes the lock only on success; otherwise it restores the previous installation.
3. If an upstream moved its skill folder, update `sourceSubdirectory` in the lock on that branch; the loadability check will fail until it is correct.
4. `npm run check`, review the lock diff and release notes, open a pull request, merge only after human approval.

## Rollback

Revert the skill-update pull request, then `npm run harness -- setup`.
