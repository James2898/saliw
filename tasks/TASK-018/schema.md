# Technical Schema — Stage-Ready Setlist Viewer

## Endpoint Contract Table

| UI Action | Method | Path / Server Action | Status | Gap Strategy |
|-----------|--------|----------------------|--------|--------------|
| Page load — fetch setlist header (name, date, leader_id) | Server Action (Supabase query) | `setlists` table — no named action exists | MISSING | Must be implemented as an inline query or a new `getSetlistById` Server Action in `setlistActions.ts` |
| Page load — fetch all songs for setlist | Server Action | `getSetlistWithSongs({ setlist_id })` in `setlistActions.ts` | EXISTS | N/A |
| Redirect unauthenticated users to /login | Server-side auth check | `supabase.auth.getUser()` via `createClient()` | EXISTS | N/A |
| Check if current user is setlist leader | Client-side comparison after Server Component fetch | `user.id === setlist.leader_id` (prop-drilled) | EXISTS (pattern) | N/A |
| Service Navigator: click song title → scroll to section | CLIENT-ONLY | `element.scrollIntoView({ behavior: 'smooth' })` | CLIENT-ONLY | N/A |
| IntersectionObserver: highlight active song | CLIENT-ONLY | Browser API | CLIENT-ONLY | N/A |
| Per-song chord sheet initializes at performance_key | Props-only (no backend call) | `performance_key` passed as `originalKey` prop to `ChordSheetClient` | EXISTS (pattern) | N/A |
| "Sync to Setlist" button: persist current displayKey | Server Action | `updatePerformanceDetails({ id, setlist_id, performance_key })` in `setlistActions.ts` | EXISTS | N/A |

## Summary

- Total backend operations: 4 (excluding client-only and prop-passing)
- EXISTS: 3 (`getSetlistWithSongs`, auth check, `updatePerformanceDetails`)
- MISSING: 1 (setlist header fetch — `name`, `date`, `leader_id`)
- All-MISSING escalation: No (25% missing — below 50% threshold)

## Critical Gap

The single MISSING operation is the setlist header fetch. `getSetlistWithSongs` returns `setlist_songs` rows only — it does not return the parent `setlists` row (`name`, `date`, `leader_id`). The page requires `leader_id` to gate the Sync button and `name`/`date` for the page header. This must be resolved with an inline Supabase query directly in the Server Component or a new `getSetlistById` Server Action.
