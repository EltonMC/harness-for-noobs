# BMad downstream delivery gates

## Type

Decision

## Summary

Downstream applies proportional work sizing, readiness, intent-gap/irreversibility/footprint records, upstream course correction, and fresh-context independent review. Walkthroughs and retrospectives remain deferred.

## Evidence

- `docs/decisions/0006-bmad-downstream-delivery-gates.md`
- `.harness/workflows/downstream-delivery-gates.md`

## Consequence

Do not implement a `FAIL` item or hide a material course correction in downstream code. Require an independent review when the changed boundary has meaningful risk.

## Status

Active
