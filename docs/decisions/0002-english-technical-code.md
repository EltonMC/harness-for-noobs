# ADR 0002: Use English for technical code

## Status

Accepted — 2026-09-13

## Context

The project is designed to be read and changed by people and agents using different tools. A single technical language improves lexical search, library alignment, agent handoffs, external documentation lookup, and cross-tool consistency.

## Decision

Write the following in English:

- source code identifiers, filenames, directory names, package names, API routes and payload fields, database identifiers, migration names, and environment-variable names;
- test descriptions, code comments, technical logs, telemetry events, and developer-facing errors;
- developer-facing Harness instructions and engineering artifacts.

User-facing copy is not governed by this ADR. It follows the documented product locale when one is chosen. Translation keys, localization namespaces, and the code that selects localized content remain English.

## Consequences

- New code and reviews must reject Portuguese technical identifiers or comments unless they are product terms that cannot be accurately translated; in that case, use the smallest clear English-qualified name.
- Do not translate canonical external API fields merely for local consistency.
- A future product-language decision may add Portuguese user-facing copy without changing technical names or translation keys.

## Evidence

- `.harness/context/code-conventions.md` (formerly `agent-readable-code.md`; see ADR 0016)
- `.harness/skills/harness-feature-delivery/SKILL.md`
- `.harness/work-items/2026-09-13-english-technical-code.md`
