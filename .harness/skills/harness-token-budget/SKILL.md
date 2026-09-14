---
name: harness-token-budget
description: Plan and execute a repository task with a bounded, reusable context and concise agent handoffs. Use for long-running work, multi-agent work, or when token usage needs to be measured or reduced.
---

Read `.harness/workflows/token-efficient-execution.md` and the current work item.

- Prefer deterministic commands over agent work: `npm run harness -- init-app`, `verify`, `doctor`, and `check` cost no reasoning tokens and print only what matters.
- Locate before reading: use the `harness-scout` subagent (small model) or targeted search, then open excerpts of the named files only.
- Load the approved handoff and work item, not `_bmad-output/`; retrieve one mapped section only for an unresolved decision.
- Never paste full logs. Read the failure summary from `verify`; open `.harness/logs/<step>.log` only around the reported error.
- Separate exploration, implementation, and review contexts. Reviewers get the diff, acceptance criteria, and risks — not the transcript.
- Caveman compression is for agent-to-agent handoffs and internal notes only. Talk to the person in clear, complete sentences.
- Start a fresh session (`/clear`) between unrelated tasks; write `.harness/memory/handoffs/CURRENT.md` first when work continues.
- When the host reports usage (Claude Code `/cost` or `/context`, `ccusage`, Codex `/status`), record input, output, and cached tokens in the work item. Compare completed tasks, not response length.
