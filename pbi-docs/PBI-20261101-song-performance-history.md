# PBI-20261101 — Song Performance History on Song Viewer

- **Saved:** 2026-11-01
- **Source:** User request + `/design-grill` rounds decision record (chat, 2026-11-01)

---

## PBI (verbatim)

### Original request

> i want to have also a history when viewing a song, like who sung the song, referecence the setlist history

### Grill decisions (2026-11-01)

| # | Decision | Answer | Source | Spec section |
|---|---|---|---|---|
| **Q1.1** | Where song history appears | Standalone Song Viewer (`/library/[id]`) only — not inside the live Setlist Viewer (`/setlists/[id]`) | recommendation accepted | Scope |
| **Q1.2** | UI pattern & primary action | Collapsible inline section above the chord sheet (mirroring `SongYouTubeSection.tsx`) with a one-click `"Use key"` action that transposes the chord sheet | recommendation accepted | AC / UI |
| **Q1.3** | Grouping & repeat handling | Grouped by unique `(worship_leader_id, performance_key)` pair — repeat performances by the same worship leader in the same key collapse into one row with a `×N` badge (`N >= 2`) and the most recent performance date (`YYYY-MM-DD`) | recommendation accepted | Data model / AC |
| **Q1.4** | Visibility & permissions | Visible to everyone who can view `/library/[id]` (guests and members see public setlist history; setlist owners and `music_director`s see all qualifying setlists via existing RLS; musician names resolved via `public.public_musicians` or `public.musicians`) | recommendation accepted · code `20261017010000_p2_rls_scoping.sql:12-68` | NFR / Security |
| **Q1.5** | Qualifying setlists | Past setlists strictly before today (`date < today` via `slice(0, 10)` UTC convention) that have an assigned worship leader (`worship_leader_id IS NOT NULL`) | recommendation accepted · code `worshipLeaderHistory.ts:53-55` | Data model / AC |
| **Q1.6** | Setlist reference on each row | Each grouped row displays the most recent setlist's name as a clickable link (`/setlists/[id]`) alongside its `YYYY-MM-DD` date | recommendation accepted | AC |
| **Q2.1** | Collapsed default & empty state | Starts collapsed behind a `"Show history (N)"` / `"Hide history"` toggle button; when a song has 0 qualifying past performances, renders a muted `"No performance history"` label (matching `"No video available"` in `SongYouTubeSection.tsx:198`) | recommendation accepted | AC |
| **Q2.2** | Sort order | Sorted by `lastSungDate` descending (most recent first), then Worship Leader name A–Z, then `performanceKey` A–Z | recommendation accepted | AC |
| **Q2.3** | Row key states & two-way sync | Each row displays `SongKeyBadge` and a button showing `"Current"` (disabled) when matching the chord sheet's active key, or `"Use key"` when different; clicking `"Use key"` sets `targetKey` on `ChordSheetClient` and updates the Chord Drawer's chords in sync; manual transpositions in `ChordSheetClient` also update which history row shows `"Current"` | recommendation accepted · code `SongDetailClient.tsx:60-83` | AC / Integration |
| **Q2.4** | Data fetching strategy | Fetched server-side during SSR in `src/app/library/[id]/page.tsx` in parallel with the song query and passed down to `SongDetailClient.tsx`; no database migration required | recommendation accepted · rule `CLAUDE.md:58` | Data model / Architecture |

---

## Analysis

### Acceptance Criteria

**Data & Scoping**
- [ ] On the standalone Song Viewer (`/library/[id]`), past performance history for the current song (`song_id = id`) is fetched server-side during SSR in parallel with the song query.
- [ ] Qualifying setlists include only setlists where `worship_leader_id IS NOT NULL` and `setlists.date` is strictly before today (`date < today`, using the `slice(0, 10)` UTC `YYYY-MM-DD` convention).
- [ ] Unauthenticated guests and regular members see history derived from public setlists (`is_public = true`), while setlist owners and `music_director` users see all qualifying setlists permitted by existing RLS policies (derived).
- [ ] Musician names are resolved safely for both unauthenticated guests and authenticated users without exposing restricted columns (`notes`, `created_by`) on `public.musicians` (derived).
- [ ] No database migrations or schema modifications are introduced.

**Grouping & Sorting**
- [ ] Performances are grouped by unique `(worship_leader_id, performance_key)` pair.
- [ ] If the same worship leader sang the song in two different keys across past setlists, two separate rows are rendered (one per distinct key).
- [ ] Repeat performances of the song by the same worship leader in the exact same key collapse into a single row displaying a repeat count badge `×N` when `N >= 2` (single performances `N = 1` omit the multiplier badge).
- [ ] Each grouped row tracks the most recent performance's date (`YYYY-MM-DD`), setlist ID (`lastSetlistId`), and setlist name (`lastSetlistName`).
- [ ] Grouped rows are sorted by `lastSungDate` descending (most recent first), then by Worship Leader name A–Z (case-insensitive), then by `performanceKey` A–Z.

**Toggle & Empty State**
- [ ] When a song has 1 or more grouped history entries (`N >= 1`), a toggle button reading `"Show history (N)"` (when collapsed) or `"Hide history"` (when expanded) is rendered above the chord sheet on `/library/[id]`.
- [ ] The history panel starts collapsed on every initial page load (`aria-expanded="false"`).
- [ ] When a song has 0 qualifying past performances, no toggle button is shown; instead, a muted neutral placeholder `"No performance history"` is rendered (matching `"No video available"` in `SongYouTubeSection.tsx`).

