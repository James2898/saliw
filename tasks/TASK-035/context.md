# Context Bundle — Auto-Scroll Feature (Setlist Viewer + Song Viewer)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/page.tsx` | Server Component — setlist viewer page; pre-processes chord sheets and passes songs to SetlistViewerClient |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Primary 'use client' wrapper for the setlist viewer; owns toolbar controls (Hide Chords, GoLive, FollowLeader); auto-scroll controls should live here |
| `src/components/client/SetlistSongSection.tsx` | Per-song wrapper with `id="song-{junctionId}"` and `scroll-mt-16`; scrolled to by ServiceNavigator |
| `src/components/SongViewer/ChordSheetClient.tsx` | 'use client' chord sheet with accordion Song Controls toolbar; auto-scroll controls should integrate into this toolbar for the song viewer context |
| `src/app/library/[id]/page.tsx` | Server Component — song viewer page; renders ChordSheetClient directly inside a Card |
| `src/hooks/useFontSize.ts` | Pattern hook: stateful value (clamped range) + localStorage persistence + SSR-safe lazy initializer; direct template for a `useAutoScroll` hook |
| `src/hooks/useTranspose.ts` | Pattern hook: clamped/bounded numeric state with increment/decrement/reset; secondary template for auto-scroll speed state |
| `src/components/client/button.tsx` | Reusable Button component with `primary`, `secondary`, `ghost` variants and `sm/md/lg` sizes; use for auto-scroll toggle button |
| `src/components/client/ServiceNavigator.tsx` | Sticky navigator at `top-16 z-40`; uses `window.scrollTo({ behavior: 'smooth' })` — the existing manual scroll API |
| `src/styles/globals.css` | Defines Artisan palette CSS variables, chord-sheet styles, and the global `transition-property` rule (which suppresses `transform` and `opacity` transitions — relevant for any animated scroll control) |

## Reuse Candidates

- `src/hooks/useFontSize.ts` — Direct structural template for `useAutoScroll`. Reuse: SSR-safe `readStoredFontSize` lazy initializer pattern (reading localStorage inside a `useState` initializer function), `clamp()` helper, and `persist()` + `useCallback` pattern. A `useAutoScroll` hook should follow this exact shape: `{ isScrolling, speed, toggle, increaseSpeed, decreaseSpeed, resetSpeed }` with `STORAGE_KEY = 'saliw-autoscroll-speed'`.
- `src/components/client/button.tsx` — Use `<Button variant="ghost" size="sm">` for the Auto-Scroll enable/disable toggle button. Use `variant="primary"` for the active/engaged state (matching the Hide Chords pattern in SetlistViewerClient, but Button component is preferred over inline button in this case).
- `src/components/client/GoLiveButton.tsx` / `src/components/client/FollowLeaderButton.tsx` — The `aria-pressed` toggle button pattern (inactive/active CSS class swap) is the exact pattern to follow for the Auto-Scroll enable toggle. See the class array pattern with `toggleActiveClass` / `toggleInactiveClass` constants in ChordSheetClient.

## Patterns to Follow

- **Hook-per-feature pattern**: See `src/hooks/useFontSize.ts` — each stateful UI feature lives in its own hook with a typed return interface. The auto-scroll hook must be in `src/hooks/useAutoScroll.ts` (per `docs/structure.md` "Shared State / Context" row).
- **localStorage persistence with SSR guard**: See `src/hooks/useFontSize.ts` lines 37–49 — read stored value inside a `useState` lazy initializer (`useState<number>(readStoredFontSize)`), never inside a `useEffect`. This avoids the BUG-001 setState-in-effect pattern.
- **Accordion toolbar integration**: See `src/components/SongViewer/ChordSheetClient.tsx` lines 147–349 — all song-level controls live inside the `<div class="chord-sheet-toolbar-panel">` accordion. Auto-scroll controls for the song viewer must be added here (after a divider `<span>` matching the existing ones at lines 284 and 330).
- **Global toolbar pattern in SetlistViewerClient**: See `src/app/setlists/[id]/SetlistViewerClient.tsx` lines 122–138 — global controls (e.g. Hide Chords) live as inline `<button>` elements in the setlist header. Auto-scroll for the full setlist should follow this pattern: an inline button in the same `div.flex.items-center.gap-3` row.
- **`requestAnimationFrame` loop with ref for scroll**: No existing implementation — this is new. The implementation must use `useRef` for the animation frame ID (cancel on unmount / on disable) and read scroll speed from a ref (not state) inside the rAF callback to avoid stale closures. Model this after the `debounceTimersRef` / `latestKeyRef` ref pattern in `src/hooks/useSetlistSync.ts`.
- **Module-level CSS class string constants**: See `src/components/SongViewer/ChordSheetClient.tsx` lines 11–34 — button class strings are extracted to module-level `const` variables (`ctrlBtnClass`, `toggleBtnClass`, `toggleActiveClass`, `toggleInactiveClass`). Follow this to avoid per-render string allocations.
- **Dark mode — explicit `dark:` variants**: Per BUG-004 (MEMORY.md), every Tailwind utility on an Artisan palette class must have an explicit `dark:` counterpart. No class on the auto-scroll controls may rely on CSS variable switching alone.

## Anti-Patterns Flagged

- `src/app/setlists/[id]/SetlistViewerClient.tsx` line 78: `useState` initial value is a primitive literal (`false`) — this is fine. However, if auto-scroll speed were initialized from localStorage here (instead of inside a hook), it would replicate BUG-001. Do not read localStorage directly in a component; keep it in the hook.
- `src/components/SongViewer/ChordSheetClient.tsx` line 127: The `externalChordsHidden` sync effect explicitly lists `[externalChordsHidden]` as dependency but there is an intentional `eslint-disable-next-line` comment on line 123 for the `externalKey` effect — confirm any new effect added to this component does not require a similar suppression or it will be flagged by the React Compiler (see BUG-002 in MEMORY.md).
- `src/components/client/ServiceNavigator.tsx` line 128: `window.scrollTo()` is called directly in an event handler without an SSR guard — this works because ServiceNavigator is `'use client'` and the function is only called on click, but any `window.scrollBy()` inside a `useEffect` or `requestAnimationFrame` callback must be guarded by `typeof window !== 'undefined'` or placed entirely within a client component boundary.

## MEMORY.md Notes

- **BUG-001** (useFontSize setState-in-effect): Do NOT initialize scroll speed from localStorage inside a `useEffect`. Use the lazy `useState` initializer pattern (`useState(readStoredValue)`) exactly as done in `useFontSize.ts`. Violation causes a synchronous setState inside useEffect which breaks the Vercel build.
- **BUG-002** (React Compiler useCallback property-path dep): When adding `useCallback` hooks that reference an object prop (e.g. a `sync` prop object), depend on the whole object, not a property path like `sync.isScrolling`. This was the root cause in GoLiveButton/FollowLeaderButton.
- **BUG-004** (Missing dark mode variants): All new UI elements must include explicit `dark:` Tailwind class pairs. Do not assume CSS variable switching covers dark mode for Tailwind named utilities.
- **BUG-007** (React Compiler forward reference): Declare all functions and callbacks before any `useEffect` that references them. This is especially relevant if `useAutoScroll` has an effect that calls a `cancel` or `pause` function declared later in the hook body.
