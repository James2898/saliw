# Spec — Chord Sheet Alternating Row BG + Section Nav Drawer (Mobile)

## Feature Summary

Two focused UI improvements to the setlist viewer page. First: chord/lyric rows in the chord sheet viewer currently have no alternating background color; this task adds a subtle alternating stripe using the Artisan palette so rows are visually scannable in both light and dark mode. Second: the section navigation deck (SectionNavDeck) currently overlaps the song sticky selector on mobile; this task moves it to a right-side overlay drawer that is open by default on mobile page load and always-visible (non-drawer) on desktop, resolving the overlap without reflowing page content.

---

## Acceptance Criteria

### Chord Sheet Alternating Row Backgrounds

1. Every even-indexed chord/lyric row in the chord sheet has a distinct background color from odd-indexed rows. Both row colors must use named Tailwind brand utilities (not CSS variable arbitrary values) to avoid the opacity issue documented in BUG-021 and ensure dark mode compatibility per BUG-004/BUG-005.
2. The stripe colors must meet WCAG AA contrast for all chord text and lyric text rendered on top of them. The low-contrast pair `text-brand-tan` on `bg-brand-cream` must not be used together (per coding-guidelines.md validator checklist).
3. Both row backgrounds have explicit `dark:` variants. No named utility class (`bg-brand-*`) is used without a paired `dark:` sibling on the same element.
4. The alternating stripe is purely cosmetic and does not affect chord alignment, `white-space: pre` / `white-space: pre-wrap` behavior, or `chord-item` span styling.
5. The stripe applies to the rendered chord sheet in both the setlist viewer page and any standalone song viewer page that renders the same `ChordSheetClient` component (or its parent).
6. On a chord sheet with only one row, no alternating stripe is visible — the single row renders with the base (odd) background.
7. The alternating pattern resets per song section: the first row of each new song section always starts at the "odd" background, not continuing the count from the prior section. (Rationale: musical sections are visually bounded units; stripe continuity across section breaks is disorienting.)

### Section Nav Drawer — Mobile

8. On viewports narrower than `<must match codebase breakpoint convention — see context.md "Patterns to Follow">` (assumed `md: 768px` — pending reconciliation), the SectionNavDeck renders as a right-side overlay drawer.
9. The drawer is open by default on mobile page load. Open state is initialized with `useState(true)` (plain literal, not a lazy initializer reading `localStorage` or `window`) to remain SSR-safe and hydration-mismatch-free per BUG-001 and BUG-020.
10. The drawer state is not persisted across page loads or navigation — it always starts open.
11. The drawer floats over page content (position: fixed or absolute, does not push or reflow the song content beneath it).
12. The drawer is anchored to the right edge of the viewport on mobile.
13. A visible toggle button is present on mobile to open and close the drawer. The toggle button must remain visible (not hidden behind the drawer) in both open and closed states so the user can always dismiss or re-open the drawer.
14. The toggle button is positioned such that it does not overlap the song sticky selector (the element that previously caused the collision). Exact placement: `<must match codebase sticky selector position — see context.md "Patterns to Follow">` — pending reconciliation; the requirement is that these two controls occupy non-overlapping screen areas.
15. On viewports at or wider than the breakpoint in AC-8, SectionNavDeck is always visible (not a drawer, no toggle button shown), matching its current desktop behavior.
16. The drawer does not display a backdrop/scrim behind it. It is a plain right-side overlay without a dimming layer. (User confirmed overlay behavior; no scrim was requested.)
17. The drawer has no dedicated internal close button — the toggle button (AC-13) is the sole open/close control.

### Section Nav Drawer — Accessibility

