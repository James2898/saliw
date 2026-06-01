# TASK-049 — Chord Sheet Alternating Row Backgrounds + Section Nav Drawer Mobile Refactor

- **Tier:** 1
- **Date Created:** 2026-06-01
- **Status:** In Progress

---

## Feature Summary

Two focused UI improvements to the setlist viewer page:

1. **Chord Sheet Alternating Row Stripe:** Chord and lyric rows in the chord sheet viewer currently have no background color, making long lyrical passages visually difficult to scan. This task adds a subtle alternating background stripe using the Artisan palette (cream and tan with espresso/brown dark variants) to improve readability without affecting chord alignment or styling.

2. **Section Nav Drawer Mobile Refactor:** The SectionNavDeck component currently renders as a horizontal bar at mobile viewport (`fixed top-16 left-0 right-0`), overlapping the song sticky selector (ServiceNavigator). This task moves it to a right-side overlay drawer that floats above content without reflowing the page. The drawer is open by default on mobile page load and always-visible (non-drawer) on desktop.

---

## Acceptance Criteria

### Chord Sheet Alternating Row Backgrounds

1. Every even-indexed chord/lyric row in the chord sheet has a distinct background color from odd-indexed rows. Both row colors must use named Tailwind brand utilities (not CSS variable arbitrary values) to avoid the opacity issue documented in BUG-021 and ensure dark mode compatibility per BUG-004/BUG-005.
2. The stripe colors must meet WCAG AA contrast for all chord text and lyric text rendered on top of them. The low-contrast pair `text-brand-tan` on `bg-brand-cream` must not be used together (per coding-guidelines.md validator checklist).
3. Both row backgrounds have explicit `dark:` variants. No named utility class (`bg-brand-*`) is used without a paired `dark:` sibling on the same element.
4. The alternating stripe is purely cosmetic and does not affect chord alignment, `white-space: pre` / `white-space: pre-wrap` behavior, or `chord-item` span styling.
5. The stripe applies to the rendered chord sheet in both the setlist viewer page and any standalone song viewer page that renders the same `ChordSheetClient` component (or its parent).
6. On a chord sheet with only one row, no alternating stripe is visible — the single row renders with the base (odd) background.
7. The alternating pattern resets per song section: the first row of each new song section always starts at the "odd" background, not continuing the count from the prior section.

### Section Nav Drawer — Mobile

8. On viewports narrower than `md` (768px), the SectionNavDeck renders as a right-side overlay drawer.
9. The drawer is open by default on mobile page load. Open state is initialized with `useState(true)` (plain literal, not a lazy initializer reading `localStorage` or `window`) to remain SSR-safe and hydration-mismatch-free per BUG-001 and BUG-020.
10. The drawer state is not persisted across page loads or navigation — it always starts open.
11. The drawer floats over page content (`position: fixed`) — does not push or reflow the song content beneath it.
12. The drawer is anchored to the right edge of the viewport on mobile.
13. A visible toggle button is present on mobile to open and close the drawer. The toggle button must remain visible (not hidden behind the drawer) in both open and closed states.
14. The toggle button is positioned such that it does not overlap the song sticky selector (`ServiceNavigator` at `sticky top-16 z-40`).
15. On viewports at or wider than `md`, SectionNavDeck is always visible (not a drawer, no toggle button shown), matching its current desktop behavior.
16. The drawer does not display a backdrop/scrim behind it. It is a plain right-side overlay without a dimming layer.
17. The drawer has no dedicated internal close button — the toggle button (AC-13) is the sole open/close control.

### Section Nav Drawer — Accessibility

18. The drawer element has `role="navigation"` and a descriptive `aria-label="Section navigation"`.
19. The toggle button has an accessible label that reflects drawer state: `aria-label="Open section navigation"` when closed, `aria-label="Close section navigation"` when open. Use `aria-expanded` on the button to toggle between states.
20. On mobile, when the drawer opens, focus is NOT forcibly moved into the drawer (no focus trap). The drawer is a supplementary navigation overlay for a read-only viewer page, not a modal that blocks the primary task.
21. The drawer is reachable via keyboard tab order in its open state and is skipped (or removed from tab order via `tabIndex={-1}` / `visibility: hidden` equivalent) when closed.

