# Research — Capo & CAGED Shape Picker

## Open Questions

- Pending Reconciliation: What is the exact lifecycle of the existing expandable song-control panel (unmount-on-collapse vs. hidden-but-mounted)? → To be resolved from context bundle: search `src/app/setlists/[id]/` and `src/components/client/` for the panel component.

- Pending Reconciliation: Does the song-control panel have a read-only state based on user role (guest/follower vs. music_director)? → To be resolved from context bundle: search for role/permission guards on the setlist detail page.

- Pending Reconciliation: What are the exact prop signatures and component names for the chord-sheet renderer and the expandable panel? → To be resolved from context bundle: inspect `src/app/setlists/[id]/` and `src/components/`.

- Pending Reconciliation: Does `shiftChord` include a defensive fallback for malformed key strings, or does it throw? → To be resolved from context bundle: inspect `src/utils/musicLogic.ts`.

- Pending Reconciliation: What is the exact note-spelling convention used in the chromatic scale array in `src/utils/musicLogic.ts`? (e.g. Bb or A# for the flat-5 enharmonic) → To be resolved from context bundle: inspect `src/utils/musicLogic.ts` note array.
