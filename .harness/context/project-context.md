# Project Context

## Product

To be defined. Capture the user, problem, primary outcome, and non-goals before the first product-sized feature.

## Technology baseline

- React + Vite frontend, built as a static single-page application (SPA).
- Cloudflare Workers Static Assets hosts the frontend. Static requests must remain static and do not need a Worker invocation.
- Supabase provides database, authentication, storage, and server-side capabilities when needed.
- Supabase Edge Functions are the default boundary for privileged backend logic. A Cloudflare Worker is added only for a specific edge/server responsibility, such as server-rendering or dynamic metadata.
- TypeScript is the default for application code unless a documented decision changes it.
- Docker Compose is the local development and CI execution boundary. Production stays a Cloudflare static-asset deployment, built and verified in containers before CI deploys it.

## Engineering invariants

- Source code, identifiers, file and directory names, database/API names, tests, code comments, technical logs, and developer-facing errors are written in English.
- User-facing copy follows the documented product locale. Keep translation keys and the code that selects localized copy in English.
- Database changes are represented by repeatable migrations.
- Every client-exposed table has explicit grants, RLS policies, and allow/deny tests for applicable operations.
- Secrets and Supabase service credentials stay server-side.
- The browser may receive only public build-time configuration, such as the Supabase URL and publishable client credential. It never receives `service_role` or another privileged secret.
- Feature work has an acceptance-focused work item and verification evidence.
- Every feature follows red-green-refactor TDD, with failure and passing-test evidence in its work item.
- All changes flow through a feature branch and pull request. `main` is protected; only CI deploys to production after the approved PR is merged.
- Every database construction or alteration has an approved DBA review. Versioned migrations are canonical; the data dictionary records why each durable entity exists so semantic duplicates can be identified before implementation.
- `.harness/memory/` is a task-scoped LLM Wiki. Query it by topic and update only durable, verified knowledge.

## Decisions to make before implementation

1. Choose the package manager.
2. Define identity and tenant model.
3. Define the first user journey and its authorization rules.
4. Add actual build, test, type-check, E2E, and deploy commands to `.harness/harness.yaml`.
