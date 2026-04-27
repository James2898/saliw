# TASK-033 — Setlist People Section (Worship Leader + Lineup)

- **Tier:** 2
- **Date Created:** 2026-04-27
- **Status:** In Progress

---

## Feature Summary

Surface the worship leader and instrumentalist lineup on two existing setlist pages. A new `'use client'` component `SetlistPeopleSection` is added to the setlist edit page so music directors can assign a worship leader (via an immediate-change select), add instrumentalists (musician select + free-text instrument field), and remove lineup entries — with inline errors on all write operations. The setlist viewer page gains two read-only display elements (worship leader name and a comma-joined lineup string) rendered above the song navigator. All five required Server Actions (`setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`, `getSetlistLineup`, `listMusicians`) already exist and are not modified by this task. No schema migrations, new RLS policies, or backend changes are needed.

---

## Acceptance Criteria

### SetlistPeopleSection component (`src/components/client/SetlistBuilder/SetlistPeopleSection.tsx`)

1. The component file exists at `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` and carries the `'use client'` directive.

2. The component accepts exactly these props (TypeScript signature must match verbatim):
   ```ts
   interface SetlistPeopleSectionProps {
     setlistId: string
     initialWorshipLeaderId: string | null
     allMusicians: Musician[]
     initialLineup: SetlistLineupEntry[]
     isMusicDirector: boolean
   }
   ```

3. All state initializers use the lazy `useState(() => value)` form — never bare `useState(propValue)` seeded directly from a prop — to satisfy the React Compiler constraint (BUG-001).

4. **Worship leader subsection — MD view:** A `<select>` renders with a leading "— None —" option (`value=""`), one option per musician (`value={musician.id}`, label `musician.name`), and the currently assigned worship leader pre-selected. On change, `setSetlistWorshipLeader({ setlist_id: setlistId, worship_leader_id: selectedId || null })` is called immediately (no save button). While the call is in-flight, the select is `disabled`.

5. If `setSetlistWorshipLeader` returns an error, the error is displayed inline below the select as a `role="alert"` text element (non-dismissible); the select is re-enabled. Local state is not modified.

6. On `setSetlistWorshipLeader` success, local worship-leader state is updated to the new `worship_leader_id`. No full page navigation occurs.

7. **Worship leader subsection — non-MD view:** The select is replaced by a plain `<span>` showing the resolved musician name (looked up from `allMusicians`), or the text `"Unassigned"` if `worship_leader_id` is null. No interactive control is rendered.

8. **Lineup list subsection — MD view:** Each `SetlistLineupEntry` in local lineup state renders as a row showing `"{musician.name} — {instrument}"` plus a "Remove" button.

9. Clicking "Remove" calls `removeSetlistMusician({ id: entry.id, setlist_id: setlistId })`. While the call is in-flight for that specific row, only that row's Remove button is `disabled`; other rows are unaffected.

10. If `removeSetlistMusician` returns an error, the error is displayed inline within that row as a `role="alert"` element; the Remove button for that row is re-enabled; local state is not modified.

11. On successful remove, the row is removed from local lineup state only after server confirmation. Local state is not modified before the Server Action returns success (server-confirm pattern, not optimistic).

12. **Lineup list subsection — non-MD view:** Lineup rows render as plain text `"{musician.name} — {instrument}"` with no Remove button.

13. **Empty lineup state (MD):** When the lineup array is empty and the user is an MD, the lineup area shows the placeholder text `"No musicians added yet."` instead of an empty list.

14. **Add-musician row — MD only:** A row containing a musician `<select>` (listing all musicians by name), a free-text `<input type="text">` for instrument, and an "Add" button. This row is not rendered for non-MDs.

15. The "Add" button is `disabled` when either the musician select has no selection (value `""`) or the instrument input is empty after `.trim()`. This validation is client-side and does not invoke the Server Action.

16. On "Add" click, `addSetlistMusician({ setlist_id: setlistId, musician_id: selectedMusicianId, instrument: instrument.trim() })` is called. While the call is in-flight, the "Add" button is `disabled` and shows a loading label.

17. On successful add, the returned `DbSetlistMusician` row is used to construct a new `SetlistLineupEntry` by resolving the musician name from `allMusicians`, and the entry is appended to local lineup state. The musician select and instrument input are both reset to empty. No full page navigation occurs.

