# TASK-042 — Capo and CAGED Shape Picker

- **Tier:** 1 (Medium)
- **Date Created:** 2026-05-26
- **Status:** In Progress

---

## Feature Summary

Add an interactive Capo selector (frets 0–7) and CAGED shape picker (5 buttons: C, A, G, E, D) inside the existing expandable song-control panel on the setlist detail page. The Capo applies an inverse transpose to chord display only: when capo is placed at fret N, the chord sheet shows the open-position shapes the performer actually fingers (the sounding key transposed down by N semitones). The CAGED picker is visual-only and has no effect on chord content. Both controls are pure React local state — never persisted to Supabase, localStorage, sessionStorage, or any external store.

---

## Acceptance Criteria

1. The Capo selector and CAGED picker are rendered inside the existing expandable song-control panel for each song row on the setlist detail page. They do not appear in any other panel or page section.

2. The Capo selector renders fret values 0 through 7 inclusive (8 steps). Fret 0 means "no capo" — the chord sheet is unaffected.

3. When capo is set to fret N (N > 0), the chord sheet for that song displays the open-position fingering shapes: each chord is transposed DOWN by N semitones from the active sounding key (performanceKey), using the existing `shiftChord` / transposition logic from `src/utils/musicLogic.ts`. No custom inline chord regex is written; all chord detection reuses the shared `chordRegex`.

4. When capo is set to 0 (no capo), the chord sheet displays chords at the full sounding key with no modification — identical to the current behavior before this feature existed.

5. The capo value is stored in React local state scoped to each song's control panel instance. It is never read from or written to Supabase, localStorage, sessionStorage, or any external store.

6. The CAGED picker renders exactly five buttons labeled C, A, G, E, D in that order.

7. Exactly one CAGED button may be active (highlighted) at a time, OR none may be active (all deselected). Pressing an already-active CAGED button deselects it, leaving all five buttons in the unselected state.

8. The active CAGED button receives a distinct visual highlight consistent with the Artisan Palette. The inactive buttons are visually distinct from the active one. Both active and inactive states must meet WCAG AA contrast on their respective backgrounds.

9. The CAGED selection has no effect on chord content, chord transposition, or any other data — it is a visual-only performer reference aid.

10. The CAGED value is stored in React local state scoped to each song's control panel instance. It is never read from or written to Supabase, localStorage, sessionStorage, or any external store.

11. When Go Live mode is active and the performer changes the capo value, the displayed setlist key (sounding key / performanceKey) does NOT change. The capo offset is applied only to the local chord display. No sync event, Realtime message, or Server Action is triggered.

12. Each song's capo and CAGED state resets to defaults (capo = 0, CAGED = none) whenever the song-control panel is collapsed and re-expanded, OR on full page reload — whichever the codebase's existing panel lifecycle dictates. (See Resolved Open Questions below for panel lifecycle confirmation.)

13. The capo state is per-song and per-panel-instance: changing capo on Song A does not affect Song B's chord display.

14. The CAGED state is per-song and per-panel-instance: selecting a CAGED shape for Song A does not affect Song B.

15. When a song's sounding key (performanceKey) produces a capo-adjusted key that falls outside the standard 12-note chromatic scale (e.g. Bb with capo 1 → A), the transposition still succeeds because the existing chromatic scale covers all 12 semitones. No special-casing is needed. This criterion confirms the existing `shiftChord` utility handles all chromatic edge cases.

16. The capo UI control is disabled or visually non-interactive when the song panel is in a read-only state (if such a state exists in the existing panel). (See Unresolved Pending Reconciliation for status.)

17. All new Client Component code follows the `useState(false)` / `useState(0)` pattern for local state initialization (literal defaults, not lazy initializers), per BUG-020. No `useState(() => typeof window !== "undefined")` is used.

18. All new `useCallback` / `useMemo` dependency arrays reference whole objects, not object property paths, per BUG-002.

19. Helper functions referenced inside `useEffect` or `useCallback` are declared above those hooks, per BUG-007.

20. All new Tailwind utility classes that use a named brand utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) include an explicit `dark:` variant pair, per BUG-004.

