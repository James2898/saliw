# Research — Setlist Archive & Index Hub

## Open Questions

- None.

## Resolved From Context

- `event_date` vs `date` column → Resolved from `src/types/supabase.ts`: column is `date`.
- `leader` plain text vs FK → Resolved from `src/types/supabase.ts`: column is `leader_id` (UUID FK). No plain text `leader` column exists.
- `music_director` role mechanism → Resolved from `src/types/Profile.ts` and `src/app/library/page.tsx`: stored in `profiles.role` column, checked as string equality.
- `?page=` default → Resolved from `src/app/library/page.tsx`: defaults to 1.
- Search OR vs AND → `leader_id` is a UUID; leader-name search is out of scope. Search applies to `name` only.
- FAB destination → Resolved: `/setlists/new` (mirrors `/library/new`).
- Date format → Resolved from `src/app/setlists/[id]/page.tsx`: `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`.
- `PaginationControls` path hardcoding → Gap identified; resolved by adding `basePath` prop with `/library` default (backwards compatible).
- `SearchBar` path hardcoding → Gap identified; resolved by adding `basePath` prop with `/library` default (backwards compatible).
- `--brand-darker` variable → Confirmed defined in `src/styles/globals.css`.
