# Context Bundle — Chord/Lyric Row Stripe + SectionNavDeck Mobile Drawer

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/styles/globals.css` | Defines `.chord-row`, `.chord-item`, `.chord-display`, `.section-title` — the only CSS source for chord/lyric row styling; no alternating background rule exists here today |
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders every lyric and chord-row `<div>` — the insertion point for alternating row background classes |
| `src/components/client/SectionNavDeck.tsx` | Component being refactored: currently renders a horizontal mobile bar (`fixed top-16 left-0 right-0`) — needs to become a right-side floating drawer on mobile |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Parent that places `<SectionNavDeck>`, `<ServiceNavigator>`, and song sections; z-index and layout decisions live here |
| `src/components/client/SetlistSongSection.tsx` | Passes `songIndex` to ChordSheetClient; already uses `isEven` for section-level alternating bg — pattern to follow for row-level stripes |
| `src/components/client/ServiceNavigator.tsx` | The sticky song selector bar (`sticky top-16 z-40`) that the mobile SectionNavDeck currently overlaps |
| `src/components/client/navbar.tsx` | Contains the existing left-side mobile sidebar drawer with backdrop — reference pattern for translate-x slide-in/out on mobile |
| `src/components/client/ChordDrawer.tsx` | Reference for `chord-drawer-panel` CSS class pattern (globals.css transition workaround for the global `*` rule) and `fixed bottom-0` z-layer |
| `src/components/client/SetlistSettingsModal.tsx` | Shows chord color controls (chordBg/chordColor presets); confirms chord styling is controlled via CSS variables, not Tailwind classes |

## Reuse Candidates

- `src/components/client/navbar.tsx` lines 345–374 — Mobile sidebar drawer pattern: backdrop div with `opacity-0 pointer-events-none` ↔ `opacity-100 pointer-events-auto`, panel with `translate-x-0` ↔ `-translate-x-full` (or `-translate-x-full` ↔ `translate-x-0` for left-to-right; use `translate-x-full` ↔ `translate-x-0` for right-to-left). The `#mobile-sidebar` and `#mobile-sidebar-backdrop` CSS overrides in globals.css restore `transition-property: transform` and `opacity` (suppressed by global `*` rule) — the same override pattern will be needed for the new deck drawer.

- `src/components/client/SetlistSongSection.tsx` lines 195–207 — `isEven = songIndex % 2 === 0` alternating section background (`bg-brand-cream dark:bg-brand-espresso/40` vs `bg-brand-tan/20 dark:bg-brand-brown/30`) — same logical pattern needed for chord/lyric row alternation inside ChordSheetClient.

- `src/components/client/SectionNavDeck.tsx` lines 197–222 — `desktopDeckClass` and `mobileDeckClass` module-level string constants — the desktop class already uses `hidden md:flex fixed top-1/2 -translate-y-1/2 right-N`; the mobile class needs replacing with a right-side drawer. The `DECK_Z_CLASS = "z-[45]"` constant is the correct z-layer (below ChordDrawer z-60, above ServiceNavigator z-40) — preserve it.

- `src/styles/globals.css` lines 76–102 — `#mobile-sidebar` / `#mobile-sidebar-backdrop` / `.chord-sheet-toolbar-panel` / `.chord-drawer-panel` transition override comments explain exactly why a new CSS class or ID is needed for the deck drawer panel's transform transition.

## Patterns to Follow

- **Module-level CSS string constants:** See `src/components/client/SectionNavDeck.tsx` lines 197–245 and `src/components/client/ChordDrawer.tsx` lines 14–18 — all fixed-position layout strings declared as `const` at module scope, never inline in JSX. Follow for any new drawer class strings.

- **Alternating backgrounds with named Tailwind utilities + explicit dark: pairs (BUG-004/BUG-005):** See `src/components/client/SetlistSongSection.tsx` lines 200–206 — `bg-brand-cream dark:bg-brand-espresso/40` for even, `bg-brand-tan/20 dark:bg-brand-brown/30` for odd. Every named `bg-brand-*` must have a `dark:` variant. Do NOT use `bg-[var(--brand-...)]` for alternating backgrounds (BUG-021: CSS variable arbitrary values can be semi-transparent).

- **SSR mount guard (BUG-020):** See `src/components/client/SectionNavDeck.tsx` lines 271–274 — `useState(false)` + `useEffect(() => setMounted(true), [])`. Any new `useState` that depends on `window` (e.g. initial drawer open state on mobile) must use this pattern, not `useState(() => typeof window !== 'undefined')`.

