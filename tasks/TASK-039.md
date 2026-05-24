# TASK-039 — Alphabet Filter Bar (Song Library + Setlist List)

- **Tier:** 1
- **Date Created:** 2026-05-24
- **Status:** In Progress

---

## Feature Summary

Add a horizontal A–Z alphabet filter bar to two existing pages: the Song Library (`src/app/library/page.tsx`) and the Setlist List (`src/app/setlists/page.tsx`). Clicking a letter filters the visible results to only items whose name/title begins with that letter. An "All" button resets the filter. The bar coexists with each page's existing search input and pagination controls. Filtering is performed server-side via a new Supabase query parameter (`?letter=A`), consistent with the project's Server Component data-fetching architecture. The bar follows the Artisan palette (Cream/Tan/Brown/Espresso) with explicit dark-mode variants on every named utility class.

---

## Acceptance Criteria

1. An alphabet filter bar renders above the results list on both the Song Library page and the Setlist List page. The bar displays 27 clickable items: "All" followed by the letters A through Z in order.
2. Clicking a letter filters results to only items whose title/name starts with that letter (case-insensitive). The filter is applied via a server-side Supabase query (`.ilike('title', 'X%')` on songs; `.ilike('name', 'X%')` on setlists), not by hiding already-loaded DOM elements.
3. Clicking "All" removes the letter filter and returns to the full unfiltered result set (subject to any active search term).
4. The currently active letter (or "All") is visually distinguished from inactive letters using `variant="primary"` from the Button component (background Tan, text Espresso). Inactive letters use `variant="ghost"` (transparent background, Brown text and border).
5. Clicking an already-active letter deselects it, resetting the filter to "All".
6. When a letter is selected, the page number resets to 1 regardless of the previously active page.
7. The letter filter and the existing search input apply simultaneously with AND logic: results must satisfy both the active letter prefix AND the search term at the same time. Neither filter overrides the other.
8. When a letter filter is active and a search term is entered (or vice versa), both filters are preserved and applied together on the next server fetch.
9. If no results match the active letter (and/or search term), an empty-state message is displayed in place of the results list. The message must be descriptive (e.g., "No songs starting with 'Q'" or "No setlists starting with 'Q'"). The alphabet bar and search input remain visible so the user can change the filter.
10. The letter filter state is stored as a URL search parameter (`?letter=A`) so that the filtered URL is bookmarkable and the browser back/forward buttons restore the correct filter state.
11. Each letter button and "All" uses Artisan palette styling. Every named Tailwind utility class (`text-brand-*`, `bg-brand-*`, `border-brand-*`) on the bar must have an explicit `dark:` variant pairing per BUG-004/BUG-005 prevention rules.
12. No `useEffect` + `setState` pattern is used to read or initialize the letter filter from a URL param or storage mechanism. If a lazy `useState` initializer is used, it must be SSR-safe.
13. No `useCallback` dependency array references an object property path (e.g., `[router]` is acceptable; `[router.replace]` is not), per BUG-002 prevention.
14. The letter filter on the Song Library page filters on the song's `title` field only. Artist name is not considered for the prefix match.
15. The Song Library alphabet bar and its filter logic are implemented as a reusable component (e.g., `AlphabetFilter`) that is also used on the Setlist List page, rather than duplicated.
16. The letter filter on the Setlist List page filters on the setlist's `name` column (confirmed from `src/app/setlists/page.tsx`).
17. **Mobile layout behavior:** Letters wrap to multiple rows on mobile screens (do NOT use horizontal scroll / overflow-x).
18. `PaginationControls.buildUrl` and `PageSizeSelect.buildUrl` are updated to thread the `letter` param so navigation never silently drops the active filter.
19. `SearchBar` navigation must NOT silently drop the `letter` param — must preserve all live params (`pageSize`, `page`, `letter`) when navigating by building a full `URLSearchParams` object (not a bare template string).
20. Run `npm run format` before committing (Prettier required per coding guidelines and MEMORY.md).

---

## Out of Scope

