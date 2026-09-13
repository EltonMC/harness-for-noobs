# ADR 0006: Apply proportional BMad delivery gates downstream

## Status

Accepted — 2026-09-13

## Context

The Harness already governs implementation with TDD, Docker, database stewardship, security, pull requests, and deployment. It now needs selected BMad practices that make implementation decisions clearer without duplicating BMad upstream planning or adding a heavyweight process to trivial work.

## Decision

Apply these five practices downstream:

1. **Proportional work sizing:** classify work as `direct`, `session`, `story`, or `epic`; use the smallest safe path.
2. **Readiness gate:** non-trivial work records `PASS`, `CONCERNS`, or `FAIL` before implementation. `FAIL` blocks work; `CONCERNS` requires an owner-accepted condition.
3. **Decision record:** capture intent gaps, irreversible actions, and footprint in the work item before implementation.
4. **Course correction:** a material discovery about product intent, UX, or architecture returns upstream and refreshes the handoff/readiness result before implementation resumes.
5. **Independent review:** qualifying changes receive a review in a fresh context before PR. Use `bmad-code-review` when available.

## Scope boundaries

- Direct, clear, reversible, low-risk changes may omit the formal readiness gate; their work item still records why that classification is appropriate.
- Qualifying changes for independent review include non-trivial behavior, security, data, authorization, migration, or public-interface changes.
- BMad walkthrough and epic retrospective are deliberately not adopted yet.

## Consequences

- Work items and pull requests explain uncertainty and risk in language the owner can review before code is written.
- A pull request cannot conceal a material scope shift as a small implementation detail.
- The review gate complements tests; it does not replace TDD or the existing PR approval process.

## Evidence

- [BMad work sizing and build design checks](https://docs.bmad-method.org/cs/build/build-a-change/)
- [BMad sprint readiness and correction](https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/)
- [BMad independent code review](https://docs.bmad-method.org/cs/reference/skills-and-agents/)
- `.harness/workflows/downstream-delivery-gates.md`