18. The drawer element has `role="navigation"` and a descriptive `aria-label` (e.g., `aria-label="Section navigation"`).
19. The toggle button has an accessible label that reflects drawer state: `aria-label="Open section navigation"` when closed, `aria-label="Close section navigation"` when open, toggled via `aria-expanded` on the button.
20. On mobile, when the drawer opens, focus is NOT forcibly moved into the drawer (no focus trap). The drawer is a supplementary navigation overlay for a read-only viewer page, not a modal that blocks the primary task. A focus trap would prevent scrolling the chord sheet via keyboard.
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

---

## Fallback Behaviors

- If the SectionNavDeck receives no sections (empty array), the drawer renders but is empty, and the toggle button is hidden (no point opening an empty drawer).
- If ChordSheetClient receives no rows, no alternating stripe is rendered (zero rows = nothing to stripe).

---

## Resolved Ambiguities

- Alternating row BG exists at all → Resolved from user clarification: it does not exist; this task creates it from scratch.
- Dark mode vs. palette clash → Resolved from user clarification: the issue is absence, not dark mode. However, MEMORY.md BUG-004/BUG-005 mandates dark: variants be added alongside any new named brand utility, so both light and dark mode must be covered.
- Drawer mobile-only → Resolved from user clarification: drawer behavior is mobile-only; desktop is always-visible unchanged.
- Overlay vs. push → Resolved from user clarification: overlay (floats over content, does not reflow).
- Scrim/backdrop → Resolved from user clarification: no scrim requested.
- Close button vs. toggle → Resolved from user clarification: toggle button only (open by default, can be closed and re-opened).
- Drawer default state → Resolved from user clarification: open by default on mobile page load, no persistence.
- useState lazy initializer prohibition → Resolved from MEMORY.md BUG-001/BUG-020: use `useState(true)` plain literal for the always-open default (no localStorage read needed here, so this pattern is safe).
- CSS variable vs. named utility for row BG → Resolved from MEMORY.md BUG-021 and coding-guidelines.md: must use named Tailwind brand utilities (`bg-brand-cream`, `bg-brand-espresso`, etc.) with explicit `dark:` pairs, not `bg-[var(--brand-*)]`.
- Focus trap in drawer → Resolved by product context: the setlist viewer is a read-only performance tool; a focus trap on the section nav drawer would block keyboard use of the primary chord sheet. No focus trap is appropriate here.

---

## Open Questions

- **Pending Reconciliation** — What is the exact Tailwind CSS breakpoint the codebase uses to distinguish mobile from desktop in the setlist viewer and other responsive components? (suggested resolution source: `SectionNavDeck.tsx`, `SetlistViewerClient.tsx` — grep for `sm:`, `md:`, `lg:` class prefixes to confirm the convention)
- **Pending Reconciliation** — What are the exact named Tailwind brand utility classes the codebase currently uses for card/row backgrounds in the chord sheet and setlist viewer? Needed to select the correct alternating pair that fits the visual hierarchy without introducing a new color not used elsewhere. (suggested resolution source: `ChordSheetClient.tsx`, `SetlistSongSection.tsx` — grep for `bg-brand-`)
- **Pending Reconciliation** — What is the current z-index layering in the setlist viewer (sticky song selector, auto-scroll toolbar, any existing fixed-position elements)? Needed to assign the drawer's z-index above all of these without conflicting. (suggested resolution source: `SetlistViewerClient.tsx`, `SectionNavDeck.tsx` — grep for `z-` classes)
- **Pending Reconciliation** — Where is the song sticky selector positioned (top, bottom, left edge) on mobile? Needed to confirm the right-side drawer toggle button placement does not overlap it. (suggested resolution source: `SetlistViewerClient.tsx` — grep for `sticky`, `fixed`, `top-`, `bottom-`)
- **Pending Reconciliation** — Does the codebase use CSS transitions on any existing drawer/sidebar (e.g., the navbar sidebar from BUG-007)? If yes, the section nav drawer should use the same transition pattern for visual consistency. (suggested resolution source: `src/components/client/navbar.tsx` — grep for `transition`, `translate-x`, `duration-`)
