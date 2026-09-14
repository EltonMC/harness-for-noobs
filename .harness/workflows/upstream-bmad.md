# BMad upstream planning flow

## Select the smallest safe BMad path

| Work shape | Upstream path |
| --- | --- |
| Trivial, low-risk correction with clear intent | Direct Harness work item; BMad optional |
| One bounded feature | `bmad-spec`, then approved handoff |
| Vague idea or uncertain value | `bmad-brainstorming`, then `bmad-product-brief`, then decide whether to continue |
| Product or several epics | `bmad-product-brief` → `bmad-prd` → `bmad-ux` when relevant → `bmad-architecture` → stories → `bmad-sprint-planning` |

## Handoff gate

1. Run each BMad workflow in a fresh chat.
2. Keep the BMad artifact as the source of intent in `_bmad-output/`.
3. Resolve intent gaps, irreversible actions, and scope questions with the owner.
4. For project work, require a BMad readiness result that is not `FAIL` before selecting a story.
5. Create an approved Harness handoff that links the source, states only the downstream contract, and maps any source decision that may need later retrieval.
6. Treat the handoff as the downstream context boundary. Do not load `_bmad-output/` by default; resolve a decision gap, conflict, or high-risk boundary by searching for and reading only the mapped source section.
7. Record the consulted path, heading, and concise conclusion in the work item or a refreshed handoff. Do not copy source sections or replay a planning transcript.
8. Create the downstream work item. It applies TDD, local environment, DBA, security, PR, and deployment rules.

The Harness installs the BMad `essential` skill profile (see `.harness/skill-sources.lock.json`). Research, PRFAQ, persona, and party skills are not installed by default.

## Course correction

If implementation discovers a product, UX, or architecture decision that invalidates the handoff, stop and route it upstream. Use BMad correction or update the authoritative artifact; do not patch the requirement only in a migration, code comment, or PR discussion.