### General

22. `npm run format` passes with no changes after implementation (Prettier v3 compliance per coding-guidelines.md workflow rules).
23. No new `useCallback` dependency array references an object property path (e.g., `[state.open]`) — must reference the whole object or a destructured primitive per BUG-002.
24. All helper functions (open, close, toggle drawer) are declared above any `useEffect` that references them, per BUG-007 (React Compiler forward reference rule).

---

## Out of Scope

- Persisting drawer open/closed state across sessions or page loads.
- Adding a backdrop/scrim or modal overlay behavior to the drawer.
- Changing the SectionNavDeck's content, ordering, or scroll-to behavior.
- Any changes to the song sticky selector itself.
- Alternating row backgrounds on any page other than the setlist viewer chord sheet and any shared component it uses.
- Animated drawer transitions beyond a CSS transform (if the codebase uses transitions, match existing patterns; do not introduce new animation libraries).
- Changes to the auto-scroll toolbar or any other toolbar in the setlist viewer.
- Persisting drawer state via localStorage or window.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/SongViewer/ChordSheetClient.tsx` | Renders chord and lyric rows (lines 706, 716); needs alternating background classes via row-index counter + per-section reset logic |
| `src/components/client/SectionNavDeck.tsx` | Mobile drawer refactor target; currently renders horizontal bar at `fixed top-16 left-0 right-0` (lines 213–222); must become right-side drawer |
| `src/styles/globals.css` | Add CSS transition override classes `.section-nav-drawer-panel` and `.section-nav-drawer-backdrop` for transform/opacity transitions (pattern from `#mobile-sidebar` override) |
| `src/components/client/SetlistSongSection.tsx` | Reference for alternating row pattern: `isEven = songIndex % 2 === 0` with `bg-brand-cream dark:bg-brand-espresso/40` vs `bg-brand-tan/20 dark:bg-brand-brown/30` (lines 195–207) |
| `src/components/client/navbar.tsx` | Reference for mobile drawer pattern: backdrop + panel with translate-x transitions (lines 345–374) |
| `src/components/client/ServiceNavigator.tsx` | Reference for sticky song selector position (`sticky top-16 z-40`); drawer toggle must not overlap |
| `src/components/client/ChordDrawer.tsx` | Reference for `.chord-drawer-panel` globals.css transition pattern (lines 14–18) |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-049/spec.md` | Acceptance criteria + scope + fallback behaviors |
| Context Bundle | `tasks/TASK-049/context.md` | Reusable component patterns + anti-patterns flagged + MEMORY.md prevention rules |
| Research Notes | `tasks/TASK-049/research.md` | Open questions for reconciliation (now resolved in this task file) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### Key Implementation Decisions

**Chord Row Alternating Stripe:**
- Use `isEven = lineIndex % 2 === 0` counter at render time to apply classes to `.chord-row` (line 716) and its sibling lyric line (line 706).
- Even rows: `bg-brand-cream dark:bg-brand-espresso/40` (from SetlistSongSection pattern).
- Odd rows: `bg-brand-tan/20 dark:bg-brand-brown/30` (from SetlistSongSection pattern).
- Reset counter per song section (per AC-7): see Amendment AM-1 below.

**Section Nav Drawer Mobile:**
- Refactor `SectionNavDeck.tsx` `mobileDeckClass` (lines 213–222) from `"md:hidden fixed top-16 left-0 right-0"` to a right-side drawer with `useState(true)` initial open state.
- Panel: `fixed right-0 top-0 bottom-0 z-[45] w-<computed> md:hidden` with `translate-x-0` (open) / `translate-x-full` (closed).
- Toggle button: placed above the ServiceNavigator sticky selector to avoid overlap (suggested: top-16 + sufficient padding, or floating near sticky selector).
- Preserve `desktopDeckClass` unchanged: `hidden md:flex fixed top-1/2 -translate-y-1/2 z-[45]`.
- Add CSS transition overrides in globals.css (pattern from navbar `#mobile-sidebar`): `.section-nav-drawer-panel { transition-property: transform; }` and `.section-nav-drawer-backdrop { transition-property: opacity; }` — both use `duration-300` or match navbar pattern.

