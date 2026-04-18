# Technical Schema — Setlist Archive & Index Hub

## Server Action / Query Contract Table

| UI Action | Server Action / Query | File | RLS Role | Status | Gap Strategy |
|-----------|----------------------|------|----------|--------|--------------|
| List setlists (paginated) | Inline Supabase query in `page.tsx` | `src/app/setlists/page.tsx` | Public (`is_public = true`) OR authenticated | MISSING (query not written yet) | Write inline in page |
| Search setlists by name | `.ilike('name', '%q%')` filter on above query | `src/app/setlists/page.tsx` | Same as above | MISSING (query not written yet) | Write inline in page |
| Resolve leader display name | Separate query: `profiles.select('full_name').eq('id', leader_id)` OR post-fetch map | `src/app/setlists/page.tsx` | `profiles_select_own` — **only own row readable** | MISSING (profiles RLS blocks cross-user read) | Show "Leader" or omit leader name; see gap strategy |
| Embedded song count per setlist | `setlist_songs(count)` PostgREST aggregate in main query | `src/app/setlists/page.tsx` | Inherits setlists SELECT RLS | EXISTS (setlist_songs FK confirmed; PostgREST supports this) | N/A |
| Role check (music_director gate) | `profiles.select('role').eq('id', user.id).single()` | `src/app/setlists/page.tsx` | `profiles_select_own` — own row only | EXISTS (pattern confirmed in `library/page.tsx`) | N/A |
| Navigate to setlist detail | `Link href="/setlists/[id]"` | `src/app/setlists/page.tsx` | Public read via RLS | EXISTS (`src/app/setlists/[id]/page.tsx` confirmed) | N/A |
| New Setlist button/FAB | `router.push('/setlists/new')` | New `NewSetlistButton` component | `music_director` only (client-side gate) | MISSING (`src/app/setlists/new/` route does not exist) | Disable button; show "Coming soon" hint if route absent |
| Pagination navigation | `PaginationControls` with `basePath` prop | `src/components/client/PaginationControls.tsx` | N/A | MISSING (`basePath` prop not implemented; hardcodes `/library`) | Must add `basePath` prop before use |
| Search input navigation | `SearchBar` with `basePath` prop | `src/components/client/SearchBar.tsx` | N/A | MISSING (`basePath` prop not implemented; hardcodes `/library`) | Must add `basePath` prop before use |

## Summary

- Total data/action requirements: 9
- EXISTS: 3
- MISSING: 6 (but 4 of 6 are component prop additions or new page stubs, not data gaps)
- Data layer MISSING: 2 (paginated list query, leader display name)
- All-MISSING escalation: No — the critical list query is not yet written but is fully safe to write inline; the leader name gap has a defined fallback

## Critical Gap Notes

1. **Leader display name** is the only true schema gap. `setlists.leader_id` is a FK to `auth.users`, NOT to `public.profiles`. PostgREST cannot auto-join across the `auth` schema boundary. A separate query to `profiles` would work only for the current user's own row due to `profiles_select_own` RLS policy. Cross-user resolution (displaying another user's name on their setlist) is blocked by RLS. The safe fallback is to omit the leader name or display a truncated `leader_id`.

2. **`PaginationControls` and `SearchBar`** both hardcode `/library` in their `buildUrl` / `router.replace` logic. They must each receive a `basePath` prop and substitute it before the setlists page can use them.

3. **`/setlists/new` route** does not exist. The NewSetlistButton must either (a) be rendered pointing to a future route with the button disabled until the route exists, or (b) not rendered until the route is built.
