# Application template dependency pins

## Type

Gotcha

## Summary

Pinning the newest release of a package in `.harness/app-template/package.fragment.json` can make `pnpm install` fail: `minimumReleaseAge: 4320` rejects versions (and their exact transitive pins, such as Wrangler → workerd) published less than three days ago. A new dependency with an install script also fails until it is listed in `allowBuilds`.

## Evidence

- 2026-09-13: `wrangler@4.131.1` (two days old) failed with "versions do not meet the minimumReleaseAge constraint"; `4.129.0` installed.
- pnpm 12 ignores the older `onlyBuiltDependencies` key; it uses `allowBuilds` and fails with `ERR_PNPM_IGNORED_BUILDS`.
- `biome migrate --write` rewrote `"recommended": true` to `"preset": "none"`, silently disabling lint rules; the template uses `"preset": "recommended"`.

## Consequence

When bumping template versions, choose releases at least a week old (stricter than the three-day `minimumReleaseAge`, because exact transitive pins such as Wrangler → workerd are often published a day or two after the parent), regenerate `.harness/app-template/pnpm-lock.yaml` with `pnpm install --lockfile-only` from the fragment, rerun the `Harness template smoke` workflow (or its steps locally), and check that a known lint violation is still reported.

## Status

Active
