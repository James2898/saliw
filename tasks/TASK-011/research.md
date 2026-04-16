# Research — Hybrid Rendering Engine (SongViewer)

## Open Questions

- Q1 (Page Route Scope) → User confirmed: create `src/app/library/[id]/page.tsx` as part of this task. The SongViewer must be wired to this route.
- Q2 (Transposition UI) → User selected option (c): both a key selector dropdown (12 chromatic keys, offset auto-calculated via `getSemitoneOffset`) AND ±1 semitone stepper buttons.
- Q3 (Performance Key Initialization) → User selected option (c): out of scope. SongViewer always starts at `original_key` with offset 0. Setlist `performance_key` integration is a future task.
- Q4 (Header Color / WCAG AA) → User confirmed: do NOT force `--brand-tan` in light mode (fails WCAG AA). Use existing `.section-title` CSS class behavior (brown in light mode, tan in dark mode). Do not create a new class.
