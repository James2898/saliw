# Spec — Song Performance History on Song Viewer

## Feature Summary
On the standalone Song Viewer (`/library/[id]`), provide an inline, collapsible performance history section positioned directly above the chord sheet (mirroring the UX pattern of `SongYouTubeSection.tsx`). The section displays past setlist performances for the song aggregated by unique `(worship_leader_id, performance_key)` pairings, showing the worship leader's name, key badge, repeat multiplier badge (`×N` when N >= 2), most recent performance date (`YYYY-MM-DD`), and a direct link to the corresponding setlist viewer (`/setlists/[id]`). Each row includes an interactive key action button that displays `"Current"` (disabled) when matching the active chord sheet key or `"Use key"` when differing. Clicking `"Use key"` immediately transposes the chord sheet and updates the chord drawer in sync, while manual key changes in `ChordSheetClient` reciprocally update row button states. History data is fetched server-side during SSR in `src/app/library/[id]/page.tsx` in parallel with the song query, complying with Supabase RLS policies and Saliw Artisan design palette standards without requiring database schema changes or migrations.

## Acceptance Criteria
1. **Parallel SSR Fetching**: In `src/app/library/[id]/page.tsx`, past performance history for the song is queried server-side in parallel with the primary song query during SSR and passed down through `SongDetailClient.tsx`.
2. **Qualifying Setlist Filter**: Past performances are strictly filtered to setlists where `worship_leader_id IS NOT NULL` and `date < today` (using UTC `YYYY-MM-DD` string comparison via `slice(0, 10)` convention). Setlists scheduled for today or in the future, as well as setlists lacking an assigned worship leader, are excluded.
3. **RLS & Security Compliance**: Setlist queries strictly honor Supabase Row Level Security: unauthenticated guests and members only receive history from public setlists (`is_public = true`), while setlist owners and users with the `music_director` role receive history across all setlists accessible to their auth session.
4. **Musician Data Privacy**: Worship leader names are safely resolved via `public.public_musicians` or safe column projection on `public.musicians` (`id`, `name`), strictly avoiding exposure of restricted columns (`notes`, `created_by`).
5. **No Schema Changes**: The implementation requires no database migrations, new tables, columns, or database functions.
6. **Tuple Grouping**: Setlist performance records are grouped by unique `(worship_leader_id, performance_key)` tuple. If the same worship leader sang the song in different keys across past setlists, each distinct key renders as a distinct row.
7. **Repeat Multiplier (`×N`)**: When the same worship leader performed the song in the identical key across multiple past qualifying setlists (N >= 2), they collapse into a single row displaying a multiplier badge `×N`. For single performances (N = 1), the multiplier badge is omitted.
8. **Latest Reference Tracking & Tie-Breaking**: Each grouped row tracks the most recent performance date (`lastSungDate` in `YYYY-MM-DD`), the setlist ID (`lastSetlistId`), and the setlist name (`lastSetlistName`). If two performances for the same `(worship_leader_id, performance_key)` share the exact same date, tie-breaking selects deterministically (by highest setlist ID or stable query encounter order).
9. **Row Sort Order**: Grouped rows are sorted deterministically: first by `lastSungDate` descending (most recent first), then by Worship Leader name ascending (case-insensitive A-Z), then by `performanceKey` ascending (A-Z).
10. **Collapsible Header & Toggle Button**: When 1 or more grouped history rows exist (N >= 1), a toggle button is rendered above the chord sheet displaying `"Show history (N)"` when collapsed or `"Hide history"` when expanded (where `N` is the count of distinct grouped rows).
11. **Initial Collapsed State**: The performance history section defaults to collapsed (`aria-expanded="false"`) on every initial page load.
12. **Zero-History Empty State**: When a song has 0 qualifying past performances, the toggle button is omitted and a muted neutral label `"No performance history"` is rendered (mirroring `"No video available"` in `SongYouTubeSection.tsx`).
13. **Row Layout & Setlist Link**: Each row displays the worship leader name, `SongKeyBadge` for `performanceKey`, the `×N` multiplier badge (if N >= 2), the performance date (`YYYY-MM-DD`), a clickable link with the setlist name navigating to `/setlists/[lastSetlistId]`, and the key transposition action button.
14. **Navigation Isolation**: Clicking the setlist link navigates the user to `/setlists/[lastSetlistId]` without invoking key transposition on the current song page.
15. **Two-Way Transposition Sync - History to Chord Sheet**:
    - When a row's `performanceKey` matches the chord sheet's currently active key, its action button reads `"Current"` and is disabled (`disabled` and `aria-disabled="true"`).
    - When a row's `performanceKey` differs from the currently active key, its action button reads `"Use key"` and is enabled.
    - Clicking `"Use key"` immediately updates `ChordSheetClient`'s target key to that row's `performanceKey`, updates `SongDetailClient`'s `uniqueChords` so `ChordDrawer` displays the matching transposed chord diagrams, sets the clicked row's button to `"Current"`, and reverts any previously matching row to `"Use key"`.
