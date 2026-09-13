# Work Item: make the Harness reliable and usable for newcomers

## Outcome

Make installation and update controls deterministic, expose a small newcomer-facing command surface, and document safe transparent harness updates.

## Delivery gate

- Change size: epic
- Upstream source or direct-intent rationale: `.harness/upstream/approved/2026-09-13-harness-reliability-and-onboarding.md`
- Intent gaps: product-specific starter behavior is intentionally deferred until the product journey and authorization model exist.
- Irreversible actions: none. Network installation and GitHub workflow execution remain explicit commands.
- Footprint: lockfiles, Node scripts and tests, GitHub workflow, README, operational workflow, project context, and versioned memory.
- Readiness verdict: PASS
- Concerns accepted by owner or condition to clear: optional RTK, Serena, Repomix, Copier, and a React starter require measured or product-informed follow-up work.

## Acceptance criteria

- [x] External skill installation uses committed executable versions, source revisions, and content digests.
- [x] Integrity drift fails verification while a remote update remains distinguishable from an integrity failure.
- [x] CI validates the maintenance scripts and publishes a read-only source report before a human prepares an update branch.
- [x] A newcomer-facing command reports prerequisite status and exposes setup, status, check, and update actions.
- [x] The README and update workflow explain how harness files can evolve without overwriting product-owned files.

## Scope

- Affected areas: Harness scripts, tests, source locks, CI workflow, README, update documentation, project context, and memory.
- Explicit non-goals: product implementation, Supabase, deployment, automatic merge, and installation of optional token-saving software.
- Dependencies or decisions: ADR 0003, ADR 0005, ADR 0007, ADR 0008, and the approved handoff.
- Code-language convention: English for technical code and developer-facing text; product locale for user-facing copy.
- Memory consulted: `decisions/versioned-skill-maintenance.md`.
- Memory captured or updated: pending at completion.

## Data and authorization impact

- Tables, Storage, Auth, RPC, or Edge Functions affected: none.
- Access-matrix update: not needed.
- Migration and RLS tests: not needed.

## UX contract

- User job and primary action: prepare or diagnose the Harness from a terminal with a single documented command.
- States: ready, action required, unavailable, and failed with an explicit next action.
- Keyboard and assistive-technology behavior: not applicable.
- Responsive or visual-regression risk: not applicable.

## Implementation evidence

- Files changed: newcomer CLI and package scripts; immutable skill-source lock; source installation, integrity, adapter, and update scripts; CI; README; ADR 0008; maintenance and token workflows; approved upstream handoff; and this work item.
- TDD red evidence: `node --test .harness/scripts/harness-cli.test.mjs .harness/scripts/install-skill-adapters.test.mjs .harness/scripts/skill-source-utils.test.mjs` initially failed four new cases: unsupported Node, unowned adapter deletion, missing `--root` value, and mutable Git revision acceptance. Earlier focused tests also failed before the CLI and `buildUpdatedLock` exports existed.
- TDD green evidence: `npm run check` passes 20 tests, including the regression where a Git source and all adapters are altered together.
- TDD refactor evidence: shared deterministic tree hashing and pinned-source utilities now serve install, offline verification, and update preparation; adapter cleanup records ownership rather than using a name prefix.
- Checks run: `npm run harness -- setup --bmad-tools codex,claude-code,cline` installed the locked BMad 6.12.0 and exact Git revisions; `npm run harness -- status` reported all prerequisites and sources ready (Docker is explicitly not required until an application stack exists); `npm run check` passed; JavaScript syntax checks, JSON parsing, YAML parsing, and `git diff --check HEAD` passed.
- Review findings and disposition: fresh-context review found mutable Git refs, editable-provenance-only verification, unverified BMad output, non-atomic replacement/update recovery, misleading status exits, unsupported Node acceptance, incomplete checks, unsafe adapter cleanup, and stale draft-PR documentation. All were fixed and covered by the resulting checks. The update workflow intentionally remains read-only because a write-capable CI job must not run a newly discovered third-party installer; a human prepares the dedicated update branch with before/after evidence.
- Remaining risks: BMad, Impeccable, and Caveman remain third-party dependencies. The update command is intentionally explicit and requires release-note review plus human pull-request approval. Docker is deferred until the product application is scaffolded.
- Independent-review evidence or proportional exception: independent adversarial, edge-case, verification-gap, and acceptance review completed in fresh contexts; identified defects were remediated before final verification.
- Course-correction record: not needed.
