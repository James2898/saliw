# Research — Chord Sheet Alternating Row BG + Section Nav Drawer (Mobile)

## Open Questions

- Tailwind mobile breakpoint in setlist viewer → Pending Reconciliation (source: SectionNavDeck.tsx, SetlistViewerClient.tsx — grep sm:/md:/lg: prefixes)
- Named brand utility classes currently used for row/card backgrounds in chord sheet → Pending Reconciliation (source: ChordSheetClient.tsx, SetlistSongSection.tsx — grep bg-brand-)
- Z-index layering of existing fixed/sticky elements in setlist viewer → Pending Reconciliation (source: SetlistViewerClient.tsx, SectionNavDeck.tsx — grep z-)
- Song sticky selector position on mobile (top/bottom/left edge) → Pending Reconciliation (source: SetlistViewerClient.tsx — grep sticky, fixed, top-, bottom-)
- Existing drawer/sidebar CSS transition pattern (for consistency with navbar) → Pending Reconciliation (source: src/components/client/navbar.tsx — grep transition, translate-x, duration-)
