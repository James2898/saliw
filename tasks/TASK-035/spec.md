# Spec — Auto-Scroll for Setlist Viewer and Song Viewer

## Feature Summary

Add a teleprompter-style auto-scroll control to both the setlist viewer (the full multi-song setlist reading page) and the standalone song viewer (the per-song detail/reading page). A persistent main toolbar button (always visible, fixed bottom-right) lets users activate auto-scroll. When activated, a control panel expands showing a speed slider and a single cycling Start/Pause/Resume button. Users can pause and resume scroll without resetting position, and adjust speed in real time. The control panel is only visible while auto-scroll is on; it hides when the user deactivates it via the main toolbar toggle. No backend changes are required; speed preference is persisted in localStorage between sessions.

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

## Fallback Behaviors

- `localStorage` unavailable (private browsing, storage quota exceeded, SSR context): speed slider initializes silently to 3; no error is thrown or displayed. Try/catch is required on all localStorage calls (criterion 30).
- SSR render pass (`window` undefined): `useAutoScroll` must not reference `window` or `document` outside `useEffect`; the control panel renders in its default off/hidden state on the server with no runtime error (criterion 26).
- Content does not exceed viewport height: main toolbar toggle renders but is disabled with hint text "Nothing to scroll" (criterion 4). The expanded control panel does not appear.

## Resolved Ambiguities

- **Scroll target (full page vs. container)** → Full-page `window` scroll, based on App Router full-page layout structure described in CLAUDE.md. @codebase-explorer must confirm no inner scroll container overrides this; if one is found, the developer must revisit criterion 14.
- **Smooth continuous vs. step-by-step** → Smooth continuous scroll via `requestAnimationFrame`. Step-by-step not requested in the feature description; out of scope.
- **Speed range** → 1–10 units mapped linearly to 20–200 px/s. Range endpoints fixed; px/s values tunable during implementation for real chord-sheet feel.
- **Content shorter than viewport** → Deterministic: disable toggle + "Nothing to scroll" hint when `scrollHeight <= clientHeight`.
- **Dark mode toolbar** → No `dark:` variant needed; `--brand-espresso` is already the dark-mode card background per `docs/coding-guidelines.md`.
- **BUG-001 / BUG-002 / BUG-007 guards** → Incorporated as hard acceptance criteria 27–29 based on known React Compiler failure modes in MEMORY.md.
- **Q1 — Pause/resume control layout** → Single cycling button (Start/Pause/Resume), not two separate controls. Resolved by user.
- **Q2 — Speed slider visibility** → Always visible in the expanded control panel while auto-scroll is on. No collapsed/gear-icon variant. The toolbar itself has a separate main toggle to show/hide the entire panel. Resolved by user.
- **Q3 — Toolbar auto-hide** → The expanded control panel is visible only while auto-scroll is on; it is fully hidden when the main toggle is off. No auto-hide timer. Resolved by user.
