# TASK-037 — Add "Items Per Page" Pagination Selector to Setlists & Library

- **Tier:** 1
- **Date Created:** 2026-05-18
- **Status:** Complete

---

## Feature Summary

Add an "items per page" selector control to both the Setlists list view (`/setlists`) and the Song Library list view (`/library`). The control presents four options (10, 25, 50, 100 items per page), defaults to 10, and persists the user's choice via the `?pageSize=N` URL query parameter. When the user changes the page size, the current page resets to 1 and the list re-renders immediately with the new item count. The control follows the Artisan design system (Cream/Tan/Brown/Espresso palette with explicit dark-mode Tailwind variants), is keyboard navigable, and is labeled accessibly for screen readers.

---

## Acceptance Criteria

1. A labeled "Items per page" selector (native `<select>` or equivalent) appears in the toolbar/header area of both the Setlists list view and the Song Library list view.
2. The selector presents exactly four options: 10 (default, pre-selected on first load), 25, 50, 100.
3. On first render with no `?pageSize` param, the selector defaults to 10 and the list displays at most 10 items.
4. When the user changes the selector value, the displayed page resets to page 1 and the list re-renders to show the first N items matching the new page size.
5. If the total number of items is less than or equal to the selected page size, the single page is shown with all available items and no empty trailing pages are rendered (pagination controls, if any, do not expose unreachable pages).
6. If the total number of items is 0 (empty state), the selector is still rendered and functional; the list shows its existing empty-state UI unchanged.
7. The selector is implemented as a Client Component (`'use client'`) because it manages interactive state; the surrounding data-fetching shell remains a Server Component.
8. The selector control carries an accessible label: either an explicit `<label>` element associated via `htmlFor`/`id`, or an `aria-label` attribute with the value "Items per page".
9. The selector is keyboard navigable: it must be reachable and operable via Tab, arrow keys, and Enter/Space without mouse interaction.
10. In light mode, the selector uses the Artisan palette as defined in `selectClass` constant: `bg-brand-cream`, `border-brand-brown/20`, `text-brand-espresso`, matching the page's existing form/control styling.
11. In dark mode, the selector carries explicit `dark:` Tailwind variants (`dark:bg-brand-espresso`, `dark:text-brand-cream`) — it must NOT rely on CSS-variable-only switches without explicit `dark:` class pairing (BUG-004/BUG-005 prevention).
12. The selector on the Setlists page and the selector on the Library page are independent — changing one does not affect the other.
13. Persistence: `?pageSize=N` URL query parameter (SSR-safe, consistent with existing `?page=` pattern; confirmed by user).
14. The feature introduces no new Supabase queries; pagination is applied via existing `LIMIT`/`OFFSET` queries with the `pageSize` variable added as a parameter.
15. No RLS policies are changed. No new Server Actions are required.
16. `npm run format` (Prettier v3) runs before every commit.

---

## Out of Scope

- Infinite scroll or virtual scrolling.
- Per-user server-side preference storage in the `profiles` or any other Supabase table.
- Changing the pagination design of the Setlist detail view (`/setlists/[id]`).
- Adding a search or filter feature alongside the selector.
- Changing the default page size from 10.
- Any change to the Song Library's song detail / chord sheet view.
- Any change to mobile layout beyond making the selector responsive alongside existing controls.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/page.tsx` | Server Component hosting the Setlists list view; currently has static `PAGE_SIZE = 10` at line 16; must replace with URL-parsed-and-validated `pageSize` |
| `src/app/library/page.tsx` | Server Component hosting the Library list view; currently has static `PAGE_SIZE = 10` at line 14; must replace with URL-parsed-and-validated `pageSize` |
| `src/components/client/PaginationControls.tsx` | Existing pagination component accepting `pageSize` prop; must be extended to include the items-per-page `<select>` and update `buildUrl` helper to carry `pageSize` through all navigation button clicks |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Source of the canonical `selectClass` constant (line 25) defining Artisan-correct select styling with dark-mode variants; value provided in Implementation Notes below |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-037/spec.md` | Full acceptance criteria, fallback behaviors, and resolved ambiguities |
| Context Bundle | `tasks/TASK-037/context.md` | Reusable components, patterns to follow, anti-patterns flagged |
| Research Notes | `tasks/TASK-037/research.md` | Open questions (persistence approach resolved by user confirmation) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### Key Implementation Patterns

1. **URL-param parsing in Server Components:**
   - Both `src/app/setlists/page.tsx` and `src/app/library/page.tsx` must read `searchParams.pageSize` (as a string) and validate it against the allowed set `[10, 25, 50, 100]`.
   - Fallback to `10` if invalid or missing.
   - Replace the static `const PAGE_SIZE = 10` with the parsed value — do not leave the constant, as it will shadow the parsed variable silently.
   - Update the `searchParams` TypeScript interface to include `pageSize?: string`.

2. **Supabase query modification:**
   - Both pages already use `.range(offset, offset + PAGE_SIZE - 1)` with computed `offset = (requestedPage - 1) * PAGE_SIZE`.
   - Change `PAGE_SIZE` references to the parsed `pageSize` variable.

