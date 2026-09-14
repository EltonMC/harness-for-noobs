# Decisions

Accepted decisions are recorded once, as ADRs in `docs/decisions/`. This page only routes to them; do not create a memory page that restates an ADR. Add a page here only for a durable product decision that has no ADR.

| Topic | Canonical source | Use when |
| --- | --- | --- |
| Frontend hosting on Cloudflare Workers | `docs/decisions/0001-frontend-hosting-cloudflare-workers.md` | deploy, SSR, edge, or frontend secrets |
| English technical code | `docs/decisions/0002-english-technical-code.md` | naming, tests, logs, developer-facing errors |
| Git, PR, and production governance | `docs/decisions/0003-docker-git-pr-production-governance.md` | pull requests, releases, CI deployment |
| Database DBA stewardship | `docs/decisions/0004-database-dba-stewardship.md` | schema, migrations, RLS, indexes |
| BMad upstream integration | `docs/decisions/0005-bmad-upstream-integration.md` | discovery, planning, handoffs |
| BMad downstream delivery gates | `docs/decisions/0006-bmad-downstream-delivery-gates.md` | sizing, readiness, review |
| Upstream context on demand | `docs/decisions/0007-upstream-context-on-demand.md` | reading BMad artifacts |
| Versioned skill maintenance | `docs/decisions/0008-versioned-skill-maintenance.md` | installing or updating external skills |
| Host toolchain, Docker only for services | `docs/decisions/0009-host-toolchain-docker-services.md` | local runtime, CI parity |
| pnpm with supply-chain defaults | `docs/decisions/0010-pnpm-package-manager.md` | dependencies, install scripts |
| Copier distribution and update PRs | `docs/decisions/0011-copier-distribution.md` | creating projects, Harness updates |
| Enforced guardrails | `docs/decisions/0012-enforced-guardrails.md` | hooks, Git hooks, CI gates, GitHub protection |
| Owner-facing language | `docs/decisions/0013-owner-facing-language.md` | documentation, CLI messages, PR summaries |
