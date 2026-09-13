# Work Item: establish the frontend hosting architecture

## Outcome

Make Cloudflare Workers Static Assets the documented deployment default for the React + Vite SPA, with Supabase as the backend and privileged logic boundary.

## Acceptance criteria

- An accepted ADR records the decision, alternatives, scope, and consequences.
- The Harness context, configuration, agent instructions, and memory route agents to that ADR.
- A tool-neutral deployment workflow defines preconditions, verification, and edge escalation.

## Scope

- Documentation and Harness configuration only.
- No Cloudflare account, production deployment, React scaffold, or Supabase resource was created or changed.

## Data and RLS impact

None. The existing rule remains: browser access uses only public configuration and Supabase RLS; privileged credentials remain server-side.

## TDD evidence

Not applicable: this is an architecture-documentation change, not a product feature or executable behavior. The next React feature must follow the required red-green-refactor workflow.

## Verification

- YAML configuration parses successfully.
- Internal ADR, workflow, and memory links resolve to committed repository paths.

## Risks and follow-up

- The exact deploy commands remain unset until the Vite project and package manager are scaffolded.
- Any future SSR or Cloudflare Worker API requires a separate architecture work item.
