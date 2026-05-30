# Context Bundle — One-Click Section Navigator Deck

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Root client wrapper that owns all shared state (autoScroll, ChordDrawer, ServiceNavigator); Navigator Deck state and props must be lifted here |
| `src/app/setlists/[id]/page.tsx` | Server Component that pre-processes `processedLines` and builds `navigatorSongs`; section data for the Deck must come from here |
| `src/components/client/SetlistSongSection.tsx` | Renders each `<section id="song-{junctionId}">` — the IntersectionObserver targets; section headers within songs are inside ChordSheetClient, not here |
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders section headers as `<span class="section-title">{line.raw}</span>` (line 678); sections have no `id` attributes today — this is the key gap |
| `src/utils/musicLogic.ts` | `preProcessChords()` parses `[VERSE]`/`[CHORUS]` etc. into `ProcessedLine` objects with `type: "header"` and `raw` containing the full bracket label |
| `src/components/client/ServiceNavigator.tsx` | Existing song-level navigator with IntersectionObserver + settle-detector pattern — the closest reuse candidate for the section-level Deck |
| `src/hooks/useAutoScroll.ts` | `UseAutoScrollReturn` type with `pause`/`resume`; ServiceNavigator already wires `onBeforeNavigate`/`onAfterNavigate` to these — same pattern needed for section scroll |
| `src/components/client/AutoScrollToolbar.tsx` | Fixed `bottom-6 right-6 z-50` — defines the bottom-right occupied zone; Navigator Deck must not overlap |
| `src/components/client/ChordDrawer.tsx` | Fixed `bottom-0 left-0 right-0 z-60` (full-width) when open; Deck must account for this when drawer is open |
| `src/components/client/navbar.tsx` | Sticky `top-0 z-50`; mobile sidebar `z-[60]`/`z-[70]` — defines the top z-index ceiling |
| `src/styles/globals.css` | Artisan palette CSS variables (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`, `--brand-tan-alpha`); `.section-title` CSS rule; `.chord-drawer-panel` transition override pattern |

## Reuse Candidates

- `src/components/client/ServiceNavigator.tsx` — The full IntersectionObserver + ratio-map + settle-detector pattern (lines 107–200) can be ported directly to observe `[data-section-id]` elements inside a song. The settle-detector's `startSettleDetector()` function (lines 168–200) is copy-paste-safe for section-level smooth scroll resume.
- `src/hooks/useAutoScroll.ts` — `UseAutoScrollReturn.pause` and `UseAutoScrollReturn.resume` are already wired through `SetlistViewerClient` → `ServiceNavigator` via `onBeforeNavigate`/`onAfterNavigate`. The section Deck needs identical wiring: call `autoScroll.pause` on `onPointerDown` and `autoScroll.resume` after settle.
- `src/utils/musicLogic.ts` `preProcessChords()` — already returns all `type: "header"` lines with their `raw` string (e.g. `"[VERSE]"`, `"[CHORUS 2]"`). No new parsing is needed; the section list can be derived from `processedLines.filter(l => l.type === "header").map(l => l.raw)` per song server-side.
- `src/components/client/AutoScrollToolbar.tsx` — Module-level CSS-variable class constant pattern (e.g. `panelClass`, `mainToggleBtnClass`) is the established Artisan FAB pattern. The Navigator Deck should follow identical module-scope constant extraction (avoids BUG-019 inline allocation).

## Patterns to Follow

- **IntersectionObserver with ratio-map + ref stability:** See `src/components/client/ServiceNavigator.tsx` lines 71–158 — stores `onAfterNavigate` in a ref (line 75–78) so the observer closure does not go stale; stores ratios in `ratiosRef` (not state) to avoid triggering re-renders on every scroll frame; winner is re-derived on each callback from the full ratio map. The section Deck must apply the same ref-stability discipline.
- **Smooth-scroll settle detector (BUG-015 fix):** See `src/components/client/ServiceNavigator.tsx` lines 168–200 — polls `window.scrollY` for 3 stable frames before firing `onAfterNavigate`; has a 2000ms safety bail-out. The section Deck must use this exact pattern (not IntersectionObserver alone as the resume signal) because the IO fires before the smooth scroll lands, causing the auto-scroll rAF to fight the in-progress scrollTo.
- **`onPointerDown` for pause before click (BUG-013 fix):** See `src/components/client/ServiceNavigator.tsx` line 249 — fires `onBeforeNavigate` on `onPointerDown`, not `onClick`. The section Deck buttons must do the same; if the page is scrolling when the user taps, the button moves between mousedown and mouseup and the click is silently swallowed.
- **`section[id="song-{junctionId}"]` scroll target convention:** See `src/components/client/SetlistSongSection.tsx` line 146 — each song renders `<section id="song-{junctionId}">`. Section-level targets will need `id="section-{junctionId}-{index}"` or similar on the `<span class="section-title">` — currently there are **no id attributes** on section headers. The implementation must add them.
- **Z-index layering:** Navbar `z-50`, ServiceNavigator `z-40`, AutoScrollToolbar `z-50`, ChordDrawer `z-60`. The section Navigator Deck should sit at `z-45` (between ServiceNavigator and AutoScrollToolbar) or be co-located with the ServiceNavigator strip to avoid a new stacking context conflict.
- **Artisan CSS-variable FAB panel:** See `src/components/client/AutoScrollToolbar.tsx` lines 28–36 — `bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`, `border border-[var(--brand-tan)]/30`, `rounded-2xl shadow-lg`. Reuse this exact pattern for the Deck panel; do not use named Tailwind brand utilities on a `fixed`/absolute element without dark: pairs (BUG-004, BUG-021).
- **Section header CSS:** See `src/styles/globals.css` lines 133–149 — `.section-title` renders with `border-left: 4px solid var(--brand-brown)`, `font-weight: 800`, `text-transform: uppercase`. The Deck pill labels should visually echo this (uppercase, espresso/tan color).

## Anti-Patterns Flagged

- `src/components/SongViewer/ChordSheetClient.tsx` line 678: Section headers (`type: "header"`) are rendered as `<span class="section-title">{line.raw}</span>` with **no `id` attribute**. The Navigator Deck cannot use `document.getElementById()` to scroll to them. Fix required: add a stable `id` (e.g. `id="section-{songJunctionId}-{lineIndex}"`) before the Deck can link to them — do not replicate the id-less pattern.
- `src/components/SongViewer/ChordSheetClient.tsx` lines 676–680: The section header `<span>` is a `display: block` (via `.section-title` CSS) but is still a `<span>`, not a `<div>` or `<section>`. `IntersectionObserver` works on any element, so this is not a functional blocker, but it is a semantic anti-pattern. Do not replicate inline spans as block-level scroll targets.
- `src/components/SongViewer/ChordSheetClient.tsx` line 671: The `processedLines.map()` uses the array `lineIndex` as the React `key`. This is acceptable here because the list is static (server-pre-processed, never reordered), but do not carry this pattern into the Deck's section list where keys must be stable identifiers, not positional indices.

## MEMORY.md Notes

Relevant entries for this feature (IntersectionObserver, scroll, section navigation):

- **BUG-012** (sub-pixel `scrollBy` accumulator): Auto-scroll speeds 1–2 were invisible because `window.scrollBy` rounds sub-pixel values to 0. Fixed with a `scrollAccumulatorRef` in `useAutoScroll`. The Navigator Deck does not call `scrollBy` directly (it uses `window.scrollTo` like ServiceNavigator), so this bug does not apply — but the Deck must call `autoScroll.pause` before its `scrollTo` to avoid the two competing simultaneously.
- **BUG-013** (click swallowed on moving target): `onPointerDown` missing from navigator buttons; page scroll moved the button between mousedown/mouseup, silently swallowing the click. Fixed in ServiceNavigator with `onPointerDown={() => onBeforeNavigate?.()}`. The section Deck buttons must also use `onPointerDown` to pause before click.
- **BUG-014** (N+1 `useAutoScroll` instances): `useAutoScroll` was called in both parent and N child components; each ran its own rAF loop; parent's `pause()` only stopped the parent's loop. Fixed by making the auto-scroll instance injectable. Do not call `useAutoScroll()` inside the Navigator Deck component — receive the shared `autoScroll` instance as a prop from `SetlistViewerClient`.
- **BUG-015** (`window.scrollTo` cancelled by competing `scrollBy`): IntersectionObserver fired too early as a resume signal; resuming the rAF while smooth-scroll was mid-flight caused the browser to cancel the smooth scroll. Fixed with a settle-detector that polls `scrollY` for 3 stable frames. The section Deck must use the same settle-detector (not IO alone) for its `onAfterNavigate` resume path.
- **BUG-004** (dark mode — named Tailwind utilities without `dark:` pairs): Named Tailwind utilities (`bg-brand-cream`, `text-brand-espresso`) do not auto-switch in dark mode. Use CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`) on fixed/floating UI, or always pair named utilities with explicit `dark:` variants.
- **BUG-021** (CSS variable with opacity in `bg-[]`): `bg-[var(--brand-card-bg)]` resolved to semi-transparent `#bc8e5c26`. For panel backgrounds that must be opaque, use named brand utilities with `dark:` pairs, or verify the CSS variable is full-opacity before using it in `bg-[]`.
- **BUG-002** (React Compiler rejects `useCallback` property-path deps): Never write `[obj.method]` or `[props.value]` in `useCallback`/`useMemo` deps. Always depend on the whole object (`[obj]`) or a destructured primitive. This codebase runs the React Compiler — violation causes a hard Vercel build failure.
- **BUG-007** (React Compiler forward reference): Declare all helper functions (`startSettleDetector`, etc.) **above** the `useEffect` that references them. Do not rely on JS hoisting in React Compiler components.
