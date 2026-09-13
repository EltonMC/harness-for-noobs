# Upstream context on demand

## Type

Decision

## Summary

Downstream begins from the approved handoff and scoped work item. BMad source artifacts are opened only by targeted reference for a missing, conflicting, or high-risk decision.

## Evidence

- `docs/decisions/0007-upstream-context-on-demand.md`
- `.harness/templates/upstream-handoff.md`
- `.harness/workflows/upstream-bmad.md`

## Consequence

Keep an on-demand source map in each handoff. When a lookup is needed, save only the source path, heading, and concise conclusion; never load or paste a full upstream artifact by default.

## Status

Active
