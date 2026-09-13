# Database Change Proposal: <short-slug>

## Intent

- User or business outcome:
- Entities created or changed:
- Explicit non-goals:

## Model and duplication check

- Data-dictionary entries consulted:
- Authoritative source for each fact:
- Similar existing tables, fields, or views and why this is not duplicate:
- Derived or cached data and refresh/consistency rule:

## Integrity and lifecycle

- Primary key and identity strategy:
- Relationships and cardinality:
- Required fields, unique rules, checks, defaults, and delete behavior:
- Timestamps, retention, deletion, or audit requirement:

## Access and queries

- Tenant or ownership boundary:
- Public API exposure, grants, RLS policies, Storage, RPC, view, function, or trigger impact:
- Expected read, write, join, filter, and sort paths:
- Proposed indexes and read/write trade-off:

## Migration and release plan

- Migration shape: additive / backfill / rename / destructive:
- Compatibility with the prior application version:
- Lock, volume, and backfill risk:
- Rollback or forward-fix plan:
- Test plan: reset, lint, pgTAP, RLS allow/deny, integration, and performance evidence:

## Owner approval

- Product or domain decision owner:
- Approved to implement on:
