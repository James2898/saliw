# TASK-055 — P3 UI/UX Mobile Polish (Navigation Actions, Editor Tabs, Lineup Disclosure, Hero CTA)

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** In Progress
- **Branch:** feature/TASK-055-ui-ux-mobile-polish

---

## Feature Summary

Execute Phase P3 mobile user experience and layout polish across four key surfaces to elevate mobile ergonomics, touch accessibility, and viewport utilization:
1. **Mobile Navigation Drawer Footer Actions (`src/components/client/navbar.tsx`):** Replace the cramped horizontal row of icon-only buttons in the mobile navigation drawer footer with a full-width, vertically stacked list of clearly labeled action rows:
   - "Profile Settings" row (`UserRound` icon, links to `/profile`, dismisses drawer).
   - "Sign Out" row (`LogOut` icon, calls `openLogoutModal()`, dismisses drawer).
   - "Theme" toggle row (full-width touch target with explicit status label e.g., `"Theme: Dark"` / `"Theme: Light"`).
   - Enforce minimum 44px touch targets (`min-h-[44px]`), WCAG AA contrast, and explicit `dark:` brand pairings.
   - Hide user-specific action rows when unauthenticated while retaining the 44px theme toggle.
2. **Mobile Song Editor Tab Switcher (`NewSongFormClient.tsx` & `SongEditorClient.tsx`):** On screens `< 768px` (`< lg`), add a segmented mobile tab strip (`role="tablist"` with `Edit Sheet` and `Live Preview`), defaulting to `Edit Sheet`. Toggling displays only the active panel on mobile to avoid infinite scrolling over long chord sheets, while desktop (`lg:grid`) retains the simultaneous side-by-side grid. Ensure tab switching toggles CSS display visibility without unmounting the DOM, completely preserving form inputs and draft state. Maintain full parity across both new-song and edit-song flows.
3. **Mobile Setlist Builder Lineup Disclosure (`SetlistPeopleLocalSection.tsx` & `SetlistBuilderClient.tsx`):** Wrap the musician lineup assignment section in an expandable disclosure accordion on mobile (`< 768px`), defaulting to collapsed with an assigned count summary: `"Service Lineup: N assigned ▾"`. On desktop (`>= 768px`), keep the lineup section continuously visible and expanded. Refactor the musician add-row from `flex flex-wrap` with awkward `min-w-[160px]` to a clean responsive grid `grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end`.
4. **Public Landing Hero Primary CTA (`src/app/page.tsx`):** In the hero section on `/`, add a high-emphasis primary CTA button `"Browse Song Library →"` linking to `/library` and a secondary outline CTA button `"Explore Setlists"` linking to `/setlists`, with responsive full-width mobile stacking (`w-full sm:w-auto`, min 44px touch height).

---

## Acceptance Criteria

1. **AC-1 — Mobile Navigation Drawer Action List (`navbar.tsx`):**
   - In the mobile sidebar drawer (`navbar.tsx`), the footer below the user greeting replaces the cramped horizontal icon-only button row with a vertically stacked list of full-width action rows.
   - Profile action row: displays `UserRound` icon, text `"Profile Settings"`, navigates to `/profile`, and closes the drawer (`setIsMenuOpen(false)`).
   - Sign Out action row: displays `LogOut` icon, text `"Sign Out"`, invokes `openLogoutModal()`, and closes the drawer.
   - Theme toggle row: displays full-width touch target with explicit text indicating current mode or toggle action (e.g. `"Theme: Dark"` / `"Theme: Light"` or `"Switch to Light/Dark Mode"`).
   - All drawer action rows enforce a minimum touch target height of 44px (`min-h-[44px]`), standard WCAG AA contrast, and explicit `dark:` brand styling.
   - When no user is authenticated, user-specific rows (Profile, Sign Out) are hidden, while the Theme toggle retains its 44px touch height.