18. If `addSetlistMusician` returns the duplicate-instrument error (code 23505), the exact server message `"That musician is already assigned to that instrument."` is displayed inline below the add row as a `role="alert"` element. Any other error string from the action is surfaced inline at the same location.

19. The add-row inline error is cleared when the user modifies either the musician select or the instrument input after an error.

20. **Empty musician roster:** When `allMusicians` is an empty array, both the worship leader select and the add-row musician select render a single disabled option with text `"No musicians in roster"`. The "Add" button remains disabled.

21. Every Artisan palette Tailwind class in the component has a paired `dark:` variant (BUG-004). Required pairs: `bg-brand-cream` / `dark:bg-brand-espresso`, `text-brand-espresso` / `dark:text-brand-cream`, `text-brand-brown` / `dark:text-brand-tan`, `border-brand-brown/20` / `dark:border-brand-tan/20`. Do not use `variant="secondary"` on `<Button>`.

22. No `useCallback` dependency array references an object property path (e.g. `[entry.musicians.name]` is forbidden; `[entry.id]` or whole-object `[entry]` is acceptable) (BUG-002).

23. All handler functions referenced in a `useEffect` or `useCallback` are declared above that hook in the component body (BUG-007).

### Edit page changes (`src/app/setlists/[id]/edit/page.tsx`)

24. Musicians and lineup are fetched in parallel with existing data via `Promise.all`:
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

25. If `listMusicians` or `getSetlistLineup` returns an error, the page does not crash or redirect. It passes `[]` for the failed fetch and continues rendering normally.

26. `<SetlistPeopleSection>` is rendered above `<SetlistBuilderClient>` within the existing `max-w-5xl` container, inside a `<Card>` or equivalent visual separator to maintain the Artisan aesthetic.

27. `SetlistPeopleSection` receives:
    - `setlistId={id}`
    - `initialWorshipLeaderId={setlist.worship_leader_id}`
    - `allMusicians={(musiciansRaw ?? []).map(m => ({ id: m.id, name: m.name, notes: m.notes }))}`
    - `initialLineup={initialLineupRaw ?? []}`
    - `isMusicDirector={true}` (non-MDs are already redirected at lines 50–52; hardcoding is safe)

### Viewer page changes (`src/app/setlists/[id]/page.tsx` and `SetlistViewerClient.tsx`)

28. The viewer page fetches musicians and lineup in parallel with the existing setlist fetch:
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

29. The worship leader name is resolved server-side in `page.tsx` by looking up `setlist.worship_leader_id` in `musiciansRaw`:
    ```ts
    const worshipLeaderName = musiciansRaw?.find(m => m.id === setlist.worship_leader_id)?.name ?? null
    ```
    This avoids an extra DB round-trip; `listMusicians` is already fetched for lineup resolution.

30. `SetlistViewerClient` receives two new props:
    ```ts
    worshipLeaderName: string | null
    lineup: Array<{ name: string; instrument: string }>
    ```

31. `SetlistViewerClientProps` is extended with `worshipLeaderName: string | null` and `lineup: Array<{ name: string; instrument: string }>`.

32. A read-only "People" block is rendered in `SetlistViewerClient` between the setlist title/date row and the `ServiceNavigator`:
    - Worship leader line `"Worship Leader: {name}"` — rendered only when `worshipLeaderName` is non-null and non-empty.
    - Lineup line `"Lineup: {name} — {instrument}, ..."` — rendered as comma-separated inline text, only when `lineup.length > 0`.
    - When both are absent (null WL + empty lineup), the entire people block is not rendered (no empty container, no placeholder text).

33. The people block in the viewer contains only read-only text elements — no inputs, selects, or buttons.

34. People block Artisan styling: musician names in `text-brand-espresso dark:text-brand-cream`, label prefixes (`"Worship Leader:"`, `"Lineup:"`) in `text-brand-brown dark:text-brand-tan`, consistent with the existing `formattedDate` paragraph style.

35. If either `listMusicians` or `getSetlistLineup` errors on the viewer page, the viewer renders normally with the people block hidden (`worshipLeaderName={null}`, `lineup={[]}`). The songs section is not affected.

