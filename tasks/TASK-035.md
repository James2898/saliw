# TASK-035 — Auto-Scroll for Setlist Viewer and Song Viewer

- **Tier:** 1
- **Date Created:** 2026-05-03
- **Status:** In Progress

---

## Feature Summary

Add a teleprompter-style auto-scroll control to both the setlist viewer (the full multi-song setlist reading page) and the standalone song viewer (the per-song detail/reading page). A persistent main toolbar button (always visible, fixed bottom-right) lets users activate auto-scroll. When activated, a control panel expands showing a speed slider and a single cycling Start/Pause/Resume button. Users can pause and resume scroll without resetting position, and adjust speed in real time. The control panel is only visible while auto-scroll is on; it hides when the user deactivates it via the main toolbar toggle. No backend changes are required; speed preference is persisted in localStorage between sessions.

---

## Acceptance Criteria

### Main Toolbar Toggle

1. A main toolbar toggle button is fixed to the bottom-right of the viewport at all times on both the setlist viewer and the song viewer. Its label/icon indicates "Auto-scroll off" when inactive and "Auto-scroll on" when active.
2. Pressing the main toolbar toggle when auto-scroll is off activates the feature: the expanded control panel becomes visible and scrolling begins immediately at the current speed setting.
3. Pressing the main toolbar toggle when auto-scroll is on (regardless of pause state) deactivates the feature entirely: scrolling stops, scroll position is preserved, and the expanded control panel hides.
4. When the page content height does not exceed the viewport height (`scrollHeight <= clientHeight`), the main toolbar toggle is visible but disabled, and a tooltip or inline hint reads "Nothing to scroll."

### Expanded Control Panel

5. The expanded control panel is visible only while auto-scroll is active (main toggle is on). It is hidden when auto-scroll is off. There is no intermediate hover/focus reveal state.
6. The expanded control panel contains exactly two controls: a speed slider and a single cycling action button (the scroll state button).
7. The scroll state button cycles through three states in order: **Scrolling** (auto-scroll running) → **Paused** (scroll stopped, position preserved) → **Scrolling** again. The button label reflects the next action: when scrolling it reads "Pause"; when paused it reads "Resume."
8. Pressing the scroll state button pauses or resumes scrolling without resetting the scroll position and without closing the control panel.

### Speed Slider

9. The speed slider is a horizontal range input with a minimum of 1 and a maximum of 10 (integer steps). The default value is 3.
10. Speed units map linearly to scroll velocity: unit 1 = 20 px/s, unit 10 = 200 px/s. Exact px/s values may be tuned during implementation for feel on real chord sheets, but the range endpoints (1 and 10) are fixed.
11. The speed slider is always visible inside the expanded control panel while auto-scroll is on. It is not collapsed behind a secondary interaction.
12. Adjusting the slider while scrolling is active takes effect immediately without stopping or restarting the scroll.
13. Adjusting the slider while scrolling is paused takes effect on the next resume.

### Scroll Behavior

14. Auto-scroll uses `requestAnimationFrame` for smooth, continuous upward scrolling of the full page (`window.scrollBy`). No sub-container scroll is in scope.
15. When the page reaches the bottom (`scrollTop + clientHeight >= scrollHeight − 2px`), auto-scroll stops automatically and the main toolbar toggle resets to the off state, hiding the control panel.
16. When the user manually scrolls (mouse wheel, touch-swipe, or keyboard arrow keys) while auto-scroll is actively running, auto-scroll pauses automatically. The control panel remains visible and the scroll state button updates to show "Resume."
17. After a manual scroll interaction, auto-scroll does NOT resume automatically. The user must press the "Resume" button.
18. The spacebar key toggles the scroll state button (Pause ↔ Resume) while the main toggle is on. Spacebar has no effect when auto-scroll is off (main toggle inactive).

### Persistence and Layout

19. The speed slider value is written to `localStorage` under the key `saliw_autoscroll_speed` on every change. On page load the slider initializes to the stored value via a lazy `useState` initializer. If no stored value exists, the default is 3.
20. When the expanded control panel is visible, a minimum of 80px bottom padding is added to the page content area to prevent the toolbar from obscuring chord content during scrolling. This padding is removed when the panel hides.

### Artisan Palette and Accessibility

