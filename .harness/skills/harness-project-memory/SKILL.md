---
name: harness-project-memory
description: Retrieve or capture durable project knowledge for a task, resumption, or cross-agent handoff. Use when continuing prior work, discovering a reusable constraint, or preserving a verified decision or gotcha.
---

Use `.harness/memory/` as a versioned LLM Wiki.

## Retrieve

1. Read `INDEX.md`, then search the memory tree with the task's domain terms.
2. Read only the matching pages and their directly linked evidence.
3. Treat code, migrations, and accepted ADRs as canonical when they conflict with memory.

## Capture

Create or update a typed page only for a durable decision, verified gotcha, repeatable procedure, or active handoff. Use `TEMPLATE.md` and keep the summary, evidence, consequence, and status concise.

Never copy chat transcripts, raw command output, credentials, personal data, or unverified conclusions. Mark obsolete information as superseded and link its replacement.

## Handoff

When work changes agent or pauses materially, replace `handoffs/CURRENT.md` with the work item, verified state, open questions, smallest next step, and evidence paths. Clear or archive it when the work is complete.
