# Managed Skill Source Maintenance

## Purpose

Keep external agent skills current without allowing unreviewed upstream content to reach `main`.

## Managed sources

- BMad: official stable `bmad-method` package and its project-local installer.
- Impeccable: `pbakaus/impeccable` through the project-local Skills CLI source at `.agents/skills/impeccable`.
- Caveman: `JuliusBrussee/caveman` through the project-local Skills CLI source at `.agents/skills/caveman`.

The immutable state is recorded in `.harness/skill-sources.lock.json`. `skills-lock.json` is maintained by the Skills CLI. Do not edit either lockfile by hand.

## Weekly check

The GitHub Actions workflow first bootstraps the managed sources in its disposable runner, then checks the stable BMad package version, Git revisions for Impeccable and Caveman, and that every portable adapter matches its local source. It writes a report to the workflow summary and `.harness/evidence/skill-source-report.md`. The installed source directories are intentionally not committed.

An available update is a signal, not authorization to change `main`.

## Prepare an update

1. Read the report and release notes for every proposed source update.
2. Run the workflow manually with `prepare_update` enabled, or run `node .harness/scripts/update-skill-sources.mjs --apply` in a dedicated feature branch.
3. The update refreshes project sources, re-runs the BMad quick update, synchronizes the explicit portable adapters, and updates the lockfile revisions. The workflow performs the same bootstrap before it updates.
4. Review the generated draft pull request. Validate skill frontmatter, adapter synchronization, BMad discovery, and any source-specific diagnostics.
5. Merge only after human approval and the project quality gates pass.

## Portable adapter boundary

External skill sources are copied only to `.agents`, `.claude`, `.cline`, `.cursor`, `.github`, and `.devin`. New hosts are added by extending the explicit target list in the source lockfile, then validating their native discovery behavior. Do not copy large skills to every tool directory merely because a registry can detect them.

## Rollback

Revert the approved skill-update pull request. The prior source revision and files are preserved by Git.
