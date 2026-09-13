# Work Item: establish versioned external skill maintenance

## Outcome

Track BMad, Impeccable, and Caveman sources in the repository and update them only through a validated draft pull request.

## Delivery gate

- Change size: session
- Upstream source or direct-intent rationale: direct Harness governance refinement; no product behavior change
- Intent gaps: none
- Irreversible actions: none
- Footprint: agent skill sources, portable adapters, lockfiles, scripts, CI workflow, architecture governance, and project memory
- Readiness verdict: PASS
- Concerns accepted by owner or condition to clear: no GitHub remote exists yet, so workflow activation awaits repository creation and push

## Acceptance criteria

- [x] BMad, Impeccable, and Caveman source versions or revisions are locked.
- [x] Caveman is installed as a project-local source and synchronized to the configured portable adapters.
- [x] A check detects upstream versions and local adapter drift without modifying sources.
- [x] An explicit update command refreshes sources only when invoked with `--apply`.
- [x] A scheduled check and manually dispatched draft-PR workflow are defined.

## Scope

- Affected areas: external skills, lockfiles, Harness scripts, agent adapters, CI workflow, ADR, workflow documentation, and memory.
- Explicit non-goals: automatic merge, production deployment, global skill installation, and Caveman proxy installation.
- Dependencies or decisions: ADR 0003, ADR 0005, and ADR 0008.
- Code-language convention: English for technical code and developer-facing text; product locale for user-facing copy.
- Memory consulted: BMad installation guidance; current project Harness decisions.
- Memory captured or updated: `decisions/versioned-skill-maintenance.md`.

## Data and authorization impact

- Tables, Storage, Auth, RPC, or Edge Functions affected: none.
- Access-matrix update: not needed.
- Migration and RLS tests: not needed.

## UX contract

- User job and primary action: not applicable.
- States: loading, empty, error, success, disabled: not applicable.
- Keyboard and assistive-technology behavior: not applicable.
- Responsive or visual-regression risk: not applicable.

## Implementation evidence

- Files changed: external source lockfiles, maintenance scripts, portable adapter copies, workflow, ADR, memory, and this work item.
- TDD red evidence: `node --test .harness/scripts/check-skill-sources.test.mjs` failed because the checker did not exist.
- TDD green evidence: `node --test .harness/scripts/check-skill-sources.test.mjs` passed 3 tests.
- TDD refactor evidence: corrected the source directory to the Skills CLI project source and made adapter synchronization replace stale managed copies.
- Checks run: `node --check` passed for all three maintenance scripts; `node --test .harness/scripts/check-skill-sources.test.mjs` passed 3 tests; JSON lockfiles, Harness YAML, workflow YAML, and 10 Harness skill frontmatters validated; source check reported all three sources and all configured adapter copies current.
- Review findings and disposition: a stale Cursor Impeccable copy was detected and resolved by exact mirror synchronization.
- Remaining risks: external sources can change behavior; draft PR review remains mandatory.
- Independent-review evidence or proportional exception: governance automation in an uninitialized repository; no pull request or remote exists yet. The workflow itself requires a draft PR and human approval once GitHub is connected.
- Course-correction record: not needed.
