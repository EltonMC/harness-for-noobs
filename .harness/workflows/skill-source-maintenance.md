# Managed Skill Source Maintenance

## Purpose

Keep external agent skills current without allowing unreviewed upstream content to reach `main`.

## Managed sources

- BMad: the exact `bmad-method` installer version in the source lock.
- Impeccable: the exact Git revision of `pbakaus/impeccable` in the source lock.
- Caveman: the exact Git revision of `JuliusBrussee/caveman` in the source lock.

The immutable state is recorded in `.harness/skill-sources.lock.json` and mirrored in `skills-lock.json` for discovery tools. Do not edit either lockfile by hand.

`bootstrap-skills.mjs` uses fixed executable versions and fetches Git revisions directly. A local `.harness-source.json` provenance record and committed content digests make an offline check able to prove that an installed source matches the lock.

## Weekly check

The GitHub Actions workflow runs the script tests before it checks the stable BMad package version, Git revisions for Impeccable and Caveman, and that every portable adapter matches its local source. It writes a report to the workflow summary and `.harness/evidence/skill-source-report.md`. The installed source directories are intentionally not committed.

An available update is a signal, not authorization to change `main`. A local provenance or adapter failure is a failed check, never a successful “update available” result.

## Prepare an update

1. Read the report and release notes for every proposed source update.
2. Run `npm run harness -- update --apply` in a dedicated feature branch.
3. The updater rejects local drift, resolves candidate Git content digests, installs the exact resolved identities, synchronizes explicit portable adapters, records before/after evidence, and changes the lock only after post-update integrity verification succeeds. It restores the previous managed installation if any step fails.
4. Run `npm run check`, then review the lockfile diff, release notes, BMad manifest version, adapter synchronization, and source-check report.
5. Merge only after human approval and the project quality gates pass.

## Portable adapter boundary

External skill sources are copied only to `.agents`, `.claude`, `.cline`, `.cursor`, `.github`, and `.devin`. New hosts are added by extending the explicit target list in the source lockfile, then validating their native discovery behavior. Do not copy large skills to every tool directory merely because a registry can detect them.

## Rollback

Revert the approved skill-update pull request, then run `npm run harness -- setup` to reconstruct the previous locked sources. Generated source directories are intentionally not relied upon for rollback.
