# Spec — Pagination Items-Per-Page Selector (Setlists + Library)

## Feature Summary

Add an "items per page" selector control to both the Setlists list view and the Song Library list view. The control lets users choose how many rows are displayed per page (10, 25, 50, 100), defaulting to 10. When the selection changes, the current page resets to 1 and the list re-renders immediately with the new item count. The control must follow the Artisan design system (Cream/Tan/Brown/Espresso palette with explicit dark-mode variants), be keyboard navigable, and be labeled accessibly.

## Acceptance Criteria

1. A labeled "Items per page" selector (native `<select>` or equivalent) appears in the toolbar/header area of both the Setlists list view and the Song Library list view.
2. The selector presents exactly four options: 10 (default, pre-selected on first load), 25, 50, 100.
3. On first render with no persisted preference, the selector defaults to 10 and the list displays at most 10 items.
4. When the user changes the selector value, the displayed page resets to page 1 and the list re-renders to show the first N items matching the new page size.
5. If the total number of items is less than or equal to the selected page size, the single page is shown with all available items and no empty trailing pages are rendered (pagination controls, if any, do not expose unreachable pages).
6. If the total number of items is 0 (empty state), the selector is still rendered and functional; the list shows its existing empty-state UI unchanged.
7. The selector is implemented as a Client Component (`'use client'`) because it manages interactive state; the surrounding data-fetching shell remains a Server Component.
8. The selector control carries an accessible label: either an explicit `<label>` element associated via `htmlFor`/`id`, or an `aria-label` attribute with the value "Items per page".
9. The selector is keyboard navigable: it must be reachable and operable via Tab, arrow keys, and Enter/Space without mouse interaction.
10. In light mode, the selector uses Artisan palette classes consistent with the page's existing form/control styling: background `--brand-cream`, border `--brand-tan`, text `--brand-espresso`. (Exact Tailwind class strings must match codebase convention — see context.md "Patterns to Follow".)
11. In dark mode, the selector must carry explicit `dark:` Tailwind variants (per BUG-004 and BUG-005 prevention notes): `dark:bg-brand-espresso`, `dark:text-brand-cream`, `dark:border-brand-brown` (or equivalent codebase convention — see context.md). It must NOT rely on a CSS-variable-only switch without explicit `dark:` pairing.
12. The selector on the Setlists page and the selector on the Library page are independent — changing one does not affect the other.
13. Persistence behavior: <OPEN QUESTION — see research.md; resolution required before implementation begins>
14. The feature introduces no new Supabase queries; pagination is applied client-side or via URL/state filtering against already-fetched data, OR via a server-side `LIMIT`/`OFFSET` query change — whichever matches the current data-loading pattern for each page (to be confirmed by @codebase-explorer context bundle).
15. No RLS policies are changed. No new Server Actions are required unless the data fetching is currently unbounded and needs a `LIMIT`/`OFFSET` parameter added to an existing query.
16. The implementation passes `npm run format` (Prettier v3) before commit, per workflow rules.

## Out of Scope

- Infinite scroll or virtual scrolling (not requested).
- Per-user server-side preference storage in the `profiles` or any other Supabase table (not requested; if persistence is desired it is constrained to client-side storage).
- Changing the pagination design of the Setlist detail view (`/setlists/[id]`) — only the list views are in scope.
- Adding a search or filter feature alongside the selector (separate concern).
- Changing the default page size from 10 (the user specified 10 as default).
- Any change to the Song Library's song detail / chord sheet view.
- Any change to mobile layout beyond making the selector responsive alongside existing controls.

## Fallback Behaviors

- If the data-fetching mechanism cannot support a `LIMIT`/`OFFSET` parameter (e.g., currently fetches all rows and renders server-side), all items must still be fetched; the page-size selector trims the rendered list client-side. This is acceptable for typical setlist/library sizes but must be noted as a known constraint for very large libraries (>500 songs).
- There is no external API for this feature; the selector is pure frontend state. No disabled-control fallback is needed.

## Resolved Ambiguities

- "Items per page" options: 10 (default), 25, 50, 100 — confirmed in PM handoff, no ambiguity.
- Dark mode requirement: resolved from BUG-004, BUG-005 prevention notes in MEMORY.md — every named Artisan utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must have an explicit `dark:` pair.
- Client Component boundary: resolved from coding-guidelines.md — selector manages interactive state, therefore `'use client'`; data fetching stays in Server Component.
- useEffect + setState for localStorage initialization: resolved from BUG-001 prevention note — if localStorage persistence is chosen, must use a `useState` lazy initializer, never `useEffect` + `setState`.
- React Compiler useCallback dep arrays: if the page-size value is passed as a prop through callbacks, resolved from BUG-002 — never use object property paths as dep array entries; depend on the whole object or a destructured primitive.
- Exact Tailwind class strings for selector styling: cannot determine without reading source files. Left as Pending Reconciliation placeholder per code-string discipline (see AC-10, AC-11).
