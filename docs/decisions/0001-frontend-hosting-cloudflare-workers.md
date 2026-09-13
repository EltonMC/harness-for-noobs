# ADR 0001: Host the frontend as static assets on Cloudflare Workers

## Status

Accepted — 2026-09-13

## Context

The application is small, has low expected traffic, uses React and Supabase, and must stay portable across agent tools and local development environments. Its frontend does not currently require server-side rendering (SSR), a custom backend-for-frontend, or always-on server compute.

## Decision

- Build the frontend with React + Vite as a static SPA.
- Deploy the build output to Cloudflare Workers Static Assets using Wrangler, from CI or a developer machine.
- Use Supabase Auth, RLS, Database, Storage, and Edge Functions for backend responsibilities.
- Keep normal SPA routes as static-asset requests. Add Cloudflare Worker code only for an explicit edge/server concern.
- Expose only public frontend configuration to Vite. `service_role`, database passwords, and other privileged credentials remain in Supabase Edge Functions or another approved server boundary.

## Rationale

Cloudflare serves static assets globally without static-request charges, keeps the initial infrastructure cost near zero, and supports a later edge-function path without requiring a framework migration. Vite produces a portable static build, so the application code is not coupled to a particular editor, agent, or hosting-specific React framework.

## Consequences

- SPA routing must be configured to return the application shell for client routes.
- Dynamic metadata, SSR, proxying secrets, and other server behavior require a separate work item that states why a Cloudflare Worker is needed and how it is tested.
- A future migration away from Cloudflare is low-risk because the primary deploy artifact remains static files.
- The initial scaffold must add actual build, test, type-check, E2E, and deploy commands to `.harness/harness.yaml`.

## Alternatives considered

- **Netlify:** strong deploy ergonomics, but its credit-based limits can pause sites; it is the fallback when that workflow is materially more valuable.
- **Vercel:** appropriate if the product deliberately adopts Next.js and SSR; commercial use requires a paid plan and is not justified for the initial SPA.
- **Firebase, Azure, AWS, and self-managed CDN/storage:** valid in their respective ecosystems, but add cost, operational overhead, or a second backend ecosystem without a current product need.

## Evidence

- [Cloudflare Static Assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare React + Vite deployment guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Research recommendation recorded in this repository](../../.harness/work-items/2026-09-13-frontend-hosting-architecture.md)
