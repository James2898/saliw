# Spec — Setlist People Section (Worship Leader + Lineup)

## Feature Summary

Surface the worship leader and instrumentalist lineup on two existing pages: the setlist edit page (assignable by music directors) and the setlist viewer (read-only for all authenticated users). A new client component `SetlistPeopleSection` encapsulates all three sub-sections — worship leader select, lineup list, and add-musician row — and is mounted above the songs panel on the edit page. The viewer page receives new props (`worshipLeaderName`, `lineup`) and renders a static read-only header above the song sections. All required Server Actions (`setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`, `getSetlistLineup`, `listMusicians`) already exist and are not modified by this task.

---

## Acceptance Criteria

### SetlistPeopleSection component (edit page)

1. The component file exists at `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` and is a `'use client'` component.

2. The component accepts exactly these props (TypeScript signature must match):
   ```ts
   interface SetlistPeopleSectionProps {
     setlistId: string
     initialWorshipLeaderId: string | null
     allMusicians: Musician[]
     initialLineup: SetlistLineupEntry[]
     isMusicDirector: boolean
   }
   ```

3. All state initializers use the lazy `useState(() => value)` form — never bare `useState(value)` seeded from props — to satisfy the React Compiler constraint (MEMORY.md BUG-001).

4. **Worship leader subsection — MD view:** A `<select>` element renders with one option per musician (value = `musician.id`, label = `musician.name`), a leading "— None —" option (value `""`), and the currently assigned worship leader pre-selected.

5. On worship leader `<select>` change, `setSetlistWorshipLeader({ setlist_id: setlistId, worship_leader_id: selectedId || null })` is called immediately (no save button). While the call is in-flight, the select is `disabled`.

6. If `setSetlistWorshipLeader` returns an error, it is displayed inline below the select as a non-dismissible `role="alert"` text element; the select is re-enabled.

7. On success, local state is updated to the new `worship_leader_id`; no full page navigation occurs (optimistic-first, confirmed on success — see State Management Decision below).

8. **Worship leader subsection — non-MD view:** The select is replaced by a plain `<span>` showing the resolved musician name, or the text "Unassigned" if `worship_leader_id` is null. No interactive control is rendered.

9. **Lineup list subsection — MD view:** Each `SetlistLineupEntry` in local lineup state is rendered as a row showing `"{musician.name} — {instrument}"` plus a "Remove" button.

10. Clicking "Remove" calls `removeSetlistMusician({ id: entry.id, setlist_id: setlistId })`. While the call is in-flight for that specific row, only that row's Remove button is `disabled` (not the entire section).

11. If `removeSetlistMusician` returns an error, the error is displayed inline within the row as a `role="alert"` element; the Remove button is re-enabled for that row.

12. On successful remove, the row is removed from local lineup state immediately upon server confirmation (not optimistic removal — see State Management Decision).

13. **Lineup list subsection — non-MD view:** Lineup rows render as plain text `"{musician.name} — {instrument}"` with no Remove button.

14. **Empty lineup state:** When the lineup array is empty and the user is an MD, the lineup area shows a short placeholder message (e.g. "No musicians added yet.") instead of an empty list.

15. **Add-musician row — MD only:** A row containing a musician `<select>` (listing all musicians by name), a free-text `<input type="text">` for instrument, and an "Add" button. This row is not rendered for non-MDs.

16. The "Add" button is `disabled` when either the musician select has no selection (value `""`) or the instrument input is empty after trim. Validation is client-side before calling the Server Action.

17. On "Add" click, `addSetlistMusician({ setlist_id: setlistId, musician_id: selectedMusicianId, instrument: instrument.trim() })` is called. While the call is in-flight, the "Add" button is `disabled` and shows a loading label.

18. On successful add, the returned `DbSetlistMusician` row is used to construct a `SetlistLineupEntry` (by resolving the musician name from `allMusicians`) and appended to local lineup state. The musician select and instrument input are reset to empty. No full page navigation occurs.

19. If `addSetlistMusician` returns the duplicate-instrument error (`"That musician is already assigned to that instrument."`), it is displayed inline below the add row as a `role="alert"` element. Any other error string from the action is also surfaced inline at the same location.

20. The add-row inline error is cleared when the user modifies either the musician select or the instrument input after an error.

21. **Empty musician roster:** When `allMusicians` is an empty array, both the worship leader select and the add-row musician select render a single disabled option with the text "No musicians in roster". The "Add" button remains disabled.

22. **Artisan palette:** Every static Artisan palette Tailwind class in the new component has a paired `dark:` variant (BUG-004). Specifically: `bg-brand-cream` / `dark:bg-brand-espresso`, `text-brand-espresso` / `dark:text-brand-cream`, `text-brand-brown` / `dark:text-brand-tan`, `border-brand-brown/20` / `dark:border-brand-tan/20`. Do not use `variant="secondary"` on `Button`.

