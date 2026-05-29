# Spec — Capo & CAGED Shape Picker

## Feature Summary

Add an interactive Capo selector and CAGED shape picker inside the existing expandable song-control panel on the setlist detail page. The Capo selector (frets 0–7) applies an inverse transpose to the displayed chord sheet: when a capo is placed at fret N, the chord sheet shows the open-position shapes the performer actually fingers (i.e. the sounding key transposed down by N semitones). The CAGED picker is a row of five toggle buttons (C, A, G, E, D) that highlight which CAGED position the performer is referencing — it has no effect on chord content. Both controls are pure React local state. No Supabase writes, Server Actions, or API calls of any kind are permitted in this task.

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

12. Each song's capo and CAGED state resets to defaults (capo = 0, CAGED = none) whenever the song-control panel is collapsed and re-expanded, OR on full page reload — whichever the codebase's existing panel lifecycle dictates. (Pending Reconciliation: actual lifecycle of the expandable panel — see Open Questions.)

13. The capo state is per-song and per-panel-instance: changing capo on Song A does not affect Song B's chord display.

14. The CAGED state is per-song and per-panel-instance: selecting a CAGED shape for Song A does not affect Song B.

15. When a song's sounding key (performanceKey) produces a capo-adjusted key that falls outside the standard 12-note chromatic scale (e.g. Bb with capo 1 → A), the transposition still succeeds because the existing chromatic scale covers all 12 semitones. No special-casing is needed. This criterion confirms the existing `shiftChord` utility handles all chromatic edge cases.

16. The capo UI control is disabled or visually non-interactive when the song panel is in a read-only state (if such a state exists in the existing panel). (Pending Reconciliation: whether a read-only panel state exists — see Open Questions.)

17. All new Client Component code follows the `useState(false)` + `useEffect(() => setMounted(true), [])` pattern for any mount guard, per BUG-020. No `useState(() => typeof window !== "undefined")` is used.

18. All new `useCallback` / `useMemo` dependency arrays reference whole objects, not object property paths, per BUG-002.

19. Helper functions referenced inside `useEffect` or `useCallback` are declared above those hooks, per BUG-007.

20. All new Tailwind utility classes that use a named brand utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) include an explicit `dark:` variant pair, per BUG-004 and BUG-005.

21. `npm run format` passes with no changes after all new files are written, per the coding guidelines workflow rule.

22. The feature introduces zero Supabase client calls, zero Server Actions, and zero `fetch` calls of any kind.

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

## Fallback Behaviors

- This feature has no dependency on any backend endpoint. All state is local React state. There are no MISSING API scenarios and therefore no fallback behaviors of the gap-handling type required.
- If `shiftChord` / `musicLogic.ts` cannot resolve a transposition (e.g. malformed key string), it should degrade silently to displaying the original un-transposed chord rather than crashing the component. (Pending Reconciliation: confirm `shiftChord` already has this defensive fallback — see Open Questions.)

## Resolved Ambiguities

- Capo range upper bound → Resolved as 0–7 (8 steps, standard guitar capo range). The user's prompt stated "Not specified — clarify or assume 0–7" and explicitly approved that assumption in the task description.
- Capo effect direction → Resolved: inverse transpose. Capo N on a G song displays F-position chords (G minus N semitones). Explicitly stated by the user.
- CAGED multi-select → Resolved: single-select with deselect. The user's spec states "just highlights which CAGED position the performer is using" (singular), implying one at a time. Deselect-all is permitted (pressing the active button clears it).
- Go Live interaction → Resolved: capo is purely local even during Go Live. The user explicitly stated this.
- Persistence → Resolved: both capo and CAGED are local-only React state. The user explicitly stated "ALWAYS local-only."
- Chord display mode → Resolved: no toggle, no dual display. When capo > 0 the open-shape view is always shown.
- Transposition chromatic edge cases → Resolved: the existing 12-note chromatic scale covers all cases; no special handling required. Source: `docs/coding-guidelines.md` — "Use the 12-note chromatic scale: C, C#, D, D#, E, F, F#, G, G#, A, Bb, B."
- CAGED visual style → Resolved: Artisan Palette compliant with explicit `dark:` pairs required, per BUG-004/BUG-005 prevention rules in MEMORY.md.
- Chord regex → Resolved: must use shared `chordRegex` from `src/utils/musicLogic.ts`, per coding-guidelines.md Musical Integrity section.

## Open Questions

- **Pending Reconciliation** — What is the exact lifecycle of the existing expandable song-control panel? Specifically: does collapsing and re-expanding the panel unmount and remount the component (resetting React state automatically), or does it remain mounted but hidden (requiring an explicit reset on close)? (suggested resolution source: codebase-explorer context bundle — look for the expandable panel component in `src/components/client/` or `src/app/setlists/[id]/`)

- **Pending Reconciliation** — Does the existing song-control panel have a read-only state (e.g. when the user is not a music_director or when viewing as a guest/follower)? If so, should the capo control be disabled in that state? (suggested resolution source: codebase-explorer context bundle — look for role/permission guards in the setlist detail page)

- **Pending Reconciliation** — What are the exact prop signatures and component names for the chord-sheet renderer and the expandable song-control panel? The capo offset must be threaded into the chord rendering without duplicating transposition logic. (suggested resolution source: codebase-explorer context bundle — look for chord rendering and panel components in `src/app/setlists/[id]/` and `src/components/`)

- **Pending Reconciliation** — Does `shiftChord` (or its equivalent in `src/utils/musicLogic.ts`) already include a defensive fallback for malformed key inputs, or does it throw? This determines whether a try/catch wrapper is needed at the capo-transposition call site. (suggested resolution source: codebase-explorer context bundle — inspect `src/utils/musicLogic.ts` shiftChord implementation)

- **Pending Reconciliation** — What is the exact string representation of the 12 notes as used in the codebase's chromatic scale array? The capo inverse-transpose must use the same note spelling (e.g. Bb vs A#) as the rest of the transposition system, otherwise the resulting chord string will not match what `shiftChord` expects. (suggested resolution source: codebase-explorer context bundle — inspect `src/utils/musicLogic.ts` note array)
