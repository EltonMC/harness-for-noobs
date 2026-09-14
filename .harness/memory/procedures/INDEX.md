# Procedures

Repeatable procedures live in `.harness/workflows/`; this page routes to them. Add a page here only for a project-specific procedure that no workflow covers.

| Topic | Canonical source | Use when |
| --- | --- | --- |
| Branch, PR, merge, release | `.harness/workflows/git-pr-production.md` | sharing or releasing work |
| Database change review | `.harness/workflows/database-change-review.md` | proposing or releasing schema changes |
| Local environment | `.harness/workflows/local-development.md` | running or fixing the local stack |
| Skill source maintenance | `.harness/workflows/skill-source-maintenance.md` | updating BMad, Impeccable, Caveman |
| Harness updates | `.harness/workflows/harness-update.md` (owner guide: `docs/guia/07-atualizando-o-harness.md`) | applying an update PR or issue, resolving update conflicts |

Keep secrets, raw command output, and time-sensitive account details out of memory.