23. No `useCallback` dependency array references an object property path (e.g. `[entry.id]` inside a factory function is fine; `[entry.musicians.name]` is not). Whole-object references or primitive values must be used in dependency arrays (BUG-002).

24. Any handler function that references variables declared below it in the component body must be reordered so all declarations precede the first `useEffect` or `useCallback` that references them (BUG-007).

### Edit page changes (src/app/setlists/[id]/edit/page.tsx)

25. The edit page fetches musicians and lineup in parallel with existing data using `Promise.all`:
    ```ts
    const [
      { data: songsRaw, error: songsError },
      { data: allSongsRaw, error: libraryError },
      { data: musiciansRaw },
      { data: initialLineupRaw },
    ] = await Promise.all([
      getSetlistWithSongs({ setlist_id: id }),
      getAllSongs(),
      listMusicians(),
      getSetlistLineup({ setlist_id: id }),
    ])
    ```

26. If `listMusicians` or `getSetlistLineup` returns an error, the edit page does not crash or redirect; it passes an empty array (`[]`) for the failed fetch and continues rendering. The people section will render with an empty list.

27. `<SetlistPeopleSection>` is rendered above `<SetlistBuilderClient>` within the same `max-w-5xl` container, inside a `<Card>` or equivalent visual separator to maintain Artisan aesthetic.

28. `SetlistPeopleSection` receives:
    - `setlistId={id}`
    - `initialWorshipLeaderId={setlist.worship_leader_id}`
    - `allMusicians={(musiciansRaw ?? []).map(m => ({ id: m.id, name: m.name, notes: m.notes }))}`
    - `initialLineup={initialLineupRaw ?? []}`
    - `isMusicDirector={true}` (only MDs reach this page — already enforced by the redirect guard at line 50)

### Viewer page changes (src/app/setlists/[id]/page.tsx and SetlistViewerClient.tsx)

29. The viewer page (`page.tsx`) fetches musicians and lineup in parallel alongside existing data using `Promise.all`:
    ```ts
    const [
      { data: songsRaw, error: songsError },
      { data: musiciansRaw },
      { data: lineupRaw },
    ] = await Promise.all([
      getSetlistWithSongs({ setlist_id: id }),
      listMusicians(),
      getSetlistLineup({ setlist_id: id }),
    ])
    ```

30. The worship leader name is resolved server-side in `page.tsx` by looking up `setlist.worship_leader_id` in the `musiciansRaw` array: `musiciansRaw?.find(m => m.id === setlist.worship_leader_id)?.name ?? null`. This avoids an extra DB round-trip and leverages data already fetched by `listMusicians`. (See Resolved Ambiguities — Worship Leader Name Resolution.)

31. `SetlistViewerClient` receives two new props:
    ```ts
    worshipLeaderName: string | null
    lineup: Array<{ name: string; instrument: string }>
    ```

32. `SetlistViewerClientProps` is extended with these two new fields. Both are optional-safe: `worshipLeaderName` may be `null`, `lineup` may be an empty array.

33. The viewer renders a read-only "People" block in `SetlistViewerClient`, positioned between the setlist title/date row and the `ServiceNavigator`:
    - "Worship Leader: {name}" — rendered only when `worshipLeaderName` is non-null and non-empty.
    - "Lineup: {name} — {instrument}, {name} — {instrument}, …" — rendered as a comma-separated inline string, only when `lineup.length > 0`.
    - When both are absent (null WL + empty lineup), the entire people block is not rendered (no empty container, no placeholder text).

34. The people block in the viewer uses read-only text elements only (no inputs, selects, or buttons).

35. The people block styling follows the Artisan palette: musician names in `text-brand-espresso dark:text-brand-cream`, label prefixes in `text-brand-brown dark:text-brand-tan`, consistent with the existing `formattedDate` paragraph style.

36. If `listMusicians` or `getSetlistLineup` returns an error on the viewer page, the viewer renders normally without the people block (passes `worshipLeaderName: null` and `lineup: []`). The songs section is not affected.

### State management

37. All add/remove/WL-change operations in `SetlistPeopleSection` use **server-confirm before local state update** (not optimistic). Local state is updated only after the Server Action returns `{ data, error: null }`. If the action returns an error, local state is not modified. (See Resolved Ambiguities — State Management Decision.)

### Clone and delete behavior

38. Cloning a setlist preserves the worship leader and lineup. This is already implemented in `cloneSetlist` (confirmed in `setlistActions.ts` lines 461–547); no code changes are required for clone behavior.

39. When a musician is deleted from the musicians roster, `setlists.worship_leader_id` is set to `NULL` by the database `ON DELETE SET NULL` constraint. The component does not need to handle this client-side; re-fetching on next page load is sufficient.

### TypeScript and build

40. `npx tsc --noEmit` exits with code 0 after all changes.

41. `npm run build` succeeds with no errors.

---

## Out of Scope

