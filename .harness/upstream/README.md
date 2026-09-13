# Upstream planning bridge

Use BMad to discover, plan, and prepare work before implementation. BMad artifacts live in `_bmad-output/`; this directory contains only approved downstream handoffs, not copies of product documents.

## Entry rule

For non-trivial work, downstream implementation begins only after an approved handoff exists under `approved/`. A small, clear, low-risk fix may enter directly through a proportional work item.

## Source of truth

- Product intent: linked BMad artifact.
- Implementation, tests, migrations, review, and release evidence: Harness work item and repository artifacts.
- If these conflict, pause implementation and update the upstream source first.

## Context-loading policy

The approved handoff is the downstream context boundary. A downstream agent starts with the handoff, the scoped work item, and the repository context required for the change; it does not load `_bmad-output/` by default.

The source may be consulted only to resolve a decision that is missing from the handoff, conflicts with downstream evidence, or affects a high-risk boundary such as authorization, data migration, or an irreversible operation. Search for the mapped heading, read the smallest useful section, and record the source path, heading, and concise conclusion in the work item or refreshed handoff. Never paste or recursively load a large BMad artifact into an implementation prompt.
