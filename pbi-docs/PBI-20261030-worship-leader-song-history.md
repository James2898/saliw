# PBI-20261030 — Worship Leader Song History in the Setlist Builder

- **Saved:** 2026-10-30
- **Source:** User request + `/design-grill` rounds decision record (chat, 2026-10-30)

---

## PBI (verbatim)

### Original request

> i want to implement a function, a button on the setlist builder, when a worship leader has been assigned a button beside of the select dropwdown will show, witht he text of the ```history``` and on click of it will show the list of the past songs the worship leader has sung, and if there are duplicate of the song with different key also show it , sort it by alphabetical order, have the filter based on the tag, and use the song card componetns to display it, main purpose i sjust to show the past history to help the music director set the key immediately from the past set lists

### Grill decisions (2026-10-30)

| # | Decision | Answer | Source | Spec section |
|---|---|---|---|---|
| Q1.1 | What the history can do | **"Add"** if the song isn't in the setlist; **"Use key"** if it is | user | Scope |
| Q1.2 | Which setlists count as "past" | The same worship leader's setlists dated **before today**, not counting the one being edited | recommendation accepted | Data model |
| Q1.3 / Q2.3 | Layout | **One row per song + key**, using `SongCard` (tags in `badgeSlot`, key and button in `actionsSlot`) | user (overrides the badge layout) | AC |
| Q3.1 | Repeat performances | Same song in the same key → one row with "×N"; button states are Add / Use key / Current (disabled) | recommendation accepted | AC |
| Q3.2 | Sort order | Titles A–Z; a song's key rows newest first | user | AC |
| Q3.3 / A1 | Date text on each row | Date only, no setlist name. Format `YYYY-MM-DD` (e.g. `2026-06-10`), showing the latest time that song was sung in that key | user | AC |
| Q1.4 | Where it opens | A modal from a **"History"** button next to the worship leader select; full screen on mobile | recommendation accepted | AC |
| Q1.5 | Where the button appears | New-setlist and edit pages, as soon as a leader is selected (before saving too); hidden on "None" | recommendation accepted | Scope |
| Q1.6 | Loading | One query, no paging; loading, empty ("No past setlists for <name>") and error/retry states | recommendation accepted | NFR |
| Q2.1 | Edit-page wiring | `SetlistPeopleSection` moves **inside** `SetlistBuilderClient` in edit mode, with a new `onWorshipLeaderChange` callback | recommendation accepted | Integration |
| Q2.2 | When changes save | Add / Use key only change the builder's list; they're written on **Save** | recommendation accepted | Integration |
| Q2.4 | After an action | The modal stays open, the row updates in place, and a screen-reader message (`aria-live`) confirms | recommendation accepted | AC |
| Q2.5 | Cloned setlists | Counted like any other setlist | recommendation accepted | Data model |
| — | Tag filter | The local chip pattern from `LibraryPanel` (All / Joyful / Solemn / Hymn), checked against the song's **current** tags | code `LibraryPanel.tsx:36-120` | AC |
| — | Who can see it | Music directors already see all setlists through existing database rules, so no rule changes are needed | code `p2_rls_scoping.sql:12-35` | NFR |
| — | Changes to the database or server code | None. One new read-only server action fetches the history; Add / Use key reuse `handleAdd` and `handleKeyChange` | code | Data model |

Note recorded with A1: `setlists.date` is `timestamptz`; the date is shown using the same `slice(0, 10)` convention as the edit page (`edit/page.tsx:182`).

---

## Analysis

### Acceptance Criteria

**Button**
- [ ] A **"History"** button appears beside the "Assign Worship Leader" select on the **new-setlist** builder once a worship leader is selected, even though the selection is not saved yet.
- [ ] The same button appears beside the select on the **edit** page (`/setlists/[id]/edit`) once a worship leader is selected.
- [ ] The button is not rendered when the select is set to "— None —".
- [ ] The button has an accessible name and is reachable by keyboard (derived).

**Data**
- [ ] The history includes only setlists whose `worship_leader_id` equals the selected musician **and** whose date is before today.
- [ ] The setlist currently being edited is excluded, even if it is dated in the past.
- [ ] Setlists from any owner, private ones included, are included for a music director (derived, follows existing RLS).
- [ ] Cloned setlists dated before today are counted like any other setlist.
- [ ] History is fetched in a single read-only server action call with no pagination; no migration and no write action is added.

**List**
- [ ] Each distinct (song, `performance_key`) pair renders as **one row** using `SongCard`. A song sung in two different keys produces two rows.
- [ ] Repeat performances of the same song in the same key collapse into one row with a "×N" count.
- [ ] Each row shows the date of the most recent performance in that key, formatted `YYYY-MM-DD`, with no setlist name.
- [ ] Rows are sorted by song title A–Z; rows for the same song are sorted by most recent date first.
- [ ] Each row shows the song's current tags (`SongTagBadge`) and the key (`SongKeyBadge`).

**Tag filter**
- [ ] Chips All / Joyful / Solemn / Hymn filter the rows by the song's **current** `songs.tags`, case-insensitive, matching LibraryPanel behaviour.
- [ ] "All" is selected by default and shows every row.

**Actions**
- [ ] When the song is not in the builder's song list, the row button reads **"Add"**; clicking it appends the song to the setlist with `performanceKey` set to that row's key.
- [ ] When the song is in the list in a different key, the button reads **"Use key"**; clicking it sets that song's `performanceKey` to the row's key.
- [ ] When the song is in the list in the same key, the button reads **"Current"** and is disabled.
- [ ] After any action the modal stays open and every row for that song updates its button state immediately (e.g. after "Add" on the G row, the A row shows "Use key").
- [ ] Each action is announced through an `aria-live` region.
- [ ] Actions change only local builder state; nothing is written until the user clicks **Save**, and the existing unsaved-change detection picks up the change (derived).
- [ ] After Save, the added songs and applied keys persist (verifiable by reloading the setlist).

