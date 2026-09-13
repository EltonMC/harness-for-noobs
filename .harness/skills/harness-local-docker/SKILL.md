---
name: harness-local-docker
description: Scaffold or change the local Docker Compose development and CI build boundary for this repository. Use for Dockerfiles, Compose files, local runtime commands, test containers, or production-build parity.
---

Read `.harness/workflows/local-development.md` and the current work item before changing container configuration.

- Keep the application, dependencies, tests, and production build inside Docker. Do not add a host-only Node workflow.
- Use a multi-stage Dockerfile with distinct development, test, and build targets. Rebuild from the lockfile in CI.
- Keep development conveniences (bind mounts, watch mode, debugging) out of the release build.
- Keep production secrets out of images, Compose files, logs, and committed environment files.
- Treat Supabase local services as disposable. Use migrations and seed scripts for reproducible state.
- Validate changed Compose configuration, then run the smallest relevant containerized test and build command. Record results in the work item.
- Cloudflare production receives verified static assets, not a long-running Compose stack. Do not claim container parity eliminates all deployment risk.
