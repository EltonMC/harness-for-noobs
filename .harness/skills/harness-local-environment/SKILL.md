---
name: harness-local-environment
description: Set up, change, or troubleshoot the local development environment — Node and pnpm toolchain, the local Supabase stack in Docker, environment variables, Playwright browsers, and CI parity. Use for local runtime commands, package scripts, .env.example, or "não roda na minha máquina" problems.
---

Read `.harness/workflows/local-development.md` and `docs/decisions/0009-host-toolchain-docker-services.md` first.

- The application runs on the host with the Node version in `.nvmrc` and the pnpm version pinned in `package.json#packageManager`. Docker runs only services (the local Supabase stack).
- CI is the clean-room check: it installs from the committed `pnpm-lock.yaml` with `pnpm install --frozen-lockfile` on a fresh runner. Do not add a host-only step CI cannot run.
- Add dependencies with `pnpm add <package>@<exact-version>` after the person confirms. Respect `minimumReleaseAge` and `allowBuilds` in `pnpm-workspace.yaml`; never disable them to make an install pass.
- New environment variables go in `.env.example` with a comment. Browser variables (`VITE_*`) are public: never put a secret there. Never read or write `.env.local`: tell the person exactly which line to add and let them do it.
- Local Supabase data is disposable: change state through migrations and seed files, then `pnpm db:reset`.
- Keep package scripts as the command surface (`dev`, `build`, `test`, `typecheck`, `lint`, `db:*`) and update the `commands` block in `.harness/project.yaml` when it changes.
- Validate with `npm run harness -- verify` and record the result in the work item.
