# ADR 0008: Maintain external skills through versioned, reviewed updates

## Status

Accepted — 2026-09-13

## Context

BMad, Impeccable, and Caveman are external software and instruction bundles. Automatically tracking their moving default branches would make the Harness unreproducible and could introduce behavior changes without review. Copying every skill to every detected tool also creates unnecessary repository size and context overhead.

## Decision

- Record each external source, installed revision or version, canonical local directory, and explicit portable targets in `.harness/skill-sources.lock.json`.
- Keep the Skills CLI lockfile (`skills-lock.json`) alongside the Harness lockfile for skills it manages.
- Run a weekly non-mutating source and adapter check.
- Prepare updates only through a manually dispatched workflow or a feature branch. The workflow creates a draft pull request; a human reviews and approves it before merge.
- Use stable BMad package releases. BMad updates use its project-local quick-update path; Impeccable and Caveman are refreshed through the Skills CLI's project-local `.agents/skills` source, then synchronized to explicit host directories.
- Limit external copies to the configured portable adapter directories. Adding a host is a reviewed lockfile change, not an automatic fan-out.

## Consequences

- The repository can prove which source revision it uses and safely revert an update.
- A scheduled check detects drift without silently changing production agent behavior.
- Impeccable and Caveman remain available in the selected portable hosts, while BMad continues to use its official installer and shared `_bmad` runtime.

## Evidence

- `.harness/skill-sources.lock.json`
- `.harness/scripts/check-skill-sources.mjs`
- `.harness/scripts/update-skill-sources.mjs`
- `.github/workflows/skill-source-maintenance.yml`
