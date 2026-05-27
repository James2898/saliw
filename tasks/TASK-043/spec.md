# Spec — Interactive Horizontal Chord Drawer

## Feature Summary

Add a collapsible, inline chord diagram drawer to the active song card in the live setlist viewer (`src/app/setlists/[id]/`). On song load/mount, the parent component parses the song text using the existing shared `chordRegex` from `src/utils/musicLogic.ts`, extracts all unique chord names, and stores them in `useState<string[]>`. These are passed to a new `ChordDrawer` component that renders a horizontally scrollable row of chord diagram cards — each showing either a guitar fretboard SVG or a piano keyboard SVG depending on the selected instrument mode. Clicking a chord token in the chord sheet focuses and auto-scrolls to the corresponding card. The feature is purely client-side: zero Supabase calls, zero Server Actions, zero API calls. All chord data lives in a new local `src/utils/chordLibrary.ts` file.

## Acceptance Criteria

### File Creation

1. A new file `src/utils/chordLibrary.ts` exists and exports a `GuitarFingering` type, a `PianoFingering` type, and a `ChordRegistry` object mapping chord names to their respective fingering data.
2. `GuitarFingering` includes at minimum: `strings` (array of 6 fret numbers or -1 for muted), `fingers` (optional array of finger labels), `capoOffset` (number, 0 if no capo bar).
3. `PianoFingering` includes at minimum: `whiteKeyIndices` (array of numbers, 0-indexed across the 14 visible white keys), `blackKeyIndices` (array of numbers, 0-indexed across the 10 floating black keys).
4. `ChordRegistry` covers at minimum the following chord names: `C`, `C/E`, `G`, `G/B`, `D`, `D/F#`, `Em`, `Am`, `Bm`, `F`, and a representative set of additional common worship chords resolvable from the registry.
5. `ChordRegistry` is a plain `Record<string, { guitar: GuitarFingering; piano: PianoFingering }>` so consumers can do a single key lookup; no async, no fetch.
6. A new file `src/components/client/ChordDrawer.tsx` exists and is a `"use client"` component.
7. `ChordDrawer` accepts the following props: `isOpen: boolean`, `onToggle: () => void`, `focusedChord: string | null`, `instrumentMode: 'guitar' | 'piano'`, `onInstrumentChange: (mode: 'guitar' | 'piano') => void`, `uniqueChords: string[]`.

### ChordDrawer — Collapsed State

