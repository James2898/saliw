# Research — Setlist Search: Include Song Title Matching

## Open Questions

- **Pending Reconciliation** — What is the exact current empty-state message text when a search returns zero results? The spec uses "No setlists matching '[query]' in name or songs." but the existing message wording (name-only variant) needs to be replaced precisely. (suggested resolution source: `src/app/setlists/page.tsx` — grep for empty state JSX or zero-result conditional render)

- **Pending Reconciliation** — What is the exact Supabase query shape used for the current name search, and does it already include a `setlist_songs` join for displaying song titles on the card? If the join is already present in the select, the song-title filter can be applied via PostgREST's nested filter syntax without adding a new join. If the join is absent, it must be added. (suggested resolution source: `src/app/setlists/page.tsx` lines 106–113 — inspect current `.from('setlists').select(...)` call and any existing join columns)

- **Pending Reconciliation** — What PostgREST filter mechanism is available for OR-filtering across a parent column and a nested join column? Specifically: does the current Supabase JS client version support `.or('name.ilike.%q%,setlist_songs.songs.title.ilike.%q%')` with a nested resource reference, or is a raw RPC/SQL function (`rpc('search_setlists', ...)`) required? (suggested resolution source: context.md "Patterns to Follow" — check existing complex filter patterns; also verify Supabase JS client version in `package.json`)

- **Pending Reconciliation** — What is the `SetlistRow` type shape at line 23 of `src/app/setlists/page.tsx`? Specifically: does it already include a `setlist_songs` array field, and if so, what is its current type (array vs object, per BUG-017 prevention note)? AC-10 depends on confirming the correct shape for the one-to-many join. (suggested resolution source: `src/app/setlists/page.tsx` line 23 — inspect `SetlistRow` type definition)

- **Pending Reconciliation** — Does the `setlist_songs` junction table have a direct FK to `songs.title`, or does it join through `songs.id`? The query shape for PostgREST nested filtering depends on whether the join path is `setlist_songs.songs.title` (two hops) or `setlist_songs.song_title` (denormalised). (suggested resolution source: `supabase/migrations/` or context.md schema section — grep for `setlist_songs` table definition)
