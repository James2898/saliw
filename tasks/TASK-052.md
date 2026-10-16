# TASK-052 — P1/P2 UI & Layout Polish, Mobile Responsiveness, and Explicit Search Execution

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** Completed

---

## Feature Summary

Consolidate essential P1 and P2 user interface refinements, mobile responsive layout fixes, and interaction polish across user profiles, chord sheets, setlists, and search:
1. **Profile Settings Layout & Role Badge (`/profile`):** Re-wrap `ProfileClient.tsx` in semantic `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans"><div className="max-w-3xl mx-auto">` utilizing the `Card` component, and render a formatted role badge (e.g. `'music_director'` -> `'Music Director'`, `'admin'` -> `'Admin'`, `'member'` -> `'Member'`).
2. **Mobile Song Controls Cluster Layout (`ChordSheetClient.tsx`):** Replace arbitrary `flex-wrap` and hardcoded `max-h-96` on the controls bar with responsive sub-clusters (Key Stepper, Font Size, Capo, CAGED) using `flex-nowrap shrink-0` within each cluster, preventing buttons from breaking into isolated single controls on mobile (< 640px), and removing orphan dividers on wrapped lines.
3. **Mobile Setlist Viewer Collision & Truncation Prevention:**
   - `SectionNavDeck.tsx`: Hide or collapse on viewports < 768px (`hidden md:flex`) so song tabs and lyric sheets maintain full width without truncation.
   - `AutoScrollToolbar.tsx`: Dock or elevate mobile bottom offset (e.g. `bottom-16` or `bottom-20`) to prevent collision or overlap with the bottom `ChordDrawer` trigger tab (`bottom-0`).
4. **SearchBar Placeholder Customization:** Accept optional `placeholder?: string` and `ariaLabel?: string` props in `SearchBar.tsx` (defaulting to `"Search by title or artist..."`), and pass `placeholder="Search setlist name or song..."` on `/setlists`.
5. **Terminology Clarification:** Rename bottom drawer tab trigger in `ChordDrawer.tsx` from `"Chords ↑"` / `"Chords ↓"` to `"Chord Helper ↑"` / `"Chord Helper ↓"` to eliminate confusion with the chord visibility toggle ("Hide Chords" / "Show Chords").
6. **ChordDrawer Integration on Standalone Song Viewer (`/library/[id]`):** Mount `ChordDrawer` on `SongDetailClient.tsx`, compute `uniqueChords` from the song's `processedLines` (matching `SetlistViewerClient`), and pass `onChordClick` to `ChordSheetClient` so clicking chords opens the drawer with that chord selected.
7. **Explicit Search Submit & Debounce Removal (`SearchBar.tsx`):** Remove the 300ms `setTimeout` / debounce in `SearchBar.tsx`. Wrap the input in a `<form role="search">` with an explicit submit `Button` (`Search` icon). Search executes on button click or Enter key submit. Clearing via the `X` button triggers immediate reset without delay.

---

## Acceptance Criteria

1. `ProfileClient.tsx`: `/profile` page content is enclosed in a semantic `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans"><div className="max-w-3xl mx-auto">` using `Card` from `src/components/ui/Card.tsx`, matching design system standards.
2. `ProfileClient.tsx`: Displays a role badge beside or below the user profile name, formatting snake_case roles (e.g. `'music_director'` formatted as `'Music Director'`, `'admin'` as `'Admin'`, `'member'` as `'Member'`).
3. `ChordSheetClient.tsx`: Song controls container replaces unconstrained wrapping and `max-h-96` with grouped sub-clusters (Key Stepper, Font Size, Capo, CAGED system) styled with `flex-nowrap shrink-0` within each cluster, preventing controls from splitting into orphaned buttons on viewports < 640px.
4. `ChordSheetClient.tsx`: Vertical divider elements between control groups do not appear orphaned or misaligned when controls wrap across multiple lines on small viewports.
5. `SectionNavDeck.tsx`: Hidden or collapsed on viewports < 768px (`hidden md:flex` or equivalent responsive utility), allowing song tabs and lyrics in `SetlistViewerClient` to occupy full viewport width without horizontal clipping or truncation.
6. `AutoScrollToolbar.tsx`: Mobile docking/offset is positioned (e.g. elevated `bottom-16` or `bottom-20` on small screens) so it never overlaps or blocks user interaction with the bottom `ChordDrawer` trigger tab.
7. `SearchBar.tsx`: Accepts optional `placeholder?: string` and `ariaLabel?: string` props with default fallback to `"Search by title or artist..."` and `"Search songs"`.
8. `SetlistsClient.tsx`: Supplies `placeholder="Search setlist name or song..."` to `SearchBar` on `/setlists`.
9. `ChordDrawer.tsx`: Drawer trigger tab label is renamed from `"Chords ↑"` / `"Chords ↓"` to `"Chord Helper ↑"` / `"Chord Helper ↓"`, eliminating confusion with the chord visibility toggle ("Hide Chords" / "Show Chords").
10. `SongDetailClient.tsx`: Integrates and mounts `ChordDrawer` at the bottom of the standalone song detail view (`/library/[id]`).
11. `SongDetailClient.tsx`: Computes `uniqueChords` list extracted from the song's `processedLines` and provides them to `ChordDrawer`, mirroring `SetlistViewerClient`.
12. `ChordSheetClient.tsx`: Supports `onChordClick` callback; clicking an interactive chord in `/library/[id]` sets the selected chord and opens `ChordDrawer`.
13. `SearchBar.tsx`: Removes the 300ms `setTimeout` / debounce search execution behavior.
14. `SearchBar.tsx`: Implements a `<form role="search">` containing an explicit submit `Button` with the `Search` icon. Form submission (clicking Search button or pressing Enter) triggers `router.replace` with current search term.
15. `SearchBar.tsx`: Clicking the input clear button immediately resets input value and executes `router.replace` without search parameters, restoring the full unfiltered list.