21. CAGED shape button array and capo fret button array declared at module scope (not inline in render body) to preserve React.memo stability, per BUG-019.

22. `npm run format` passes with no changes after all new files are written, per the coding guidelines workflow rule.

23. The feature introduces zero Supabase client calls, zero Server Actions, and zero `fetch` calls of any kind.

---

## Out of Scope

- Saving capo or CAGED state to the database.
- Saving capo or CAGED state to localStorage or any persistent client store.
- Syncing capo or CAGED state to other performers via Go Live / Realtime.
- Dual display (showing both sounding-key chords and capo chords side-by-side).
- A toggle between "capo view" and "full key view" — capo view is always active when capo > 0.
- Capo values above fret 7.
- CAGED multi-select (at most one CAGED shape active at a time).
- Any UI for non-standard tunings, partial capos, or alternate capo positions.
- Changing the performanceKey via the capo control — the sounding key is unchanged.
- Any migration, RLS policy change, or database schema modification.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/page.tsx` | Server Component that fetches setlist data; passes `originalKey`, `performanceKey` to client |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Client root for the setlist viewer; owns lifted hooks and renders `SetlistSongSection` per song |
| `src/components/client/SetlistSongSection.tsx` | Per-song wrapper; capo/CAGED picker must integrate inside the expandable song-control panel here |
| `src/components/SongViewer/ChordSheetClient.tsx` | Contains expandable "Song Controls" accordion (`toolbarOpen`/`setToolbarOpen` useState); capo offset applied here at DOM-mutation useEffect (line 151) as `shiftChord(original, semitoneOffset - capoOffset)`; max-h-40 must be increased to fit new rows |
| `src/hooks/useTranspose.ts` | Manages `semitoneOffset` and `displayKey`; capo state stored locally in `ChordSheetClient`, not in this hook |
| `src/utils/musicLogic.ts` | `shiftChord(chord, semitones)`, `getSemitoneOffset`, `NOTES`, `chordRegex` — all transposition math must use these exports |
| `src/hooks/useChordColor.ts` | Reference pattern for 5-option preset picker with typed union presets and module-level preset arrays |
| `src/components/client/SetlistSettingsModal.tsx` | Reference for swatch button UI: `aria-pressed`, `border-2` ring on selection, SVG checkmark overlay; module-level class constants (not inline strings) |
| `src/hooks/useFontSize.ts` | Reference for SSR-safe local state (do NOT use `useState(() => typeof window !== "undefined")` per BUG-020) |

---

## Technical Schema

N/A — no API contract required for this task. All state is local React state; no Supabase calls, Server Actions, or fetch requests.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-042/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-042/context.md` | Reusable components + patterns + MEMORY.md prevention rules |
| Research Notes | `tasks/TASK-042/research.md` | Open questions + decision log |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).
- The DOM-mutation pattern for capo offset is applied at `src/components/SongViewer/ChordSheetClient.tsx` line 151 (the existing `useEffect` that calls `shiftChord` for each chord span). Change from `shiftChord(original, semitoneOffset)` to `shiftChord(original, semitoneOffset - capoOffset)`. This keeps the existing SSR-safe approach and avoids hydration mismatch.
- The new capo and CAGED rows must be inserted inside the existing `<div aria-label="Chord sheet controls">` flex container in `ChordSheetClient.tsx` (lines 300–450), following the same `<span class="w-px h-5 ...">` divider pattern between control groups. Update the expanded panel's `max-h-40` class to a larger value (e.g. `max-h-64` or `max-h-96`) to accommodate the additional rows.
- Module-level class constants (e.g. `const capoLabelClass = "..."`) must be hoisted above the component function, following the existing pattern in `ChordSheetClient.tsx` lines 13–36. Do not use template literals inside JSX.
- Module-level CAGED shape and capo fret arrays must be hoisted (e.g. `const CAGED_SHAPES = ['C', 'A', 'G', 'E', 'D']` and `const CAPO_FRETS = [0, 1, 2, 3, 4, 5, 6, 7]`), not inline in the render body — this preserves React.memo stability per BUG-019.
- The capo state is local to each `ChordSheetClient` instance: `const [capoOffset, setCapoOffset] = useState(0)`. The CAGED state follows the same pattern: `const [cagedShape, setCAGEDShape] = useState<CAGEDShape | null>(null)` where `type CAGEDShape = 'C' | 'A' | 'G' | 'E' | 'D'`.
- Reference UI patterns: Swatch buttons from `src/components/client/SetlistSettingsModal.tsx` lines 395–460 (aria-pressed, border-2 ring, checkmark overlay). Accordion from `src/components/SongViewer/ChordSheetClient.tsx` lines 238–452 (useState boolean, aria-expanded, overflow-hidden transition).
- Artisan Palette color classes: use `text-brand-*`, `bg-brand-*`, `border-brand-*` with explicit `dark:` variant pairs on all new classes (BUG-004 prevention). Reference: `src/components/client/SetlistSettingsModal.tsx` line 93–103 shows the correct pattern.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> Copied verbatim from `tasks/TASK-042/context.md` → MEMORY.md Notes section. This is the canonical list of past-bug prevention rules for implementation.