### State management

36. All write operations in `SetlistPeopleSection` (`setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`) use **server-confirm before local state update**. Local state is updated only after the Server Action returns `{ data, error: null }`. If the action returns an error, local state is not modified.

### Clone and delete behavior

37. Cloning a setlist already preserves the worship leader and lineup (implemented in `cloneSetlist`, `setlistActions.ts` lines 461–547). No code changes are required for clone behavior.

38. When a musician is deleted from the roster, `setlists.worship_leader_id` is set to `NULL` by the database `ON DELETE SET NULL` constraint. The component does not handle this client-side; re-fetch on next page load is sufficient.

### TypeScript and build

39. `npx tsc --noEmit` exits with code 0 after all changes.

40. `npm run build` succeeds with no errors.

---

## Out of Scope

- Per-song musician assignment.
- Drag-and-drop reordering of lineup entries.
- Singer/vocal part cleanup or voice-part tagging (Phase 5).
- Adding a new musician directly from within `SetlistPeopleSection` (redirect to `/musicians/new`).
- Public (unauthenticated) access to lineup data.
- Any change to existing Server Actions in `setlistActions.ts` or `musicianActions.ts`.
- Any new Supabase RLS policies or schema migrations.
- Pagination or search within the musician select dropdowns.
- Realtime sync of WL / lineup changes to followers (the live sync channel is songs-only).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | NEW — client component encapsulating worship leader select, lineup list, and add-musician row |
| `src/app/setlists/[id]/edit/page.tsx` | Add `listMusicians` + `getSetlistLineup` to Promise.all; mount `SetlistPeopleSection` above `SetlistBuilderClient` |
| `src/app/setlists/[id]/page.tsx` | Add `listMusicians` + `getSetlistLineup` to Promise.all; resolve WL name server-side; pass new props to `SetlistViewerClient` |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Extend props interface; render read-only people block between title/date row and `ServiceNavigator` |
| `src/app/actions/setlistActions.ts` | Contains `setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`, `getSetlistLineup` — read only, no changes |
| `src/app/actions/musicianActions.ts` | Contains `listMusicians` — read only, no changes |
| `src/types/Musician.ts` | Provides `Musician` and `SetlistLineupEntry` types — import from here, not from supabase types |
| `src/types/supabase.ts` | Provides `DbSetlistMusician` shape (returned by `addSetlistMusician`) |
| `src/components/client/SetlistBuilder/ErrorBanner.tsx` | Reuse for inline error display (already has `role="alert"`); interface: `{ message: string; onDismiss: () => void }` |
| `src/components/client/SetlistBuilder/SortableSongRow.tsx` | Canonical select class pattern to follow for musician/instrument dropdowns |
| `src/components/client/SetlistBuilder/SetlistPanel.tsx` | Canonical row wrapper class pattern for lineup entry rows |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Pattern reference for lazy useState, dark mode pairing, and declaration-before-use ordering |
| `src/components/client/button.tsx` | Use for "Add" and "Remove" CTAs |

---

## Technical Schema

All 5 Server Actions confirmed **EXISTS**. No gaps. No MISSING escalation.

### Endpoint Contract Table