21. The main toolbar toggle and the expanded control panel share a common container styled with `--brand-espresso` background, `--brand-cream` text and icons, and `--brand-tan` as the active/highlight accent. No `dark:` variant is required; `--brand-espresso` is already the dark-mode card background.
22. All text and interactive elements in the toolbar meet WCAG AA contrast. `--brand-tan` text on `--brand-cream` background is prohibited (low-contrast pair per coding guidelines).
23. Typography inside the toolbar uses 'Plus Jakarta Sans' for labels and controls, consistent with UI typography in the coding guidelines.

### Architecture and Compiler Safety

24. All scroll logic is extracted into `src/hooks/useAutoScroll.ts` and shared by both the setlist viewer and the song viewer. No duplicate logic is permitted across the two viewer components.
25. The control panel component is a Client Component (`'use client'`). It must not call Supabase directly.
26. All `window` and `document` references inside `useAutoScroll.ts` must be placed inside `useEffect` or guarded by an `isBrowser` check. The hook must not throw during the SSR render pass.
27. The `localStorage` read for speed preference must use a lazy `useState` initializer — not a `useEffect` setter — to prevent the BUG-001 pattern (synchronous setState inside useEffect causes Vercel build errors).
28. Any `useCallback` or `useMemo` inside `useAutoScroll.ts` must declare whole objects as dependencies, never object property paths (BUG-002 compliance).
29. All helper functions referenced inside `useEffect` in `useAutoScroll.ts` must be declared before the `useEffect` call site (BUG-007 compliance).
30. All `localStorage` reads and writes must be wrapped in try/catch. On any failure the slider silently defaults to 3 with no visible error.

---

## Out of Scope

- Per-song speed overrides (one speed setting applies globally across the session).
- Auto-scroll on/off state persisting across page navigations — only the speed value persists.
- Any backend storage of scroll preferences in Supabase.
- Scroll within a sub-container (modal, drawer) — full-page window scroll only.
- Step-by-step / line-by-line scroll mode.
- Reverse (upward) auto-scroll.
- Mobile swipe gesture controls beyond native touch-scroll pause behavior (criterion 16).
- Keyboard arrow key speed adjustment.
- Auto-hide of the toolbar after an idle period.
- A collapsed/gear-icon UI for the speed slider.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/page.tsx` | Server Component — setlist viewer page; SetlistViewerClient renders within it |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Primary 'use client' wrapper for setlist viewer; must render AutoScrollToolbar in the toolbar area |
| `src/components/client/SetlistSongSection.tsx` | Per-song wrapper with `id="song-{junctionId}"`; defines scroll targets for the page |
| `src/components/SongViewer/ChordSheetClient.tsx` | 'use client' chord sheet in song viewer; must integrate AutoScrollToolbar into the Song Controls toolbar |
| `src/app/library/[id]/page.tsx` | Server Component — song viewer page; ChordSheetClient renders within it |
| `src/hooks/useFontSize.ts` | Direct template for `useAutoScroll`: SSR-safe lazy `useState` initializer reading from localStorage, `clamp()`, and `persist()` + `useCallback` patterns |
| `src/hooks/useTranspose.ts` | Secondary template for clamped numeric state (speed bounded to 1–10) |
| `src/components/client/button.tsx` | Reusable Button component; use `variant="ghost"` for toggle and `variant="primary"` for active state |
| `src/styles/globals.css` | Artisan palette CSS variables (`--brand-espresso`, `--brand-cream`, `--brand-tan`) and chord-sheet styles |
| `docs/coding-guidelines.md` | Establishes Artisan palette, dark mode rules, and BUG-004 dark-mode variant requirement |

---

## Technical Schema

N/A — no API contract required for this task. All scroll logic is client-side with localStorage persistence only.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-035/spec.md` | Acceptance criteria + out-of-scope + fallback behaviors |
| Context Bundle | `tasks/TASK-035/context.md` | Reusable components, patterns, and anti-patterns to avoid |
| Research Notes | `tasks/TASK-035/research.md` | Open questions resolved during requirements phase |

---

## Implementation Notes

**Before writing any code:**

1. Read `docs/coding-guidelines.md` — establishes Artisan palette, dark mode rules (BUG-004), and TypeScript naming conventions.
2. Read `docs/tech-stack.md` — confirms Next.js App Router and Tailwind v4 setup.
3. Read `docs/structure.md` — confirms hooks live in `src/hooks/` and components in `src/components/`.
4. Study `src/hooks/useFontSize.ts` — it is the direct structural template for `useAutoScroll.ts`. Reuse the SSR-safe localStorage pattern, clamp helper, and persist callback shape exactly.