16. **Two-Way Transposition Sync - Chord Sheet to History**: Manually transposing the chord sheet inside `ChordSheetClient` (via semitone `-1`/`+1` stepper buttons, key selector dropdown, or `"Reset"` button) immediately updates the active key state in `SongDetailClient`, causing any history row matching the new key to switch to `"Current"` (and all non-matching rows to `"Use key"`).
17. **Local Viewing State Only**: Transposing the key via the history section updates only local component viewing state and never modifies or persists changes to `songs.original_key` in the database.
18. **Accessibility & Screen Reader Feedback**:
    - The toggle button exposes `aria-expanded` and controls the collapsible container via `aria-controls`.
    - Clicking `"Use key"` announces the transposition to screen readers via an `aria-live="polite"` status region.
19. **Artisan Design System Palette**: All component styles adhere to the Artisan palette: primary text in `brand-espresso` / `brand-cream`, subtle accents in `brand-brown` / `brand-tan`, container backgrounds in `brand-cream` / `brand-darker` / `brand-espresso`, and standard 32px button baselines (`h-8` or `px-3 py-1.5 text-xs font-semibold rounded-lg`) with flex-wrapping toolbar layouts. Generic Tailwind badge colors (`emerald`, `blue`, etc.) are forbidden. Text meets WCAG AA contrast standards in both light and dark modes.

## Out of Scope
- Displaying per-song performance history inside the Setlist Viewer (`/setlists/[id]`), Setlist Builder (`/setlists/new`, `/setlists/[id]/edit`), or Print view.
- Database schema migrations, table alterations, new columns, or RLS policy modifications.
- Including setlists dated today or in the future (`date >= today`), or setlists lacking an assigned `worship_leader_id`.
- Displaying non-worship-leader lineup musicians (`setlist_musicians`).
- Persisting selected transposition keys to `songs.original_key` in the database.
- Inline editing, creation, or deletion of past setlist records from the song detail view.

## Fallback Behaviors
- **Missing or Failed SSR History Query**: If the parallel SSR query for song history encounters an error or returns null/empty, catch the error gracefully and fallback to an empty list `[]`. The song detail page renders normally and displays the muted label `"No performance history"` without throwing an unhandled exception.
- **Missing Worship Leader Record**: If a past setlist has a `worship_leader_id` whose profile has been deleted or is inaccessible under RLS, render `"Unknown Leader"` as the worship leader name.
- **Untitled or Empty Setlist Name**: If `setlists.title` is null or empty, display `"Untitled Setlist"` as the clickable link text.
- **Invalid Key Representation**: If a historical `performance_key` is malformed, unrecognized, or null, display the key as-is in `SongKeyBadge` and disable the `"Use key"` button to prevent sending invalid inputs to `shiftChord`.

## Resolved Ambiguities
- **Placement & UI Pattern**: Placed inline directly above the chord sheet on `/library/[id]`, matching the collapsible section style of `SongYouTubeSection.tsx` (Source: Grill decision Q1.1, Q1.2).
- **Default State**: Starts collapsed behind a `"Show history (N)"` / `"Hide history"` toggle button on initial load (Source: Grill decision Q2.1).
- **Grouping Logic**: Grouped by unique `(worship_leader_id, performance_key)` tuple; repeat count badge `×N` rendered only when N >= 2 (Source: Grill decision Q1.3).
- **Date Filtering**: Qualifying setlists are strictly before today (`date < today` using UTC `slice(0, 10)` convention) with non-null `worship_leader_id` (Source: Grill decision Q1.5, matching `worshipLeaderHistory.ts:53-55`).
- **Row Setlist Reference**: Displays the most recent setlist's name as a clickable Next.js link `/setlists/[lastSetlistId]` alongside the `YYYY-MM-DD` date (Source: Grill decision Q1.6).
- **Row Sort Order**: Sorted by `lastSungDate` descending (most recent first), then worship leader name A-Z (case-insensitive), then `performanceKey` A-Z (Source: Grill decision Q2.2).
- **Two-Way Key Sync**: History row action button toggles between `"Current"` (disabled) and `"Use key"` (enabled); bidirectional sync updates `ChordSheetClient` and `ChordDrawer` when clicking `"Use key"`, and updates history row buttons when manually transposing in `ChordSheetClient` (Source: Grill decision Q2.3).
- **SSR Query Strategy**: Performed server-side during SSR in `src/app/library/[id]/page.tsx` in parallel with the song query, requiring no database migrations (Source: Grill decision Q2.4).
- **Same-Date Tie-Breaking**: If multiple setlists for the same `(worship_leader_id, performance_key)` occur on the same `YYYY-MM-DD` date, deterministic tie-breaking selects the setlist with the greater ID (or first stable query entry) for `lastSetlistId` and `lastSetlistName` (Source: Grill Analysis).
