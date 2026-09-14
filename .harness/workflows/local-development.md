# Local development

See `docs/decisions/0009-host-toolchain-docker-services.md`.

## Runtime boundary

- The application, tests, and build run on the host with the Node version in `.nvmrc` and the pnpm version pinned in `package.json#packageManager` (pnpm 10+ switches to it automatically).
- Docker runs services only: the local Supabase stack started by the Supabase CLI.
- CI is the clean room: a fresh runner installs from the lockfile and runs every gate. A change that passes only on one laptop is not done.

## First run after `init-app`

Agents never read or write `.env` files. Give the owner these steps:

1. `cp .env.example .env.local`
2. Start Docker Desktop, then `pnpm db:start`; paste the printed publishable key into `.env.local`.
3. `pnpm exec playwright install chromium`
4. `npm run harness -- verify` (database gates are reported as skipped while the local stack is stopped).

## Everyday flow

1. `pnpm db:start` (once per session) and `pnpm dev`.
2. Change code test-first; the agent hooks lint edited files and run the quick gate before the agent finishes.
3. `npm run harness -- verify` before a pull request (`--e2e` for flows). With the local stack running it also runs `db:lint` and `db:test`.
4. `pnpm db:stop` when finished. `pnpm db:reset` rebuilds local data from migrations and seeds (local data is lost).

## Boundaries

- Never place production secrets in `.env.local`, package scripts, or committed files. Browser variables (`VITE_*`) are public.
- Keep install-time safety on: `minimumReleaseAge` and `allowBuilds` in `pnpm-workspace.yaml`.
- Cloudflare receives only the built static assets from CI; nothing deploys from a laptop.
