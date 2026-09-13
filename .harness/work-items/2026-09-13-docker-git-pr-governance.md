# Work Item: establish Docker, Git, PR, and production governance

## Outcome

Define a beginner-friendly, portable process in which Docker Compose executes local and CI work, protected pull requests control changes, and CI alone deploys approved merges to production.

## Acceptance criteria

- An accepted ADR distinguishes Docker build parity from the Cloudflare production runtime.
- Workflows document local Docker development, PR review, protected `main`, release, rollback, and migration handling.
- Dedicated Docker and Git/PR skills guide future agents.
- A pull request template asks for TDD, Docker, visual, migration, risk, and rollback evidence.

## Scope

- Harness configuration, instructions, workflow documents, skills, memory, and a PR template only.
- No Git repository, remote account, branch protection rule, CI workflow, Docker image, Cloudflare credential, or production deployment was created.
- Memory consulted: project memory index; no applicable prior Git or Docker project decision.
- Memory captured: Docker/Git governance decision and Git/PR procedure.

## Data and authorization impact

- Tables, Storage, Auth, RPC, or Edge Functions affected: none.
- Access-matrix update: not needed.
- Migration and RLS tests: not needed.

## UX contract

- Not applicable; this is a developer-delivery process.

## Implementation evidence

- Files changed: Harness configuration/context/instructions, ADR, workflows, skills, PR template, and memory entries.
- TDD evidence: not applicable; no executable application behavior exists yet.
- Checks run: YAML and skill-frontmatter validation plus adapter synchronization.
- Remaining risks: GitHub plan/visibility and a second reviewer must be chosen before enforcing protected-environment approvals on a private repository.
