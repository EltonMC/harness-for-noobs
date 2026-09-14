# ADR 0011: Distribute and update the Harness with Copier

## Status

Accepted — 2026-09-13.

## Context

Projects were created with `git clone`, which left `origin` pointing at the Harness repository and offered no update path beyond a manual comparison of Harness-owned files — impractical for a newcomer.

## Decision

- Projects are created with `uvx copier@<version> copy gh:EltonMC/harness-for-noobs <folder>`. `uv` is already a prerequisite for BMad.
- Ownership is split so updates can reach Harness content: `.harness/harness.yaml`, memory indexes, `.harness/context/harness-baseline.md`, and the application workflows (`app-ci.yml`, `app-deploy.yml`) are Harness-owned; product configuration moved to `.harness/project.yaml` and product rules to `project-context.md`.
- `copier.yml` excludes Harness development history (year-independent patterns), maintainer-only workflows, and generated installs, and lists product-owned files in `_skip_if_exists` so updates never overwrite them (`README.md`, `package.json`, `.harness/project.yaml`, `project-context.md`, `access-matrix.md`, design, database dictionary, the active handoff).
- Releases are Git tags following SemVer. `.harness/VERSION` holds the version; `CHANGELOG.md` explains each release in Portuguese with a "Precisa fazer algo?" section.
- `.github/workflows/harness-update.yml` runs weekly in generated projects: `copier update --defaults --conflict inline` and Harness self-tests. With the `HARNESS_UPDATE_TOKEN` secret (a fine-grained token with contents, pull requests, and workflows write access) it opens or refreshes a pull request, never overwriting commits people pushed to the update branch. Without the token it opens an issue with instructions, because `GITHUB_TOKEN` cannot push workflow changes and pull requests it opens do not trigger CI.
- Nothing is merged automatically.

## Consequences

- The Harness maintainer must tag releases and keep the changelog current.
- Updates to a product-owned file (for example new `harness.yaml` keys) must be described as a manual step in the changelog.
- Projects created before this ADR can adopt Copier with `copier copy --vcs-ref <tag>` over a clean branch and review the diff.
