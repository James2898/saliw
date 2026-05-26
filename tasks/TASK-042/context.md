# Context Bundle — Capo and CAGED Shape Picker

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/page.tsx` | Server Component that fetches setlist data and pre-processes chord sheets; passes `originalKey`, `performanceKey`, `processedLines` to client |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Client root for the setlist viewer; owns `useSetlistSync`, all lifted hooks (font, chordFont, chordColor, autoScroll), and renders one `SetlistSongSection` per song |
| `src/components/client/SetlistSongSection.tsx` | Per-song wrapper; passes props into `ChordSheetClient` (MemoChordSheetClient); the Sync button and live-sync status live here — capo/CAGED picker must be added inside this component's header area |
| `src/components/SongViewer/ChordSheetClient.tsx` | Contains the expandable "Song Controls" accordion (`toolbarOpen` / `setToolbarOpen` useState, `max-h-0` → `max-h-40` CSS transition); this is the expand/collapse mechanism the task refers to |
| `src/hooks/useTranspose.ts` | Manages `semitoneOffset` and `displayKey`; exposes `setTargetKey(key)` — the capo's inverse-transpose must compute a new effective semitone offset and pass it here or alongside it |
| `src/utils/musicLogic.ts` | `shiftChord(chord, semitones)`, `getSemitoneOffset(originalKey, performanceKey)`, `NOTES`, `chordRegex` — all transposition math must use these exports |
| `src/hooks/useFontSize.ts` | Reference implementation for a local-only hook with SSR-safe lazy `useState` initializer (BUG-001 pattern) |
| `src/hooks/useChordColor.ts` | Reference for a preset-picker hook with typed union presets, module-level preset arrays, and a `setXxx` callback pattern |
| `src/hooks/useChordFontSize.ts` | Second reference for the same lifted-hook pattern |
| `src/components/client/SetlistSettingsModal.tsx` | Reference for the swatch-style preset button UI pattern (color swatches with `aria-pressed`, checkmark overlay, border ring on selected state) |

## Reuse Candidates

- `src/hooks/useTranspose.ts` — The capo state can be stored as a plain `number` (0–7) in `ChordSheetClient` local state; the effective display offset becomes `semitoneOffset - capoOffset` before calling `shiftChord`. No changes to `useTranspose` are needed; the capo is applied as a subtraction on the existing `semitoneOffset` at the DOM-mutation site (`useEffect` that calls `shiftChord`).

- `src/utils/musicLogic.ts` — `shiftChord` and `getSemitoneOffset` are the sole permitted math functions. The capo offset is subtracted from `semitoneOffset` before passing to `shiftChord`. No new utility function is needed.

- `src/hooks/useChordColor.ts` — Pattern for a 5-option preset picker (typed union, module-level `PRESETS` array, `setState` + optional `localStorage` persist via lazy initializer). The CAGED hook can follow this exactly: `type CAGEDShape = 'C' | 'A' | 'G' | 'E' | 'D'` with a `useState<CAGEDShape>('C')`.

- `src/components/client/SetlistSettingsModal.tsx` — The `w-9 h-9` swatch button pattern with `aria-pressed`, `border-2` ring on selection, and SVG checkmark overlay is directly reusable for the 5-button CAGED picker and the capo fret buttons.

- `src/components/SongViewer/ChordSheetClient.tsx` (accordion expand/collapse) — The `toolbarOpen` / `setToolbarOpen` boolean + `max-h-0` / `max-h-40` CSS transition is the exact pattern to follow for inserting new rows inside the expanded Song Controls panel. The new capo and CAGED rows must go inside the existing `<div aria-label="Chord sheet controls">` flex row (lines 300–450), separated by the same `<span class="w-px h-5 ...">` divider pattern already used between Key, Size, and Hide Chords.

- `src/components/client/SetlistSettingsModal.tsx` — Module-level CSS class constant strings (e.g. `ctrlBtnClass`, `sectionLabelClass`) extracted above the component to avoid per-render string allocations. The capo/CAGED picker must follow this same module-level constant extraction.

## Patterns to Follow

- **Accordion expand/collapse:** See `src/components/SongViewer/ChordSheetClient.tsx` lines 238–452 — `useState(false)` for `toolbarOpen`, button with `aria-expanded={toolbarOpen}`, collapsible `<div>` with `overflow-hidden transition-all duration-200` and `max-h-0` / `max-h-40` CSS height classes.

- **Local-only state with SSR-safe lazy initializer:** See `src/hooks/useFontSize.ts` — `useState<number>(readStoredFontSize)` where `readStoredFontSize` guards `typeof window === "undefined"`. If capo/CAGED are not persisted, use `useState(0)` / `useState<CAGEDShape>('C')` directly — no localStorage or lazy initializer needed. Do NOT use `useState(() => typeof window !== "undefined")` as a mount guard (BUG-020).

- **Preset-picker typed union:** See `src/hooks/useChordColor.ts` lines 5–43 — typed union, `PRESETS` array at module scope (not inline in render — BUG-019), `useCallback`-wrapped setter.

- **Swatch button with selected ring:** See `src/components/client/SetlistSettingsModal.tsx` lines 395–460 — `aria-pressed={isSelected}`, `border-2` toggling between `border-brand-espresso dark:border-brand-tan` (selected) and `border-brand-brown/20 dark:border-brand-tan/20` (unselected), SVG checkmark overlay.

- **DOM mutation for chord display (not React re-render):** See `src/components/SongViewer/ChordSheetClient.tsx` lines 151–165 — `useEffect` that queries `.chord-item[data-original-chord]` spans and mutates `span.innerText = shiftChord(original, semitoneOffset)`. The capo offset must be applied at this same site: `shiftChord(original, semitoneOffset - capoOffset)`. This keeps the existing SSR-safe DOM mutation approach and avoids hydration mismatch.

- **Divider between control groups:** See `src/components/SongViewer/ChordSheetClient.tsx` lines 382–385 — `<span className="w-px h-5 bg-brand-brown/20 dark:bg-brand-tan/20 shrink-0" aria-hidden="true" />`.

- **Module-level class constants:** See `src/components/SongViewer/ChordSheetClient.tsx` lines 13–36 — all repeated Tailwind class strings are hoisted to `const` above the component. The new capo/CAGED UI must follow this — no template literal class strings inside JSX.

- **useCallback dep discipline (React Compiler):** See `src/components/client/GoLiveButton.tsx` line 201 — deps reference the whole `sync` object, not `sync.toggleLive`. Never use object property paths in `useCallback`/`useMemo` dep arrays (BUG-002).

- **Hook declaration order (React Compiler):** See `src/components/client/SetlistSettingsModal.tsx` line 141 comment — all helper functions that are called inside `useEffect` must be declared before the `useEffect` (BUG-007).

## Anti-Patterns Flagged

- `src/components/client/SetlistSettingsModal.tsx` line 93–103: `ctrlBtnClass` uses named Tailwind utilities (`text-brand-espresso`, `bg-brand-cream`) without `dark:` variants on `bg-brand-cream`. The dark mode background uses `dark:bg-brand-espresso` but the text uses `text-brand-espresso dark:text-brand-cream`. This is correctly paired on text, but if replicated carelessly in the new capo/CAGED picker, any `bg-brand-cream` on a button must have `dark:bg-brand-espresso` (BUG-004 pattern). Do not replicate bare `bg-brand-cream` without the `dark:` pair.

- `src/components/SongViewer/ChordSheetClient.tsx` line 296: `max-h-40` is hardcoded as the expanded height of the toolbar panel. If capo and CAGED rows are added inside this panel, `max-h-40` (160px) will clip the expanded content. The value will need to be increased (e.g. `max-h-64` or `max-h-96`) to accommodate the additional rows — do not replicate the current value without adjusting it.

## MEMORY.md Notes

The following entries from `MEMORY.md` are directly relevant to this local-only state feature:

- **BUG-001** (useState lazy initializer): If capo or CAGED state is later persisted to `localStorage`, the read must use a lazy initializer (`useState(readValue)`) — never `useEffect` + `setState`. For the current local-only (never-persisted) implementation, `useState(0)` and `useState<CAGEDShape>('C')` are sufficient and safe.

- **BUG-020** (SSR hydration mismatch with window check): Do NOT use `useState(() => typeof window !== "undefined")` as a mount guard. The capo and CAGED state have no SSR dependency — use `useState(false)` / `useState(0)` / `useState('C')` as literal defaults.

- **BUG-002** (React Compiler useCallback property-path deps): Any new `useCallback` in `ChordSheetClient` or a new hook must list the whole object as the dep, not a property path. E.g. depend on `[controls]` not `[controls.capoOffset]`.

- **BUG-007** (React Compiler forward reference): Declare any capo/CAGED setter callbacks above the `useEffect` that uses them. The DOM-mutation `useEffect` at line 151 is where `capoOffset` must be added to the dep array — declare any helper above it.

- **BUG-004** (dark mode paired utilities): Every `text-brand-*`, `bg-brand-*`, `border-brand-*` class in the new picker UI must have an explicit `dark:` pair. The swatch pattern in `SetlistSettingsModal.tsx` is the correct reference.

- **BUG-019** (inline array allocation negating memo): If the 5 CAGED shape buttons or capo fret buttons are mapped from an array, that array must be declared at module scope or in `useMemo` — never inline in the render body — if the picker is ever extracted into a `React.memo` child. Since `ChordSheetClient` is currently wrapped in `React.memo` at the call site (`SetlistSongSection.tsx` line 49), arrays passed as props must be stable.
