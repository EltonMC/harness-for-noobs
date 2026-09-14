# Harness Baseline

Harness-owned: updated by Harness releases. Product-specific context and rules belong in `project-context.md`, which updates never overwrite.

## Technology baseline

- React + Vite + TypeScript static SPA, created from `.harness/app-template` by `npm run harness -- init-app`.
- Cloudflare Workers Static Assets hosts the frontend; only CI deploys it.
- Supabase provides database, authentication, storage, and Edge Functions for privileged logic.
- Tooling: Vitest + Testing Library, Playwright, Biome, pnpm (pinned in `package.json#packageManager`, lockfile committed), Node from `.nvmrc`.
- Local runtime on the host; Docker only for the local Supabase stack. CI is the clean-room verifier.
- Product configuration (owner and product locales, application commands) lives in `.harness/project.yaml`.

## Engineering invariants

- Code, identifiers, tests, comments, logs, and developer-facing errors are English; user-facing copy follows `product_locale`; conversation with the owner follows `owner_locale`.
- Database changes are versioned migrations with an approved DBA review.
- Every `public` table has RLS enabled (`supabase/tests/database/000_rls_enabled.test.sql`), explicit grants, and allow/deny tests.
- The browser receives only the Supabase URL and publishable key; bundles are scanned for privileged keys.
- Every behavior change follows red-green-refactor with evidence in its work item.
- All changes flow through a branch and pull request; only CI deploys, after the owner merges.