**Row Presentation & Setlist Reference**
- [ ] Each row displays the Worship Leader's name, the most recent setlist name as a clickable Next.js `<Link href="/setlists/[lastSetlistId]">`, the latest performance date (`YYYY-MM-DD`), `SongKeyBadge` for `performanceKey`, the `×N` multiplier badge (when `N >= 2`), and the key action button.
- [ ] Clicking the setlist link navigates to `/setlists/[lastSetlistId]` without triggering a key transposition on the current song page (derived).

**Two-Way Key Transposition Sync**
- [ ] When the chord sheet's currently displayed key equals a row's `performanceKey`, that row's action button reads `"Current"` and is disabled (`disabled` / `aria-disabled="true"`).
- [ ] When the chord sheet's currently displayed key differs from a row's `performanceKey`, that row's action button reads `"Use key"` and is enabled.
- [ ] Clicking `"Use key"` on a history row immediately transposes `ChordSheetClient` to that row's `performanceKey`, updates `SongDetailClient`'s `uniqueChords` (so `ChordDrawer` reflects the new key), and updates all history rows' button states (`"Current"` vs `"Use key"`).
- [ ] Manually transposing the key inside `ChordSheetClient` (via the `-1` / `+1` steppers, key dropdown, or `"Reset"` button) updates the active key in `SongDetailClient` so any matching history row immediately switches to `"Current"` (and non-matching rows switch to `"Use key"`).
- [ ] An `aria-live="polite"` status region announces key changes triggered from the history rows to screen readers (derived, consistent with `WorshipLeaderHistoryModal.tsx`).
- [ ] All UI elements use Saliw Artisan palette classes with explicit `dark:` counterparts and meet WCAG AA contrast requirements (derived).

### Scope & Out-of-Scope

- **In scope:**
  - Pure grouping and sorting helper for per-song performance history (with unit tests).
  - Server-side parallel query in `src/app/library/[id]/page.tsx` fetching past setlist performances and worship leader names for the viewed song.
  - Collapsible inline song history UI component on `/library/[id]` with empty state, setlist links, `×N` badges, and `"Use key"` / `"Current"` actions.
  - Two-way `targetKey` / `onKeyChange` state synchronization in `src/app/library/[id]/SongDetailClient.tsx` between the history section, `ChordSheetClient`, and `ChordDrawer`.
- **Out of scope:**
  - Displaying per-song performance history inside the Setlist Viewer (`/setlists/[id]`) or Setlist Builder (`/setlists/new`, `/setlists/[id]/edit`).
  - Database migrations, new tables, or RLS policy changes.
  - Including setlists dated today or in the future, or setlists without an assigned `worship_leader_id`.
  - Tracking non-worship-leader lineup musicians (`setlist_musicians`) in the song history.
  - Persisting the selected `"Use key"` transposition back to `songs.original_key` in the database (transposition on `/library/[id]` is local viewing state).

### Ambiguities & Risks

- **Tie-breaking when the same leader sang the song in the same key twice on the same date:** If two setlists share the exact same `YYYY-MM-DD` date for the same `(worship_leader_id, performance_key)`, the grouping helper should deterministically pick which setlist's `id` and `name` to link (e.g. first encountered or ordered by `setlist.id`).
- **PostgREST foreign-key join vs `anon` column-level grants on `public.musicians`:** Migration `20261017010000_p2_rls_scoping.sql` (lines 61–68) revoked table-level `SELECT` on `public.musicians` from `anon` and granted `SELECT (id, name) ON public.musicians TO anon` (plus created `public.public_musicians`). When querying from `src/app/library/[id]/page.tsx` (which is a public page accessible to `anon`), any join on `musicians(id, name)` must explicitly project only `(id, name)` (never `*`), or resolve names via `public_musicians` so `anon` requests do not fail with a Postgres permission error (`42501`).
- **Two-way `targetKey` sync in `SongDetailClient`:** Currently `SongDetailClient.tsx` only tracks `semitoneOffset` via `handleKeyChange` and does not pass `targetKey` to `ChordSheetClient`. Lifting `activeKey` (initialized to `originalKey`) into `SongDetailClient` and passing `targetKey={activeKey}` + `onKeyChange={handleKeyChange}` to `ChordSheetClient` is already supported by `ChordSheetClient.tsx` (lines 93, 358–366), which guards `if (targetKey !== undefined && targetKey !== displayKey)` to prevent feedback loops.

### Codebase-Aware Notes

**Expected to change**
- `src/app/library/[id]/page.tsx`: fetch the song's setlist history server-side in parallel with the song query and pass the grouped items down to `SongDetailClient` (or render the history section alongside `SongYouTubeSection`).
- `src/app/library/[id]/SongDetailClient.tsx`: track `activeKey` state (initialized to `originalKey`), wire `targetKey={activeKey}` into `ChordSheetClient`, and connect the song history section's `"Use key"` callback so both `ChordSheetClient` and `ChordDrawer` (`uniqueChords`) stay in sync.
- `src/utils/worshipLeaderHistory.ts` (or a sibling helper): add pure grouping/sorting function (e.g. `groupSongPerformanceHistory`) and corresponding unit tests.

**Reuse**
- `src/components/client/SongYouTubeSection.tsx`: exact visual pattern for the collapsible toggle button (`px-3 py-1.5 rounded-lg text-xs font-semibold border`) and muted empty state (`text-xs text-brand-espresso/50 dark:text-brand-cream/40`).
- `src/components/SongViewer/ChordSheetClient.tsx` (lines 93, 358–366): existing `targetKey` prop and `onKeyChange` callback for controlled key updates.
- `src/components/SongKey/SongKeyBadge.tsx`: badge component for displaying `performanceKey`.
- `src/components/client/SongCard.tsx` & `src/components/client/button.tsx`: composable card/row layout and Artisan ghost button (`"Use key"` / `"Current"`).
- `src/utils/worshipLeaderHistory.ts`: `slice(0, 10)` UTC date comparison and `×N` aggregation pattern.
