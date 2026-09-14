# Token-Efficient Execution

Use for long, agent-driven work or when cost and context quality matter.

## Principles

1. **Deterministic first.** Anything a script can do is not agent work: `init-app` scaffolds, `verify` checks, `doctor` diagnoses, `github-protect` configures. They cost no reasoning tokens.
2. **Locate, then read.** Use the `harness-scout` subagent (small model) or targeted search to name files; read excerpts, not trees. Never load `_bmad-output/` or `.harness/memory/` wholesale.
3. **Quiet output.** `verify` prints failure summaries and keeps full logs in `.harness/logs/`. CI reporters are compact (`dot`, `line`). Read a log only around the reported error.
4. **Small always-on context.** `AGENTS.md` holds only rules no mechanism enforces. Every installed skill adds its description to each session, so BMad uses the `essential` profile.
5. **Separate contexts.** Exploration, implementation, and review each get only their inputs: the reviewer receives the diff, acceptance criteria, and risks.
6. **Stable prefix.** Keep `AGENTS.md` and settings stable during a session so prompt caching works; put volatile state in the work item or `handoffs/CURRENT.md`, not in always-loaded files.
7. **Fresh sessions.** Start a new session between unrelated tasks after writing a handoff when needed.

## Communication

Caveman compression is for agent-to-agent handoffs and internal notes. The owner always gets complete, plain sentences: misunderstanding costs more tokens than it saves.

## Measurement

Record provider-reported input, output, and cached tokens for completed work items when the host exposes them (Claude Code `/cost`, `/context`, or `npx ccusage`; Codex `/status`). Compare equivalent completed tasks, not response length.

## Optional: terminal-output compression (RTK)

RTK rewrites common shell commands through a hook and compresses their output. It is not installed by default because it changes what the agent sees. Pilot it in a dedicated work item:

1. Pick three recent, representative tasks and record their token usage.
2. Install RTK (`brew install rtk`) and enable its hook for the chosen agent following the RTK documentation.
3. Repeat equivalent tasks; confirm exit codes, failing test names, and file paths remain visible.
4. Keep it only if completed-task tokens drop without hidden failures. Record the result as an ADR.

## Optional: semantic code navigation

For a large codebase, a symbol-level tool (for example Serena via MCP, or the agent's LSP integration) can replace broad file reads. Small projects rarely benefit; evaluate with the same measurement procedure before adopting.
