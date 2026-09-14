# ADR 0013: Portuguese-first owner-facing language

## Status

Accepted — 2026-09-13. Complements ADR 0002.

## Context

The intended owner is a Portuguese-speaking person with little software experience. English-only guides, CLI messages, and pull request text create a barrier exactly where understanding matters most: setup, recovery, and approving changes.

## Decision

- The Harness's own owner-facing material is Portuguese: the repository README, `docs/guia/`, Harness CLI messages, hook block reasons, and the Harness changelog.
- Agent conversation, pull request "O que muda" and "Como testar" sections, and BMad's communication language follow `owner_locale` (a Copier question, default `pt-BR`, stored in `.harness/project.yaml`). `product_locale` applies only to text the product's end users see.
- An English overview lives in `docs/en/README.md`.
- Agent-facing artifacts stay English for precision and token efficiency: `AGENTS.md`, skills, workflows, ADRs, templates, and code (ADR 0002).
- BMad is installed with the communication language mapped from `owner_locale`.

## Consequences

- Two audiences, two languages, one boundary: if a file is read mainly by the owner, it is Portuguese; if mainly by agents, English.
