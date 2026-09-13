# Upstream Handoff: harness-reliability-and-onboarding

## Status

`APPROVED`

## BMad sources

- Planning path used: BMad spec, generated from the owner's approved improvement plan.
- Source artifacts under `_bmad-output/`: `specs/spec-harness-reliability-and-onboarding/SPEC.md` and `delivery-sequence.md`.
- Upstream owner approval and date: Elton Carvalho, 2026-09-13, through the instruction to execute the proposed improvement plan.

## Context contract

- Default downstream context: this handoff and the scoped Harness work item.
- Source artifacts are not loaded by default.
- On-demand source map:

| Decision or question | Source path and heading | Read only when |
| --- | --- | --- |
| Capability and boundary | `_bmad-output/specs/spec-harness-reliability-and-onboarding/SPEC.md`, `Capabilities` and `Constraints` | A change could widen the agreed scope or weaken a guardrail. |
| Delivery order | `_bmad-output/specs/spec-harness-reliability-and-onboarding/delivery-sequence.md`, full file | A dependency changes the planned slice order. |

- Retrieved-conclusion log: no downstream retrieval yet.

## Delivery contract

- Outcome and user value: a newcomer can diagnose setup, install approved skills, and use trustworthy update controls without decoding implementation scripts.
- Explicit non-goals: a product-specific application, deployment, automatic merge, or automatic installation of optional token tools.
- Acceptance criteria: CAP-1 through CAP-4 of the linked spec, with automated verification where executable.
- UX job, states, and accessibility requirements: command-line output must provide ready, action-required, and failure states in plain language.
- Architecture decisions or constraints: Node-only harness tooling; fixed executable versions and source revisions; integrity failure stays non-zero; no unpinned installer in write-capable CI.
- Data model, authorization, and migration impact: none.
- Dependencies, rollout, and risks: Git, supported Node LTS, npm, and network access are required only when installing or intentionally updating external sources. Optional token tooling requires a measured pilot.

## Open questions

None that block the first delivery. Product-specific scaffolding remains intentionally deferred.

## Downstream routing

- Harness work item: `.harness/work-items/2026-09-13-harness-reliability-and-onboarding.md`
- Required skills: feature delivery / Git PR delivery.
- Evidence required before PR: TDD red/green evidence, all Node tests, lockfile validation, offline integrity check, and CI syntax validation.
