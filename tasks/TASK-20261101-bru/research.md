# Research — Song Performance History on Song Viewer

## Open Questions
- None. (All product decisions resolved in design grill rounds Q1.1–Q2.4 and recorded in `pbi-docs/PBI-20261101-song-performance-history.md`).

## Implementation Invariants for Codebase Explorer & Task Logger
- **Pending Reconciliation — Supabase Query & Joins**: The exact query join syntax (`setlists!inner(...)`, `setlist_songs`, `musicians` or `public_musicians`) in `src/app/library/[id]/page.tsx`. `@codebase-explorer` will inspect `src/app/library/[id]/page.tsx`, `src/types/`, and migration files to confirm the exact join query structure.
- **Pending Reconciliation — Prop Interface for Key Sync**: The exact prop signature for two-way key communication between `SongDetailClient.tsx` and `ChordSheetClient.tsx` (e.g. `initialKey`, `targetKey`, `onKeyChange`). `@codebase-explorer` will confirm existing props in `SongDetailClient.tsx` and `ChordSheetClient.tsx`.