| UI Action | Server Action | File | RLS Role | Status |
|-----------|---------------|------|----------|--------|
| Set / clear worship leader | `setSetlistWorshipLeader()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS |
| Add musician to lineup | `addSetlistMusician()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS |
| Remove musician from lineup | `removeSetlistMusician()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS |
| Read lineup (edit + viewer) | `getSetlistLineup()` | `src/app/actions/setlistActions.ts` | public read (authenticated) | EXISTS |
| Populate WL + musician picker | `listMusicians()` | `src/app/actions/musicianActions.ts` | public read (authenticated) | EXISTS |

### Action Input/Return Contracts

**`setSetlistWorshipLeader`**
- Input: `{ setlist_id: string, worship_leader_id: string | null }`
- Return: `{ data: { id: string } | null, error: string | null }`
- RLS: `music_director`
- Tables: `setlists.worship_leader_id`

**`addSetlistMusician`**
- Input: `{ setlist_id: string, musician_id: string, instrument: string }`
- Return: `{ data: DbSetlistMusician | null, error: string | null }`
- RLS: `music_director`
- Tables: `setlist_musicians`
- Special: error code 23505 → surfaces as `"That musician is already assigned to that instrument."` — render inline below add row as `role="alert"`. NOT a toast.

**`removeSetlistMusician`**
- Input: `{ id: string, setlist_id: string }`
- Return: `{ data: { id: string } | null, error: string | null }`
- RLS: `music_director`
- Tables: `setlist_musicians`
- Special: action does not check delete count; stale-ID deletes return `{ data: { id }, error: null }` and silently no-op — component treats this as success and removes row from local state, which is the correct end state.

**`getSetlistLineup`**
- Input: `{ setlist_id: string }`
- Return: `{ data: SetlistLineupEntry[] | null, error: string | null }`
- RLS: public read (authenticated)
- Order: `instrument ASC, name ASC`
- On error: pass `[]` to component; do not block page render.

**`listMusicians`**
- Input: none
- Return: `{ data: DbMusician[] | null, error: string | null }`
- RLS: public read (authenticated)
- On error: pass `[]` to component; project `DbMusician` to `Musician` (strip `created_by`, `created_at`, `updated_at`).

### Type Shapes

```ts
SetlistLineupEntry: {
  id: string
  musician_id: string
  instrument: string
  musicians: { id: string; name: string }
}

Musician: {
  id: string
  name: string
  notes: string | null
}

DbSetlistMusician: {
  id: string
  setlist_id: string
  musician_id: string
  instrument: string
  created_at: string
  updated_at: string
}
```

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-033/spec.md` | Acceptance criteria, fallback behaviors, resolved ambiguities |
| Context Bundle | `tasks/TASK-033/context.md` | Reusable components, canonical patterns, anti-patterns flagged |
| Research Notes | `tasks/TASK-033/research.md` | Open questions (none) and resolved decisions |
| Technical Schema | `tasks/TASK-033/schema.md` | Endpoint contract table (all 5 EXISTS) |
| Endpoint Contracts | `tasks/TASK-033/contracts/endpoints.md` | Full contract detail |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Feature branch:** Create `feature/TASK-033-setlist-lineup-ui` from `develop` before writing any code. Do not work on `main` or `develop` directly.
- **BUG-001 (lazy useState):** All state seeded from props must use `useState(() => initialValue)`. Never `useState(propValue)` directly. Applies to `localLineup`, `worshipLeaderId`, add-row musician select, add-row instrument input, and any per-row loading/error state.
- **BUG-002 (useCallback property path):** `useCallback` dependency arrays must not reference object property paths (e.g. `entry.musicians.name`). Use whole-object references or extracted primitives.
- **BUG-003 (layout shell in every branch):** Every early-return error branch added to `edit/page.tsx` or `page.tsx` must independently include the full `<main>` + max-width container layout shell. Do not assume a parent provides it.
- **BUG-004 (dark: variants):** Every Artisan palette Tailwind utility must be paired with an explicit `dark:` variant. Named utilities like `bg-brand-cream` do NOT inherit dark mode automatically. The existing `labelClass` in `SetlistBuilderClient.tsx` uses bare `text-brand-brown` without a `dark:` pair — do not replicate this in `SetlistPeopleSection`.
- **BUG-007 (declaration order):** Declare all handler functions and callbacks above any `useEffect` or `useCallback` that references them. React Compiler rejects forward references that JS hoisting would otherwise allow.
- **BUG-008 (split error/data checks):** In any multi-step action handler (e.g. `addSetlistMusician` followed by local state construction), split `if (error)` and `if (!data)` into two separate `if` blocks. Never combine into `if (error || !data)`. See `cloneSetlist` in `setlistActions.ts` lines 523–529 for the correct pattern.
- **BUG-009 (`!== undefined` in payload builders):** Use `!== undefined` to gate field inclusion in any payload object. Do not use the `in` operator or falsy checks, which mishandle explicit `undefined` values.
- **Import source:** Import `Musician` and `SetlistLineupEntry` from `@/types/Musician`, not from supabase types. Do not replicate the `DbSetlistMusician`-in-client-component anti-pattern found in `SetlistViewerClient.tsx` line 12.
- **Select class pattern:** Use the canonical select class from `SortableSongRow.tsx`: `text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso`.
- **Input class pattern:** Use the canonical input class from `SetlistBuilderClient.tsx` lines 291–294: `w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/40 dark:placeholder:text-brand-tan/40 focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1`.
- **Row wrapper class:** Use the canonical row class from `SetlistPanel.tsx`: `flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10`.
- **Section heading class:** `text-sm font-semibold text-brand-brown/60 uppercase tracking-widest mb-4` (from `SetlistBuilderClient.tsx` line 352).
- **ErrorBanner:** Import from `./ErrorBanner` (co-located in SetlistBuilder directory). Interface: `{ message: string; onDismiss: () => void }`. Use for inline error display; it already carries `role="alert"`. For non-dismissible inline errors (WL, remove row), render a bare `role="alert"` span instead so no dismiss button appears.
- **Duplicate error handling:** The 23505 duplicate error from `addSetlistMusician` must be displayed inline below the add row, not as a toast notification.
- **Parallel fetching:** Both new fetches (`listMusicians`, `getSetlistLineup`) must be added to the existing `Promise.all` in both `edit/page.tsx` and `page.tsx`. Do not chain them sequentially after the existing awaits.
- **MEMORY.md sections relevant to this task:** BUG-001, BUG-002, BUG-003, BUG-004, BUG-007, BUG-008, BUG-009. Read the corresponding entries in `MEMORY.md` before implementing.

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling `spec.md` against `context.md`. These criteria were not in the original spec but are required based on anti-patterns or MEMORY.md notes found during codebase exploration.

