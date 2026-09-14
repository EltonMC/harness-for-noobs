# ADR 0009: Run the application on a pinned host toolchain; use Docker only for services

## Status

Accepted — 2026-09-13. Supersedes the "Local and CI execution" section of ADR 0003.

## Context

ADR 0003 ran the application, tests, and build inside Docker Compose. In practice the Harness already required Node.js on the host for its own scripts, the Supabase CLI already manages its own Docker containers, and a newcomer debugging bind mounts, container networking, file watching, and Playwright inside containers pays a high cost for little additional safety. The owner decided on a lighter local runtime.

## Decision

- The application, Vitest, Playwright, Biome, and Vite run on the host with the Node version in `.nvmrc` and the exact pnpm version in `package.json#packageManager`.
- Docker is required only for the local Supabase stack, started through `pnpm db:start`.
- Reproducibility comes from the lockfile, the pinned package manager, `.nvmrc`, and CI: every pull request is verified on a fresh runner with `pnpm install --frozen-lockfile`.
- `npm run harness -- doctor` checks tool versions and prints the platform-specific install command.

## Consequences

- No Dockerfile or Compose file is part of the template; `harness-local-docker` is replaced by `harness-local-environment`. Setup removes the retired skill, including installs recorded by v0.2.
- ADR 0003's containerized CI quality gate is replaced by `pnpm install --frozen-lockfile` plus the gates in `.github/workflows/app-ci.yml`.
- Host differences can still appear; CI is the arbiter and must stay green before merge.
- Windows users need WSL2 for Docker Desktop, documented in `docs/guia/01-instalacao.md`.
