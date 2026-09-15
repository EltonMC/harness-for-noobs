# Application Code Conventions

Harness-owned (ADR 0016). Read before writing or reviewing application code. Product-specific rules go in `project-context.md`. Biome, TypeScript, Knip, coverage, and the Stop hook enforce what they can; the reviewer checks the rest.

## Structure

```text
src/
  app/                  routes, layout, providers, route error and not-found pages
  features/<feature>/   one folder per user-facing domain (kebab-case, e.g. expense-report)
    <Name>Page.tsx      route screen; composes components and hooks
    components/         feature-only components
    hooks/              use-<name>.ts exporting use<Name>: TanStack Query hooks wrapping api functions
    api/                <operation>.ts (e.g. list-expenses.ts): the only place that calls Supabase
    <name>.schema.ts    zod schemas for forms and untrusted input (when needed)
  shared/               code used by two or more features (ui, i18n, errors, formatting)
  lib/                  clients and configuration (supabase, query client, generated types)
  test/                 test helpers (renderRoute, accessibility)
```

- A feature never imports from another feature. Move shared code to `shared/` when the second feature needs it, not before.
- Import across folders with `@/` (for example `@/shared/i18n/translate`); import siblings relatively.
- Component files use PascalCase (`ExpenseList.tsx`); every other file, including hooks, uses kebab-case (`use-expenses.ts`). Tests sit next to the file: `name.test.ts(x)`.
- Named exports only. No barrel `index.ts` files.

## Before writing new code

Search for an existing component, hook, api function, schema, message key, or helper that already does the job (the `harness-scout` subagent reports them). Extend it rather than creating a near-duplicate.

## Data access and server state

- Only `src/features/<feature>/api/*.ts` imports `@/lib/supabase` (Biome blocks it elsewhere). Api functions take typed arguments, return typed data, and throw the Supabase error instead of returning `{ data, error }`.
- Anything read from or written to the server goes through TanStack Query (`useQuery`, `useMutation`) in the feature's `hooks/`. Never fetch in `useEffect` with `useState`.
- Query keys are arrays starting with the feature name: `['expenses', 'list', { month }]`. Invalidate those keys after a mutation.
- Use the generated `Database` types (`pnpm db:types` after every migration, with the Supabase CLI version pinned in `.github/workflows/app-ci.yml`, because the generator output changes between versions). Never hand-write row types or cast Supabase results with `as`.
- Authorization lives in RLS. The UI may hide an action, but never relies on hiding it for security.

## Validation

- Validate with zod at every boundary: form input, URL parameters, `localStorage`, Edge Function payloads, and third-party responses. Derive types with `z.infer`; do not repeat them.
- Show validation messages from the i18n catalog, next to the field, linked with `aria-describedby`.

## User-facing copy (i18n)

- Every string the user sees comes from `translate('<feature>.<key>')`. Add keys to `src/shared/i18n/messages.ts` for every locale in the catalog; the compiler rejects a missing one.
- Format dates, numbers, and currency with `Intl` and `productLocale`, never by hand.
- Tests look copy up with `translate(...)` instead of repeating the text.

## Errors and states

- Every screen that loads data renders loading, empty, error, and success states; every action has disabled and pending states.
- Show errors with `translate(userErrorMessageKey(error))`. Never render `error.message`: it is not localized and can expose table or policy names.
- Route loaders and components that throw reach `RouteErrorPage`. Do not swallow errors with an empty `catch`.
- Only `console.error` and `console.warn` are allowed, and never with personal data or tokens.

## React and TypeScript

- No `any`, non-null assertions (`!`), or `as` casts on external data; narrow with zod or type guards.
- Components stay presentational where possible: data from hooks, behavior in hooks or pure functions that are easy to test.
- Keep effect dependencies exhaustive. Prefer derived values and event handlers to `useEffect`.
- Accessible first: semantic elements (`button`, `a`, `label`, headings in order), an accessible name for every control, visible focus, keyboard operation. `div` with `onClick` is a bug.
- Cognitive complexity above 15 fails lint: extract a function or a component.

## Size and naming

- One responsibility per module. About 200 lines is a signal to split; 400 needs a reason in the review.
- Use specific, unique names that a search can find. Avoid `data`, `handler`, `manager`, `service`, `utils`, or `helpers` without a domain qualifier.
- Identifiers, file names, comments, test names, logs, and developer-facing errors are English.
- Comments explain *why*, not *what*.

## Tests

- Test behavior the user or caller observes: roles, accessible names, visible text, calls to the api layer. Never test implementation details, private state, or CSS classes.
- Render screens with `renderRoute` from `@/test/render` and interact through `user` (`userEvent`), not `fireEvent`.
- Fake the server by mocking the feature's api module (`vi.mock('@/features/<feature>/api/<operation>')`). RLS behavior is proven by pgTAP allow/deny tests, not by component tests.
- Each new screen or interactive component calls `expectNoAccessibilityViolations(container)`; the E2E smoke runs axe in a real browser.
- Coverage thresholds (80% lines, functions, and statements; 75% branches) apply to the whole suite. Do not lower them or add exclusions to pass.
- Never delete, skip (`.skip`, `.only`, `.todo`), or weaken an assertion to make a test pass. Fix the code, or record why the behavior changed in the work item.

## Refactor checklist (after green)

- [ ] No duplicated logic or copy that already exists elsewhere.
- [ ] Names say what things are in domain terms.
- [ ] Business rules live in hooks, pure functions, or the database, not inside JSX.
- [ ] No file or function grew past the size signals without a reason.
- [ ] No dead code, unused exports, or leftover debugging (`pnpm knip` is clean).
- [ ] Tests still describe behavior, and all states from the UX contract are covered.
