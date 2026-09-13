# ADR 0007: Consume upstream artifacts by targeted reference

## Status

Accepted — 2026-09-13

## Context

BMad planning artifacts can be large. Sending them into every downstream implementation context wastes tokens and makes the implementation agent less focused, even though those artifacts remain the authoritative product source.

## Decision

- An approved upstream handoff and its scoped Harness work item are the default downstream context.
- The handoff contains the delivery contract and an on-demand source map: decision, source path and heading, and the condition that justifies retrieval.
- `_bmad-output/` is not loaded by default, in bulk, or recursively.
- An agent may retrieve only the smallest relevant source section when the handoff lacks a needed decision, downstream evidence conflicts with it, or the decision affects a high-risk or irreversible boundary.
- After retrieval, record only the source path, heading, and concise resolved conclusion in the work item or refreshed handoff. Do not copy source sections or planning transcripts.

## Consequences

- BMad remains the source of product intent without becoming mandatory context for each implementation task.
- Handoffs must be decision-complete enough for ordinary implementation, while retaining traceable links for rare detail lookups.
- A source conflict still returns upstream; targeted retrieval does not authorize downstream to redefine product intent.

## Evidence

- `.harness/templates/upstream-handoff.md`
- `.harness/workflows/upstream-bmad.md`
- `.harness/workflows/token-efficient-execution.md`
