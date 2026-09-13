# Local development with Docker Compose

## Goal

Give every developer and agent the same Linux-based runtime, dependency versions, tests, and build behavior without requiring a host Node installation.

## Required scaffold artifacts

- `Dockerfile` with `development`, `test`, and `build` stages;
- `compose.yaml` for local development, with source synchronization and named dependency volumes where appropriate;
- `.dockerignore` that excludes dependencies, build output, secrets, and VCS metadata not needed in an image;
- the package-manager lockfile;
- documented Compose commands in `package.json`, `README.md`, and `.harness/harness.yaml`.

## Everyday flow

1. Start Docker Desktop.
2. Run the documented Compose start command; use the Vite development container for hot reload.
3. Run unit, integration, lint, type, and build checks through Compose, not a host-installed Node runtime.
4. Use the local Supabase stack for integration paths. Treat it as disposable and seed it through versioned scripts or migrations.
5. Stop the stack when finished. Reset local data only with an explicit command that names the target.

## Production-like verification

Before a pull request is ready, CI must build the release target from the lockfile, run the configured checks in a clean container, and validate the generated static bundle. The deployment job consumes that verified output; it does not rebuild an unreviewed working tree.

## Boundaries

- Do not place production secrets in Compose files, bind mounts, images, or committed `.env` files.
- Do not use Docker Compose as the Cloudflare production runtime. Cloudflare receives the built static assets.
- Do not claim Docker guarantees production behavior. It controls runtime and dependency drift; tests, build checks, staged rollout, monitoring, and rollback address the remaining risks.
