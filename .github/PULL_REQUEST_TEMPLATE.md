## Outcome

Explain the user-visible change in plain language.

## Evidence

- [ ] Readiness is `PASS`, or accepted `CONCERNS` are recorded in the work item
- [ ] Intent gaps, irreversible actions, and footprint are recorded
- [ ] TDD red evidence recorded in the work item
- [ ] Focused test passed
- [ ] Relevant Docker-based checks passed
- [ ] Build completed from a clean container
- [ ] Visual or accessibility evidence attached when the UI changed

## Risk and rollback

- User, security, performance, or deployment risk:
- Rollback or forward-fix approach:

## Supabase impact

- [ ] No Supabase change
- [ ] DBA proposal and review report included for a schema change
- [ ] Migration included and compatible with the previous application version
- [ ] RLS allow/deny evidence included
- [ ] Storage, Auth, RPC, or Edge Function impact described

## Reviewer checklist

- [ ] Scope matches the work item
- [ ] Code and developer-facing text are in English
- [ ] No secrets, local volumes, or generated files are committed
- [ ] CI is green and conversations are resolved
- [ ] Independent review completed when required, with findings disposition recorded
