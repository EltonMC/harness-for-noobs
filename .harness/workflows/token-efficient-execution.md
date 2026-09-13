# Token-Efficient Execution

Use this workflow for long, agent-driven work or when cost and context quality matter.

1. Start from one work item. Search `.harness/memory/` for its domain terms, then load only matching pages, linked context, affected files, and current evidence.
2. For upstream-backed work, load the approved handoff rather than `_bmad-output/`. Use its source map only for an unresolved decision, conflict, or high-risk boundary; retrieve the smallest relevant section and retain only a concise conclusion with its path and heading.
3. Use a scout only to identify files, symbols, and commands. Its handoff is paths plus concise findings, never copied files or raw logs.
4. Give the implementer the work item, focused context, and scout handoff. Do not replay the exploration conversation.
5. Give a reviewer the diff, acceptance criteria, changed tests, and risks. Do not send the entire implementation transcript.
6. Persist durable decisions in the project context or an ADR; discard transient exploration after its conclusion is captured.
7. Record provider-reported input, output, reasoning, and cached tokens when the host exposes them. Compare completed work items, not isolated response length.
8. At a tool or session boundary, replace `memory/handoffs/CURRENT.md` with a concise, evidence-linked continuation note. Capture only durable discoveries in the typed memory folders.

Do not add a skill simply because it promises token savings. Add it only when it eliminates repeated discovery, context, or work in this repository.

## Optional terminal-output filtering

Tools such as RTK may reduce the terminal output an agent reads, but that does not directly measure total model-token or billing savings. Do not install one by default. Pilot it only in a dedicated work item with an unchanged task set, preserved exit codes and access to full logs, and provider-reported token measurements when the host exposes them. Keep it only when completed-task evidence shows a benefit without hiding failures.
