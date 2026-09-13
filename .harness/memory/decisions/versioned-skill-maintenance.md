# Versioned skill maintenance

## Type

Decision

## Summary

External skills are tracked by immutable version or revision, checked weekly, and updated only in a human-reviewed pull request. Bootstrap uses the fixed BMad installer version, fixed Git revisions, and content digests; offline checks validate provenance plus source and adapter integrity. Portable copies are deliberately limited to explicit host directories.

## Evidence

- `docs/decisions/0008-versioned-skill-maintenance.md`
- `.harness/skill-sources.lock.json`
- `.harness/workflows/skill-source-maintenance.md`

## Consequence

Use the source-maintenance workflow instead of manually editing external skill copies or accepting unreviewed latest versions.

## Status

Active
