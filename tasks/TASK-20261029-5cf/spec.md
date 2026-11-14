<Spec — Worship Leader Song History in the Setlist Builder>
## Feature Summary
This feature introduces a Worship Leader Song History capability directly into the Saliw Setlist Builder. When a worship leader is assigned to a setlist (on either the new-setlist builder or the edit-setlist page), a "History" button appears next to the worship leader select dropdown. Clicking this button opens a modal showing past songs sung by that worship leader from setlists dated before today (excluding the current setlist). Each unique song and performance key combination is displayed as a row using the `SongCard` component, with repeat performances in the same key collapsed into a single row showing a repeat count (×N) and the latest performance date (YYYY-MM-DD). Music directors can filter history rows by song tags (All, Joyful, Solemn, Hymn) and quickly add a song to the setlist ("Add") or adopt the worship leader's historical key for a song already in the setlist ("Use key"). All actions update local builder state immediately while keeping the modal open, persisting only when the setlist is saved.

## Acceptance Criteria
1. **Trigger Button Visibility & Placement:**
   - On the new setlist builder (`/setlists/new`), a "History" button is rendered adjacent to the "Assign Worship Leader" select dropdown as soon as a worship leader is selected, even prior to saving the setlist.
   - On the edit setlist page (`/setlists/[id]/edit`), the "History" button is rendered adjacent to the worship leader select dropdown whenever a worship leader is assigned or selected.
   - When the worship leader select dropdown is set to "— None —" (or unassigned), the "History" button is not rendered.
   - The button has an accessible name (e.g. `aria-label="View song history for [Leader Name]"`) and follows standard sibling button height (`h-8` / `px-3 py-1.5 text-xs font-semibold rounded-lg`).

2. **Modal Interaction & Responsiveness:**
   - Clicking the "History" button opens a modal displaying song history for the currently selected worship leader, with the leader's name visible in the modal header.
   - The modal renders full-screen on mobile viewports (<640px) and as a centered overlay dialog on desktop viewports.
   - The modal can be closed via a visible close button (`X`), pressing the `Escape` key, or clicking the backdrop overlay.
   - Focus is managed accessibly within the modal while open and returned to the trigger button upon closure.

3. **History Data Scope & Query:**
   - A single read-only server action <must match codebase convention — see context.md "Patterns to Follow"> fetches past performance history for the given `worship_leader_id`.
   - The query includes only setlists where `worship_leader_id` matches the selected musician and the setlist `date` is strictly before today's date (`date < today`, following the `slice(0, 10)` date convention).
   - The setlist currently being edited (matching `setlistId` in edit mode) is excluded from the query results, even if its date is in the past.
   - Setlists across any owner (including private setlists) are accessible to music directors per existing RLS policies.
   - Cloned setlists dated before today are included normally.
   - The fetch is performed in a single call with no pagination; no database migrations or schema alterations are introduced.

4. **Row Grouping, Presentation, & Card Composition:**
   - History items are grouped and displayed as one row per unique `(song_id, performance_key)` pair using the `SongCard` component.
   - A song performed in multiple different keys renders as separate rows (one row per distinct key).
   - Repeat performances of the same song in the exact same key collapse into a single row displaying a repeat count badge "×N" (where N >= 2). A single performance does not show a multiplier badge.
   - Each row displays the date of the most recent performance of that song in that key, formatted as `YYYY-MM-DD` (date only, no setlist title or venue name).
   - Each row displays the song's current tags via `SongTagBadge` in `badgeSlot`, and displays the key via `SongKeyBadge`, repeat multiplier (if N >= 2), latest date text, and action button in `actionsSlot`.

5. **Sorting:**
   - Rows are sorted primarily by song title in alphabetical order (A–Z, case-insensitive).
   - Multiple key rows for the same song are sorted secondarily by most recent performance date descending (newest performance first).

6. **Tag Filtering:**
   - Filter chips for `All`, `Joyful`, `Solemn`, and `Hymn` are rendered at the top of the modal body (matching `LibraryPanel` behavior).
   - "All" is selected by default and displays all history rows.
   - Clicking a filter chip filters visible rows client-side against the song's current `songs.tags` array (case-insensitive).
   - If a song possesses multiple tags, selecting any of its matching tags displays the row.

