# Context Bundle — Setlist Display Layout Settings

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/page.tsx` | Server Component route wrapper that currently wraps `SetlistViewerClient` in a hardcoded `max-w-3xl mx-auto` container; must allow full-width containment or delegate width constraints to `SetlistViewerClient`. |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Main interactive client wrapper for the setlist viewer; coordinates songs, `ServiceNavigator`, `SetlistSettingsModal`, and `AutoScrollToolbar`. Houses song display mode (scroll vs 1-song multi-page view), active song / page index state, keyboard listeners (Space, Arrow keys), edge tap targets, and layout settings instantiation. |
| `src/components/client/SetlistSettingsModal.tsx` | Two-tab settings dialog (`font` and `chords`). Needs a 3rd tab (`layout`) for line spacing stepper (1.2–2.4, step 0.1), content width toggle (Centered vs Full Width), page display mode (scroll vs 1/2/3 pages side-by-side), and long-song handling (overflow paging vs auto-scale fit-to-screen). |
| `src/components/client/SetlistSongSection.tsx` | Per-song section component that wraps `ChordSheetClient` and song header/actions; passes line height and font styles down. In page mode, coordinates active song rendering. |
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders `.chord-display` and `.chord-item` spans with CSS variable injection (`--chord-font-size`, `--chord-item-font-size`, `--chord-color`, `--chord-bg`). Applies `--chord-line-height` via container ref and supports multi-column or fit-to-screen scaling. |
| `src/styles/globals.css` | Defines `.chord-display` styling where `line-height: 1.8;` is currently hardcoded; needs update to `line-height: var(--chord-line-height, 1.8);` to enable dynamic stepper overrides without breaking defaults. |
| `src/hooks/useFontSize.ts` | Existing SSR-safe preference hook with localStorage persistence using lazy initializer `useState(readStoredValue)`; serves as the template for the new layout settings hook. |
| `src/hooks/useChordFontSize.ts` | Parallel font hook demonstrating isolated localStorage key pattern (`saliw-chord-font-size`) and clamping. |
| `src/hooks/useChordColor.ts` | Demonstrates multi-value preset management with localStorage persistence and SSR-safe fallback. |
| `src/hooks/useAutoScroll.ts` | Controls teleprompter auto-scrolling and global Spacebar listener (`handleKeyDown`); must be disabled or paused when page view mode is active. |
| `src/components/client/ServiceNavigator.tsx` | Sticky song navigation bar tracking `activeSongId` and triggering smooth scrolls; integrates with song switching in page mode. |
| `src/components/client/AutoScrollToolbar.tsx` | Fixed floating auto-scroll toolbar at bottom-right; should be hidden or disabled when page view mode is active. |

## Reuse Candidates

- `src/hooks/useFontSize.ts` / `src/hooks/useChordFontSize.ts` — Reuse the exact SSR-safe lazy initializer pattern (`useState(readStoredValue)`), try/catch storage helpers, clamp functions, and reset handlers to create a dedicated `useSetlistLayout` (or `useLayoutSettings`) hook.
- `src/components/client/SetlistSettingsModal.tsx` — Reuse the modal panel structure, tab button styling (`tabActiveClass`, `tabInactiveClass`), stepper controls (`ctrlBtnClass`), and accessible dialog attributes (`role="dialog"`, `aria-modal="true"`, focus trap) to add the "Layout" tab.
- `src/components/client/ServiceNavigator.tsx` — Reuse existing song navigation concepts and active song tracking when stepping between songs via keyboard or edge navigation in 1-song page mode.

## Patterns to Follow

- **SSR-Safe localStorage Lazy Initializers:** See `src/hooks/useFontSize.ts` lines 37–49. Always read localStorage inside `useState(() => readStoredValue())` with an initial `typeof window === "undefined"` guard. Never read storage in `useEffect` + `setState` (BUG-001).
- **Client Mount Guards:** See `src/components/client/SectionNavDeck.tsx` lines 262–269. When checking client-side mounting or hydration guards, use `useState(false)` + `useEffect(() => setMounted(true), [])`, never `useState(() => typeof window !== "undefined")` (BUG-020).
- **CSS Variable Injection (Zero-Rerender DOM Mutation):** See `src/components/SongViewer/ChordSheetClient.tsx` lines 305–307. Apply line spacing to `.chord-display` via `sheetRef.current?.style.setProperty('--chord-line-height', String(lineSpacing))` inside a `useEffect` on the container element ref.
- **Compiler-Safe useCallback Dep Arrays:** See `MEMORY.md` BUG-002. Reference whole objects in dependency arrays (e.g., `[layoutSettings]`), never object property paths (e.g., `[layoutSettings.lineSpacing]`).
- **Declaration Order Before Hooks:** See `MEMORY.md` BUG-007. Declare all helper functions and event handlers textually above any `useEffect` or other React hooks that reference them.
- **Explicit Dark Mode Tailwind Utilities:** See `MEMORY.md` BUG-005. Ensure every named Tailwind color utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) is paired with an explicit `dark:` variant.
- **Keyboard Event Filtering:** See `src/hooks/useAutoScroll.ts` lines 284–292. When intercepting Space or Arrow keys for page navigation, check `e.target` to ignore events originating from `INPUT`, `TEXTAREA`, `SELECT`, or `isContentEditable` elements, or when modal dialogs are open.
- **Responsive Multi-Page Columns:** Apply side-by-side columns progressively using media queries or container queries: 2 pages active only on `>= 1024px` (`lg:`), 3 pages active only on `>= 1280px` (`xl:`), falling back to 1 column on smaller viewports.

## Anti-Patterns Flagged

- `src/app/setlists/[id]/page.tsx` line 256: `<div className="max-w-3xl mx-auto px-4 py-8 sm:px-8">` hardcodes `max-w-3xl` at the server page level. This prevents full-width expansion. The container width constraint must be lifted or made dynamic based on the Content Width setting.
- `src/styles/globals.css` line 178: `.chord-display` uses hardcoded `line-height: 1.8;`. It must be changed to `line-height: var(--chord-line-height, 1.8);` so that dynamic line-height overrides cascade cleanly.
- `src/components/SongViewer/ChordSheetClient.tsx`: Do not attach duplicate global keyboard listeners inside each per-song chord sheet; keyboard navigation for setlist page view must be handled centrally at the `SetlistViewerClient` level.

## MEMORY.md Notes

- **BUG-001 (localStorage in useEffect):** Never initialize React state from `localStorage` via `useEffect` + `setState`. Always use lazy initializer `useState(readStoredValue)`.
- **BUG-020 (SSR Hydration Mismatch):** Never use `useState(() => typeof window !== "undefined")` as a mount guard. Use `useState(false)` + `useEffect(() => setMounted(true), [])`.
- **BUG-002 (React Compiler useCallback Deps):** Never use object property paths in `useCallback` / `useMemo` dependency arrays. Always depend on the whole object or primitive values.
- **BUG-005 (Dark Mode Utility Pairing):** Every `text-brand-*`, `bg-brand-*`, and `border-brand-*` utility must have an explicit `dark:` pair.
- **BUG-007 (Declaration Order):** Declare all helper callbacks before the `useEffect` blocks that call them.
- **BUG-019 (Prop Injection vs Hook State):** When an injected prop overrides hook state, call the hook unconditionally and defer to the prop via `prop ?? hookValue`. Hoist static arrays and objects to module scope.
- **BUG-006 (Tailwind v4 Doc Class Scanning):** Never use wildcard class patterns with asterisk (e.g. `bg-[var(--brand-*)]`) in comments or markdown files; use specific examples to prevent invalid CSS compilation errors.
