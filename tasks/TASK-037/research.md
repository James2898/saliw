# Research — Pagination Items-Per-Page Selector (Setlists + Library)

## Open Questions

### Blocking

- **Persistence across navigation/refresh:** Should the selected items-per-page value persist across page navigations and browser refresh?

  The three viable options are:
  - (A) **Session only** — state lives in React component state; resets to 10 on every page load. Simplest, no storage side-effects.
  - (B) **localStorage** — value survives refresh and future sessions. Requires BUG-001 mitigation (lazy `useState` initializer, not `useEffect` + `setState`). Introduces a brief flash-of-default-value risk on SSR hydration; must be handled with a hydration guard.
  - (C) **URL query param** (e.g., `?pageSize=25`) — survives refresh, is shareable/bookmarkable, and is SSR-safe (no hydration flash). More complex to wire in Next.js App Router (`useSearchParams` in a Client Component, `searchParams` prop in a Server Component).

  **User input required because:** this is a product decision that affects user experience, shareable links, and implementation complexity. None of the three options is clearly implied by the raw request. The spec cannot proceed with AC-13 unresolved.

### Pending Reconciliation

- **Current data-loading pattern for Setlists page:** Does `src/app/setlists/page.tsx` (or equivalent) fetch all setlist rows in one query, or does it already use `LIMIT`/`OFFSET`? (suggested resolution source: context.md — query pattern in setlists page file)
- **Current data-loading pattern for Library page:** Does `src/app/library/page.tsx` (or equivalent) fetch all song rows in one query, or does it already paginate server-side? (suggested resolution source: context.md — query pattern in library page file)
- **Existing toolbar/header layout:** Where in the Setlists and Library page layouts is the logical placement for the selector (top-right of list header, bottom of list, etc.)? (suggested resolution source: context.md — component structure of both pages)
- **Existing select/dropdown styling class pattern:** What Tailwind classes are used for other `<select>` or dropdown form controls in the codebase? (suggested resolution source: context.md "Patterns to Follow" — grep for `<select` in components)
- **Existing pagination controls:** Do either the Setlists or Library pages already have any pagination (page number navigation)? If yes, the items-per-page selector must integrate with the existing pagination component rather than introduce a parallel mechanism. (suggested resolution source: context.md — component tree for both pages)
