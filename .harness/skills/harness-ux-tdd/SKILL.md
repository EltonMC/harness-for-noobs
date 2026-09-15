---
name: harness-ux-tdd
description: Build or change a React interface with behavior-first tests, accessible interaction states, and visual-system consistency. Use for screens, components, user flows, and interface refinements.
---

Read `.harness/context/code-conventions.md`, the relevant `.harness/design/` artifacts, the work item, and the components you will touch. If `.harness/design/DESIGN.md` still says "To be defined" and this is a substantial new surface, run `harness-design-system` (with Impeccable when installed) to capture the owner's visual direction before coding.

1. Define the user job, primary action, and loading, empty, error, success, and disabled states in the work item's UX contract.
2. Reuse before creating: look for an existing component in `src/shared/` or the feature, and for message keys in `src/shared/i18n/messages.ts`.
3. Before implementation, write the smallest tests for observable behavior with `renderRoute` and `user` from `@/test/render`: accessible names and roles, main interaction, each state from step 1, validation and error recovery, and keyboard behavior when applicable. Look copy up with `translate(...)`. Fake the server by mocking the feature's `api` module. Use a focused E2E test for the critical cross-component flow.
4. Add `await expectNoAccessibilityViolations(container)` from `@/test/accessibility` to each new screen or interactive component test.
5. Run the focused test and record the expected failure, then implement the minimum interface that makes it pass: semantic elements, all copy through `translate`, errors through `userErrorMessageKey`, server data through TanStack Query hooks.
6. Verify responsive behavior and use real or representative content. Add screenshot or visual-regression evidence only where hierarchy, layout, or styling is materially risky.
7. When Impeccable is installed, use its audit or critique workflow for substantial visual work. Treat findings as review input; preserve approved product and design-system decisions.
8. Record red/green/refactor evidence, accessibility checks (axe unit and E2E), E2E result, and visual review outcome in the work item.

Do not substitute snapshots or a visual audit for behavior, accessibility, or user-flow tests.