- **CSS transition workaround for global `*` rule:** See `src/styles/globals.css` lines 76–102 — the global `*` rule only transitions `background-color, border-color, fill, stroke`. Any element that uses `transform` or `opacity` transitions needs a named CSS class (or ID selector) in globals.css to restore those properties. Required for the new mobile drawer panel.

- **Z-index hierarchy:** AutoScrollToolbar = z-50, ChordDrawer = z-60, SetlistSettingsModal backdrop = z-[80] / panel = z-[90], SectionNavDeck = z-[45], ServiceNavigator = z-40. Mobile drawer backdrop should sit between z-[45] and z-[80] — z-[50] is occupied; use z-[48] for backdrop.

- **Drawer open-by-default on mobile:** Use `useState(true)` for the initial drawer open state (no window check needed — purely a UI boolean default). Per BUG-020 pattern this is safe since it's a static literal.

- **BUG-007 compliance:** Declare `handleOpen`/`handleClose` callbacks above any `useEffect` that references them.

- **BUG-002 compliance:** `useCallback` deps must reference whole objects, not property paths.

## Anti-Patterns Flagged

- `src/components/client/SectionNavDeck.tsx` lines 213–222 — `mobileDeckClass` uses `"md:hidden fixed top-16 left-0 right-0"` — this is the horizontal bar that overlaps ServiceNavigator. It must be replaced entirely (not patched) with a right-side floating drawer structure. Do not add margin/padding offsets to work around the overlap — reposition the element.

- `src/components/SongViewer/ChordSheetClient.tsx` line 716 — `<div key={lineIndex} className="chord-row leading-snug">` — no alternating background applied here. The fix cannot use CSS `:nth-child` alone because chord-rows and lyric-rows are interleaved in the same parent (not a pure list), so row alternation must be computed via a per-render counter or a line-group index passed at render time.

- `src/components/SongViewer/ChordSheetClient.tsx` line 706 — `<div key={lineIndex} className="text-brand-espresso dark:text-brand-cream leading-snug">` for lyric lines — no background class. Lyric lines and the chord row above them form a logical pair; if the design calls for pairing, a group index must be maintained as chord-row and lyric-row are iterated together.

- Do NOT use `bg-[var(--brand-cream)]` or similar CSS-variable arbitrary values for the row stripe backgrounds — per BUG-021, these can be semi-transparent. Use named Tailwind utilities (`bg-brand-cream`, `bg-brand-tan/20`) with explicit `dark:` pairs.

## MEMORY.md Notes

Relevant prevention rules from MEMORY.md for this feature category:

- **BUG-004 / BUG-005 (Dark Mode):** Every `bg-brand-*`, `text-brand-*`, `border-brand-*` named Tailwind utility must have a corresponding `dark:` variant. The existing chord row has no background at all — when adding backgrounds, pair each with its dark: counterpart. Failure mode: text becomes near-invisible against the switched dark background.

- **BUG-021 (CSS variable opacity):** `bg-[var(--brand-card-bg)]` resolved to semi-transparent `#bc8e5c26`. Do not use CSS variable arbitrary values for any background that must be opaque. The `--brand-tan-alpha` variable is intentionally semi-transparent (26 = 15% opacity). Use named Tailwind utilities for chord/lyric row backgrounds.

- **BUG-020 (SSR hydration mismatch):** Never use `useState(() => typeof window !== 'undefined')` as a mount guard. Use `useState(false)` + `useEffect(() => setMounted(true), [])`. The mobile drawer's initial open state is a static boolean (`true`) — safe to set directly, no window check needed.

- **BUG-007 (React Compiler forward reference):** Declare all helper functions (`handleOpen`, `handleClose`, `handleToggle`) above any `useEffect` that references them. The React Compiler rejects forward references even when JS hoisting would allow it.

- **BUG-002 (React Compiler useCallback deps):** `useCallback` dependency arrays must reference whole objects, not property paths (`[obj]` not `[obj.method]`).

- **BUG-014 (N+1 useAutoScroll instances):** Do not call `useAutoScroll()` inside SectionNavDeck. The component already receives `autoScroll` as a prop from SetlistViewerClient — this must be preserved in the refactored version.

- **BUG-013 (click swallowed on moving target):** Preserve `onPointerDown` pause call on badge buttons — do not replace with `onClick`-only pattern.

- **Global `*` transition rule:** The globals.css `*` rule only covers `background-color, border-color, fill, stroke`. The new mobile drawer panel needs a named CSS class in globals.css to restore `transform` and `opacity` transitions (same as `#mobile-sidebar` and `.chord-drawer-panel`).

- **Run Prettier before committing:** `npm run format` must be run before every commit.