- **BUG-001** (useState lazy initializer): If capo or CAGED state is later persisted to `localStorage`, the read must use a lazy initializer (`useState(readValue)`) — never `useEffect` + `setState`. For the current local-only (never-persisted) implementation, `useState(0)` and `useState<CAGEDShape | null>(null)` are sufficient and safe.

- **BUG-020** (SSR hydration mismatch with window check): Do NOT use `useState(() => typeof window !== "undefined")` as a mount guard. The capo and CAGED state have no SSR dependency — use `useState(0)` and `useState<CAGEDShape | null>(null)` as literal defaults.

- **BUG-002** (React Compiler useCallback property-path deps): Any new `useCallback` in `ChordSheetClient` or a new hook must list the whole object as the dep, not a property path. E.g. depend on `[controls]` not `[controls.capoOffset]`.

- **BUG-007** (React Compiler forward reference): Declare any capo/CAGED setter callbacks above the `useEffect` that uses them. The DOM-mutation `useEffect` at line 151 is where `capoOffset` must be added to the dep array — declare any helper above it.

- **BUG-004** (dark mode paired utilities): Every `text-brand-*`, `bg-brand-*`, `border-brand-*` class in the new picker UI must have an explicit `dark:` pair. The swatch pattern in `SetlistSettingsModal.tsx` is the correct reference.

- **BUG-019** (inline array allocation negating memo): If the 5 CAGED shape buttons or capo fret buttons are mapped from an array, that array must be declared at module scope or in `useMemo` — never inline in the render body — if the picker is ever extracted into a `React.memo` child. Since `ChordSheetClient` is currently wrapped in `React.memo` at the call site (`SetlistSongSection.tsx` line 49), arrays passed as props must be stable.

---

## Amendments (from Context Bundle)

> Derived from reconciliation of `spec.md` against `context.md` anti-patterns and MEMORY.md notes. These criteria were identified during codebase exploration and are required to prevent known failure modes.

- **AM-1:** Ensure `max-h-40` on the expanded song-controls panel (line 296 in `ChordSheetClient.tsx`) is increased when capo and CAGED rows are added inside it (e.g. to `max-h-64` or `max-h-96`). Current height clips content (source: `context.md` → Anti-Patterns Flagged section). Without this update, the new controls will be cut off when the panel expands.

- **AM-2:** Do not replicate bare `bg-brand-cream` without `dark:bg-brand-espresso` pair on button backgrounds. Reference incorrect pattern at `SetlistSettingsModal.tsx` line 93–103; correct pattern requires both. Apply the corrected swatch-button pattern (lines 395–460) to all capo/CAGED button styling (source: `context.md` → Anti-Patterns Flagged section).

---

## Resolved Open Questions

> From `spec.md` Open Questions, reconciled against `context.md`.

- **Q1 (Panel lifecycle)** → The expandable song-control panel remains mounted but hidden during collapse/expand (CSS `max-h-0` → `max-h-40` transition), NOT unmounted/remounted. Therefore, React state persists across collapse/expand cycles. The developer must implement explicit reset on panel close if the spec requires state reset on close. Source: `context.md` → Patterns to Follow section citing `src/components/SongViewer/ChordSheetClient.tsx` lines 238–452 (accordion pattern with `overflow-hidden transition-all duration-200` and height classes, not component unmount).

