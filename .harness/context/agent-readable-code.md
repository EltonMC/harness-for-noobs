# Agent-Readable Code

Use this as a design and review guide for new modules and substantial refactors.

- Give each module one clear responsibility. Split code when unrelated behaviors make it hard to test or change in isolation.
- Write identifiers, file and directory names, API and database names, test descriptions, comments, technical logs, and developer-facing errors in English. Use the product locale only for copy displayed to users; keep its translation keys in English.
- Keep files small enough to inspect in one focused read. A 500-line file is a review threshold, not a target.
- Use specific, unique names that a lexical search can distinguish. Avoid generic names such as `data`, `handler`, `manager`, or `service` unless a domain qualifier makes the name unique.
- Keep directory and test naming predictable. A feature's implementation and tests should be discoverable from the same domain terms.
- Depend on injected interfaces or adapters where external effects would otherwise make focused tests difficult.
- Expose headless, documented commands for setup, test, lint, type-check, and build.
- Prefer structured fields over prose logs when the application needs logs; never log secrets or sensitive user data.

This guidance does not replace product or architecture decisions. Use it when a change improves navigability, testability, or focused retrieval.
