# TASK-044 — Bass Tab in ChordDrawer

- **Tier:** 2
- **Date Created:** 2026-05-27
- **Status:** In Progress

---

## Feature Summary

Add bass guitar (4-string) chord fingering diagrams to the ChordDrawer component. Each chord in the registry will have a new `bass` field containing a 4-string fingering (E A D G tuning), rendered as a pure SVG alongside existing Guitar and Piano tabs. The instrumentMode type will be widened from `"guitar" | "piano"` to `"guitar" | "piano" | "bass"` throughout the component hierarchy. Bass tabs will use the same Artisan palette colors and interactive patterns as guitar/piano tabs.

---

## Acceptance Criteria

1. **AC-1: BassFingering interface definition** — Define `export interface BassFingering { strings: [number, number, number, number]; }` in `src/utils/chordLibrary.ts`. The 4-element array represents E A D G strings (index 0–3). Follow the same convention as GuitarFingering: -1 = muted, 0 = open, N ≥ 1 = fret number.

2. **AC-2: BassFingering module export** — Export BassFingering as a named type alongside GuitarFingering and PianoFingering so downstream components can import and type their props.

3. **AC-3: BassFingering stability** — Do NOT create a `fingers` field on BassFingering (unlike GuitarFingering). Bass diagrams will not render finger labels; only the string/fret indicators (open circle, muted ×, filled circle) are shown.

4. **AC-4: ChordRegistry type update — bass field required** — Update `export type ChordRegistry = Record<string, { guitar: GuitarFingering; piano: PianoFingering; bass: BassFingering }>`. The `bass` field is non-optional and required on every chord entry.

5. **AC-5: TypeScript compilation must fail until all chords have bass** — After updating the ChordRegistry type, run `npm run build` to ensure all ~45 chord entries in CHORD_REGISTRY generate a TypeScript error for missing `bass` field. Do NOT proceed to AC-6 until the error is confirmed (verifying the type constraint is enforced).