**States and layout**
- [ ] A loading indicator shows while history is fetched.
- [ ] With no qualifying setlists, the modal shows "No past setlists for <name>".
- [ ] When the fetch fails, an error message with a Retry control is shown.
- [ ] The modal is full screen on mobile widths and can be closed by keyboard (Escape) and by a close button (derived).
- [ ] Artisan palette classes, including `dark:` pairs, are used per `docs/coding-guidelines.md` (derived).

**Edit-page wiring**
- [ ] On the edit page, `SetlistPeopleSection` is rendered by `SetlistBuilderClient` (not as a sibling in `page.tsx`) and reports the selected leader through a new `onWorshipLeaderChange` callback.
- [ ] Worship leader and lineup save behaviour on the edit page is unchanged: it still saves immediately through `setSetlistWorshipLeader` (derived, regression).

### Scope & Out-of-Scope

- **In scope:** the History button, history modal, one new read-only server action, tag filtering, Add / Use key actions on local builder state, moving the People section into the builder on the edit page.
- **Out of scope:**
  - Any database migration, new RLS policy, or change to `addSongToSetlist` / `updatePerformanceDetails`.
  - Search box, pagination, or sorting options inside the modal.
  - Showing the setlist name or every performance date per row.
  - Marking or excluding cloned setlists.
  - History for musicians other than the worship leader (lineup members).
  - Showing the history on the read-only setlist viewer (`/setlists/[id]`).
  - Custom (non-standard) tags as filter chips.

### Ambiguities & Risks

- **Timezone of "before today" and the displayed date.** `setlists.date` is `timestamptz`. `slice(0, 10)` gives the UTC date, so a service at 06:00 Manila time (UTC+8) shows the previous day, and the "before today" cut-off can be off by one at day boundaries. The spec should fix whether "today" is computed server-side in UTC or in the user's local zone.
- **"Use key" with the same song in the list twice:** impossible today because the builder blocks duplicates (`addedIds`), but the history must keep keying on `songId`.
- **Keys outside the selectable list:** `performance_key` is free text in the DB. A legacy value that `SongKeySelect` doesn't offer would be applied but might not render in the row's dropdown. Consider disabling actions for keys not in the canonical `NOTES` list.
- **Edit-page refactor risk:** moving `SetlistPeopleSection` changes the render tree of the edit page. Watch for lost state, duplicated People sections, or broken lineup add/remove.
- **Edit-page `allSongs` has no tags** (`edit/page.tsx:143-148`). The history action must select `songs.tags` itself rather than relying on the builder's library list.
- **Stale history after edits:** setlists saved in another tab won't appear until the modal refetches. Fetching on each open is the assumed behaviour.
- **Scale:** no pagination is fine at roughly a few hundred rows per leader. Revisit if a leader has many years of history.

### Codebase-Aware Notes

**Expected to change**
- `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx`: add the History button beside the select (L126-L144).
- `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx`: add the History button beside the select (around L213) plus the `onWorshipLeaderChange` callback.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`: render `SetlistPeopleSection` in edit mode; pass `localSongs`, `handleAdd` (L127) and `handleKeyChange` (L150) to the modal. Add-with-key is `handleAdd` followed by `handleKeyChange`; the save path already writes changed keys (L216-L220, L330-L333).
- `src/app/setlists/[id]/edit/page.tsx`: remove the sibling `SetlistPeopleSection` (L159-L174) and pass `initialWorshipLeaderId`, musicians and lineup to `SetlistBuilderClient` instead.
- `src/app/actions/setlistActions.ts`: add the read-only history action (e.g. `getWorshipLeaderSongHistory({ musician_id, exclude_setlist_id })`), following the existing `{ data, error }` return shape and `auth.getUser()` check.

**Reuse**
- `src/components/client/SongCard.tsx`: row rendering (`badgeSlot`, `actionsSlot`, `footerSlot` for the date).
- `src/components/SongKey/SongKeyBadge.tsx` and `src/components/SongTags/SongTagBadge.tsx`.
- `src/components/client/SetlistBuilder/LibraryPanel.tsx` L36-L120: local tag-chip filter pattern. `TagFilterBar.tsx` is URL-driven and not suitable.
- `src/types/Song.ts`: `STANDARD_SONG_TAGS`.
- `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` and `src/components/client/AppendSongsModal.tsx`: existing dialog patterns to mirror.

**Net-new**
- History modal component (e.g. `src/components/client/SetlistBuilder/WorshipLeaderHistoryModal.tsx`).
- Grouping/sorting helper (song + key → count and last date). It has branch and sort logic, so it needs a unit test under `src/app/actions/__tests__/` or next to the helper (`npm run test:unit`).

**Data (verified)**
- `setlists.worship_leader_id` → `musicians.id`, indexed: `supabase/migrations/20260426000002_setlist_musicians_and_worship_leader.sql`.
- `setlist_songs.performance_key text NOT NULL`: `supabase/migrations/20260415000003_create_setlist_songs_table.sql`.
- `songs.tags text[]`: `supabase/migrations/20261021000000_add_tags_to_songs.sql`.
- Music-director read access to all setlists and setlist songs: `supabase/migrations/20261017010000_p2_rls_scoping.sql` L12-L35.
