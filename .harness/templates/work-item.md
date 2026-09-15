# <id>: <short outcome>

<!-- Fill only what applies. Delete sections marked "if applicable" when they do not. Keep evidence to one line per item; full logs stay in .harness/logs/. -->

## Outcome

What the user can do when this is done, in one or two sentences.

## Gate

- Size: session / story / epic — source: <approved handoff path or direct request>
- Intent gaps: none / decisions the owner must make
- Irreversible actions: none / what needs explicit approval
- Footprint: modules, interfaces, data, authorization, deployment touched; files to add or change (per `.harness/context/code-conventions.md`) and existing code to reuse
- Readiness: PASS / CONCERNS (accepted condition: …) / FAIL

## Acceptance criteria

- [ ] Observable result.

## Scope

- In scope:
- Explicit non-goals:

## Data and authorization (if applicable)

- Tables, RLS, Storage, Auth, RPC, Edge Functions:
- Access matrix and DBA review:
- Allow/deny tests:

## Security (if applicable)

<!-- Sign-in, personal data, payments, uploads, admin actions, third-party services, or Edge Functions. See .harness/context/security-patterns.md. -->

- Protecting: data, accounts, money, availability:
- Abuse cases (who, how; STRIDE prompts):
- Mitigations and the test that proves each:
- New third-party origins added to `public/_headers`:

## UX contract (if applicable)

- User job and primary action:
- Loading, empty, error, success, disabled states:
- Keyboard and screen-reader behavior:

## Evidence

- Files changed:
- Red: `<command>` → <expected failure, one line>
- Green: `<command>` → <result>
- Quality: refactor checklist done; Knip clean; coverage <lines %> (thresholds unchanged); accessibility checks <axe unit / E2E / not applicable>
- Verify: `npm run harness -- verify` → <Tudo verde / failures fixed>
- Review: `harness-code-reviewer` / <other reviewer> → <findings and disposition> / not required because …
- Course correction: not needed / upstream artifact updated and readiness rerun
- Remaining risks:
- Memory consulted / captured:
