# Spec — Navbar Full-Width Header Expansion (PR 1)

## Feature Summary
Expand the interior container of the main application navbar to span the full width of the screen (`w-full px-4 sm:px-8`) instead of the centered max-width container (`max-w-5xl mx-auto`). On viewports from medium (`md`) up to ultra-wide (`2560px+`), brand navigation items anchor to the left and utility controls anchor to the right separated by a flexible spacer, while mobile layouts retain flush right-aligned drawer toggles. All page body containers remain centered, and Phase 2 changelog links are strictly excluded from this task.

## Acceptance Criteria
1. The interior container element of `<nav>` in `src/components/client/navbar.tsx` replaces the constrained width classes `max-w-5xl mx-auto` with `w-full`, while retaining `px-4 sm:px-8` horizontal padding and standard flex layout classes.
2. Across all desktop viewports (`md` breakpoint up to ultra-wide `2560px+`), the navigation header stretches edge-to-edge across the viewport without introducing horizontal scrolling or layout overflow.
3. On desktop viewports (`>= md`), the brand logo and navigation links (`Dashboard`, `Library`, `Setlists`, and conditional `Musicians`) remain anchored to the left padding edge, and utility controls (Theme toggle, greeting, user profile menu, login/logout) remain anchored to the right padding edge separated by a flexible spacer (`flex-1`).
4. Existing navigation links retain standard link spacing (`gap-1 ml-4`), hover feedback, focus ring indicators, and active route highlight styles.
5. On mobile viewports (`< md`), the mobile hamburger trigger button remains flush to the right padding edge and triggers the `#mobile-sidebar` drawer without visual clipping or alignment regression.
6. Page body content containers across all pages (including `src/app/page.tsx` at `max-w-5xl`, `src/app/library/page.tsx` and `src/app/setlists/page.tsx` at `max-w-3xl`) remain unaffected and retain their existing centered max-width layouts.
7. No Changelog link, changelog icon, or changelog badge is added to the desktop navbar or mobile drawer in this PR (strictly deferred to Phase 2 / PR 2).
8. Existing automated unit tests pass without regression (`npm run test:unit`).

## Out of Scope
- Creation of `/changelog` route, changelog page component, or changelog data sources.
- Adding Changelog navigation items or notification badges to either the desktop navbar or mobile drawer.
- Modifying page-level body containers, main layout wrappers, or page contents outside `src/components/client/navbar.tsx`.
- Modifying any backend endpoints, database schemas, or server actions.

## Fallback Behaviors
- None required: This task is purely a CSS/layout refactor within `Navbar`. No new backend endpoints or APIs are introduced. Existing auth session, role checks, and theme toggles continue to use their current hook fallbacks.

## Resolved Ambiguities
- Header width vs. page body width constraint -> The header expands edge-to-edge (`w-full px-4 sm:px-8`), while page body containers remain centered at their respective max-widths (`max-w-5xl` or `max-w-3xl`) (source: PBI-20261031 Phase 1 spec).
- Phase separation of Changelog navigation item -> PR 1 strictly omits the Changelog navigation link to avoid broken links/404s before PR 2 introduces the route (source: PM decision & PBI-20261031 Phase 1 spec).
- Layout anchoring on ultra-wide displays -> The brand and nav links anchor left, right-hand controls anchor right via a `flex-1` spacer between them with `px-4 sm:px-8` edge padding (source: PBI-20261031 Phase 1 spec).
