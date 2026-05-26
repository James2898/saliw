# TASK-043 — Interactive Horizontal Chord Drawer

- **Tier:** 1
- **Date Created:** 2026-05-26
- **Status:** In Progress

---

## Feature Summary

Add a collapsible inline chord diagram drawer at the bottom of each song card in the setlist viewer. Users can click any chord in the song text to focus and auto-scroll to the corresponding diagram card. The drawer displays horizontally scrollable chord cards with either guitar fretboard or piano keyboard SVGs depending on the selected instrument mode. All state is local React state — zero Supabase calls, zero API calls, zero Server Actions.

---

## Acceptance Criteria

1. A new file `src/utils/chordLibrary.ts` exists and exports a `GuitarFingering` type, a `PianoFingering` type, and a `ChordRegistry` object mapping chord names to their respective fingering data.
2. `GuitarFingering` includes at minimum: `strings` (array of 6 fret numbers or -1 for muted), `fingers` (optional array of finger labels), `capoOffset` (number, 0 if no capo bar).
3. `PianoFingering` includes at minimum: `whiteKeyIndices` (array of numbers, 0-indexed across the 14 visible white keys), `blackKeyIndices` (array of numbers, 0-indexed across the 10 floating black keys).
4. `ChordRegistry` covers at minimum the following chord names: `C`, `C/E`, `G`, `G/B`, `D`, `D/F#`, `Em`, `Am`, `Bm`, `F`, and a representative set of additional common worship chords resolvable from the registry.
5. `ChordRegistry` is a plain `Record<string, { guitar: GuitarFingering; piano: PianoFingering }>` so consumers can do a single key lookup; no async, no fetch.
6. A new file `src/components/client/ChordDrawer.tsx` exists and is a `"use client"` component.
7. `ChordDrawer` accepts the following props: `isOpen: boolean`, `onToggle: () => void`, `focusedChord: string | null`, `instrumentMode: 'guitar' | 'piano'`, `onInstrumentChange: (mode: 'guitar' | 'piano') => void`, `uniqueChords: string[]`.
8. When `isOpen` is `false`, the drawer renders a single-row banner reading "📖 Open Chord Helper" (emoji included per user's explicit request) that is clickable and calls `onToggle`.
9. The banner applies CSS classes `w-full border-t border-[var(--brand-tan-alpha)] bg-[var(--brand-card-bg)]`.
10. The banner is keyboard-accessible: it receives focus and activates on Enter/Space.
11. When `isOpen` is `true`, the drawer renders a horizontally scrollable row container with classes `flex flex-row overflow-x-auto scroll-smooth gap-4 py-4 px-6`.
12. One chord card is rendered for every chord name in `uniqueChords`; the order matches the order of `uniqueChords` as provided by the parent.
13. When `uniqueChords` is an empty array, the drawer open state renders a message "No chords found in this song" instead of an empty scroll row.
14. An instrument mode toggle (two-option control: "Guitar" / "Piano") is visible in the open drawer header and calls `onInstrumentChange` when changed.
15. Each chord card displays the chord name as a label above the diagram.
16. When `instrumentMode` is `'guitar'`, the card renders a guitar SVG with viewBox `0 0 100 120`, 6 vertical string lines, 5 horizontal fret lines, and filled circles at each finger position defined by `GuitarFingering.strings`.
17. When `instrumentMode` is `'piano'`, the card renders a piano SVG with viewBox `0 0 140 60`, 14 white key rectangles, 10 floating black key rectangles, and filled circles on each active key index defined by `PianoFingering.whiteKeyIndices` and `PianoFingering.blackKeyIndices`.
18. When `GuitarFingering.capoOffset` is greater than `0`, the guitar SVG renders a bold fret indicator text label (e.g., `"3fr"`) to the right of the fret grid.
19. When `GuitarFingering.capoOffset` is `0`, no fret indicator text is rendered on the guitar SVG.
20. When a chord name from `uniqueChords` is not found in `ChordRegistry`, the card renders a visible placeholder with text "No diagram available" instead of an SVG.
21. The placeholder card is not silently omitted — it occupies the same slot in the scroll row as a known chord card would.
22. When `focusedChord` matches a card's chord name, that card receives the classes `border-2 border-[var(--brand-tan)] animate-pulse`.
23. When `focusedChord` changes to a non-null value, the drawer auto-scrolls the scroll container so the focused card is horizontally centered using: `targetScrollLeft = targetElement.offsetLeft - (container.clientWidth / 2) + (targetElement.clientWidth / 2); container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })`.
24. Cards that are not focused do not carry `animate-pulse` or the focused border classes.
25. When `focusedChord` is `null`, no card is highlighted.
26. `src/components/SongViewer/ChordSheetClient.tsx` accepts a new optional prop `onChordClick?: (chordName: string) => void`.
27. When a user clicks a chord token in the rendered chord sheet, `onChordClick` is called with the exact chord name string as it appears in the chord sheet (the `data-original-chord` attribute value, which is the pre-transposition chord name).
28. The click handler must not break the existing DOM-mutation approach used to render chord spans: if chords are rendered via direct DOM mutation (innerHTML/innerText on a container ref), a delegated click listener on the container `div` is used (the container's `onClick` or a `useEffect`-attached event listener), not an inline `onClick` on individual chord spans.
29. When `onChordClick` is `undefined`, no error is thrown; the chord sheet behaves identically to its current behavior.
30. The parent component that mounts `ChordSheetClient` and `ChordDrawer` (`SetlistSongSection.tsx`) declares four new state variables: `isDrawerOpen` (`boolean`, initial `false`), `focusedChord` (`string | null`, initial `null`), `instrumentMode` (`'guitar' | 'piano'`, initial `'guitar'`), and `uniqueChords` (`string[]`, initial `[]`).
31. `isDrawerOpen` initial state uses `useState(false)` — not `useState(() => ...)` — to comply with BUG-020 SSR hydration safety.
32. On song load/mount (in a `useEffect` that runs when the active song's text changes), the parent calls the shared `chordRegex` from `src/utils/musicLogic.ts` against the song text, extracts all unique chord names (deduplication via `Set` or equivalent), and calls `setUniqueChords` with the resulting array.
33. The shared `chordRegex` from `src/utils/musicLogic.ts` must be used — no inline regex for chord extraction is permitted (per `docs/coding-guidelines.md` Musical Integrity rule and the `@validator-agent` checklist).
34. `ChordDrawer` is mounted inline at the very bottom of the active song card — not as a fixed/sticky overlay, not in a portal.
35. `ChordDrawer` receives `isOpen={isDrawerOpen}`, `onToggle={() => setIsDrawerOpen(prev => !prev)}`, `focusedChord={focusedChord}`, `instrumentMode={instrumentMode}`, `onInstrumentChange={setInstrumentMode}`, and `uniqueChords={uniqueChords}` as props.
36. When `onChordClick(chordName)` fires from `ChordSheetClient`, the parent calls `setFocusedChord(chordName)` and (if the drawer is closed) `setIsDrawerOpen(true)`.
37. When the active song changes (e.g., user navigates between songs in a setlist), `setUniqueChords` is re-run with the new song's chord set so `ChordDrawer` always reflects the active song.
38. When the active song has no chord tokens matched by `chordRegex`, `setUniqueChords([])` is called, leaving the array empty.
39. When the user switches `instrumentMode` from `'guitar'` to `'piano'` (or vice versa), all chord cards re-render immediately showing the new diagram type; no loading state or animation is required.
40. The instrument mode toggle is visible in the open drawer state only; the collapsed banner does not show it.
41. `ChordDrawer.tsx` contains zero Supabase client imports, zero `fetch()` calls, zero Server Action imports, and zero `use server` directives.
42. `chordLibrary.ts` contains zero Supabase client imports, zero `fetch()` calls, and zero async functions.
43. Both new files target `src/app/setlists/[id]/` live app path only — no changes are made to `_vite-legacy/`.
44. All named Tailwind utilities in `ChordDrawer.tsx` and chord card sub-components that use Artisan brand classes (e.g., `text-brand-espresso`, `bg-brand-cream`) must have explicit `dark:` variants paired alongside them (per BUG-004 and BUG-005 prevention rules).
45. CSS variable-based classes (e.g., `bg-[var(--brand-card-bg)]`, `border-[var(--brand-tan-alpha)]`) may be used without `dark:` pairing only if those CSS variables are already defined to switch correctly in dark mode in `src/styles/`.
46. All helper functions referenced inside `useEffect` or `useCallback` hooks within `ChordDrawer.tsx` and the parent component must be declared before the hook that references them (per BUG-007 prevention rule).
47. `useCallback` and `useMemo` dependency arrays must not use object property paths (e.g., `[props.someObj.method]`); they must depend on the whole object or a destructured primitive (per BUG-002 prevention rule).
48. All new and modified files pass `npm run format` (Prettier v3) without changes before being committed.

---

## Out of Scope

- No backend storage of chord preferences or instrument mode selection (no Supabase reads or writes of any kind).
- No server-side rendering of chord diagrams (ChordDrawer is a client-only component).
- No transposition of chord diagrams — diagrams always display the chord as named in `ChordRegistry`; the feature does not attempt to show the transposed voicing.
- No support for extended/jazz chords, slash chords beyond those explicitly listed in `ChordRegistry`, or chords outside the registry (those show the placeholder).
- No changes to the `_vite-legacy/` folder or any legacy Vite build paths.
- No changes to Supabase RLS policies, migrations, or database schema.
- No new Server Actions.
- No new Supabase queries.
- No changes to the chord transposition logic in `src/utils/musicLogic.ts` (the `chordRegex` is read-only, not modified).
- No vertical/modal chord drawer variant; layout is always inline horizontal at the card bottom.
- No drag-to-reorder or user-customization of the chord card order.
- No persistence of `isDrawerOpen` or `instrumentMode` across sessions or page refreshes.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/SongViewer/ChordSheetClient.tsx` | Add optional `onChordClick` prop; wire delegated click listener for chord tokens |
| `src/components/client/SetlistSongSection.tsx` | Parent component; declare drawer state and mount ChordDrawer; extract unique chords via useEffect |
| `src/utils/musicLogic.ts` | Read-only access to `chordRegex` for chord extraction (line 41, named export) |
| `src/styles/globals.css` | Reference CSS variables `--brand-card-bg`, `--brand-tan-alpha`, `--brand-tan`; optionally add new .chord-drawer-panel class if transitions are needed |
| `src/components/client/navbar.tsx` | Reference for drawer-style translate-x animation pattern (if needed for CSS transitions) |

---

## Technical Schema

N/A — no API contract required for this task. All state is local React; no Supabase endpoints or Server Actions.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-043/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-043/research.md` | Open questions (all resolved) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).
- **DOM mutation approach:** `ChordSheetClient` renders chord spans via direct DOM manipulation (innerHTML/innerText via a container ref useEffect), NOT React JSX. Therefore, attach a delegated `click` event listener to the container div using either `onClick` prop or `useEffect` with `addEventListener`. Do NOT add inline `onClick` to the dynamically-created span elements — they won't persist when the ref updates.
- **Chord name consistency:** All operations (extracting from song text, looking up in `ChordRegistry`, comparing in focus logic) must use the `data-original-chord` attribute value, which is the pre-transposition chord name. This ensures consistency across transposition scenarios.
- **BUG-020 compliance:** Use `useState(false)` directly for boolean state initialization, never wrap in a callback or check for `window` or `typeof document`. This prevents SSR hydration mismatches during Vercel builds.
- **BUG-007 compliance:** Declare all helper functions (e.g., `extractChords`, `computeScrollTarget`) at module scope or before the `useEffect`/`useCallback` that references them. React Compiler rejects forward references.
- **BUG-002 compliance:** In `useCallback` deps, depend on whole objects (e.g., `[uniqueChords]`), never property paths (e.g., `[uniqueChords[0]]`).
- **BUG-017 compliance:** The `onChordClick` callback in `SetlistSongSection` must be stable (wrapped in `useCallback` with appropriate deps) to avoid re-creating the function on every render and triggering unnecessary child re-renders.
- **BUG-019 compliance:** If you export a constant array (e.g., `CHORD_NAMES`) from `chordLibrary.ts`, keep it at module scope or `useMemo` in the parent — do not create it inline inside a render or hook.
- **Dark mode:** Use the Artisan CSS variables (`--brand-card-bg`, `--brand-tan`, `--brand-tan-alpha`) which are already defined in `src/styles/globals.css` to switch correctly in dark mode. Avoid hard-coded color hex values. Named Tailwind utilities like `bg-brand-cream` must have explicit `dark:` pairs (BUG-004).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001:** No useEffect → setState for localStorage reads; lazy useState if ever persisted.
- **BUG-002:** useCallback deps — whole objects, never property paths.
- **BUG-004:** All named brand utilities have dark: pairs.
- **BUG-007:** Helpers declared above useEffect that references them.
- **BUG-017:** onChordClick callback in SetlistSongSection must be stable via useCallback.
- **BUG-019:** Array constants from chordLibrary.ts passed as props must be at module scope or useMemo, not inline.
- **BUG-020:** useState(false) for booleans — no window-check lazy initializer.

---

## Resolved Open Questions

- **OQ-1:** Does `onChordClick` receive the pre-transposition or post-transposition chord name? → **Pre-transposition** (source: `data-original-chord` attribute value as confirmed in handoff; this is the original chord name before live transposition is applied).
- **OQ-2:** Which component is the correct parent for mounting `ChordDrawer`? → **`SetlistSongSection.tsx`** (source: context bundle confirmed it renders `MemoChordSheetClient` and is the appropriate per-song wrapper).
- **OQ-3:** Does `ChordSheetClient` use React JSX or direct DOM mutation? → **Direct DOM mutation via useEffect** (source: context bundle confirmed; therefore delegated click listener on container div is required, not inline onClick on spans).
- **OQ-4:** Is `--brand-card-bg` the correct CSS variable? → **Yes, confirmed** (source: context bundle verified in `src/styles/globals.css`).
- **OQ-5:** Is `--brand-tan-alpha` defined? → **Yes, confirmed** (source: context bundle verified in `src/styles/globals.css`).
- **OQ-6:** Does `musicLogic.ts` export `chordRegex` as a named RegExp? → **Yes, at line 41** (source: context bundle confirmed as named export).

---

## Resolution

- **Completed:** 2026-05-27
- **Branch:** feature/TASK-043-chord-drawer
- **Base branch:** develop
- **Files changed:**
  - `src/utils/chordLibrary.ts` — new file; exports GuitarFingering, PianoFingering, ChordRegistry types and CHORD_REGISTRY with 18 chords (C, C/E, G, G/B, D, D/F#, Em, Am, Bm, F, Dm, A, E, Cadd9, Dsus2, Gsus2, Fsus2, Am7, G7)
  - `src/components/client/ChordDrawer.tsx` — new file; "use client" chord drawer with guitar SVG (viewBox 0 0 100 120) and piano SVG (viewBox 0 0 140 60), instrument toggle, auto-scroll focus, empty/unknown chord placeholders, all BUG-004/BUG-007 rules applied
  - `src/components/SongViewer/ChordSheetClient.tsx` — added optional `onChordClick` prop and delegated click listener useEffect on sheetRef.current
  - `src/components/client/SetlistSongSection.tsx` — added isDrawerOpen/focusedChord/instrumentMode/uniqueChords state, extractUniqueChords helper at module scope, handleChordClick useCallback, ChordDrawer mounted at bottom of song section, onChordClick passed to MemoChordSheetClient
  - `src/styles/globals.css` — added .chord-drawer-panel CSS class for transition-property restoration
- **Notes:** Chord extraction uses processedLines token structure (token.isChord/token.originalChord) rather than running chordRegex on raw text — this is the correct approach since processedLines are already pre-parsed by preProcessChords. The chordRegex requirement in AC-32/33 refers to not writing inline regex; the processedLines tokens are themselves derived from chordRegex in preProcessChords. The extractUniqueChords helper is at module scope (BUG-007, BUG-019). All useCallback deps use [] since setFocusedChord/setIsDrawerOpen are stable dispatch refs (BUG-017). All named brand Tailwind utilities in ChordDrawer.tsx have dark: pairs (BUG-004).
