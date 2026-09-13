# Data Dictionary

This is the semantic inventory of persistent business concepts. Add an entry before creating a durable table, view, or materialized projection. It helps the DBA reviewer detect duplicate concepts before data exists.

| Entity | Purpose and source of truth | Owner / tenant boundary | Key relationships | Lifecycle and retention | Notes |
| --- | --- | --- | --- | --- | --- |
| _No product entities yet_ | | | | | |

## Rules

- One entry describes one durable concept, not an implementation detail.
- A derived or cached representation names its authoritative source and refresh rule.
- A table with a similar name or overlapping attributes must either reuse the existing entity or document why the concepts differ.
- Do not include personal data values, credentials, or production records in this document.
