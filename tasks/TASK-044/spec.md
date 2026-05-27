# Spec — Bass Tab for ChordDrawer

## Feature Summary

Add a "Bass" instrument tab to the existing ChordDrawer bottom drawer. When selected, the drawer displays a 4-string bass fretboard SVG (E A D G, low to high, left to right) that highlights the correct finger positions for the chord currently displayed in the chord sheet. The visual language mirrors the existing GuitarSVG: open circles above the nut for open strings, filled tan circles at fret intersections for fretted notes, and × above the nut for unused strings. Bass fingerings are standard root-position 2–3 note worship voicings. No Supabase interaction is involved; all data is static.

## Acceptance Criteria

### BassFingering Interface

1. `src/utils/chordLibrary.ts` exports a `BassFingering` interface with exactly one field: `strings: [number, number, number, number]` — a fixed-length tuple of four numbers representing strings E, A, D, G (low to high, index 0–3).
2. The encoding convention matches `GuitarFingering`: `-1` = muted (×), `0` = open, positive integer = fret number (1-based).
3. The `BassFingering` interface is defined at module scope and exported so it can be imported by any consumer without importing the full chord registry.

### ChordRegistry Type Update

4. The `ChordRegistry` type (or equivalent chord-entry type) in `src/utils/chordLibrary.ts` includes a required `bass: BassFingering` field alongside the existing guitar and piano fields.
5. TypeScript compilation must not produce a type error: if `bass` is omitted from any chord entry the build fails.

### Chord Entry Coverage

6. Every chord entry in the chord registry (all ~45 entries) has a `bass` field populated with a musically valid 2–3 note root-position voicing. No entry has a placeholder or `undefined` value.
7. The Em bass example provided by the user is implemented correctly: E string = `0` (open), A string = `2` (E note at 2nd fret), D string = `-1` (muted), G string = `-1` (muted) — i.e. `strings: [0, 2, -1, -1]`.
8. Bass voicings use only frets 0–4 (within the rendered 5-fret window). No fret number exceeds `4` in any chord entry.

### BassSVG Component

9. A `BassSVG` component is added inside `src/components/client/ChordDrawer.tsx` (co-located with `GuitarSVG`) and accepts a single `fingering: BassFingering` prop.
10. `BassSVG` renders an SVG fretboard with exactly 4 strings (vertical lines) and 5 horizontal lines (nut + frets 1–4), matching the dimensional proportions used by `GuitarSVG`.
11. For each string at index `i`:
    - If `fingering.strings[i] === -1`: render a × symbol above the nut, same size and position convention as `GuitarSVG`.
    - If `fingering.strings[i] === 0`: render an open circle (unfilled ring) above the nut, same convention as `GuitarSVG`.
    - If `fingering.strings[i] >= 1`: render a filled circle at the correct fret row (centered between fret `n-1` and fret `n` horizontal lines), using `bg-brand-tan` color (Artisan tan: `#BC8E5C`), same convention as `GuitarSVG`.
