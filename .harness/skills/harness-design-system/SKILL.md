---
name: harness-design-system
description: Capture or evolve the product context, visual system, and route-specific design briefs used by agents in this repository. Use when establishing visual direction, introducing shared UI patterns, or preventing design drift across features.
---

Use `.harness/design/` as the canonical design context.

- Update `PRODUCT.md` for audience, user job, voice, constraints, and named references. Do not invent missing product truth.
- Update `DESIGN.md` only with approved, reusable visual decisions: semantic tokens, typography, layout, components, states, and motion.
- Add a surface brief only when a route or workflow has a different user job or visual direction from the project default.
- Link decisions to work items or implementation evidence. Remove or mark superseded guidance when the approved design changes.
- Keep design context concise. It guides future agents; it is not a catalog of every CSS value or a record of brainstorming.
