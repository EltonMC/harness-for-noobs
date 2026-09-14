# ADR 0003: Use Docker, protected pull requests, and CI-only production deployments

## Status

Accepted — 2026-09-13. Superseded in part by ADR 0009: the "Local and CI execution" section and every mention of containerized CI checks or container configuration validation (CI now installs from the lockfile on a fresh runner). Per-PR previews now exist (`app-ci.yml`), and production verification runs before migrations (`app-deploy.yml`). Guardrail enforcement is extended by ADR 0012.

## Context

The project needs a friendly workflow for a developer with limited Git and deployment experience. It must keep local development reproducible, prevent direct unreviewed production changes, and preserve the existing Cloudflare static-hosting decision.

## Decision

### Local and CI execution

- The React application, test tools, and build run inside Docker containers through Docker Compose.
- The scaffold will provide a multi-stage `Dockerfile`: `development`, `test`, and `build` targets. CI uses the test and build targets; it does not trust a developer's host Node installation.
- The local command surface is intentionally small: start, test, lint, type-check, build, stop, and reset. Each command has a documented `docker compose` equivalent.
- Supabase local services use the official local stack backed by Docker. Local data is disposable; remote development and production data are never used as a development dependency.
- Docker is a build and verification boundary, not the production runtime. CI deploys the verified Vite static output to Cloudflare Workers Static Assets.

### Source control and pull requests

- GitHub is the default remote host when the user creates the repository. The Harness remains portable because branch, PR, and CI concepts are not GitHub-specific.
- `main` is protected: no direct push, no force push, pull request required, conversations resolved, and required checks green.
- Each feature starts from a short-lived branch named `feature/<work-item>` or `fix/<work-item>` and has one scoped pull request.
- Use squash merge to keep the history readable for a new Git user. Delete the branch after a successful merge.
- The pull request template requires an outcome, test evidence, visual evidence when relevant, migration impact, rollback notes, and a plain-language review checklist.

### Deployment approval and environments

- Pull request CI runs the containerized quality gate: formatting/lint, type-check, behavior tests, build, container configuration validation, and targeted E2E checks when configured.
- Production deployment is CI-only and can run only from the protected `main` branch after the approved PR merges. No local `wrangler deploy` targets production.
- Store the least-privileged Cloudflare deploy token and account ID only in CI secrets. The production job uses a GitHub `production` environment and serializes deployments.
- In the initial solo-owner phase, the human approval is the owner's explicit review and merge of a passing PR. A second maintainer enables a required independent PR approval and a protected-environment reviewer. Do not enable a required independent reviewer while one person is the only maintainer; it would block every release.
- A later staging/preview environment is desirable but not a prerequisite for the first small release. It becomes required before changes with migration, payment, data loss, or other elevated risk.

### Database compatibility

- A pull request that changes Supabase schema, Auth, Storage, RPC, or Edge Functions must include migrations, RLS allow/deny tests, a rollback or forward-fix plan, and a compatible deploy order.
- Use expand/contract migrations: release additive database changes first, deploy code that supports old and new shapes, and remove obsolete structures only in a later approved PR.

## Rationale

Docker makes the dependencies and build environment reproducible across a laptop and CI. GitHub protected branches and status checks make the review/merge boundary visible. CI-only deployment prevents credentials and production deploy commands from being scattered across local machines.

## Consequences

- Docker Desktop is a required local prerequisite.
- The initial scaffold must provide the Dockerfile, Compose files, `.dockerignore`, lockfile, health checks where applicable, and concrete Harness commands before feature work starts.
- CI configuration is created only after the repository exists and the actual commands can be executed. All third-party Actions must be pinned to full commit SHAs and granted least privilege.
- GitHub plan capabilities vary for private repositories. Before enforcing protected-environment reviewers, verify the selected GitHub plan and whether the repository is public or private.

## Evidence

- [GitHub protected branch rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub deployment environments and reviewers](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Docker Compose production guidance](https://docs.docker.com/compose/how-tos/production/)
- [Cloudflare Workers GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- `.harness/work-items/2026-09-13-docker-git-pr-governance.md`
