# Work Item: establish the English technical code convention

## Outcome

Require English for code and developer-facing engineering text across the portable Harness while keeping user-facing copy independent of this decision.

## Acceptance criteria

- An accepted ADR defines the technical-language scope and the user-copy exception.
- Harness configuration, project context, instructions, code guide, and feature-delivery skill expose the same convention.
- Every platform adapter receives the updated feature-delivery skill.

## Scope

- Documentation, configuration, and agent-skill changes only.
- No production code, user-facing strings, deployment, or Supabase resources are changed.
- Memory consulted: `.harness/memory/INDEX.md` and decisions index; no applicable prior project decision.
- Memory captured: `.harness/memory/decisions/english-technical-code.md`.

## Data and authorization impact

- Tables, Storage, Auth, RPC, or Edge Functions affected: none.
- Access-matrix update: not needed.
- Migration and RLS tests: not needed.

## UX contract

- Not applicable. This change deliberately does not choose the product locale.

## Implementation evidence

- Files changed: architecture decision, Harness context/configuration, feature-delivery skill, memory index/page, and adapter copies.
- TDD evidence: not applicable; this is a non-executable Harness convention. Future product features remain subject to red-green-refactor.
- Checks run: YAML and skill-frontmatter validation; adapter synchronization.
- Remaining risks: existing future external APIs may contain non-English domain fields and must be preserved when canonical.
