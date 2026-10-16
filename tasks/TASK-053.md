# TASK-053 — P2 Architecture, Code Splitting & Database Privacy

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** Completed

---

## Feature Summary

Execute Phase P2 architectural enhancements across the frontend and database layers to optimize bundle size, harden data privacy, and ensure transaction atomicity:
1. **Dynamic Code Splitting for Modals and Drawers:** Convert heavy client-side modal and drawer components (`ChordDrawer`, `SetlistSettingsModal`, `AppendSongsModal`, `LogoutModal`, and `CloneSetlistDialog`) from eager imports to dynamic imports with `{ ssr: false }` (`next/dynamic`) to strip their JavaScript weight from initial route bundles.
2. **Clean Unused Props & Warnings:** Remove obsolete `songIndex` parameter and prop from `SetlistViewerClient.tsx` and `SetlistSongSection.tsx` to eliminate console and compiler warnings without altering functionality.
3. **Database Privacy Hardening (RLS Scoping & Musician Notes Protection):** Apply Supabase migration `supabase/migrations/20261017010000_p2_rls_scoping.sql` to replace overly permissive SELECT policies on `setlists`, `setlist_songs`, and `setlist_musicians` with scoped policies enforcing that private setlists (`is_public = false`) are viewable only by their owner (`leader_id = auth.uid()`) or users with role `music_director`. Revoke unauthenticated (`anon`) access to `musicians.notes` and `created_by` columns, creating a public view `public.public_musicians(id, name)` (resolving MEMORY.md BUG-011).
4. **Atomic Setlist Song Reordering (PostgreSQL RPC):** Create a transactional stored procedure `public.reorder_setlist_songs(p_setlist_id uuid, p_song_orders jsonb)` with `SECURITY DEFINER` and search path isolation, and wire it into `src/app/actions/setlistActions.ts:updateSetlistSongOrder` with graceful sequential fallback.

---

## Acceptance Criteria

1. **AC-1 — Dynamic Code Splitting of Modals & Drawers:**
   In consuming client components, dynamically load heavy modals with `next/dynamic(..., { ssr: false })`:
   - `src/app/setlists/[id]/SetlistViewerClient.tsx`: `ChordDrawer` and `SetlistSettingsModal`
   - `src/components/client/AppendSongsButton.tsx`: `AppendSongsModal`
   - `src/components/client/navbar.tsx`: `LogoutModal`
   - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`: `CloneSetlistDialog`
2. **AC-2 — Hydration Safety & Modal Integrity:**
   All five dynamically imported components must load without hydration errors, and retain complete interactive behaviors (opening, closing, Escape key, form submission, error handling).
3. **AC-3 — Clean Up Unused `songIndex`:**
   In `src/app/setlists/[id]/SetlistViewerClient.tsx` and `src/components/client/SetlistSongSection.tsx`, remove the unused `songIndex` prop to clear compiler/runtime warnings cleanly.
4. **AC-4 — Private Setlist RLS Scoping:**
   In `supabase/migrations/20261017010000_p2_rls_scoping.sql`:
   - Replace `setlists_select_public_or_authenticated` with `setlists_select_scoped`: `is_public = true OR leader_id = auth.uid() OR public.is_music_director()`.
   - Replace `setlist_songs_select_public_or_authenticated` with `setlist_songs_select_scoped` verifying the parent setlist meets the visibility rule.
   - Replace `setlist_musicians_select_public` with `setlist_musicians_select_scoped` verifying parent setlist visibility.
5. **AC-5 — Musician Column-Level Protection & Public View:**
   In the migration:
   - Revoke table-level `SELECT` on `public.musicians` from `anon`.
   - Grant `SELECT (id, name)` on `public.musicians` to `anon`.
   - Create view `public.public_musicians (id, name)` with SELECT permissions granted to `anon` and `authenticated` (BUG-011).
6. **AC-6 — Atomic Setlist Reorder RPC:**
   In the migration:
   - Create stored procedure `public.reorder_setlist_songs(p_setlist_id uuid, p_song_orders jsonb)` with `SECURITY DEFINER` and `SET search_path = public, pg_temp`.
   - Procedure verifies caller is the setlist owner (`leader_id = auth.uid()`) or `public.is_music_director()`, raising exception `42501` if unauthorized.
   - Procedure loops through `p_song_orders` and updates `order_index` on `public.setlist_songs` in a single atomic transaction.
7. **AC-7 — Server Action RPC Integration & Fallback:**
   In `src/app/actions/setlistActions.ts`:
   - `updateSetlistSongOrder` calls `supabase.rpc("reorder_setlist_songs", ...)`.
   - Returns `{ data: null, error: ... }` if permission error `42501` occurs.
   - Falls back gracefully to sequential updates if the RPC is not yet present.
8. **AC-8 — Type Check & Production Build:**
   `npx tsc --noEmit` and `npm run build` pass cleanly with zero errors.

---

## Out of Scope

- Changing musical transposition logic or audio playback.
- Introducing external drag-and-drop libraries.
- Modifying public profile access rules (handled in TASK-050).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Dynamically import `ChordDrawer` & `SetlistSettingsModal`; remove `songIndex` |
| `src/components/client/SetlistSongSection.tsx` | Remove unused `songIndex` prop definition & default |
| `src/components/client/AppendSongsButton.tsx` | Dynamically import `AppendSongsModal` |
| `src/components/client/navbar.tsx` | Dynamically import `LogoutModal` |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Dynamically import `CloneSetlistDialog` |
| `src/app/actions/setlistActions.ts` | Wire `reorder_setlist_songs` RPC with sequential fallback |
| `src/app/actions/musicianActions.ts` | Conditionally query restricted musician columns based on auth (BUG-011) |
| `supabase/migrations/20261017010000_p2_rls_scoping.sql` | RLS scoping, column security, public view, and atomic reorder RPC |
| `MEMORY.md` | Prevention rules (BUG-011, BUG-007, BUG-002, BUG-019) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before finalizing changes.
- Inlined MEMORY.md rules:
  - **BUG-011 (Musician data exposure):** Protect sensitive columns (`notes`, `created_by`) from unauthenticated read access.
  - **BUG-007 (React compiler forward reference):** Declare helper functions before any hooks referencing them.
  - **BUG-002 (useCallback dependencies):** Depend on primitive variables or whole objects, never object property chains.
  - **BUG-019 (Injected prop overrides):** Unconditional hooks with fallback coalesce.

---

## Resolution

- **Completed:** 2026-10-17
- **Branch:** `feat/p2-architecture-and-bundle-optimization`
- **Files changed:**
  - `src/app/setlists/[id]/SetlistViewerClient.tsx`
  - `src/components/client/SetlistSongSection.tsx`
  - `src/components/client/AppendSongsButton.tsx`
  - `src/components/client/navbar.tsx`
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`
  - `src/app/actions/setlistActions.ts`
  - `src/app/actions/musicianActions.ts`
  - `supabase/migrations/20261017010000_p2_rls_scoping.sql`
  - `tasks/TASK-053.md`
- **Notes:** Dynamically split heavy modals/drawers with `{ ssr: false }`, removed obsolete `songIndex` prop, established private setlist RLS scoping and column-level protection on musician notes with public view (auditing `musicianActions.ts` per BUG-011), and implemented atomic `reorder_setlist_songs` PostgreSQL RPC wired into `setlistActions.ts`.
