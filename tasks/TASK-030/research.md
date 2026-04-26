# Research — Musicians Table & Setlist Musicians Migration

## Open Questions

- **UNIQUE constraint with expression column** → Resolved from context: PostgreSQL does not support expression columns in inline `UNIQUE (...)` clauses inside `CREATE TABLE`. The inline form `UNIQUE (setlist_id, musician_id, lower(instrument))` in the original spec would fail at parse time with a syntax error. The correct implementation is a separate `CREATE UNIQUE INDEX IF NOT EXISTS setlist_musicians_unique_instrument_idx ON public.setlist_musicians (setlist_id, musician_id, lower(instrument))`. This is a confirmed breaking spec error, not a style preference. Source: PostgreSQL CREATE TABLE documentation; `lower()` is an expression, not a column reference.