- **Q3 (Component prop signatures)** → Component names and paths confirmed:
  - Chord renderer: `src/components/SongViewer/ChordSheetClient.tsx` (contains DOM-mutation useEffect for `shiftChord` call at line 151)
  - Expandable panel: Same file, `toolbarOpen` / `setToolbarOpen` boolean state (lines 238–452)
  - Transpose hook: `src/hooks/useTranspose.ts` manages `semitoneOffset` and `displayKey`
  - Transposition math: `src/utils/musicLogic.ts` exports `shiftChord(chord, semitones)`, `getSemitoneOffset`, `NOTES`, `chordRegex`
  
  Source: `context.md` → Relevant Files and Reuse Candidates sections.

---

## Unresolved Pending Reconciliation

> Open Questions from `spec.md` that `context.md` did NOT answer. The developer must grep/inspect these before or during implementation.

- **Q2 (Read-only panel state)** — Does the existing song-control panel have a read-only state (e.g. when the user is not a music_director or when viewing as a guest/follower)? If so, should the capo control be disabled in that state? (suggested grep target: `src/app/setlists/[id]/page.tsx` and `src/components/client/SetlistSongSection.tsx` for role/permission guards)

- **Q4 (shiftChord defensive fallback)** — Does `shiftChord` in `src/utils/musicLogic.ts` include a defensive fallback for malformed key inputs, or does it throw? This determines whether a try/catch wrapper is needed at the capo-transposition call site. (suggested grep target: `src/utils/musicLogic.ts` for `shiftChord` implementation and error handling)

- **Q5 (Note spelling convention)** — What is the exact string representation of the 12 notes as used in the codebase's chromatic scale array (e.g. Bb vs A#)? The capo inverse-transpose must use the same note spelling, or the resulting chord string will not match `shiftChord` output expectations. (suggested grep target: `src/utils/musicLogic.ts` for `NOTES` array definition)

---

## Resolution

- **Completed:** 2026-05-26
- **Branch:** `feature/TASK-042-capo-caged-picker`
- **Base branch:** `develop`
- **Files changed:**
  - `src/components/SongViewer/ChordSheetClient.tsx` — added module-level `CAPO_FRETS`, `CAGED_SHAPES`, `CAGEDShape` type, and 4 CSS class constants; added `capoOffset` and `cagedShape` local state; updated DOM-mutation `useEffect` to use `semitoneOffset - capoOffset`; increased collapsible panel `max-h-40` → `max-h-96`; added Capo row (8 buttons, frets 0–7) and CAGED row (5 buttons, C/A/G/E/D) inside `<div aria-label="Chord sheet controls">` with dividers
- **Notes:**
  - Q2 (read-only panel state): The panel has no disabled state for non-leaders. `isLeader` only gates the Sync button. Capo/CAGED controls are available to all viewers (consistent with Key and Size controls, which also have no leader gate).
  - Q4 (shiftChord error handling): `shiftChord` uses `rootToIndex` with a `?? 0` safe fallback for unrecognised input and never throws. No try/catch wrapper needed at the call site.
  - Q5 (note spelling): `NOTES` array uses `Bb` (not `A#`) at index 10. The capo inverse-transpose passes through `shiftChord` which always outputs from the canonical `NOTES` array — no special-casing needed.
  - Panel lifecycle (Q1): The panel stays mounted during collapse/expand (CSS height transition, not unmount). State persists across collapse/expand cycles. Per spec AC-12, this is acceptable — the spec says "whenever the panel lifecycle dictates", and the lifecycle keeps state. If reset-on-close is required in future, add a `useEffect` on `toolbarOpen` that resets capoOffset and cagedShape.
  - CAGED is visual-only: selecting a shape does not affect `semitoneOffset`, `performanceKey`, or any external state.
  - BUG-002, BUG-004, BUG-007, BUG-019, BUG-020 prevention rules all applied (see Implementation Notes).
