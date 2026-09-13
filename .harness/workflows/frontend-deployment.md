# Frontend deployment: Vite SPA to Cloudflare Workers Static Assets

## Scope

This is the default deployment path for the React frontend. It is tool-agnostic: any editor, local shell, CI service, or coding agent may execute it after the commands are defined in `package.json` and `.harness/harness.yaml`.

## Preconditions

- The application has a passing behavior, type, and build suite.
- The production Supabase project, URL, and publishable client credential are known.
- The Cloudflare account, custom domain, and Wrangler authentication are configured outside the repository.
- No privileged Supabase credential is present in Vite environment variables or the generated static bundle.

## Deploy contract

1. Run the configured lint, type-check, test, E2E, and build commands.
2. Deploy the generated Vite static assets with Wrangler.
3. Configure SPA fallback so client-side routes resolve to the application shell.
4. Verify the production URL, authenticated route, unauthenticated route, and one RLS-protected data path.
5. Record the deployment identifier, commands, results, rollback target, and any Supabase migration dependency in the relevant work item.

## Edge escalation

Add Worker code only when the work item names an edge/server responsibility that cannot safely live in the static SPA or a Supabase Edge Function. The work item must include its request boundary, secret handling, behavior tests, observability, cost impact, and rollback approach.

## Portability rule

The deploy artifact is the Vite build output, not an IDE- or agent-specific integration. Keep deployment configuration under version control and run it through headless commands.
