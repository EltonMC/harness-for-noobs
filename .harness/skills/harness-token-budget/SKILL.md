---
name: harness-token-budget
description: Plan and execute a repository task with a bounded, reusable context and concise agent handoffs. Use for long-running work, multi-agent work, or when token usage needs to be measured or reduced.
---

Read `.harness/workflows/token-efficient-execution.md` and the current work item.

- Search `.harness/memory/` by task terms, then load only matching pages, linked project context, decisions, affected files, and current verification evidence.
- For upstream-backed work, load the approved handoff and work item, not `_bmad-output/`. Retrieve a single mapped source section only for an unresolved decision, conflict, or high-risk boundary; capture its path, heading, and concise conclusion.
- Keep exploration, implementation, and review handoffs separate. Persist conclusions, not transcripts or raw logs.
- Use a second agent only for independent work that avoids duplicated file reading or testing.
- Return concise evidence: changed paths, commands, results, risks, and next state.
- If the host reports usage, record input, output, reasoning, and cached tokens in the work item. Do not infer savings from shorter prose alone.
- At an agent or session change, write an evidence-linked, compact continuation note in `.harness/memory/handoffs/CURRENT.md`.
