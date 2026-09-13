---
name: harness-feature-delivery
description: Deliver a React and Supabase feature through a scoped work item, verification evidence, and review-ready handoff. Use when implementing a feature, bug fix, or behavior change in this repository.
---

Use `.harness/harness.yaml` to locate the current project context and artifact paths.

1. Size the work before implementation: `direct` for a clear, low-risk correction; `session` for one bounded outcome; `story` or `epic` for upstream-planned work. Do not use a smaller label merely to bypass a gate.
2. If the change does not have a work item, create one from `.harness/templates/work-item.md`. Record intent gaps, irreversible actions, footprint, and a `PASS`/`CONCERNS`/`FAIL` readiness verdict for non-trivial work. `FAIL` blocks implementation; `CONCERNS` need owner-accepted conditions.
3. For upstream-backed work, start from the approved handoff and work item, not the complete `_bmad-output/` artifact. Consult the smallest mapped source section only for an unresolved decision, conflict, or high-risk boundary, then record the source path, heading, and concise conclusion.
4. Search `.harness/memory/` for the feature's domain terms and read only relevant entries, then read the project context and relevant architecture decisions before changing code.
5. Write source code and developer-facing technical text in English: identifiers, paths, tests, comments, logs, API/database names, and errors. User-facing copy follows the documented product locale; translation keys remain English.
6. For database construction or alteration, use `harness-database-steward` and attach an approved database change proposal and review report to the work item before implementation.
7. For Supabase client-access changes, update `.harness/context/access-matrix.md` first. Include grants, RLS policies, and allow/deny tests in the same work item.
8. Before production code, add or modify the smallest behavior-focused test and run it to demonstrate the intended failure. Record the command and result.
9. Implement the minimum change that makes the focused test pass, then refactor only with the relevant suite green.
10. Run the relevant configured checks. Do not invent commands marked `unset`; identify the project tooling first and update the harness configuration when it is established.
11. Require a fresh-context independent review before PR for non-trivial, security, data, authorization, migration, or public-interface changes. Use `bmad-code-review` when available and record the findings and disposition.
12. If downstream invalidates a requirement, UX, or architecture decision, stop and route it upstream. Refresh the approved handoff and readiness result before continuing.
13. Record files changed, red/green/refactor evidence, commands run, results, risks, review findings, and relevant memory use in the work item.
14. Capture a concise memory entry only when the change establishes a durable decision, gotcha, procedure, or handoff. Update an older conflicting entry rather than adding duplicate guidance.

If BMad is installed, consume its current spec, architecture, and story artifacts instead of recreating them. Use `bmad-build` for implementation and `bmad-code-review` for a separate review when their workflows fit the change.
