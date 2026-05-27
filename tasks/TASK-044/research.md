# Research — Bass Tab for ChordDrawer

## Open Questions

- Unknown-chord fallback text/visual → Pending Reconciliation from context: `src/components/client/ChordDrawer.tsx` fallback render path when chord key is absent from registry.
- Chord name label presence and style in BassSVG → Pending Reconciliation from context: `src/components/client/ChordDrawer.tsx` GuitarSVG label rendering.
- Hide-vs-unmount pattern for non-active instrument tabs → Pending Reconciliation from context: `src/components/client/ChordDrawer.tsx` instrument toggle conditional render.
- `instrumentMode` persistence (localStorage/Supabase) for guitar/piano → Pending Reconciliation from context: `src/app/setlists/[id]/SetlistViewerClient.tsx` instrumentMode state initialization.
- GuitarSVG exact SVG dimensions (width, height, viewBox, stroke) → Pending Reconciliation from context: `src/components/client/ChordDrawer.tsx` GuitarSVG SVG element attributes.