2. **AC-2 — Mobile Song Editor Tab Switcher (`NewSongFormClient.tsx` & `SongEditorClient.tsx`):**
   - On viewports `< 768px` / `< lg`, render a segmented mobile tab strip (`role="tablist"`) with two tabs: `Edit Sheet` and `Live Preview`.
   - The tab strip is hidden on desktop viewports (`lg:hidden`).
   - Default active tab on mobile is `Edit Sheet`.
   - On mobile, only the active panel is visible (`Edit Sheet` or `Live Preview`), preventing infinite vertical scrolling.
   - On desktop viewports (`lg:grid`), both the form editor and the live preview remain visible side-by-side simultaneously.
   - Switching tabs MUST NOT unmount form controls or chord sheet text areas (see AM-1); form values, dirty state, and cursor focus must persist across tab switches.
   - Implement identical behavior and layout across both `NewSongFormClient.tsx` and `SongEditorClient.tsx`.

3. **AC-3 — Mobile Setlist Builder Lineup Disclosure (`SetlistPeopleLocalSection.tsx`):**
   - On mobile viewports (`< 768px`), the musician lineup section is wrapped in an expandable disclosure accordion that defaults to collapsed.
   - The collapsed disclosure header displays a dynamic summary label: `"Service Lineup: {count} assigned ▾"`.
   - On desktop viewports (`>= 768px`), the lineup section remains unconditionally visible and expanded.
   - The musician addition row is refactored from `flex flex-wrap` to a responsive grid: `grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end`.

4. **AC-4 — Public Landing Hero Primary CTA (`page.tsx`):**
   - The public landing hero on `/` renders a high-emphasis primary button `"Browse Song Library →"` linking to `/library`.
   - Renders a secondary outline button `"Explore Setlists"` linking to `/setlists`.
   - Buttons stack vertically full-width on mobile (`w-full sm:w-auto`) and sit inline on larger screens, enforcing minimum 44px touch target heights.