- Adding the alphabet filter to any page other than the Song Library and the Setlist List.
- Filtering by artist name in the Song Library.
- Filtering setlists by any field other than the setlist name.
- Animated transitions between filtered states.
- Counting how many results exist per letter (badge counts on each letter button).
- Any changes to Supabase RLS policies — the filter is a query-level change only.
- Any changes to existing search input UI or pagination component UI.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/library/page.tsx` | Song Library Server Component — owns `searchParams`, inline Supabase query with `.or(title.ilike / artist.ilike)`, pagination derivation; needs `letter` param threading |
| `src/app/setlists/page.tsx` | Setlist List Server Component — owns `searchParams`, inline Supabase query with `.ilike("name", ...)`, pagination derivation; needs `letter` param threading |
| `src/components/client/SearchBar.tsx` | Existing search input — `router.replace` with `?q=` URL param, 300ms debounce; needs to preserve other params (letter, pageSize) via URLSearchParams |
| `src/components/client/PaginationControls.tsx` | Existing pagination — `buildUrl` assembles URLSearchParams from `q`, `pageSize`, `page`; must be extended to thread `letter` |
| `src/components/client/PageSizeSelect.tsx` | Existing page-size selector — `buildUrl` assembles from `q`, `pageSize`; must also thread `letter` |
| `src/components/client/button.tsx` | Shared Button — `variant="ghost"` (inactive) / `variant="primary"` (active); use for letter chips |
| `src/styles/globals.css` | CSS variable definitions: `--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`; Tailwind v4 `--color-brand-*` tokens |
| `MEMORY.md` | Known bug patterns — BUG-001 through BUG-017 |

---

## Technical Schema

N/A — no API contract required for this task. All data fetching uses existing Supabase queries inline in Server Components; no new endpoints or Server Actions.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-039/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-039/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-039/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### Architecture Pattern

The `AlphabetFilter` component receives the active letter as a prop from the Server Component (read from `searchParams`) — it does NOT call `useSearchParams()` for initial state (BUG-001 prevention: no lazy initializer needed since it's a prop). The component uses `useRouter` from `next/navigation` for navigation only via `router.replace`.

Both Server Components (`src/app/library/page.tsx` and `src/app/setlists/page.tsx`) must:
1. Read and sanitize the `letter` param from `searchParams` (single uppercase A–Z or empty).
2. Chain `.ilike("title", `${letter}%`)` on songs or `.ilike("name", `${letter}%`)` on setlists to the Supabase query.
3. Pass the `letter` value as a prop to the new `AlphabetFilter` component.
4. Update their empty-state messages to account for both letter filter and search term (e.g., "No songs starting with 'Q' matching 'love'").
5. Thread the `letter` param to `PaginationControls` and `PageSizeSelect` props.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> _Copied verbatim from `context.md` → MEMORY.md Notes. This is the canonical list of past-bug prevention rules for `@fullstack-developer`, `@release-manager`, and `@validator-agent`. They MUST NOT re-read `MEMORY.md` directly; trust this list._

- **BUG-001 (useFontSize setState-in-effect):** Do not use `useEffect` + `setState` to initialize component state from URL params. If a lazy `useState` initializer is needed, ensure it returns a default when `window` is undefined (SSR-safe). Better: pass filter state as a prop from the Server Component.
- **BUG-002 (React Compiler useCallback property-path dep):** Do not write `[router.replace]` or `[obj.method]` in dependency arrays. Use the whole object `[router]`.
- **BUG-004 (Dashboard components missing dark mode variants):** All Tailwind named utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) require explicit `dark:` variants. Apply to every utility used on the alphabet filter bar.
- **BUG-005 (Dark mode color switching):** Same as BUG-004 — do not assume a CSS-variable-switched background will automatically carry text color. Every chip needs `dark:text-brand-*` and `dark:border-brand-*` pairs.
- **BUG-007 (React Compiler forward reference):** In Client Components, declare helper functions (including `buildUrl`) above any hook that calls them. Violating this causes a hard Vercel build error.
- **BUG-016 (Module-level constant shadows dynamic variable):** Do not introduce a module-level `const LETTERS = [...]` that shadows a dynamic variable derived from `searchParams` in the same scope. Use a distinct name (e.g., `ALPHABET`).
- **Prettier formatting:** Run `npm run format` before every commit. Prettier v3 + `.prettierrc` is mandatory.

---

## Amendments (from Context Bundle)

- **AM-1:** AC-4 (active state styling) amended — The Button component's `primary` variant currently lacks explicit `dark:` variants on its text and border colors. Before using it in the AlphabetFilter, either: (a) add `dark:text-brand-espresso dark:border-brand-tan` to the Button component's `primary` variant definition, or (b) override the variant with inline `dark:` utilities in AlphabetFilter when rendering active chips. Per BUG-004/BUG-005, this is mandatory.
  
- **AM-2:** AC-18 (SearchBar param preservation) amended — The current implementation of `SearchBar.tsx` line 39 uses a bare template string `${basePath}?q=...` that silently drops all other active params (`pageSize`, `page`, `letter`). This violates AC-18. Replace the template string with a full `URLSearchParams` builder that preserves all live params, mirroring the pattern used in `PaginationControls.buildUrl`. This must be fixed as part of this task.

---

## Resolved Open Questions

- **OQ-1 (URL param vs local state)** → URL search parameter `?letter=A` (user decision from handoff). Bookmarkable and back-button-restoring per AC-10. (source: handoff "User Decisions")

- **OQ-2 (Mobile layout)** → Wrap to multiple rows on mobile, not horizontal scroll (user decision from handoff). (source: handoff "User Decisions")

- **OQ-3 (Setlist title column name)** → `name` column on `setlists` table (confirmed from `src/app/setlists/page.tsx` line 21, 85, 211). (source: `src/app/setlists/page.tsx`)

- **OQ-4 (Artisan active/inactive chip tokens)** → From `button.tsx`: `primary` variant = `bg-brand-tan text-brand-espresso`, `ghost` variant = `bg-transparent text-brand-brown border-brand-brown`. (source: `src/components/client/button.tsx` lines 14–21)

- **OQ-5 (Shared Server Action vs inline fetch)** → Both pages fetch data inline in their Server Components, not via a shared Server Action. The `letter` param must be threaded into the inline Supabase queries on both pages. (source: `src/app/library/page.tsx` lines 76–87 and `src/app/setlists/page.tsx` lines 82–95)

---

## Resolution

- **Completed:** 2026-05-24
- **Branch:** feature/TASK-039-alphabet-filter
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/AlphabetFilter.tsx` — new shared Client Component; 27 chips (All + A-Z); uses Button variant="primary"/"ghost"; flex-wrap mobile layout; router.replace navigation; all brand utilities have dark: pairs; BUG-001/002/004/005/007/016 prevention rules applied
  - `src/app/library/page.tsx` — added letter searchParam, sanitization (A-Z only), .ilike("title", `${letter}%`) filter, AlphabetFilter render, updated empty-state message, threaded letter to SearchBar/PageSizeSelect/PaginationControls
  - `src/app/setlists/page.tsx` — same as library page but filtering on name column; AlphabetFilter render with basePath="/setlists"
  - `src/components/client/SearchBar.tsx` — AM-2 fix: replaced bare template string URL builder with full URLSearchParams that preserves pageSize and letter; added pageSize/letter props; buildSearchUrl declared above hooks (BUG-007)
  - `src/components/client/PaginationControls.tsx` — added letter prop to interface and buildUrl signature; all navigation calls thread letter through
  - `src/components/client/PageSizeSelect.tsx` — added letter prop to interface and buildUrl signature; page-size change threads letter through
- **Notes:**
  - AlphabetFilter receives q and pageSize as props from the Server Component (not via useSearchParams) — this is the BUG-001-safe architecture described in Implementation Notes.
  - AM-1 (Button primary variant missing dark: pairs): addressed by passing inline className overrides `dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan` to active chips. The Button component itself was not modified.
  - The letter param is sanitized server-side: only a single uppercase A-Z character is accepted. Any other value is treated as no filter (null).
  - Both .ilike filters compose via AND semantics when both q and letter are active (Supabase chains multiple filter calls as AND by default).
