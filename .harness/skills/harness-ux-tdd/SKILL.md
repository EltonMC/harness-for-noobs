---
name: harness-ux-tdd
description: Build or change a React interface with behavior-first tests, accessible interaction states, and visual-system consistency. Use for screens, components, user flows, and interface refinements.
---

Read the relevant `.harness/design/` artifacts, work item, and component context. If product or visual direction is undefined for a substantial new surface, capture the missing decision before coding.

1. Define the user job, primary action, and loading, empty, error, success, and disabled states in the work item.
2. Before implementation, write the smallest tests for observable behavior: accessible names and roles, main interaction, validation/error recovery, and keyboard behavior when applicable. Use a focused E2E test for the critical cross-component flow.
3. Run the focused test and record the expected failure, then implement the minimum interface that makes it pass.
4. Verify responsive behavior and use real or representative content. Add screenshot or visual-regression evidence only where hierarchy, layout, or styling is materially risky.
5. When Impeccable is installed, use its audit or critique workflow for substantial visual work. Treat findings as review input; preserve approved product and design-system decisions.
6. Record red/green/refactor evidence, accessibility checks, E2E result, and visual review outcome in the work item.

Do not substitute snapshots or a visual audit for behavior, accessibility, or user-flow tests.
