# ADR 0005: Use BMad as the upstream planning layer

## Status

Accepted — 2026-09-13

## Context

The Harness needs a clear separation between deciding what to build and safely implementing it. BMad supplies specialized planning skills and artifact flow; the Harness supplies repository-specific delivery controls such as TDD, Docker, database stewardship, security, pull requests, and deployment.

## Decision

- Use installed BMad skills as the upstream planning layer for non-trivial product work.
- Size the upstream path to the work: direct intent for a small clear change; `bmad-spec` for a bounded feature; product brief/PRD, UX, architecture, epics/stories, and sprint planning for project-scale work.
- Run BMad workflows in fresh chats and retain their source artifacts under `_bmad-output/`.
- Before implementation, create an approved Harness upstream handoff that links the BMad artifacts and extracts only the implementation contract: outcome, non-goals, acceptance criteria, UX states, architecture decisions, data/access impact, dependencies, risks, and approval.
- Downstream implementation consumes the approved handoff plus the scoped work item. It does not rewrite product intent; changes that invalidate upstream decisions return upstream through BMad correction or an updated approved artifact.

## Boundary

| Layer | Owns | Does not own |
| --- | --- | --- |
| Upstream: BMad | discovery, product intent, requirements, UX intent, architecture choices, story readiness | implementation evidence, production release, and operational controls |
| Downstream: Harness | TDD, Docker execution, database review, Supabase security, PR checks, deployment evidence, memory | silently redefining approved product intent |

## Consequences

- BMad remains optional for trivial low-risk edits; do not force a full PRD for every small correction.
- Larger work cannot enter implementation with an ambiguous handoff. The owner resolves missing product decisions upstream.
- BMad output is not duplicated into the Harness. The handoff is a concise pointer and delivery contract, reducing context and drift.
- BMad installation is project-local and includes BMM stable skills for Codex, Claude Code, Cursor/VS Code through `.agents/skills`, and Cline.

## Evidence

- [BMad planning paths](https://docs.bmad-method.org/cs/plan/choose-a-planning-path/)
- [BMad story readiness and tracking](https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/)
- [BMad build workflow](https://docs.bmad-method.org/cs/build/build-a-change/)
- `.harness/workflows/upstream-bmad.md`
