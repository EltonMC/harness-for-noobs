# Harness Baseline

Harness-owned: updated by Harness releases. Product-specific context and rules belong in `project-context.md`, which updates never overwrite.

## Technology baseline

- React + Vite + TypeScript static SPA, created from `.harness/app-template` by `npm run harness -- init-app`.
- Cloudflare Workers Static Assets hosts the frontend; only CI deploys it.
- Supabase provides database, authentication, storage, and Edge Functions for privileged logic.
- Application libraries: React Router, TanStack Query for server state, zod at boundaries, a typed in-house i18n catalog, and the Supabase client typed from generated database types (ADR 0016).
- Tooling: Vitest + Testing Library with coverage thresholds and axe-core, Playwright with axe, Biome (strict rules), Knip, pnpm (pinned in `package.json#packageManager`, lockfile committed), Node from `.nvmrc`.
- Local runtime on the host; Docker only for the local Supabase stack. CI is the clean-room verifier.
- Product configuration (owner and product locales, application commands) lives in `.harness/project.yaml`.

## Engineering invariants

- Code, identifiers, tests, comments, logs, and developer-facing errors are English; user-facing copy follows `product_locale`; conversation with the owner follows `owner_locale`.
- Database changes are versioned migrations with an approved DBA review and an owner-approved proposal; published migrations are immutable (`.harness/scripts/database-guard.mjs`).
- The Harness guards in `.harness/database/guards/` and the Supabase security advisors pass: RLS on every `public` table, `security_invoker` views, no bare `true` policies, fixed `search_path`, classified personal-data columns, and account-deletable foreign keys; plus explicit grants and allow/deny tests.
- The browser receives only the Supabase URL and publishable key; bundles are scanned for privileged keys.
- Every behavior change follows red-green-refactor with evidence in its work item.
- Application code follows `.harness/context/code-conventions.md`: feature folders, Supabase access only in `api` modules, copy through `translate`, no raw error text shown to users, and tests of observable behavior with accessibility checks.
- All changes flow through a branch and pull request; only CI deploys, after the owner merges.
