# Research — Interactive Horizontal Chord Drawer

## Open Questions

- OQ-1 (Pending Reconciliation) → Does `onChordClick` receive the pre-transposition or post-transposition chord name? Resolved from context: inspect `src/components/SongViewer/ChordSheetClient.tsx` — check what value is stored on the chord span (text content vs `data-*` attribute) during the DOM-mutation `useEffect`.
- OQ-2 (Pending Reconciliation) → Which component is the correct parent for `ChordDrawer` state — `SetlistSongSection.tsx` or `SetlistViewerClient.tsx`? Resolved from context: inspect whichever file currently renders `<ChordSheetClient>`.
- OQ-3 (Pending Reconciliation) → Does `ChordSheetClient` use React JSX or direct DOM mutation for chord spans? Resolved from context: inspect the `useEffect` in `src/components/SongViewer/ChordSheetClient.tsx`.
- OQ-4 (Pending Reconciliation) → Is `--brand-card-bg` the correct CSS variable name for card backgrounds? Resolved from context: grep `src/styles/` for `--brand-card`.
- OQ-5 (Pending Reconciliation) → Is `--brand-tan-alpha` defined in `src/styles/`? Resolved from context: grep `src/styles/` for `--brand-tan-alpha`.
- OQ-6 (Pending Reconciliation) → Does `src/utils/musicLogic.ts` export `chordRegex` as a named `RegExp` export? Resolved from context: check export signature in `src/utils/musicLogic.ts`.
