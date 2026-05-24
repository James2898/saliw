# Research — Alphabet Filter Bar (Song Library + Setlist List)

## Open Questions

- **OQ-1 (Blocking)** — URL search parameter (`?letter=A`) vs React local state for letter filter?
  → **Awaiting user input.**

- **OQ-2 (Blocking)** — Mobile layout: horizontally scrollable single row vs multi-row wrap?
  → **Awaiting user input.**

- **OQ-3 (Pending Reconciliation)** — Exact column name for setlist title on `setlists` table.
  → To be resolved from context.md / `src/app/setlists/page.tsx` by `@task-logger`.

- **OQ-4 (Pending Reconciliation)** — Exact Tailwind tokens for active interactive element state in Artisan UI.
  → To be resolved from context.md "Patterns to Follow" / existing button/tab components by `@task-logger`.

- **OQ-5 (Pending Reconciliation)** — Whether Song Library and Setlist List use shared Server Actions or inline fetch in Server Components for their list queries.
  → To be resolved from context.md / `src/app/actions/songActions.ts` / `src/app/setlists/page.tsx` by `@task-logger`.