**Key Implementation Constraints:**

- **Hook is shared:** Create `src/hooks/useAutoScroll.ts` with a typed return interface: `{ isScrolling, isPaused, speed, toggle, pause, resume, setSpeed }`.
- **SSR guard:** All `window` and `document` references must be inside `useEffect` or behind an `isBrowser` check (AC 26). The hook must not reference `window.scrollY` at module scope.
- **localStorage read:** Use a lazy `useState` initializer reading from a helper function, never inside a `useEffect` (AC 27 / BUG-001 compliance).
- **rAF loop:** Use `useRef` to store the animation frame ID so it can be cancelled on unmount or deactivation. Read speed from a `speedRef` (not state) inside the rAF callback to avoid stale closures.
- **Spacebar handler:** Add a global keydown listener inside `useEffect` that toggles pause/resume when spacebar is pressed and auto-scroll is active (AC 18).
- **Manual scroll detection:** Listen to scroll events and detect if the user manually scrolled (compare `window.scrollY` before and after a small timeout). Pause auto-scroll on manual scroll but keep the control panel visible (AC 16).
- **Bottom-of-page detection:** Compare `scrollTop + clientHeight >= scrollHeight - 2px` and auto-disable when reached (AC 15).
- **New components:** Create `src/components/client/AutoScrollToolbar.tsx` — a Client Component rendering the fixed bottom-right toggle button and the expanded control panel. Import and render it in both SetlistViewerClient and ChordSheetClient.
- **Styling:** Use CSS variables for colors (`bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`, `bg-[var(--brand-tan)]`). These switch automatically in dark mode and need no `dark:` pair. Pair all Tailwind named utilities with explicit `dark:` (AC 21–23, BUG-004).
- **Bottom padding:** Wrap the main scrollable content area and conditionally add `pb-20` or similar when the control panel is visible (AC 20).

**Memory.md Compliance:**

- **BUG-001** (setState in useEffect): Use lazy `useState` initializer for localStorage read. ✓ AC 27
- **BUG-002** (React Compiler useCallback deps): Depend on whole objects, not property paths. ✓ AC 28
- **BUG-004** (dark mode missing variants): All Tailwind named utilities must have explicit `dark:` pairs. CSS variable arbitrary values auto-switch. ✓ AC 21–23
- **BUG-007** (forward reference in hooks): Declare all functions before `useEffect` that references them. ✓ AC 29

---

## Resolution

- **Completed:** 2026-05-03
- **Branch:** `claude/feat-auto-scroll-TASK-035`
- **Base branch:** `develop`
- **PR:** https://github.com/James2898/saliw/pull/69
- **Files changed:**
  - `src/hooks/useAutoScroll.ts` — new shared hook with rAF loop, speed persistence, manual-scroll detection, spacebar toggle, bottom-of-page auto-stop; fully SSR-safe and BUG-001/002/007 compliant
  - `src/components/client/AutoScrollToolbar.tsx` — new Client Component; fixed bottom-right panel with speed slider (1–10), cycling Pause/Resume button, Artisan Palette CSS-variable styling (no dark: variants needed)
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — added useAutoScroll() call and AutoScrollToolbar; conditional h-24 bottom spacer at end of song list (AC 20)
  - `src/components/SongViewer/ChordSheetClient.tsx` — added useAutoScroll() call and AutoScrollToolbar; conditional h-24 bottom spacer after chord display (AC 20)
- **Notes:**
  - The `AutoScrollToolbar` receives the full `UseAutoScrollReturn` as a `scroll` prop (matching the GoLiveButton/FollowLeaderButton `sync` prop pattern). This lets the parent viewer read `isActive` for the bottom-padding spacer without duplicating hook state.
  - Manual scroll detection uses a threshold diff of 8px against `lastScrollYRef` to avoid false positives from rAF-driven scroll increments at maximum speed (~3–4px per frame at 200px/s).
  - `speedRef.current` is kept in sync by `setSpeed` (which updates both ref and state), following the canonical stale-closure solution for rAF loops.
  - All Tailwind utilities in the toolbar use CSS-variable arbitrary values only (`bg-[var(--brand-espresso)]` etc.), so no `dark:` pairs are needed per the spec (AC 21) and BUG-004 is not triggered.
  - `'use client'` directive is at the top of `useAutoScroll.ts` to prevent any SSR-side import from accidentally calling browser APIs; all `window`/`document` references inside the hook are inside `useEffect` guards.