3. **PaginationControls.tsx extension:**
   - The component already receives a `pageSize` prop.
   - Add a `<select>` element inside the `<nav>` tag that displays the current page size and allows the user to choose from `[10, 25, 50, 100]`.
   - The select's `onChange` handler must call `router.replace()` with both `?pageSize=<newValue>&page=1` (reset to page 1).
   - Extend the `buildUrl` helper function (currently at line 20) to accept a `pageSize` parameter and include `params.set("pageSize", String(pageSize))` so all four nav buttons (prev, next, page number buttons) carry the currently-selected page size in their URLs.

4. **Styling the selector:**
   - Use the `selectClass` constant from `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` line 25:
     ```
     "text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso"
     ```
   - Apply this class string directly to the new `<select>` element (or copy it inline if extracting to a named constant in PaginationControls.tsx is preferred, but reuse is preferred).
   - **Dark-mode verification:** The string already includes explicit `dark:bg-brand-espresso` and `dark:text-brand-cream` pairs — no additional dark: variants needed. Verify no named Artisan utilities are used without `dark:` pairs (BUG-004/BUG-005 prevention).

5. **Accessibility:**
   - The `<select>` element must have an associated `<label htmlFor="pageSize">Items per page</label>` with `id="pageSize"` on the select, OR use `aria-label="Items per page"` directly on the select.
   - Native `<select>` elements are keyboard-navigable by default (Tab to reach, arrow keys to change, Enter/Space to select).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001 (Prevention):** Never initialize React state from `localStorage`/`sessionStorage` via `useEffect` + `setState`. If the items-per-page control ever needs a persisted preference, use a `useState` lazy initializer. For this task, URL params are the source of truth — no localStorage involvement.

- **BUG-002 (Prevention):** The React Compiler rejects `useCallback` dep arrays that reference object property paths (e.g., `[router.replace]`). The new `onChange` handler in PaginationControls.tsx should be a plain inline arrow (no `useCallback`) or depend on the whole `router` object.

- **BUG-004/BUG-005 (Prevention):** Every `text-brand-*`, `bg-brand-*`, and `border-brand-*` named Tailwind utility must have an explicit `dark:` pair. The new `<select>` element must use the provided `selectClass` string — it already has the correct dark variants. Verify no named Artisan utilities in the new code lack `dark:` pairs.

- **BUG-007 (Prevention):** Declare any helper functions (`buildUrl`, handler functions) before the hook (`useRouter`, any `useCallback`) that references them inside PaginationControls.tsx. The React Compiler rejects forward references.

---

## Contradictions Checked

The Explorer's context and the Requirements Engineer's spec were scanned for conflicting literal values and structural choices:

- **AC-1, AC-2, AC-3:** Default page size 10, options [10, 25, 50, 100]. ✅ No conflict — explorer confirms current `PAGE_SIZE = 10` constant.
- **AC-4:** `router.replace` on page size change, reset `?page=1`. ✅ No conflict — explorer's Patterns to Follow section confirms `router.replace` (not push) and no-history-pollution pattern.
- **AC-7:** Selector as Client Component, data-fetching shell as Server Component. ✅ No conflict — consistent with Next.js App Router architecture and project guidelines.
- **AC-10, AC-11:** Light/dark mode selector styling using `selectClass` from `SetlistPeopleSection.tsx`. ✅ No conflict — explorer provides the exact canonical string with `dark:` variants already baked in.
- **AC-13:** Persistence via `?pageSize=N` URL query param. ✅ No conflict — user confirmed in handoff; explorer's context supports URL-param pattern via `router.replace` and `useSearchParams` or `searchParams` prop.

---

## Resolved Open Questions

- **Persistence across navigation/refresh** → URL query param (`?pageSize=N`), confirmed by user in handoff. This is SSR-safe, shareable/bookmarkable, and avoids the hydration-flash risk of localStorage (source: research.md → Blocking Open Question, handoff — Last Decision).

---

## Resolution

- **Completed:** 2026-05-19
- **Branch:** fix/setlist-card-visible-border
- **Files changed:**
  - `src/app/setlists/page.tsx` — replaced static `PAGE_SIZE = 10` with `ALLOWED_PAGE_SIZES` constant + URL-parsed `pageSize` variable; added `pageSize?: string` to searchParams interface; updated all Supabase `.range()` and `totalPages` computations; passes `pageSize` to `PaginationControls`
  - `src/app/library/page.tsx` — identical changes as setlists page
  - `src/components/client/PaginationControls.tsx` — was already updated prior to this session with `selectClass`, `PAGE_SIZE_OPTIONS`, the items-per-page `<select>` element, accessible `<label htmlFor>`, and `buildUrl` helper threading `pageSize` through all nav buttons
- **Notes:**
  - `PaginationControls.tsx` was already fully implemented before this dev session ran; only the two Server Component page files needed updating.
  - `pageSize` URL param is validated server-side against `[10, 25, 50, 100]`; any invalid or absent value defaults to 10.
  - TypeScript check (`tsc --noEmit`) passed with no errors. Prettier (`npm run format`) ran and formatted both page files.
