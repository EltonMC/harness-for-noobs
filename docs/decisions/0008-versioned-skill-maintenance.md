# ADR 0008: Maintain external skills through versioned, reviewed updates

## Status

Accepted — 2026-09-13. Amended 2026-09-13: installs only the selected agents' directories, verifies that every skill is loadable, installs Impeccable from its host-specific folders, and uses the BMad `essential` profile (see `.harness/workflows/skill-source-maintenance.md`). References below to `.cursor`, `.github`, and `.devin` skill targets are historical; `clean` removes those legacy copies.

## Context

BMad, Impeccable, and Caveman are external software and instruction bundles. Automatically tracking their moving default branches would make the Harness unreproducible and could introduce behavior changes without review. Copying every skill to every detected tool also creates unnecessary repository size and context overhead.

## Decision

- Record each external source, installer version or Git revision, canonical local directory, and explicit portable targets in `.harness/skill-sources.lock.json`.
- Use the exact BMad npm installer version and direct Git fetches of exact external-skill revisions. `skills-lock.json` mirrors those identities for discovery tools; it is not the installer authority.
- Run a weekly non-mutating source and adapter check.
- Prepare updates only through a dedicated feature branch. The scheduled workflow is read-only and signals available updates; a human reviews and approves the resulting pull request before merge.
- Use stable BMad package releases. Bootstrap resolves only the locked BMad package version and Git revisions. An explicit update resolves candidates once, installs those exact identities, then records the new locks after installation succeeds.
- Limit external copies to the configured portable adapter directories. Adding a host is a reviewed lockfile change, not an automatic fan-out.

## Consequences

- The repository can prove BMad runtime and adapter digests, external-skill provenance and content digests, and adapter state offline, then safely reconstruct a reverted source set from the prior locks.
- A scheduled check detects drift without silently changing production agent behavior.
- Impeccable and Caveman remain available in the selected portable hosts, while BMad continues to use its official installer and shared `_bmad` runtime.

## Evidence

- `.harness/skill-sources.lock.json`
- `.harness/scripts/check-skill-sources.mjs`
- `.harness/scripts/update-skill-sources.mjs`
- `.github/workflows/skill-source-maintenance.yml`
