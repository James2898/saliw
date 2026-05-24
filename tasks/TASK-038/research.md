# Research — Append Songs FAB (Setlist Detail Page)

## Open Questions

- OQ-1 (Pending Reconciliation) — What `aria-label` string does the existing auto-scroll FAB use, and what naming convention is followed for FAB aria-labels in this codebase? → Unresolved from context; suggested resolution source: grep `aria-label` near auto-scroll FAB component in `src/`.
- OQ-2 (Pending Reconciliation) — What default ordering is applied to the songs list in the existing Song Library page? → Unresolved from context; suggested resolution source: `src/app/library/page.tsx` or the Song Library Supabase query.
- OQ-3 (Pending Reconciliation) — What is the exact column name for song ordering in the setlist–song junction table? → Unresolved from context; suggested resolution source: `supabase/migrations/` or `src/app/actions/setlistActions.ts` insert patterns.
- OQ-4 (Pending Reconciliation) — At what Tailwind breakpoint does the existing auto-scroll FAB become visible on desktop? → Unresolved from context; suggested resolution source: auto-scroll FAB component responsive class in `src/`.
- OQ-5 (Pending Reconciliation) — Does the setlist detail page fetch song data via a single full query or paginated approach? → Unresolved from context; suggested resolution source: `src/app/setlists/[id]/page.tsx` and related Server Actions.