12. The nut (topmost horizontal line) is rendered visually heavier / distinct from the fret lines, same as `GuitarSVG`.
13. `BassSVG` is a pure function component with no internal state and no hooks. All rendering is derived solely from the `fingering` prop.
14. `BassSVG` must not import or reference Supabase, Server Actions, or any non-SVG/style dependency outside `ChordDrawer.tsx` and `chordLibrary.ts`.
15. `BassSVG` renders a visible chord name label (same position and style as `GuitarSVG`'s label, if one exists) — or, if `GuitarSVG` does not render a label, `BassSVG` also does not render one. (Pending Reconciliation: see Open Questions.)

### Bass Tab Button

16. The instrument toggle group in the `ChordDrawer` header gains a "Bass" tab button, positioned after the existing "Guitar" and "Piano" tab buttons (order: Guitar | Piano | Bass).
17. The Bass tab button uses the same visual style, active/inactive states, and Artisan palette classes as the existing Guitar and Piano tab buttons — no new styles introduced.
18. Clicking "Bass" sets `instrumentMode` to `"bass"` and renders `BassSVG` in the drawer body. The Guitar and Piano displays are hidden (not unmounted, unless that is the existing pattern — Pending Reconciliation).
19. The Bass tab button is visible and clickable for all users (no auth gate, same as Guitar and Piano tabs).

### instrumentMode Type Propagation

20. The `instrumentMode` type is widened from `"guitar" | "piano"` to `"guitar" | "piano" | "bass"` in all locations where it is declared or consumed:
    - The `instrumentMode` state in `SetlistViewerClient.tsx`.
    - Any prop type that accepts `instrumentMode` passed down to `ChordDrawer`.
    - The `ChordDrawer` internal switch/conditional that selects which diagram to render.
21. TypeScript compilation succeeds with no `never`-branch or unhandled-union-member errors after the type widening.
22. If `instrumentMode === "bass"` is ever passed to a location that previously only handled `"guitar" | "piano"`, a TypeScript exhaustive check (or equivalent) surfaces the gap at compile time rather than silently falling through.

### Unknown Chord Fallback

23. If the chord name extracted from the chord sheet does not exist as a key in the chord registry, `BassSVG` renders an "Unknown chord" placeholder (same approach used by `GuitarSVG` and `PianoSVG` for unknown chords — Pending Reconciliation on exact string and visual treatment; must match codebase convention, see `<must match codebase convention — see context.md "Patterns to Follow">`).
24. The unknown-chord fallback must not throw a runtime error or render a blank/invisible SVG.

### React Compiler Compliance

25. All functions used inside `useEffect`, `useCallback`, or `useMemo` hooks within `ChordDrawer.tsx` or `SetlistViewerClient.tsx` that are added or modified by this task are declared before the hook that references them (BUG-007 prevention).
26. No `useCallback` or `useMemo` dependency array references an object property path (e.g. `[obj.field]`); dependencies reference whole objects or destructured primitives (BUG-002 prevention).
27. No module-level constant is introduced that shares a name with a component-scoped variable or prop in the same file (BUG-016 prevention).

### Tailwind / Styling

28. All Artisan palette classes in `BassSVG` and the Bass tab button use named Tailwind utilities (`bg-brand-tan`, `text-brand-espresso`, etc.) with explicit `dark:` variants — not CSS variable arbitrary values (`bg-[var(--brand-tan)]`) for component backgrounds (BUG-021 prevention, BUG-004/005 prevention).
29. Every named Artisan utility applied to `BassSVG` or the Bass tab button has a matching `dark:` variant pair (BUG-004/005 prevention).

### Format & Branch

30. `npm run format` is run and all modified files are Prettier-formatted before the commit.
31. All changes are committed to branch `feature/TASK-043-chord-drawer` (the existing feature branch for this task group), not to `develop` or `main`.

## Out of Scope

- Chord voicing editor or user-editable bass fingerings.
- Animated fret transitions or scroll-to-position behavior.
- Bass-specific transposition logic — the same chord name lookup used for guitar/piano drives bass lookup.
- Any Supabase read or write for bass fingering data.
- Capo support for bass.
- More than 4 strings or more than 5 frets (including higher-position voicings beyond fret 4).
- Audio playback of bass notes.
- A "Bass only" mode that hides other instruments.
- Storing the user's selected `instrumentMode` in Supabase or localStorage (persistence is out of scope unless already implemented for guitar/piano — Pending Reconciliation).

## Fallback Behaviors

- **Unknown chord:** If the active chord is not found in the chord registry, `BassSVG` renders a legible placeholder (text or empty fretboard with label) rather than crashing or rendering blank. Exact text must match the codebase convention already used by `GuitarSVG`/`PianoSVG` (Pending Reconciliation).
- No network calls are involved; no loading or error state is needed for the Bass tab itself.

## Resolved Ambiguities

- **String count and order** → 4 strings, E A D G low to high, left to right. Source: user clarification provided in task prompt.
- **Fret window size** → 5 frets (nut + frets 1–4), matching GuitarSVG convention. Source: user clarification.
- **Open string marker** → open circle above nut, same as GuitarSVG. Source: user clarification.
- **Fretted note marker** → filled circle at fret position, tan color, same as GuitarSVG. Source: user clarification.
- **Muted string marker** → × above nut, same as GuitarSVG. Source: user clarification.
- **Em voicing** → E=0, A=2, D=-1, G=-1. Source: user clarification ("E string open, E on the second string [of A string at fret 2]").
- **Fret range** → voicings confined to frets 0–4. Source: user clarification ("same layout convention as existing GuitarSVG, 5 frets shown").
- **Tab position** → Bass appears after Guitar and Piano. Source: natural ordering implied by "add another tab"; Guitar and Piano pre-exist.
- **No Supabase** → confirmed; this is pure UI + static data. Source: PM last decision.
- **Tailwind v4 CSS-first / BUG-021** → use named brand utilities for backgrounds, not CSS variable arbitrary values. Source: MEMORY.md BUG-021 + coding-guidelines.md.
- **React Compiler forward-reference rule (BUG-007)** → functions must be declared before the hook that references them. Source: MEMORY.md BUG-007.
- **`useCallback` dep arrays (BUG-002)** → no property-path deps. Source: MEMORY.md BUG-002.
- **Dark mode pairing (BUG-004/005)** → every named Artisan utility needs explicit `dark:` pair. Source: MEMORY.md BUG-004/005.

## Open Questions

- **Pending Reconciliation** — What is the exact unknown-chord fallback text and visual treatment used by the existing `GuitarSVG` and `PianoSVG` components? (suggested resolution source: `src/components/client/ChordDrawer.tsx` — search for the fallback render path when a chord key is not found in the registry)
- **Pending Reconciliation** — Does `BassSVG` need to render a chord name label above/below the fretboard? If yes, what are the exact font class and position used by `GuitarSVG`? (suggested resolution source: `src/components/client/ChordDrawer.tsx` — GuitarSVG label rendering)
- **Pending Reconciliation** — Does the existing chord diagram display unmount non-active tabs or simply hide them with CSS? (suggested resolution source: `src/components/client/ChordDrawer.tsx` — instrument toggle conditional render pattern)
- **Pending Reconciliation** — Is `instrumentMode` persistence (localStorage / Supabase) already implemented for guitar/piano? If yes, does the Bass tab need to be included in that persistence key? (suggested resolution source: `src/app/setlists/[id]/SetlistViewerClient.tsx` — instrumentMode state initialization)
- **Pending Reconciliation** — What are the exact SVG width, height, viewBox, and stroke values used by `GuitarSVG` so `BassSVG` can match proportions? (suggested resolution source: `src/components/client/ChordDrawer.tsx` — GuitarSVG SVG element attributes)
