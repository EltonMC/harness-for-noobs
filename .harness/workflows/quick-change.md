# Quick Change Workflow

Use for a clear, low-risk change with a narrow scope.

1. Classify: `direct` only when intent, footprint, and reversibility are clear and low risk (text, style, obvious one-line fix). Otherwise it is `session`.
2. Branch: stay on the current work branch, or `git switch -c fix/<name>` when on `main` (never commit to `main`).
3. `direct`: no work-item file; the commit message states the outcome. `session`: create a work item from `.harness/templates/work-item.md`.
4. Write the smallest test that demonstrates the behavior when behavior changes; run it and confirm the intended failure. Pure copy or style changes need no new test but must keep the suite green.
5. Implement the smallest coherent change following `.harness/context/code-conventions.md`; refactor only with tests green, using its refactor checklist.
6. `npm run harness -- verify`.
7. Request a fresh-context review from the `harness-code-reviewer` subagent when security, data access, a public interface, or non-trivial behavior is involved.
8. Deliver with `harness-git-pr-delivery`.

When BMad is available, a `session` change may use `bmad-spec` then `bmad-build`; use `harness-code-reviewer` (or `bmad-code-review`) for the review gate.
