---
name: harness-upstream-bmad
description: Route an idea or planned change through the installed BMad Method and produce an approved, concise handoff for downstream implementation. Use for discovery, product requirements, UX intent, architecture planning, specs, stories, or implementation readiness.
---

Read `.harness/workflows/upstream-bmad.md` and `.harness/upstream/README.md` before starting.

1. Size the work and select the smallest BMad planning path that safely fits it. Do not require a full PRD for a trivial, clear, low-risk correction.
2. Run BMad workflows in fresh chats. Keep their source output under `_bmad-output/`; do not duplicate those artifacts in the Harness.
3. Ask the owner to resolve intent gaps, irreversible actions, product ambiguity, and unresolved risks. Do not turn those into downstream implementation guesses.
4. After approval, create one upstream handoff from `.harness/templates/upstream-handoff.md`. Link the BMad artifacts, extract only the delivery contract, and add an on-demand source map for decisions that may need later retrieval.
5. The approved handoff and scoped work item are the downstream context boundary. Do not load `_bmad-output/` by default. Consult only the smallest mapped source section for an unresolved decision, conflict, or high-risk boundary; record its path, heading, and concise conclusion.
6. Route the approved handoff to a proportional Harness work item. Select UX, database, Supabase security, Docker, and Git/PR skills only when their boundaries are actually affected.
7. If downstream discoveries invalidate the contract, stop and send the decision upstream. Update the source artifact and handoff before resuming.

The BMad artifacts own product intent. The Harness owns implementation evidence, repository governance, and deployment controls.
