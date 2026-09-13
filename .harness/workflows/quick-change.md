# Quick Change Workflow

Use for a clear, low-risk change with a narrow scope.

1. Classify the change as `direct` only when its intent, footprint, and reversibility are clear and low risk. Otherwise classify it as `session` and record a readiness verdict in the work item.
2. Create `.harness/work-items/<id>.md` from the work-item template. Record intent gaps, irreversible actions, footprint, and any condition required to proceed.
3. Confirm the acceptance criteria, affected files, and configured checks.
4. Write the smallest test that demonstrates the requested behavior, then run it and record its intended failure.
5. Implement the smallest coherent change that makes the focused test pass.
6. Refactor only while the focused test and relevant suite remain green.
7. Run relevant checks and record their exact outcome.
8. Request a fresh-context independent review when security, data access, a public interface, or non-trivial behavior is involved.

When BMad is available, a `session` change maps to `bmad-spec` followed by `bmad-build`; use `bmad-code-review` for the independent review gate.
