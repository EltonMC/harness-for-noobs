# Data Dictionary

This is the semantic inventory of persistent business concepts. Add an entry before creating a durable table, view, or materialized projection. It helps the DBA reviewer detect duplicate concepts before data exists. The database guard fails when a migration creates a `public` table that is not named here.

| Entity | Purpose and source of truth | Owner / tenant boundary | Key relationships | Personal data | Purpose of personal data | Retention and deletion | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _No product entities yet_ | | | | _none / personal / sensitive: columns_ | | | |

## Rules

- One entry describes one durable concept, not an implementation detail.
- A derived or cached representation names its authoritative source and refresh rule.
- A table with a similar name or overlapping attributes must either reuse the existing entity or document why the concepts differ.
- Personal data follows the column comments in the migration (`pii:none`, `pii:personal`, `pii:sensitive`). Sensitive data (health, religion, biometrics, racial origin, sex life, political opinion, children's data) needs an explicit purpose and the owner's approval.
- Retention says how long the data is kept and what happens when the person deletes the account.
- Do not include personal data values, credentials, or production records in this document.