**Z-Index Hierarchy:**
- ServiceNavigator: `z-40`
- SectionNavDeck (desktop + drawer): `z-[45]`
- Drawer backdrop (if added in future): `z-[48]` (reserved for future use; not in current scope per AC-16).
- ChordDrawer: `z-60`

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-004 / BUG-005 (Dark Mode):** Every `bg-brand-*`, `text-brand-*`, `border-brand-*` named Tailwind utility must have a corresponding `dark:` variant. Failure mode: text becomes near-invisible against the switched dark background. ✅ This task adds dark variants to all row backgrounds.

- **BUG-007 (React Compiler forward reference):** Declare all helper functions (`handleOpen`, `handleClose`, `handleToggle`) above any `useEffect` that references them. The React Compiler rejects forward references even when JS hoisting would allow it. ✅ Must be followed in SectionNavDeck refactor.

- **BUG-002 (React Compiler useCallback deps):** `useCallback` dependency arrays must reference whole objects, not property paths (`[obj]` not `[obj.method]`). ✅ If adding useCallback in drawer state handlers, must follow this rule.

- **BUG-020 (SSR hydration mismatch):** Never use `useState(() => typeof window !== 'undefined')` as a mount guard. Use `useState(false)` + `useEffect(() => setMounted(true), [])`. The mobile drawer's initial open state is a static boolean (`true`) — safe to set directly, no window check needed. ✅ Drawer initialized with plain `useState(true)`.

- **BUG-021 (CSS variable opacity):** `bg-[var(--brand-card-bg)]` resolved to semi-transparent `#bc8e5c26`. Do not use CSS variable arbitrary values for any background that must be opaque. Use named Tailwind utilities for chord/lyric row backgrounds. ✅ Only named utilities used (bg-brand-cream, bg-brand-tan/20, etc.).

- **BUG-014 (N+1 useAutoScroll instances):** Do not call `useAutoScroll()` inside SectionNavDeck. The component already receives `autoScroll` as a prop from SetlistViewerClient — this must be preserved in the refactored version. ✅ Preserve any existing autoScroll prop passing.

- **BUG-013 (click swallowed on moving target):** Preserve `onPointerDown` pause call on badge buttons — do not replace with `onClick`-only pattern. ✅ If toggle button uses event handlers, use onPointerDown if needed to prevent scroll conflicts.

- **Global `*` transition rule:** The globals.css `*` rule only covers `background-color, border-color, fill, stroke`. The new mobile drawer panel needs a named CSS class in globals.css to restore `transform` and `opacity` transitions (same as `#mobile-sidebar` and `.chord-drawer-panel`). ✅ Must add `.section-nav-drawer-panel { transition-property: transform; }` to globals.css.

- **Run Prettier before committing:** `npm run format` must be run before every commit (AC-22). ✅ Required step before finalizing.

---

## Amendments (from Context Bundle)

- **AM-1:** Per AC-7, the alternating pattern must reset per song section (verse/chorus/bridge boundaries within a song). The current ChordSheetClient data model receives `lyricsLine` array but context.md does not specify a `section` field or boundary marker in the data structure. **Resolution:** ChordSheetClient must detect or receive section boundaries and reset the `lineIndex % 2` counter to 0 at each section start. If the lyrics data model does not include section metadata, contact the requirements engineer to clarify whether: (a) sections are marked in the data (e.g., a `section_type` field), (b) sections are inferred from lyric content patterns (e.g., `[Verse]`, `[Chorus]` markers in the lyric text), or (c) the alternating stripe should NOT reset per section and AC-7 can be simplified to "never reset, count continuously across all rows of a song." **Current assumption (pending clarification):** Section boundaries exist in the data and must be detected at render time. If data lacks markers, add a data structure amendment in the handoff to the requirements engineer.

---

## Resolved Open Questions

- **Tailwind breakpoint for mobile/desktop distinction** → `md` (768px) — confirmed by context.md Patterns to Follow and SetlistSongSection/SectionNavDeck existing class usage (source: `context.md` → Patterns to Follow).

- **Named brand utilities for row backgrounds** → `bg-brand-cream` / `bg-brand-tan/20` (odd stripe) with dark variants `dark:bg-brand-espresso/40` / `dark:bg-brand-brown/30` — exact pattern from SetlistSongSection (source: `context.md` → Reuse Candidates, SetlistSongSection.tsx lines 195–207).

