# Work Item: make upstream context retrieval on demand

## Outcome

Downstream work uses a concise approved handoff by default and retrieves BMad source material only when a specific decision requires it.

## Delivery gate

- Change size: session
- Upstream source or direct-intent rationale: direct Harness governance refinement; no product behavior changes
- Intent gaps: none
- Irreversible actions: none
- Footprint: upstream handoff, token workflow, delivery skills, portable adapter output, and architecture governance
- Readiness verdict: PASS
- Concerns accepted by owner or condition to clear: none

## Acceptance criteria

- [x] The approved handoff is explicitly the default downstream context.
- [x] BMad artifacts are retrieved only by targeted source path and heading for defined exceptions.
- [x] The retrieval conclusion is recorded compactly without copying source artifacts.
- [x] Portable skill adapters receive the revised instructions.

## Scope

- Affected areas: Harness configuration, agent rules, upstream and token workflows, handoff template, skills, ADR, and memory.
- Explicit non-goals: changing BMad product artifacts, implementing product code, or changing external services.
- Dependencies or decisions: ADR 0005 and ADR 0007.
- Code-language convention: English for technical code and developer-facing text; product locale for user-facing copy.
- Memory consulted: relevant local BMad integration decision and token workflow only.
- Memory captured or updated: `decisions/upstream-context-on-demand.md`.

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

- Files changed: Harness policy, workflow, template, skills, ADR, and memory listed in this work item.
- TDD red evidence: not applicable; this is workflow governance, not product behavior.
- TDD green evidence: not applicable; no runtime behavior exists yet.
- TDD refactor evidence: not applicable.
- Checks run: YAML and skill frontmatter validation; adapter synchronization and equality checks.
- Review findings and disposition: pending validation.
- Remaining risks: handoff authors must keep the source map decision-specific.
- Independent-review evidence or proportional exception: direct governance documentation change; independent review not required.
- Course-correction record: not needed.
