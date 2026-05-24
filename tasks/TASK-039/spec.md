# Spec — Alphabet Filter Bar (Song Library + Setlist List)

## Feature Summary

Add a horizontal A–Z alphabet filter bar to two existing pages: the Song Library and the Setlist List. Clicking a letter filters the visible results to only items whose title begins with that letter. An "All" button resets the filter. The bar must coexist with each page's existing search input and pagination controls without replacing either. Filtering is performed server-side via a new Supabase query parameter, consistent with the project's Server Component data-fetching architecture. The bar follows the Artisan palette (Cream/Tan/Brown/Espresso) with explicit dark-mode variants on every named utility class.

## Acceptance Criteria

### Shared (applies to both Song Library and Setlist List pages)

1. An alphabet filter bar renders above the results list on both the Song Library page and the Setlist List page. The bar displays 27 clickable items: "All" followed by the letters A through Z in order.
2. Clicking a letter filters results to only items whose title starts with that letter (case-insensitive). The filter is applied via a server-side Supabase query (`.ilike('title', 'X%')` or equivalent), not by hiding already-loaded DOM elements.
3. Clicking "All" removes the letter filter and returns to the full unfiltered result set (subject to any active search term).
4. The currently active letter (or "All") is visually distinguished from inactive letters. The active state must use a background or border drawn from the Artisan palette — exact token values to be confirmed against context.md "Patterns to Follow".
5. Clicking an already-active letter deselects it, resetting the filter to "All".
6. When a letter is selected, the page number resets to 1 regardless of the previously active page.
7. The letter filter and the existing search input apply simultaneously with AND logic: results must satisfy both the active letter prefix AND the search term at the same time. Neither filter overrides the other.
8. When a letter filter is active and a search term is entered (or vice versa), both filters are preserved and applied together on the next server fetch.
9. If no results match the active letter (and/or search term), an empty-state message is displayed in place of the results list. The message must be descriptive (e.g., "No songs starting with 'Q'" or "No setlists starting with 'Q'"). The alphabet bar and search input remain visible so the user can change the filter.
10. The letter filter state is stored as a URL search parameter (`letter=A`) so that the filtered URL is bookmarkable and the browser back/forward buttons restore the correct filter state. **This criterion is contingent on user confirmation — see Open Questions OQ-1.**
11. Each letter button and "All" uses Artisan palette styling. Every named Tailwind utility class (`text-brand-*`, `bg-brand-*`, `border-brand-*`) on the bar must have an explicit `dark:` variant pairing per BUG-005 / BUG-004 prevention rules.
12. No `useEffect` + `setState` pattern is used to read or initialize the letter filter from a URL param or storage mechanism. If a lazy `useState` initializer is used, it must be SSR-safe (return a default value when `window` is undefined).
13. No `useCallback` dependency array references an object property path (e.g. `[router.push]` is acceptable; `[obj.method]` is not), per BUG-002 prevention.

### Song Library page

14. The letter filter on the Song Library page filters on the song's `title` field only. Artist name is not considered for the prefix match.
15. The Song Library alphabet bar and its filter logic are implemented as a reusable component (e.g., `AlphabetFilter`) that is also used on the Setlist List page, rather than duplicated.

### Setlist List page

16. The letter filter on the Setlist List page filters on the setlist's `title` (or equivalent name column — exact column name to be confirmed against context.md). Only the first letter of the setlist title is used for matching.

### Mobile layout

17. **Mobile layout behavior is contingent on user confirmation — see Open Questions OQ-2.** Until resolved, no mobile-specific layout style should be committed. A placeholder comment should be left in the component noting the pending decision.

## Out of Scope

- Adding the alphabet filter to any page other than the Song Library and the Setlist List.
- Filtering by artist name in the Song Library.
- Filtering setlists by any field other than the setlist title.
- Animated transitions between filtered states.
- Counting how many results exist per letter (badge counts on each letter button).
- Any changes to Supabase RLS policies — the filter is a query-level change only, no permission model changes.
- Any changes to existing search input UI or pagination component UI.

## Fallback Behaviors

- If the Supabase query for a filtered result set fails (network or DB error), the page should display the same error state that already exists on the page for a failed initial load. The alphabet bar remains visible.
- There are no new API endpoints introduced by this feature; all data fetching goes through existing Server Actions or Server Component fetch patterns. No new "MISSING endpoint" fallback is required.

## Resolved Ambiguities

- **"Clicking the same letter again should reset the filter"** → The user's feature request explicitly states this. Clicking an active letter deselects it back to "All". Source: feature request verbatim.
- **"An 'All' option should reset the filter"** → The user's feature request explicitly calls for an "All" option. Resolved from feature request text.
- **Filtering scope (title only vs title + artist)** → The request says "first letter of the setlist/song" — implies title only. Resolved from feature request intent.
- **Pagination reset on letter select** → Reset to page 1 on any filter change is a universal UX convention and prevents stale page states (e.g., page 5 of 2 results). Resolved by convention; no user input needed.
- **Empty state** → Show a descriptive contextual message per coding-guidelines.md: "User-facing messages must be helpful." The bar and search remain visible. Resolved from guidelines.
- **Server-side vs client-side filtering** → coding-guidelines.md states "Server Components (Default): Use for all data fetching." Client-side filtering of an already-loaded page would show only the current page's worth of results, not the full dataset — incorrect behavior. Server-side filtering is required. Resolved from guidelines.
- **Dark mode on alphabet bar** → BUG-005 and BUG-004 in MEMORY.md: every `text-brand-*`, `bg-brand-*`, `border-brand-*` utility must have an explicit `dark:` pair. Resolved from MEMORY.md.
- **No `useEffect` + `setState` for state initialization** → BUG-001 in MEMORY.md. Resolved from MEMORY.md.

## Open Questions

- **OQ-1 (Blocking)** — Should the letter filter state be stored in the URL as a search parameter (`?letter=A`) for shareability and back-button support, or kept in React local state (client-side only, lost on navigation)? (User input required because this is a product decision — URL params require the component to be a Client Component reading `useSearchParams` or the page to use `searchParams` prop, while local state is simpler but loses filter on refresh/navigation.)

- **OQ-2 (Blocking)** — On mobile screens, should the A–Z bar scroll horizontally (single row, horizontally scrollable) or wrap to multiple rows? (User input required because both are valid product directions with different UX tradeoffs; neither MEMORY.md nor coding-guidelines.md addresses this.)

- **OQ-3 (Pending Reconciliation)** — What is the exact Supabase column name for the setlist title on the Setlist List page? The spec assumes a `title` column on the `setlists` table, but the actual column name must be confirmed. (Suggested resolution source: context.md, `setlists` table schema or `src/app/setlists/page.tsx`.)

- **OQ-4 (Pending Reconciliation)** — What are the exact Tailwind class tokens used for active/inactive interactive elements (buttons, tabs) elsewhere in the codebase, so the active letter state matches existing Artisan UI conventions? (Suggested resolution source: context.md "Patterns to Follow", existing button/tab components in `src/components/`.)

- **OQ-5 (Pending Reconciliation)** — Do the Song Library page and Setlist List page currently use a shared Server Action for their list queries, or does each page fetch data inline in the Server Component? This determines where the `letter` filter parameter must be threaded. (Suggested resolution source: context.md, `src/app/actions/songActions.ts`, `src/app/setlists/page.tsx`.)
