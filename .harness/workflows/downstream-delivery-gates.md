# Downstream delivery gates

## 1. Size the work

| Size | Use when | Entry evidence |
| --- | --- | --- |
| `direct` | clear, reversible, low-risk correction with narrow footprint | direct-intent rationale in the work item |
| `session` | one bounded outcome that can be built and reviewed coherently | readiness verdict plus TDD plan |
| `story` | an approved upstream story with acceptance criteria | approved handoff, readiness, and work item |
| `epic` | several dependent stories or cross-cutting decisions | upstream planning artifacts, stories, and readiness |

Do not downgrade a change to bypass a gate.

## 2. Readiness

- `PASS`: outcome, acceptance criteria, authorization, dependencies, tests, and risks are sufficiently understood.
- `CONCERNS`: implementation may begin only after the owner accepts named conditions and they are recorded.
- `FAIL`: a material intent gap, unsafe irreversible action, unknown dependency, or unapproved risk blocks implementation.

## 3. Record the decisions before code

The work item records:

- **intent gaps** — outcomes that would surprise the owner if guessed incorrectly;
- **irreversible actions** — production deploys, destructive data changes, external messages, or other decisions that need explicit approval;
- **footprint** — modules, interfaces, data, authorization, operations, and deployment surfaces affected.

## 4. Correct course

Stop downstream work when a discovery changes an approved requirement, UX decision, architecture boundary, or risk level. Route it upstream, update the authoritative source and handoff, then recalculate readiness. A code comment, migration, or PR discussion cannot substitute for this update.

## 5. Review independently

Before PR, conduct a fresh-context review for qualifying changes. The reviewer reads the work item, upstream handoff when present, relevant diff, tests, and risk surfaces; records findings and dispositions. Use the `harness-code-reviewer` subagent, which checks `.harness/context/code-conventions.md`; `bmad-code-review` is an alternative. Retain the Harness work item as the evidence record.

## Deferred practices

Human walkthroughs and epic retrospectives are not required yet.