- **Z-index layering** → ServiceNavigator `z-40`, SectionNavDeck `z-[45]`, ChordDrawer `z-60`. Drawer backdrop (not in this scope) would use `z-[48]` (source: `context.md` → Patterns to Follow).

- **Song sticky selector position** → `sticky top-16 z-40` (ServiceNavigator component); drawer toggle must not overlap this element (source: `context.md` → Relevant Files).

- **CSS transition pattern for drawer** → Mirror navbar `#mobile-sidebar` pattern from lines 345–374 (backdrop + panel with `translate-x` and `opacity` transitions); add CSS class overrides in globals.css (source: `context.md` → Patterns to Follow and Reuse Candidates).

---

## Unresolved Pending Reconciliation

- **Song section boundaries in ChordSheetClient data model** → See Amendment AM-1. If `lyricsLine` array lacks a section marker, clarify whether sections exist in the data and how to detect them. Suggested grep targets: `ChordSheetClient.tsx` for `lyricsLine` type definition; Song/Lyrics data types in `src/types/` or schema files; any existing section-aware rendering in the codebase (search for `[Verse]`, `[Chorus]`, `section_type`, `sectionId`).

---

## Resolution

- **Completed:** 2026-06-01
- **Branch:** `feature/TASK-049-chord-stripe-section-nav-drawer`
- **Base branch:** `main`
- **Files changed:**
  - `src/components/SongViewer/ChordSheetClient.tsx` — alternating row stripe logic with per-section reset
  - `src/components/client/SectionNavDeck.tsx` — mobile drawer refactor (right-side overlay), toggle button, drawer state
  - `src/styles/globals.css` — `.section-nav-drawer-panel` transition override class added

## Diff Summary

- `src/components/SongViewer/ChordSheetClient.tsx` L677–784 — wrapped `processedLines.map` in an IIFE with a `rowCounter` variable; chord/lyric rows get `bg-brand-cream dark:bg-brand-espresso/40` (even) or `bg-brand-tan/20 dark:bg-brand-brown/30` (odd); counter resets to 0 at each `header` line (AC-1 through AC-7)
- `src/components/client/SectionNavDeck.tsx` L207–253 — removed old `mobileDeckClass`, added `mobileDrawerPanelBase` (right-side drawer) and `mobileToggleBtnClass` (toggle button) module-scope constants (AC-8, AC-11–16)
- `src/components/client/SectionNavDeck.tsx` L300–317 — added `isMobileOpen` state (`useState(true)`) and `handleToggle` useCallback declared above all useEffects (AC-9, AC-10, BUG-007, BUG-002, BUG-020)
- `src/components/client/SectionNavDeck.tsx` L518–593 — replaced mobile div render with toggle button + `<nav>` drawer panel with translate-x transitions, `aria-hidden`, `inert` on container when closed (AC-8–21)
- `src/styles/globals.css` L101–115 — added `.section-nav-drawer-panel { transition-property: transform; }` override matching `.chord-drawer-panel` pattern (AC-22, globals.css pattern)

## Notes

- AM-1 resolved: `header` type lines in `ProcessedLine` serve as section boundaries; `rowCounter` resets to 0 at each `header` encounter — no data model changes needed.
- Chord rows hidden via `chordsHidden` still increment `rowCounter` so adjacent lyric rows maintain correct even/odd pairing (AC-4: stripe is cosmetic only, does not affect chord alignment).
- Single-row sections: first row is always even (counter=0), so AC-6 is naturally satisfied.
- `inert` attribute used as `inert={!isMobileOpen || undefined}` — TypeScript expects `boolean | undefined`, so `true` when closed (inert), `undefined` when open (not set).
- Toggle button uses inline `style={{ right: toggleBtnRight }}` with pixel offsets to animate alongside the drawer (56px when open = w-14, 0px when closed). The `transition-[right]` utility in Tailwind handles the animation.
- `role="navigation"` is set on the `<nav>` element (redundant but explicit per AC-18) and `aria-label="Section navigation"` applied.
- Desktop deck (`desktopDeckClass`) and `DECK_Z_CLASS` untouched per spec.