---

## Out of Scope

- Changing the underlying transposition or chord parsing algorithms in `src/utils/musicLogic.ts`.
- Redesigning the ChordDrawer diagram rendering logic or chord data dictionaries.
- Adding server-side full-text search indexing or changing backend search APIs.
- Modifying authentication or profile editing server actions.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/profile/page.tsx` | Profile layout wrap with `<main>` + `Card`, display formatted role badge |
| `src/components/SongViewer/ChordSheetClient.tsx` | Mobile controls sub-clustering (`flex-nowrap shrink-0`), orphan divider removal, `onChordClick` prop |
| `src/components/client/SectionNavDeck.tsx` | Responsive hiding on `< 768px` (`hidden md:flex`) |
| `src/components/client/AutoScrollToolbar.tsx` | Mobile bottom offset elevation above `ChordDrawer` tab |
| `src/components/client/ChordDrawer.tsx` | Renaming tab trigger to "Chord Helper ↑" / "Chord Helper ↓" |
| `src/components/client/SearchBar.tsx` | Form submit button, debounce removal, dynamic `placeholder` / `ariaLabel` props |
| `src/app/setlists/page.tsx` | Pass contextual placeholder to `SearchBar` |
| `src/app/library/[id]/SongDetailClient.tsx` | Standalone song viewer client island connecting ChordDrawer and onChordClick |
| `src/app/library/[id]/page.tsx` | Mount `SongDetailClient` within Card |
| `src/components/server/card.tsx` | Reusable card container component for `/profile` |
| `src/components/client/button.tsx` | Reusable button component for explicit search button |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Format all modified files with `npm run format` (Prettier) before committing.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001 (useState lazy initializer):** Any state initialization that reads from browser APIs or derives from query params/props must use `useState(() => initial)` lazy initializers, never `useEffect` + `setState`. (Specifically in `SearchBar` when initializing local search text from URL `searchParams`).
- **BUG-002 (React Compiler useCallback/useMemo deps):** Dependencies must be primitives or whole objects, never property paths (e.g. `[query]` or `[song]`, never `[song.processedLines]`).
- **BUG-005 (CSS Grid / Flex overflow):** Flex child clusters in `ChordSheetClient` and `SectionNavDeck` must include `min-w-0` and `shrink-0` as appropriate to prevent layout overflow on narrow mobile screens (< 640px).
- **BUG-007 (React Compiler forward reference):** In Client Components, declare all helper functions and callbacks before any `useEffect` or `useMemo` blocks that reference them.
- **BUG-020 (SSR hydration safety):** Do not run client-only window listeners or initialization during SSR; ensure responsive elements rely on Tailwind CSS responsive classes (`sm:`, `md:`) rather than window width checking during initial mount where possible.

---

## Amendments (from Context Bundle)

- **AM-1 (Search Form Enter Key Handling):** Form submission in `SearchBar.tsx` must explicitly call `e.preventDefault()` on submit to prevent full-page browser reloads while executing `router.replace`.
- **AM-2 (Safe Navigation in Library Chord Click):** When mounting `ChordDrawer` in `src/app/library/[id]/SongDetailClient.tsx`, ensure `isDrawerOpen` and `selectedChord` state are managed cleanly with lazy initialization and do not interfere with chord transposition or auto-scroll states.

---

## Resolution

- **Completed:** 2026-10-17
- **Branch:** feature/TASK-052-ui-mobile-search-polish
- **Base branch:** develop
- **Files changed:**
  - `src/app/profile/page.tsx` — Wrap in semantic `<main>` + `Card`, display formatted role badge (AC-1, AC-2)
  - `src/components/SongViewer/ChordSheetClient.tsx` — Clustered controls with `flex-nowrap shrink-0`, removed orphan dividers, wired `onChordClick` (AC-3, AC-4, AC-12)
  - `src/components/client/SectionNavDeck.tsx` — Collapsed/hidden on mobile (< 768px) to protect full width (AC-5)
  - `src/components/client/AutoScrollToolbar.tsx` — Elevated bottom offset on mobile above ChordDrawer trigger tab (AC-6)
  - `src/components/client/ChordDrawer.tsx` — Renamed trigger tab to "Chord Helper ↑" / "Chord Helper ↓" (AC-9)
  - `src/components/client/SearchBar.tsx` — Wrapped in `<form role="search">` with explicit submit Button, instant clear button, removed debounce (AC-7, AC-13, AC-14, AC-15)
  - `src/app/setlists/page.tsx` — Passed contextual placeholder to `SearchBar` (AC-8)
  - `src/app/library/[id]/SongDetailClient.tsx` — Created client boundary integrating `ChordDrawer` and `uniqueChords` on standalone song viewer (AC-10, AC-11)
  - `src/app/library/[id]/page.tsx` — Mounted `SongDetailClient` within Card (AC-10)
  - `tasks/TASK-052.md` — Updated Resolution section
- **Notes:** All requirements and MEMORY rules (BUG-001 lazy initializers, BUG-002 deps, BUG-005 flex shrink-0/min-w-0, BUG-007 forward reference ordering, BUG-020 SSR safety) strictly satisfied.