- **[AC] Label dark: pairing (from anti-pattern: `SetlistBuilderClient.tsx` line 297):** Any label element in `SetlistPeopleSection` that uses `text-brand-brown` must include a paired `dark:text-brand-tan` class. The existing `labelClass` in `SetlistBuilderClient.tsx` is a known BUG-004 instance; do not replicate the bare `text-brand-brown` pattern in the new component.

- **[AC] Split error/data checks in add handler (from BUG-008 MEMORY.md note):** The `addSetlistMusician` handler must check `if (result.error)` in one `if` block and `if (!result.data)` in a separate `if` block when constructing the new `SetlistLineupEntry`. Do not combine into a compound guard such as `if (result.error || !result.data)`, which would swallow a fetch error silently if `data` happens to be falsy.

---

## Resolution

- **Completed:** 2026-04-27
- **Branch:** feature/TASK-033-setlist-lineup-ui
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` — NEW: 'use client' component for worship leader select + lineup list + add-musician row; full MD/non-MD mode, server-confirm pattern, lazy useState throughout, split error checks (BUG-008), declaration-before-use (BUG-007), all Artisan palette classes paired with dark: variants (BUG-004)
  - `src/app/setlists/[id]/edit/page.tsx` — Added `listMusicians` + `getSetlistLineup` to existing Promise.all; mounted `<SetlistPeopleSection>` above `<SetlistBuilderClient>` inside a `<Card>`; `isMusicDirector={true}` hardcoded (non-MDs redirected at line 52)
  - `src/app/setlists/[id]/page.tsx` — Converted sequential `getSetlistWithSongs` await to parallel `Promise.all` with `listMusicians` + `getSetlistLineup`; resolved `worshipLeaderName` server-side; built simplified `lineup` array; passed both to `SetlistViewerClient`
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — Extended `SetlistViewerClientProps` with `worshipLeaderName: string | null` and `lineup: Array<{ name: string; instrument: string }>`; added read-only people block between header and `ServiceNavigator`
- **Notes:**
  - All BUG-001 through BUG-009 guards applied. No `useState(propValue)` — all lazy. No compound `if (error || !data)` guards in action handlers. Handler functions declared before any useEffect/useCallback. All Artisan palette utilities have explicit `dark:` pairs.
  - `npx tsc --noEmit` exits 0.
  - ErrorBanner not used for WL and row-level errors (they are non-dismissible per AC-5/AC-10); bare `role="alert"` span used instead. ErrorBanner's dismiss button interface conflicts with non-dismissible requirement.
  - `isMusicDirector` prop on `SetlistPeopleSection` retained for component-level MD/non-MD branching even though edit page always passes `true` (non-MDs are redirected at the page level).