7. **Row Action Button States & Dynamics:**
   - **"Add":** When the song is not present in the setlist builder's song list, the row button displays "Add". Clicking it appends the song to the builder's setlist with `performanceKey` initialized to that row's key.
   - **"Use key":** When the song is already present in the setlist builder's song list but with a different `performanceKey`, the row button displays "Use key". Clicking it updates the song's `performanceKey` in the builder to that row's key.
   - **"Current":** When the song is already present in the setlist builder's song list with the identical `performanceKey`, the row button displays "Current" and is disabled.
   - Clicking "Add" or "Use key" keeps the modal open.
   - Upon clicking "Add" or "Use key", all rows for that song inside the modal immediately update their button states in place (e.g. the selected row transitions to "Current", while sibling key rows for that song transition to "Use key").
   - An `aria-live="polite"` announcement confirms each action to screen readers (e.g., announcing the song added or key updated).

8. **State Management & Persistence:**
   - Actions in the modal modify only local in-memory setlist builder state (reusing existing `handleAdd` and `handleKeyChange` handlers).
   - Performing an action marks the builder as having unsaved changes (triggering the existing dirty-state prompt on page exit).
   - Songs added and key changes applied persist to the database only when the user clicks the builder's "Save" button.

9. **UI States (Loading, Empty, Error):**
   - While the history query is in flight, the modal displays a loading spinner or skeleton placeholder.
   - If the worship leader has no qualifying past setlists or songs, the modal displays the empty state: "No past setlists for <Leader Name>".
   - If the server action fails or errors, the modal displays an error message ("Unable to load song history") with a functional "Retry" control.

10. **Edit Page Component Integration:**
    - On the edit page (`/setlists/[id]/edit`), `SetlistPeopleSection` is rendered inside `SetlistBuilderClient` (instead of as a sibling in `page.tsx`) and provides an `onWorshipLeaderChange` callback.
    - Existing auto-saving of worship leader assignments and lineup changes on the edit page (via `setSetlistWorshipLeader`) remains intact without regression.

11. **Design System & Contrast:**
    - All modal elements, cards, chips, and buttons utilize Artisan Palette tokens (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`).
    - All UI elements meet WCAG AA contrast compliance across light and dark modes.

## Out of Scope
- Modifying database schemas, altering tables, or writing Supabase SQL migrations.
- Adding database mutation server actions specifically for history actions (history operations reuse existing local builder state mutations and save action).
- Paginated or infinite-scrolling queries for history items.
- Including setlists dated today or in the future.
- Viewing song performance history for musicians or vocalists other than the assigned worship leader.
- Displaying setlist names, service types, or notes in the history rows.
- Direct editing or deleting of past setlist records from within the history modal.
- Free-text search input or custom date range filters within the history modal.

## Fallback Behaviors
- **Failed History Fetch:** When the history query fails or throws an exception, the modal displays an error alert with hint text and a "Retry" button; song action buttons are hidden until a successful retry.
- **Empty History:** When a worship leader has no qualifying past setlists before today, an empty state banner displays "No past setlists for <Leader Name>".
- **Worship Leader Swapped Mid-Session:** If the user selects a different worship leader while the modal or trigger is active, the history query re-executes for the new worship leader ID.

## Resolved Ambiguities
- **Button placement & activation** → Rendered beside "Assign Worship Leader" select dropdown on both new-setlist and edit pages as soon as a worship leader is chosen, even before saving. Hidden when set to "— None —". (Source: Grill Q1.4, Q1.5)
- **Past setlist criteria** → Setlists where `worship_leader_id` matches the selected musician and `date < today` (excluding the setlist currently being edited). Cloned setlists dated before today are included. (Source: Grill Q1.2, Q2.5)
- **Multi-key and repeat performances** → One row per unique (song, key) pair using `SongCard`. Repeats in the same key collapse to one row with a "×N" multiplier and latest date `YYYY-MM-DD` (via `slice(0, 10)`). (Source: Grill Q1.3, Q2.3, Q3.1, Q3.3 / A1)
- **Sorting order** → Song titles sorted A–Z; multiple key rows for the same song sorted newest performance date first. (Source: Grill Q3.2)
- **Action capability & modal lifecycle** → Row buttons show "Add" (if not in setlist), "Use key" (if in setlist in different key), or "Current" (disabled if in setlist in same key). Modal stays open after action; rows update in-place dynamically and announce via `aria-live`. (Source: Grill Q1.1, Q2.4, Q3.1)
- **Save lifecycle** → History actions mutate only local builder state; written to the database only when the user clicks "Save". Edit-page leader assignment auto-saves as before. (Source: Grill Q2.1, Q2.2)
- **Tag filter set** → Filter chips for `All`, `Joyful`, `Solemn`, `Hymn` matching `LibraryPanel`, evaluated case-insensitively against current song tags. (Source: Grill / `LibraryPanel.tsx`)