8. When `isOpen` is `false`, the drawer renders a single-row banner reading "📖 Open Chord Helper" (emoji included per user's explicit request) that is clickable and calls `onToggle`.
9. The banner applies CSS classes `w-full border-t border-[var(--brand-tan-alpha)] bg-[var(--brand-card-bg)]`.
10. The banner is keyboard-accessible: it receives focus and activates on Enter/Space.

### ChordDrawer — Open State

11. When `isOpen` is `true`, the drawer renders a horizontally scrollable row container with classes `flex flex-row overflow-x-auto scroll-smooth gap-4 py-4 px-6`.
12. One chord card is rendered for every chord name in `uniqueChords`; the order matches the order of `uniqueChords` as provided by the parent.
13. When `uniqueChords` is an empty array, the drawer open state renders a message "No chords found in this song" instead of an empty scroll row.
14. An instrument mode toggle (two-option control: "Guitar" / "Piano") is visible in the open drawer header and calls `onInstrumentChange` when changed.

### ChordDrawer — Chord Cards

15. Each chord card displays the chord name as a label above the diagram.
16. When `instrumentMode` is `'guitar'`, the card renders a guitar SVG with viewBox `0 0 100 120`, 6 vertical string lines, 5 horizontal fret lines, and filled circles at each finger position defined by `GuitarFingering.strings`.
17. When `instrumentMode` is `'piano'`, the card renders a piano SVG with viewBox `0 0 140 60`, 14 white key rectangles, 10 floating black key rectangles, and filled circles on each active key index defined by `PianoFingering.whiteKeyIndices` and `PianoFingering.blackKeyIndices`.
18. When `GuitarFingering.capoOffset` is greater than `0`, the guitar SVG renders a bold fret indicator text label (e.g., `"3fr"`) to the right of the fret grid.
19. When `GuitarFingering.capoOffset` is `0`, no fret indicator text is rendered on the guitar SVG.
20. When a chord name from `uniqueChords` is not found in `ChordRegistry`, the card renders a visible placeholder with text "No diagram available" instead of an SVG.
21. The placeholder card is not silently omitted — it occupies the same slot in the scroll row as a known chord card would.

### ChordDrawer — Focus and Scroll

22. When `focusedChord` matches a card's chord name, that card receives the classes `border-2 border-[var(--brand-tan)] animate-pulse`.
23. When `focusedChord` changes to a non-null value, the drawer auto-scrolls the scroll container so the focused card is horizontally centered using: `targetScrollLeft = targetElement.offsetLeft - (container.clientWidth / 2) + (targetElement.clientWidth / 2); container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })`.
24. Cards that are not focused do not carry `animate-pulse` or the focused border classes.
25. When `focusedChord` is `null`, no card is highlighted.

### ChordSheetClient — onChordClick Integration

26. `src/components/SongViewer/ChordSheetClient.tsx` accepts a new optional prop `onChordClick?: (chordName: string) => void`.
27. When a user clicks a chord token in the rendered chord sheet, `onChordClick` is called with the exact chord name string as it appears in the chord sheet (pre-transposition name OR post-transposition name — see Pending Reconciliation OQ-1).
28. The click handler must not break the existing DOM-mutation approach used to render chord spans: if chords are rendered via direct DOM mutation (innerHTML/innerText on a container ref), a delegated click listener on the container `div` is used (the container's `onClick` or a `useEffect`-attached event listener), not an inline `onClick` on individual chord spans.
29. When `onChordClick` is `undefined`, no error is thrown; the chord sheet behaves identically to its current behavior.

### Parent State Wiring

30. The parent component that mounts `ChordSheetClient` and `ChordDrawer` (either `SetlistSongSection.tsx` or `SetlistViewerClient.tsx` — see Pending Reconciliation OQ-2) declares four new state variables: `isDrawerOpen` (`boolean`, initial `false`), `focusedChord` (`string | null`, initial `null`), `instrumentMode` (`'guitar' | 'piano'`, initial `'guitar'`), and `uniqueChords` (`string[]`, initial `[]`).
31. `isDrawerOpen` initial state uses `useState(false)` — not `useState(() => ...)` — to comply with BUG-020 SSR hydration safety.
32. On song load/mount (in a `useEffect` that runs when the active song's text changes), the parent calls the shared `chordRegex` from `src/utils/musicLogic.ts` against the song text, extracts all unique chord names (deduplication via `Set` or equivalent), and calls `setUniqueChords` with the resulting array.
33. The shared `chordRegex` from `src/utils/musicLogic.ts` must be used — no inline regex for chord extraction is permitted (per `docs/coding-guidelines.md` Musical Integrity rule and the `@validator-agent` checklist).
34. `ChordDrawer` is mounted inline at the very bottom of the active song card — not as a fixed/sticky overlay, not in a portal.
35. `ChordDrawer` receives `isOpen={isDrawerOpen}`, `onToggle={() => setIsDrawerOpen(prev => !prev)}`, `focusedChord={focusedChord}`, `instrumentMode={instrumentMode}`, `onInstrumentChange={setInstrumentMode}`, and `uniqueChords={uniqueChords}` as props.
36. When `onChordClick(chordName)` fires from `ChordSheetClient`, the parent calls `setFocusedChord(chordName)` and (if the drawer is closed) `setIsDrawerOpen(true)`.

### Pre-Mount Ingestion

37. When the active song changes (e.g., user navigates between songs in a setlist), `setUniqueChords` is re-run with the new song's chord set so `ChordDrawer` always reflects the active song.
38. When the active song has no chord tokens matched by `chordRegex`, `setUniqueChords([])` is called, leaving the array empty.

### Instrument Mode Toggle

39. When the user switches `instrumentMode` from `'guitar'` to `'piano'` (or vice versa), all chord cards re-render immediately showing the new diagram type; no loading state or animation is required.
40. The instrument mode toggle is visible in the open drawer state only; the collapsed banner does not show it.

### Architecture and Zero-Backend Constraint

41. `ChordDrawer.tsx` contains zero Supabase client imports, zero `fetch()` calls, zero Server Action imports, and zero `use server` directives.
42. `chordLibrary.ts` contains zero Supabase client imports, zero `fetch()` calls, and zero async functions.
43. Both new files target `src/app/setlists/[id]/` live app path only — no changes are made to `_vite-legacy/`.

### Dark Mode

44. All named Tailwind utilities in `ChordDrawer.tsx` and chord card sub-components that use Artisan brand classes (e.g., `text-brand-espresso`, `bg-brand-cream`) must have explicit `dark:` variants paired alongside them (per BUG-004 and BUG-005 prevention rules).
45. CSS variable-based classes (e.g., `bg-[var(--brand-card-bg)]`, `border-[var(--brand-tan-alpha)]`) may be used without `dark:` pairing only if those CSS variables are already defined to switch correctly in dark mode in `src/styles/`.

### React Compiler Compliance

46. All helper functions referenced inside `useEffect` or `useCallback` hooks within `ChordDrawer.tsx` and the parent component must be declared before the hook that references them (per BUG-007 prevention rule).
47. `useCallback` and `useMemo` dependency arrays must not use object property paths (e.g., `[props.someObj.method]`); they must depend on the whole object or a destructured primitive (per BUG-002 prevention rule).

### Formatting

48. All new and modified files pass `npm run format` (Prettier v3) without changes before being committed.

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

## Fallback Behaviors

- **Unknown chord in registry:** The chord card renders a visible "No diagram available" placeholder. The card is present in the scroll row (not silently dropped).
- **Song with no chords:** `uniqueChords` is an empty array; the open drawer renders "No chords found in this song" instead of a scroll row.
- **`onChordClick` not provided:** `ChordSheetClient` does not throw; clicking a chord token is a no-op with respect to the drawer.
- **Drawer closed when chord clicked:** The parent opens the drawer (`setIsDrawerOpen(true)`) and sets the focused chord in one event, so the user sees the drawer open immediately to the relevant card.
- **`chordRegex` matches zero tokens on mount:** `setUniqueChords([])` is called; the "No chords found" empty state is shown if the user opens the drawer.

## Resolved Ambiguities

- **Emoji in banner text** → Kept (`"📖 Open Chord Helper"`) because the user's spec explicitly included the emoji, overriding the general no-emoji default in the coding guidelines (user opt-in is permitted).
- **Event wiring strategy** → React props/state only; no `window.dispatchEvent` or `CustomEvents` per user's explicit confirmation.
- **Drawer position** → Inline at the bottom of the active song card; not a fixed overlay or a portal (per user's explicit confirmation).
- **Target codebase** → Live Next.js app (`src/app/setlists/[id]/`) only; `_vite-legacy/` is excluded (per user's explicit confirmation).
- **All-unknown chord list** → Show placeholder cards for each unknown chord (not silently omit them); confirmed by user spec ("UNKNOWN CHORDS: Show a 'No diagram available' placeholder card").
- **`isDrawerOpen` initial state** → `useState(false)` (not a lazy initializer) to comply with BUG-020 SSR hydration safety rule from MEMORY.md.
- **`uniqueChords` deduplication** → Deduplicate on mount via `Set` so each chord name appears at most once in the drawer regardless of how many times it appears in the song text.
- **Named Tailwind utilities + dark mode** → Every `text-brand-*`, `bg-brand-*`, `border-brand-*` class must carry an explicit `dark:` pair per BUG-004/BUG-005 prevention patterns from MEMORY.md.
- **React Compiler function declaration order** → Declare all helper functions before the `useEffect`/`useCallback` that references them, per BUG-007 from MEMORY.md.
- **chordRegex reuse** → Must use the shared `chordRegex` from `src/utils/musicLogic.ts`; inline chord regex is prohibited per coding guidelines and validator checklist.

## Open Questions

- **Pending Reconciliation — OQ-1:** Does `onChordClick` receive the chord name as it appears in the original song text (pre-transposition) or as it appears after live transposition is applied? The answer depends on how `ChordSheetClient` renders transposed chords — specifically, whether the `data-chord` attribute or the span's text content holds the original vs transposed value. (Suggested resolution source: `src/components/SongViewer/ChordSheetClient.tsx` — inspect the span text or `data-*` attribute populated during DOM mutation.)
- **Pending Reconciliation — OQ-2:** Which component is the correct parent for mounting `ChordDrawer` and declaring the four state variables — `SetlistSongSection.tsx` or `SetlistViewerClient.tsx`? The answer depends on which component currently mounts `ChordSheetClient` and has access to the active song text. (Suggested resolution source: `src/components/client/SetlistSongSection.tsx` and/or `src/components/client/SetlistViewerClient.tsx` — check which one renders `ChordSheetClient`.)
- **Pending Reconciliation — OQ-3:** Does `ChordSheetClient` currently render chord spans via React JSX or via direct DOM mutation (innerHTML/innerText on a container ref)? If DOM mutation is used, a delegated `click` event listener on the container is required (not an inline `onClick` on the span). (Suggested resolution source: `src/components/SongViewer/ChordSheetClient.tsx` — inspect the `useEffect` that populates chord spans.)
- **Pending Reconciliation — OQ-4:** What is the exact CSS variable name used for card backgrounds in this codebase — is it `--brand-card-bg` as used in the user spec, or a different variable? (Suggested resolution source: `src/styles/` — grep for `--brand-card` or review the full CSS variable list.)
- **Pending Reconciliation — OQ-5:** Is `--brand-tan-alpha` already defined as a CSS variable in `src/styles/`? If not, either the variable must be defined or an alternative semi-transparent Artisan token must be used for the drawer border. (Suggested resolution source: `src/styles/` — grep for `--brand-tan-alpha`.)
- **Pending Reconciliation — OQ-6:** Does `src/utils/musicLogic.ts` export `chordRegex` as a named export? And is the export a `RegExp` instance or a string pattern? (Suggested resolution source: `src/utils/musicLogic.ts` — check export signature.)
