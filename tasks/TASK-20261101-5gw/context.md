# Context Bundle — Setlist Page View Feature Parity & Edit Songs FAB

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Main setlist viewer component; houses mode toggling (Continuous vs Page View), `AppendSongsButton` guard, popover controls, layout & column management, keyboard listeners, and `ChordDrawer` integration. |
| `src/hooks/useSetlistSync.ts` | Realtime collaboration hook; manages `SONG_CHANGE`, `SECTION_CHANGE`, `KEY_CHANGE`, and `SCROLL_SYNC` broadcasts/subscriptions. Needs `onRemoteSongChange` callback. |
| `src/components/client/SetlistSongSection.tsx` | Per-song section component; handles song header (standard & compact), Sync to Setlist button, YouTube player embed and modals. Needs compact header parity for `liveSyncState` & `syncError`, and layout isolation for YouTube in Page View. |
| `src/components/SongViewer/ChordSheetClient.tsx` | Reference implementation for CAGED shape selector, original key indicator, reset button, and follower override badge (`[Reset to Leader]`). |
| `src/components/client/AppendSongsButton.tsx` | Floating action button (FAB) for editing/reordering setlist songs via `AppendSongsModal`. Reused directly in Page View. |
| `src/components/client/AppendSongsModal.tsx` | Modal dialog for adding/removing/reordering songs; calls `router.refresh()` which requires `activeSongIndex` reconciliation in Page View. |
| `src/components/client/ChordDrawer.tsx` | Bottom drawer chord dictionary; already supports `capoOffset?: number` prop, needs active-song chord scoping in Page View. |
| `src/utils/musicLogic.ts` | Source of truth for `NOTES`, `shiftChord`, and `getSemitoneOffset`. Ideal location for shared CAGED shape constants. |
| `pbi-docs/PBI-20261101-setlist-page-view-feature-parity.md` | Specification defining acceptance criteria, scope, and grill decisions for PBI-20261101. |
| `MEMORY.md` | Root cause registry containing critical pitfalls for SSR hydration, React Compiler rules, layout transforms, and Realtime broadcasts. |

## Reuse Candidates
- `<AppendSongsButton />` (`src/components/client/AppendSongsButton.tsx`): Reused directly across all modes by removing the `!isPageMode` guard in `SetlistViewerClient.tsx:606`. Works out of the box with `AppendSongsModal` without modification.
- CAGED shape selector logic (`src/components/SongViewer/ChordSheetClient.tsx:43-58, 710-745`): Reused in `SetlistViewerClient.tsx`'s Page View popover. `CAGED_SHAPES` (`["C", "A", "G", "E", "D"]`) and `CAGED_SHAPE_ROOTS` can be exported from `ChordSheetClient.tsx` or `src/utils/musicLogic.ts`.
- `getSemitoneOffset` & `shiftChord` (`src/utils/musicLogic.ts`): Use standard music math helpers for CAGED shape capo calculation (`getSemitoneOffset(shapeRoot, activeKey)`) and semitone transpositions.
- `liveSyncState` and `syncError` indicators (`src/components/client/SetlistSongSection.tsx:300-338, 383-390`): Reuse the existing standard header's status rendering (Saving…, Synced, and error message) inside the `isCompactHeader={true}` branch.
- `ChordDrawer`'s `capoOffset` prop (`src/components/client/ChordDrawer.tsx:494, 506`): `ChordDrawer` already accepts `capoOffset?: number` and passes it to `GuitarSVG` — pass `capoOffset={isPageMode ? currentSongCapo : 0}` from `SetlistViewerClient.tsx`.
- Native DOM query selector for modal guarding (`document.querySelector('[role="dialog"][aria-modal="true"]')`): Reuses existing standard ARIA attributes in `AppendSongsModal`, `YouTubeLinkModal`, and `SetlistSettingsModal` to guard keyboard shortcuts without prop drilling.

## Patterns to Follow
- **React Compiler & Immutability Rules (BUG-002, BUG-007, GEMINI.md):**
  - Never use object property paths in dependency arrays (`[sync.toggleLive]` -> `[sync]`).
  - Declare helper functions and callbacks *before* any hook (`useEffect`, `useCallback`) that references them (no forward references).
  - Never assign to `window.location.hash` or direct global mutations.
- **Stable Refs for Callbacks & Broadcast Throttling (BUG-021, BUG-027):**
  - In `useSetlistSync.ts`, hold `onRemoteSongChange` in a stable `useRef` updated on render (`const onRemoteSongChangeRef = useRef(onRemoteSongChange); onRemoteSongChangeRef.current = onRemoteSongChange;`) to prevent channel reconnection loops when parent re-renders.
  - Guard broadcast triggers with `prevValuesRef` transition checks.
