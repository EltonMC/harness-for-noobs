# ADR 0010: Use pnpm with supply-chain safety defaults

## Status

Accepted — 2026-09-13.

## Context

An owner with little experience cannot evaluate whether a new dependency version is malicious, and agents add dependencies readily. npm runs every dependency's install scripts by default and installs versions minutes after publication.

## Decision

- The application template uses pnpm, pinned through `package.json#packageManager`; `doctor` requires pnpm 10+ so the pinned version is used automatically.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (three days) and `strictDepBuilds: true` with an explicit `allowBuilds` list (`esbuild`, `workerd`).
- Dependency versions in the template are exact. Dependabot proposes updates weekly with a seven-day cooldown.
- The Harness scripts themselves have zero dependencies and run with plain Node.

## Consequences

- A freshly published version fails to install until it ages; the owner can wait or explicitly add a reviewed exclusion.
- A new dependency with an install script fails the install until a person approves it in `allowBuilds`.
- Agents ask before `pnpm add`/`pnpm install` (Claude Code permission `ask`).