5. **AC-5 — Touch Target & Accessibility Standards:**
   - All interactive mobile elements (drawer action rows, editor tab triggers, lineup disclosure header, hero CTA buttons) enforce `min-h-[44px]` for accessibility.
   - Tab switcher adheres to ARIA tablist patterns (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`).

6. **AC-6 — Type Safety & Clean Compilation:**
   - `npx tsc --noEmit` passes with 0 errors.
   - `npm run lint` and `npm run build` pass cleanly with zero diagnostics or build failures.

---

## Out of Scope

- Modifying core song saving, setlist creation, or transpose logic in `src/utils/musicLogic.ts`.
- Introducing external UI component libraries (e.g. Radix UI, Headless UI, Shadcn).
- Altering desktop navbar layout or desktop setlist editor structure.
- Modifying authentication state machines or Supabase backend RPCs.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/navbar.tsx` | Mobile drawer footer vertical action list (Profile, Sign Out, Theme Toggle) |
| `src/components/client/NewSongFormClient.tsx` | Mobile tab switcher for new song editor and live preview |
| `src/components/client/SongEditorClient.tsx` | Mobile tab switcher for existing song editor and live preview |
| `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` | Mobile lineup disclosure accordion & responsive musician add-row grid |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Parent container for setlist lineup and song builder sections |
| `src/app/page.tsx` | Public landing hero primary CTA ("Browse Song Library →") & secondary CTA |
| `src/components/client/button.tsx` | Design system button variants (`primary`, `outline`) for hero CTAs |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing code.
- Read `docs/tech-stack.md` before introducing any new dependency.
- Format all modified files with `npm run format` (Prettier) before finishing.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001 (useState lazy initializer):** Any state initialization from browser APIs, window matchMedia, or derived props must use `useState(() => initial)` lazy initializers, never `useEffect` + `setState`.
- **BUG-002 (useCallback dependencies):** In Client Components, dependencies in `useCallback` and `useMemo` must be primitives or whole objects, never object property chains.
- **BUG-005 (CSS Grid / Flex overflow):** In flex and grid containers (such as the musician add-row grid and mobile tab lists), include `min-w-0` on children to prevent container blowout on narrow mobile viewports (< 640px).
- **BUG-007 (React compiler forward reference):** In Client Components, declare all helper functions and event handlers before any hooks or `useEffect` blocks that reference them.
- **BUG-020 (SSR hydration safety):** Do not evaluate `window.innerWidth` during initial render. Use Tailwind CSS responsive classes (`hidden lg:block`, `sm:grid-cols-...`) to control layout across breakpoints without causing hydration mismatches.

---

## Amendments (from Context Bundle)

- **AM-1 (Tab Switcher DOM State Preservation):** In `NewSongFormClient.tsx` and `SongEditorClient.tsx`, toggling between `Edit Sheet` and `Live Preview` on mobile MUST use CSS display toggling (`className={activeTab === 'edit' ? "block" : "hidden lg:block"}`) rather than conditional JSX mounting (`{activeTab === 'edit' && <Editor />}`). Conditional unmounting would destroy textarea cursor position, scroll offset, and uncommitted form draft state.
- **AM-2 (Mobile Lineup Disclosure Desktop Invariance):** The mobile lineup disclosure in `SetlistPeopleLocalSection.tsx` must ensure the disclosure wrapper expands unconditionally on desktop (`md:block` / `md:open`) regardless of whether the mobile accordion was left collapsed.

---

## Resolution

- **Completed:** 2026-10-17
- **Branch:** feature/TASK-055-ui-ux-mobile-polish
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/navbar.tsx` — Replace cramped horizontal mobile drawer buttons with full-width stacked action rows (Profile, Sign Out, Theme Toggle) with min 44px touch targets.
  - `src/components/client/NewSongFormClient.tsx` — Add responsive mobile tab switcher (`Edit Sheet` / `Live Preview`) with CSS display toggling to preserve form draft state and DOM.
  - `src/components/client/SongEditorClient.tsx` — Update mobile tab labels and styling to match NewSongFormClient with min 44px touch targets.
  - `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` — Wrap mobile lineup in expandable disclosure accordion defaulting to collapsed (`md:block` on desktop) and refactor add-row to responsive grid.
  - `src/components/dashboard/PublicDashboardView.tsx` — Add primary "Browse Song Library →" and secondary "Explore Setlists" CTA buttons with responsive stacking and min 44px height.
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` & `src/app/setlists/new/page.tsx` — Make public visibility switch default toggled ON (`true`) during setlist creation with safe fallback in `createSetlist`.
- **Diff Summary:**
  - `src/components/client/navbar.tsx` L441–517 — replace horizontal drawer footer with stacked vertical list of 44px action rows (AC-1, AC-5)
  - `src/components/client/NewSongFormClient.tsx` L42, L200–265 — add `activeTab` state, `role="tablist"` mobile switcher, and CSS display toggling (AC-2, AC-5, AM-1)
  - `src/components/client/SongEditorClient.tsx` L217–221, L430–508 — update tab labels to "Edit Sheet" / "Live Preview", ensure 44px touch targets and CSS visibility toggling (AC-2, AC-5, AM-1)
  - `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` L65, L150–240 — mobile disclosure accordion defaulting to collapsed (`md:block`), responsive grid `grid-cols-1 sm:grid-cols-[1fr_1fr_auto]` (AC-3, AC-5, AM-2, BUG-005)
  - `src/components/dashboard/PublicDashboardView.tsx` L1–2, L65–85 — add primary and secondary CTA buttons in public landing hero with mobile vertical stacking (AC-4, AC-5)
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` L88, `src/app/setlists/new/page.tsx` L99, `src/app/actions/setlistActions.ts` L96 — set default public visibility to toggled ON (`true`) on setlist creation
- **Notes:** All touch targets enforce >=44px height. State is preserved across tab switches without DOM unmounting. All accessibility ARIA attributes properly implemented. Setlist creation defaults to public.