- **Page View Horizontal Translation & Sub-Page Calculation (BUG-021, BUG-023):**
  - Step translation in `translateX(-${subPageIndex * 100}%)` and measure dimensions asynchronously with `ResizeObserver` + `requestAnimationFrame`. Never use `transform: scale()` on multi-column text containers.
- **Artisan Color Palette & Dark Mode Pairing (BUG-005, docs/coding-guidelines.md, GEMINI.md):**
  - Every named Tailwind utility (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`) must have an explicit `dark:` pair (`dark:text-brand-cream`, `dark:text-brand-tan`, `dark:bg-brand-espresso`, `dark:bg-brand-darker`).
  - Never use generic Tailwind green/blue colors (`emerald`, `sky`, `blue`) for UI badges; adhere to the Artisan palette.

## Anti-Patterns Flagged
- `src/app/setlists/[id]/SetlistViewerClient.tsx:606`: `{isLeader && !isPageMode && <AppendSongsButton ... />}` — artificially restricts song management to continuous scroll mode; remove `!isPageMode`.
- `src/app/setlists/[id]/SetlistViewerClient.tsx:1013-1072`: Nesting the entire `<SetlistSongSection />` (which contains the compact header and YouTube embed) directly inside the multi-column and `translateX` container — causes header and YouTube embed to flow into column 1 and scroll off-screen on Page 2+. The header and YouTube section must be hoisted/separated outside the CSS column and horizontal translation container.
- `src/components/client/SetlistSongSection.tsx:266, 321, 356`: Using generic Tailwind `text-green-600`, `text-green-700`, `bg-green-50` — violates Saliw Artisan Design System Palette Rules (GEMINI.md).
- `src/components/client/SetlistSongSection.tsx:237-284`: `isCompactHeader` completely omits `liveSyncState` and `syncError` indicators, leaving the leader with no sync feedback in Page View mode.
- `src/app/setlists/[id]/SetlistViewerClient.tsx:496`: `if (settingsOpen || isDrawerOpen)` in `handleKeyDown` ignores other active modals (`AppendSongsModal`, `YouTubeLinkModal`), causing Arrow/Space keys to hijack focus while interacting with open dialogs.

## MEMORY.md Notes
- `BUG-001` (UI State): Never initialize state from `localStorage` synchronously in `useEffect` + `setState`. Always use lazy initializer `useState(() => readValue())`.
- `BUG-002` (Architecture): The React Compiler rejects object property paths in dependency arrays (e.g. `[sync.notifyKeyChange]`). Always depend on the entire object (`[sync]`) or destructured primitive variables.
- `BUG-005` (UI State): All named brand utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) require explicit `dark:` pairs (e.g. `dark:text-brand-cream`, `dark:bg-brand-espresso`).
- `BUG-007` (Architecture): Helper functions must be declared before any hooks that reference them. The React Compiler does not tolerate forward references or hoisting.
- `BUG-019` (Architecture): When overriding a hook's state with an optional prop, call the hook unconditionally and use nullish coalescing (`propValue ?? hookValue`). Do not wrap hooks conditionally.
- `BUG-020` (UI State): Never use `useState(() => typeof window !== "undefined")` as a mount guard; use `useState(false)` + `useEffect(() => setMounted(true), [])` or `useSyncExternalStore`.
- `BUG-021` (UI State / Layout): Percentage offsets in `translateY` are relative to element height, not container height. For page layout, use measured pixel heights or container-relative `translateX(-${subPageIndex * 100}%)`.
- `BUG-021` (API Integration / Realtime): When effects trigger Realtime broadcasts, never pass raw prop callbacks directly into dependency arrays without `useRef` encapsulation or stable references. Always guard with transition checks.
- `BUG-022` (API Integration / Supabase): Always invoke `channel.untrack()` before `supabase.removeChannel(channel)` in cleanup teardown.
- `BUG-023` (UI State / Layout): Never apply `transform: scale()` to multi-column text layouts to reflow text. Adjust font size directly and compute sub-pages from `scrollWidth / clientWidth`.
- `BUG-027` (UI State / Transpose): Child components notifying parents via `onStateChange` callbacks must use `useRef` guards to prevent circular re-render loops (`Maximum update depth exceeded`). Guard parent setters with `prev === next ? prev : next`.