- Per-song musician assignment.
- Drag-and-drop reordering of lineup entries.
- Singer/vocal part cleanup or voice-part tagging.
- Adding a new musician directly from within `SetlistPeopleSection` (must go to `/musicians/new`).
- Public (unauthenticated) access to lineup data.
- Any change to existing Server Actions in `setlistActions.ts` or `musicianActions.ts`.
- Any new Supabase RLS policies.
- Pagination or search within the musician select dropdowns.
- Realtime sync of WL / lineup changes to followers (the live sync channel is songs-only).

---

## Fallback Behaviors

- **`listMusicians` error on edit page:** Pass `allMusicians={[]}` to `SetlistPeopleSection`. Both musician selects render a disabled "No musicians in roster" option. Add button is disabled. The songs panel is unaffected.
- **`getSetlistLineup` error on edit page:** Pass `initialLineup={[]}` to `SetlistPeopleSection`. Lineup renders the empty-state placeholder. The songs panel is unaffected.
- **`listMusicians` error on viewer page:** Pass `worshipLeaderName={null}` (WL ID cannot be resolved) and `lineup={[]}`. The people block is hidden entirely.
- **`getSetlistLineup` error on viewer page:** Pass `lineup={[]}`. Only the lineup row is hidden; the WL line is still shown if `worship_leader_id` is non-null and was resolved from the (potentially successful) `listMusicians` call.
- **`setSetlistWorshipLeader` action error:** Inline error below the select; select re-enabled; local state unchanged.
- **`addSetlistMusician` duplicate error (code 23505):** Inline error below the add row with the exact server message `"That musician is already assigned to that instrument."`.
- **`addSetlistMusician` other error:** Inline error below the add row with the server-returned string.
- **`removeSetlistMusician` action error:** Inline error within the affected row; Remove button re-enabled; row remains in local state.
- **`removeSetlistMusician` not-found (action returns no error but count is 0):** The current `removeSetlistMusician` implementation does not check `count` (unlike `removeSongFromSetlist`). If the delete silently no-ops (row already gone), the action returns `{ data: { id }, error: null }` and the component removes the row from local state — which is the correct end state. No special handling required.

---

## Resolved Ambiguities

- **State management: optimistic vs. server-confirm** → Resolved as **server-confirm before local state update**. Rationale: lineup operations are infrequent (user is in an edit flow, not a performance flow), the round-trip latency is acceptable, and optimistic updates would require rollback logic that introduces complexity. The existing `SetlistBuilderClient` pattern also uses server-confirm (save button collects all changes before persisting). Source: codebase pattern analysis.

- **Worship leader name resolution in viewer** → Resolved as **client-side lookup in the `musiciansRaw` array already fetched by `listMusicians`**. The `getSetlistById` action already returns `worship_leader_id`. `listMusicians` is fetched in parallel for lineup resolution anyway. Performing the `find` in `page.tsx` server-side avoids adding a new join query or a second DB call. This is the lowest-cost approach and consistent with the existing pattern of resolving display values from already-fetched collections. Source: `setlistActions.ts` `getSetlistById` return shape (line 17) + `musicianActions.ts` `listMusicians` (line 12).

- **Unique constraint on setlist_musicians: is it per (musician_id) or per (musician_id, instrument)?** → Resolved as **per (musician_id, instrument) composite**. The `addSetlistMusician` action handles error code `23505` with the message "That musician is already assigned to that instrument." (line 634–636 of `setlistActions.ts`), confirming the unique constraint is on the composite key. A musician can therefore appear in the lineup twice with different instruments (e.g. guitar + vocals). Source: `setlistActions.ts` line 634.

- **Inline error placement for add-row vs. row-level errors** → Resolved as: add-row errors appear below the add row (single shared error slot); remove errors appear inline within the specific lineup row being removed. This keeps error proximity clear without requiring a per-row error state on the lineup list.

- **Whether non-MD users see the edit page at all** → Resolved: the edit page already redirects non-MDs to the viewer at line 50–52 of `edit/page.tsx`. `isMusicDirector` is therefore always `true` for anyone who renders `SetlistPeopleSection` on the edit page; the prop is retained for component reusability but its value is guaranteed on this page.

- **Viewer page: should lineup be passed as `SetlistLineupEntry[]` or a simplified shape?** → Resolved as a **simplified shape** `Array<{ name: string; instrument: string }>` derived server-side in `page.tsx`. The viewer has no need for `id` or `musician_id`; passing only the display fields reduces prop surface and avoids exposing internal IDs in the client component.

- **`removeSetlistMusician` count check gap** → Noted but not a blocker. The action currently returns `{ data: { id }, error: null }` even if 0 rows were deleted (unlike `removeSongFromSetlist` which checks `count`). In practice this means a stale-ID remove silently succeeds from the component's perspective and removes the row from local state, which is the correct end state. The action-level gap is out of scope for this task.