6. **AC-6: All 45 chords have bass voicings** — Add a `bass` field to every chord entry in CHORD_REGISTRY. Each voicing is a root-position 2–3 note voicing using fret range 0–4 (no extended range). Use standard worship bassist conventions:
   - C: `[0, 3, 2, 0]` (C E G C — low E open, A fret 3, D fret 2, G open)
   - Em: `[0, 2, -1, -1]` (E A open on low two strings, D/G muted)
   - G: `[3, 0, 0, -1]` (G open A, D open, G muted)
   - D: `[-1, 0, 0, 2]` (E muted, A open, D open, G fret 2)
   - A: `[0, 0, 2, 2]` (A open, D open, G frets 2–2)
   - Am: `[-1, 0, 1, 2]` (A open, D fret 1, G fret 2)
   - All slash chords (C/E, G/B, D/F#, etc.) use the bass note as the lowest open or fretted string.

7. **AC-7: Worship bass voicing consistency** — Every chord's bass voicing must be playable on a 4-string bass in first position (frets 0–4), with no dead strings on intermediate frets that would require specialized damping. Muted strings are acceptable as the highest note in the voicing.

8. **AC-8: Known bass fingering — Em validation** — The Em bass voicing `[0, 2, -1, -1]` produces E A notes (root and fifth). This is confirmed in the specification and must not be changed.

9. **AC-9: BassSVG pure function signature** — Create a new sub-component `function BassSVG({ fingering }: { fingering: BassFingering })` in `src/components/client/ChordDrawer.tsx`. It must be a pure function with no hooks, no state, no Supabase calls, and no side effects.

10. **AC-10: BassSVG viewBox and dimensions** — BassSVG must render with `viewBox="0 0 88 120"` (width=88, height=120). The narrower viewBox width (cf. GuitarSVG's width=100) accommodates 4 strings with ~20px spacing and left/right margins.

11. **AC-11: BassSVG BASS_STRING_X constant — module scope** — Define `const BASS_STRING_X = [14, 34, 54, 74] as const;` at module scope BEFORE the BassSVG function definition (not inside the function). This is a stable constant preventing BUG-007 (forward reference in hooks) and BUG-019 (unstable array refs per render).

12. **AC-12: BassSVG fret line geometry** — BassSVG must render exactly 5 horizontal fret lines at `FRET_Y = [20, 40, 60, 80, 100]` (nut + 4 frets). The nut line (index 0, y=20) has `strokeWidth=3`; all other fret lines have `strokeWidth=1`. All lines use `stroke="var(--brand-brown)"`.

13. **AC-13: BassSVG vertical string lines** — BassSVG must render 4 vertical string lines at x positions in BASS_STRING_X, from y=20 (nut) to y=100 (fret 4). Each line has `stroke="var(--brand-brown)" strokeWidth=1`.

14. **AC-14: BassSVG open string indicators** — For each string i in [0, 1, 2, 3], if fingering.strings[i] === 0, render a circle above the nut: `<circle cx={BASS_STRING_X[i]} cy={12} r={4} fill="none" stroke="var(--brand-brown)" strokeWidth={1.5} />`.

15. **AC-15: BassSVG muted string indicators** — For each string i, if fingering.strings[i] === -1, render a × symbol above the nut: `<text x={BASS_STRING_X[i]} y={14} textAnchor="middle" fontSize={9} fill="var(--brand-brown)" fontWeight="bold">×</text>`.

16. **AC-16: BassSVG fretted string indicators** — For each string i, if fingering.strings[i] >= 1, render a filled tan circle at the fret position: `<circle cx={BASS_STRING_X[i]} cy={FRET_CENTER_Y[fingering.strings[i] - 1]} r={7} fill="var(--brand-tan)" />`. The FRET_CENTER_Y array is borrowed from GuitarSVG and maps fret number (1–4) to y coordinate.

17. **AC-17: Bass tab button in instrument toggle** — Add a third button labeled "Bass" to the instrument toggle group in ChordDrawer's header. The button order is: Guitar | Piano | Bass (left to right).

18. **AC-18: Bass button styling — active state** — When `instrumentMode === "bass"`, the Bass button uses `instrBtnActiveClass` (brown bg with cream text in light mode; tan bg with espresso text in dark mode).

19. **AC-19: Bass button styling — inactive state** — When `instrumentMode !== "bass"`, the Bass button uses `instrBtnInactiveClass` (tan border, cream/tan text, hover transition).

20. **AC-20: SetlistViewerClient instrumentMode type widened** — In `src/app/setlists/[id]/SetlistViewerClient.tsx` line 111, change `useState<"guitar" | "piano">` to `useState<"guitar" | "piano" | "bass">`. The default value remains `"guitar"`.

21. **AC-21: ChordDrawerProps.instrumentMode type widened** — In ChordDrawer's props type, update the `instrumentMode` prop type from `"guitar" | "piano"` to `"guitar" | "piano" | "bass"`.

22. **AC-22: ChordDrawerProps.onInstrumentChange type widened** — In ChordDrawer's props type, update the `onInstrumentChange` prop type from `(mode: "guitar" | "piano") => void` to `(mode: "guitar" | "piano" | "bass") => void`.

23. **AC-23: ChordDrawer instrument conditional refactored to if/else chain** — Replace the two-arm ternary at line 439 (`instrumentMode === "guitar" ? <GuitarSVG> : <PianoSVG>`) with an if/else chain to prepare for three instruments:
   ```typescript
   if (instrumentMode === "guitar") {
     return <GuitarSVG fingering={... } capoOffsetProp={...} />;
   } else if (instrumentMode === "piano") {
     return <PianoSVG fingering={...} />;
   } else if (instrumentMode === "bass") {
     return <BassSVG fingering={...} />;
   } else {
     return <p className={placeholderTextClass}>No diagram available</p>;
   }
   ```

24. **AC-24: Unknown bass chord fallback** — If a chord name is not found in CHORD_REGISTRY and the user selects the Bass tab, render `<p className={placeholderTextClass}>No diagram available</p>` (same fallback as guitar/piano). Do NOT produce a runtime error or console warning.

25. **AC-25: BassSVG module-scope constants stability** — BASS_STRING_X must be declared at module scope as a TypeScript `const ... as const` array, preventing BUG-007 (forward reference) and BUG-019 (unstable refs). The function definition must come AFTER the constant declaration.

26. **AC-26: React Compiler compliance — no property-path deps** — Do NOT use property-path dependencies in any hooks (e.g., `fingering.strings[0]`). Depend on the whole object: `[fingering]`. This prevents BUG-002 (React Compiler rejection).

27. **AC-27: React Compiler compliance — no shadowing** — Do NOT declare any local variables named `BASS_STRING_X` or other module-level constant names inside function bodies. This prevents BUG-016 (static const shadowing dynamic variables).

28. **AC-28: SVG colors use CSS variables — full opacity** — All SVG fills and strokes must use `var(--brand-brown)`, `var(--brand-tan)`, `var(--brand-cream)`, or `var(--brand-espresso)`. All of these CSS variables are full-opacity (not semi-transparent). Do NOT use `bg-[var(--brand-card-bg)]` or similar semi-transparent variables (BUG-021).

29. **AC-29: Tailwind utilities include dark: variants** — Every Tailwind utility class with color or background properties must have a paired `dark:` variant. This applies to all new Bass-related styling in the toggle buttons and any wrapper divs. Examples: `text-brand-brown dark:text-brand-tan`, `bg-brand-cream dark:bg-brand-espresso`.

30. **AC-30: Format before commit** — Before creating the pull request, run `npm run format` to auto-format all modified files with Prettier v3. Do NOT commit unformatted code.

31. **AC-31: Branch name matches TASK ID** — All commits must be made to branch `feature/TASK-043-chord-drawer`. The branch already exists (from TASK-043 setup). Do NOT commit to develop or main.

---

## Out of Scope

- Capo offset display for bass fingerings (bass chords use only frets 0–4; capo is not applicable).
- Dynamic chord voicing transposition based on setlist key changes (bass voicings are static, same as guitar/piano).
- MIDI playback or sound synthesis for bass chords.
- Finger label annotations on bass diagrams (unlike guitar).
- Extended bass range beyond fret 4.
- Tuning variation (all bass tabs assume standard E A D G tuning).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/utils/chordLibrary.ts` | ChordRegistry type update; BassFingering interface; 45 chord entries + bass voicings |
| `src/components/client/ChordDrawer.tsx` | BassSVG sub-component; BASS_STRING_X constant; instrument mode conditional refactor; bass button in toggle group |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Widen instrumentMode state type and onInstrumentChange callback |

---

## Technical Schema

N/A — no API contract required for this task. Bass fingerings are static module constants; no Supabase queries or Server Actions involved.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | (embedded in this file) | Acceptance criteria + scope |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).
- TypeScript will enforce the `bass` field requirement on ChordRegistry once the type is updated. Compilation will fail until all 45 chord entries are complete.
- BassSVG follows the exact same SVG rendering pattern as GuitarSVG; reuse the FRET_CENTER_Y constant borrowed from GuitarSVG geometry (no duplication).
- Do NOT create a BASS_FRET_CENTER_Y constant; reuse FRET_CENTER_Y from GuitarSVG scope.
- All instrument toggle buttons share instrBtnActiveClass and instrBtnInactiveClass — add Bass as a third button using the same styling classes.
- ChordDrawer currently passes only guitar/piano to sub-components; ensure the bass case also passes the `fingering` prop extracted from CHORD_REGISTRY[chordName].bass.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-002:** React Compiler rejects useCallback deps that reference object property paths (e.g., `fingering.strings[0]`). Depend on the whole object instead: `[fingering]`.
- **BUG-004:** Tailwind named utilities using hard-coded Artisan palette classes (e.g., `text-brand-brown`) do NOT switch in dark mode. Every color/background utility MUST have a paired `dark:` variant (e.g., `text-brand-brown dark:text-brand-tan`).
- **BUG-007:** React Compiler rejects forward references — functions or variables used in hooks must be declared before the hook, not after. BASS_STRING_X must be declared at module scope before BassSVG function definition.
- **BUG-016:** Static module-level constants can shadow dynamic variables in the same scope, causing silent perf bugs. Do NOT declare local variables with the same names as module constants.
- **BUG-019:** Arrays created inside function bodies (e.g., `const STRINGS = [0, 2, ...]` inside a component) produce new refs every render, breaking memo() stability. Define BASS_STRING_X at module scope as a stable const.
- **BUG-021:** CSS variable names do not signal opacity — `var(--brand-card-bg)` is semi-transparent, but `var(--brand-tan)` is full-opacity. Use Tailwind named utilities for opaque backgrounds; only use CSS variables after verifying they are full-opacity.

---

## Amendments (from Context Bundle)

N/A — no anti-pattern conflicts or MEMORY.md items require amendments. All 31 ACs are derived from the spec and codebase constraints.

---

## Resolved Open Questions

N/A — no open questions in the specification.

---

## Resolution

- **Completed:** 2026-05-27
- **Branch:** feature/TASK-043-chord-drawer
- **Base branch:** develop
- **Files changed:**
  - `src/utils/chordLibrary.ts` — Added `BassFingering` interface, updated `ChordRegistry` type to require `bass` field, added `bass` voicings to all 45 chord entries
  - `src/components/client/ChordDrawer.tsx` — Added `BassFingering` import, `BASS_STRING_X` module-level constant, `BassSVG` pure function component, `Bass` button in instrument toggle group, widened `ChordDrawerProps` types, refactored two-arm ternary to if/else chain
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — Widened `instrumentMode` useState type from `"guitar" | "piano"` to `"guitar" | "piano" | "bass"`
- **Notes:**
  - Build passed cleanly (`npm run build`) with zero TypeScript errors — ChordRegistry type enforcement confirmed all 45 entries have the `bass` field.
  - Prettier reported all files as unchanged (already formatted).
  - BassSVG is declared at module scope before computeScrollTarget, satisfying BUG-007 (no forward references).
  - BASS_STRING_X declared as `const ... as const` at module scope, satisfying BUG-019 (stable array ref).
  - All SVG fills/strokes use `var(--brand-brown)` and `var(--brand-tan)` — full-opacity CSS variables only (BUG-021 compliant).
  - No Supabase calls, no Server Actions, no auth logic added.
  - Bass voicings for Em are `[0, 2, -1, -1]` as specified (AC-8 confirmed).
