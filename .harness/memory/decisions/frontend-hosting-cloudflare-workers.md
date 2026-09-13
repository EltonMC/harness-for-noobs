# Frontend hosting on Cloudflare Workers

## Type

Decision

## Summary

The React + Vite frontend is a static SPA hosted on Cloudflare Workers Static Assets. Supabase remains the backend and privileged server boundary through Edge Functions unless an accepted work item justifies edge code elsewhere.

## Evidence

- `docs/decisions/0001-frontend-hosting-cloudflare-workers.md`
- `.harness/workflows/frontend-deployment.md`

## Consequence

Keep client routes and assets static. Do not add SSR, a Cloudflare Worker API, or privileged browser configuration without a scoped, tested architecture change.

## Status

Active
