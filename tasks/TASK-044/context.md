# Context Bundle — Bass Tab in ChordDrawer

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/components/client/ChordDrawer.tsx` | Contains `instrumentMode` prop type, `GuitarSVG`/`PianoSVG` sub-components, all module-level SVG constants, instrument toggle buttons, and the card render switch |
| `src/utils/chordLibrary.ts` | Defines `GuitarFingering`, `PianoFingering`, `ChordRegistry` types; exports `CHORD_REGISTRY` with 46 chord entries (module-scope stable ref per BUG-019) |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Owns `instrumentMode` state (`useState<"guitar" | "piano">("guitar")`); passes `instrumentMode` and `onInstrumentChange={setInstrumentMode}` to `<ChordDrawer>` |
| `src/styles/globals.css` | Defines CSS variables (`--brand-tan`, `--brand-tan-alpha`, `--brand-darker`, `--brand-brown`, `--brand-cream`, `--brand-espresso`) used inside SVG `fill`/`stroke` attributes |
| `docs/coding-guidelines.md` | Artisan palette rules, dark mode pairing requirement (BUG-004), Musical Integrity rules |

---

## Reuse Candidates

- `src/components/client/ChordDrawer.tsx` — `GuitarSVG` sub-component can be studied as the exact structural template for a `BassSVG` sub-component: same `STRING_X`/`FRET_Y`/`FRET_CENTER_Y` pattern but with 4 strings instead of 6; same open/muted/fretted rendering logic.
- `src/components/client/ChordDrawer.tsx` — `STRING_X`, `FRET_Y`, `FRET_CENTER_Y` constants at module scope (BUG-019 compliant); a new `BASS_STRING_X` constant should follow the same `as const` pattern.
- `src/components/client/ChordDrawer.tsx` — `instrBtnActiveClass` / `instrBtnInactiveClass` module-level string constants are already the exact CSS for the instrument toggle buttons; the Bass button uses the same pair.
- `src/utils/chordLibrary.ts` — `GuitarFingering` interface is directly reusable for bass: bass uses the same `strings` tuple semantics (fret numbers, -1 muted, 0 open) and `capoOffset`; only the tuple length changes from 6 to 4. A new `BassFingering` interface should follow the same shape.
- `src/utils/chordLibrary.ts` — `ChordRegistry` type is `Record<string, { guitar: GuitarFingering; piano: PianoFingering }>` — needs a `bass` key added to the value shape.

---

## Patterns to Follow

- **Module-level `as const` array for SVG geometry:** See `ChordDrawer.tsx` lines 105–111 (`STRING_X`, `FRET_Y`, `FRET_CENTER_Y`). Bass needs its own `BASS_STRING_X` constant (4 positions) at module scope before any sub-component that uses it (BUG-007 requires declaration before reference).
- **SVG sub-component as a plain function (not memoized):** See `GuitarSVG` (lines 136–246) and `PianoSVG` (lines 248–306) — both are declared as plain `function` declarations, not arrow functions or `React.memo`. New `BassSVG` should follow the same convention.
- **Instrument mode switch in card render:** See `ChordDrawer.tsx` lines 438–448 — the ternary `instrumentMode === "guitar" ? <GuitarSVG> : <PianoSVG>` must be extended to a three-way conditional or a lookup object when bass is added.
- **Union type widening for `instrumentMode`:** The type `"guitar" | "piano"` appears in three places that must all be widened together: (1) `ChordDrawerProps.instrumentMode` line 323, (2) `ChordDrawerProps.onInstrumentChange` line 324, and (3) `SetlistViewerClient.tsx` line 111 `useState<"guitar" | "piano">`. All three must change to `"guitar" | "piano" | "bass"` atomically.
- **Button aria-pressed pattern:** See `ChordDrawer.tsx` lines 387–408 — each instrument button uses `aria-pressed={instrumentMode === "<mode>"}` and the active/inactive class pair from module-scope constants.
- **Placeholder card for missing data:** See `ChordDrawer.tsx` lines 447–449 — if an entry is in `CHORD_REGISTRY` but has no `bass` field yet, the same `<p className={placeholderTextClass}>No diagram available</p>` path handles it; the render switch just falls through to placeholder.
- **Dark mode brand utility pairing (BUG-004):** See all module-level class constants in `ChordDrawer.tsx` (lines 14–100) — every named Tailwind brand utility has an explicit `dark:` pair. Any new classes for BassSVG or a new tab button must follow the same pairing.

---

## Anti-Patterns Flagged

- `src/components/client/ChordDrawer.tsx` line 439: the instrument branch is a two-arm ternary (`instrumentMode === "guitar" ? <GuitarSVG> : <PianoSVG>`). Adding bass as a third arm requires converting this to an if/else chain or a lookup object — do NOT nest a second ternary (`… : instrumentMode === "piano" ? <PianoSVG> : <BassSVG>`) as it becomes unreadable and is against the Readability guideline in `docs/coding-guidelines.md`.
- `src/utils/chordLibrary.ts` line 35–38: `ChordRegistry` value type is `{ guitar: GuitarFingering; piano: PianoFingering }` with no `bass` field. Adding `bass?: BassFingering` here changes the exported type shape — downstream consumers of `CHORD_REGISTRY` (currently only `ChordDrawer.tsx`) will need to handle the optional field at render time (which the existing placeholder path already handles correctly).

---

## MEMORY.md Notes

- **BUG-007 (React Compiler forward reference):** Declare `BASS_STRING_X` and any `BassSVG` helper at module scope BEFORE the `BassSVG` function definition, and declare `BassSVG` BEFORE the `useEffect` or any hook that could reference it. React Compiler rejects forward references that JS hoisting would otherwise allow.
- **BUG-002 (React Compiler useCallback property-path deps):** `onInstrumentChange` in `SetlistViewerClient` is currently `setInstrumentMode` (a stable setter — no `useCallback` needed). If the type widens and a wrapper `useCallback` is added, deps must be whole objects or primitives, never property paths like `[instrumentMode.length]`.
- **BUG-004 (Dark mode missing variants):** All new Tailwind named brand utilities added for the Bass button or BassSVG must have explicit `dark:` paired alongside them. CSS variable classes (`bg-[var(--brand-tan-alpha)]`) do not need pairing if the variable already switches correctly in dark mode.
- **BUG-019 (Stable array refs at module scope):** `BASS_STRING_X` must be declared at module level with `as const`, not created inline inside `BassSVG` or inside the parent render. The existing `STRING_X`, `FRET_Y`, `FRET_CENTER_Y`, `BLACK_KEY_X` constants in `ChordDrawer.tsx` are the canonical reference for this pattern.
- **BUG-021 (CSS variable opacity):** Any new SVG `fill` or background using `var(--brand-*)` must verify the variable is full-opacity. The existing SVG fills (`var(--brand-brown)`, `var(--brand-tan)`, `var(--brand-cream)`, `var(--brand-espresso)`) are all confirmed full-opacity. Do not introduce `var(--brand-card-bg)` for SVG fill — it resolves semi-transparent.
- **Prettier (feedback rule):** Run `npm run format` before every commit. All files in the PR must pass Prettier v3 without changes.
