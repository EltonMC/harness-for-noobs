# Work Item: publish Harness for Noobs

## Outcome

Make the portable Harness understandable and reusable through the public `EltonMC/harness-for-noobs` GitHub repository.

## Delivery gate

- Change size: session
- Upstream source or direct-intent rationale: direct documentation and repository-packaging work
- Intent gaps: none
- Irreversible actions: a public GitHub commit and pull request; authorized by the repository owner
- Footprint: repository identity, README, licensing notices, Git ignore rules, skill bootstrap, and GitHub branch history
- Readiness verdict: PASS
- Concerns accepted by owner or condition to clear: the remote has an initial MIT license and minimal README; this branch preserves the license and replaces the README

## Acceptance criteria

- [x] README explains purpose, prerequisites, installation, daily workflow, updates, and GitHub safeguards for newcomers.
- [x] Third-party skills have licensing and attribution notices.
- [x] Personal, generated, and third-party installed files are excluded from the initial commit and recreated from official sources.
- [ ] The Harness is committed on a feature branch and pushed to the provided GitHub repository.
- [ ] A pull request is opened for owner review; `main` is not directly changed.

## Scope

- Affected areas: public documentation, source-control metadata, shared BMad configuration, and packaging.
- Explicit non-goals: application scaffolding, deployment configuration, production secrets, or an automatic merge.
- Dependencies or decisions: ADR 0003 and ADR 0008.
- Code-language convention: English for technical code and developer-facing text; product locale for user-facing copy.
- Memory consulted: reusable BMad project-local installation convention.
- Memory captured or updated: not needed; the public README is the durable onboarding artifact.

## Data and authorization impact

- Tables, Storage, Auth, RPC, or Edge Functions affected: none.
- Access-matrix update: not needed.
- Migration and RLS tests: not needed.

## UX contract

- User job and primary action: a newcomer can clone the repository, select an agent host, and begin their first work item.
- States: loading, empty, error, success, disabled: not applicable.
- Keyboard and assistive-technology behavior: not applicable.
- Responsive or visual-regression risk: not applicable.

## Implementation evidence

- Files changed: README, notices, ignore rules, skill bootstrap, and this work item.
- TDD red evidence: the bootstrap test initially failed because `parseBmadTools` was not exported.
- TDD green evidence: `node --test .harness/scripts/bootstrap-skills.test.mjs` passed after adding the validated parser and default target behavior.
- TDD refactor evidence: parsing remains a small pure exported function; installation side effects stay in the executable entrypoint.
- Checks run: `node --test .harness/scripts/bootstrap-skills.test.mjs` passed 3 tests; `node --test .harness/scripts/check-skill-sources.test.mjs` passed 3 tests; `node --check .harness/scripts/bootstrap-skills.mjs` passed; public configuration and lockfile validation passed; no prior project name or personal path remains in tracked source candidates.
- Review findings and disposition: pending pull request.
- Remaining risks: users must configure their own GitHub protections and credentials after cloning.
- Independent-review evidence or proportional exception: initial repository packaging; the owner reviews the generated pull request before merge.
- Course-correction record: not needed.
