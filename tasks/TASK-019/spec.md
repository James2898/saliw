# Spec — Setlist Archive & Index Hub

## Feature Summary

Build `src/app/setlists/page.tsx` as the Setlist Archive & Index hub: a server-rendered, paginated, searchable list of all setlists ordered by event date descending. The page fetches from the `setlists` table with a song count via `setlist_songs`, supports `?q=` and `?page=` URL parameters for server-side filtering and pagination (page size 10), and presents each setlist as an Artisan-styled card linking to `/setlists/[id]`. A "New Setlist" action (desktop button + mobile FAB) is gated to `music_director` role users only. A `loading.tsx` skeleton must mirror the responsive card layout.

---

## Acceptance Criteria

1. The page is a Next.js Server Component (`src/app/setlists/page.tsx`) with `export const dynamic = 'force-dynamic'` to prevent stale caching.
2. The Supabase query selects `id`, `name`, `date`, `leader_id`, and a count of related `setlist_songs` rows (via PostgREST embedded count, e.g. `setlist_songs(count)`), ordered by `date DESC`.
3. The `setlists` table schema uses `date` (not `event_date`) as the column name — the query must reference `date`. The `leader` display is the authenticated user's `leader_id` (a UUID foreign key), not a plain text field. The display label for the leader must be resolved from the `profiles` table (`full_name` or fallback `email`) using the `leader_id` — see Resolved Ambiguities #2.
4. Server-side pagination uses `?page=` URL param (default: 1 when absent or invalid). Page size is 10. Offset is computed as `(page - 1) * 10`. The Supabase query uses `.range(offset, offset + 9)` with `{ count: 'exact' }`.
5. Server-side search uses `?q=` URL param. When `q` is present, filter with `.ilike('name', '%q%')` OR `.ilike('leader_display', ...)` — because `leader` is a UUID FK, search applies `.ilike()` on `name` only. Leader search is out of scope unless a `profiles` join is added (see Out of Scope).
6. The `q` parameter is sanitized using `.slice(0, 100).replace(/[(),%]/g, '')` before use in `.ilike()`, matching the existing library page pattern.
7. Each setlist renders as a card with: `bg-[--brand-cream]`, `rounded-xl`, `border-l-4 border-[--brand-tan]`. The entire card is wrapped in a `<Link href="/setlists/[id]">` covering the full hit area.
8. Desktop layout (md and above): setlist `name` on the left as primary heading (`text-brand-espresso`, `font-extrabold`); Date, Leader name, and Song Count aligned horizontally to the right as metadata chips/spans. Uses `whitespace-nowrap` and `text-overflow: ellipsis` on the name to prevent overflow.
9. Mobile layout (below md): metadata stacks vertically below the name. Date and Leader use a smaller font size (`text-xs`) with `color: var(--brand-espresso)` at `0.7` opacity (`text-brand-espresso/70`). Song count displayed as a badge.
10. Event date displayed as `Month Day, Year` (e.g. `April 6, 2025`) using `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`, matching the pattern in `src/app/setlists/[id]/page.tsx`. If `date` is null/empty, the date slot is omitted.
11. A sticky header contains the page title and a search bar. The search bar is a reusable `<SearchBar>` Client Component (existing at `src/components/client/SearchBar.tsx`) configured with `placeholder="Search setlists…"` and routing to `/setlists?q=…` instead of `/library?q=…`. A new `SetlistSearchBar` component (or a prop-driven variant of `SearchBar`) must be created to target the `/setlists` path.
12. "New Setlist" action: Desktop — a standard button rendered in the top-right of the sticky header, visible only when `isMusicDirector === true`. Mobile — a FAB fixed at `bottom-6 right-6 z-[80]`, visible only when `isMusicDirector === true`. Both are absent from the DOM when `isMusicDirector === false`.
13. The "New Setlist" action navigates to `/setlists/new`. If `/setlists/new` does not yet exist, the button still renders and navigates — the 404 is acceptable at this task scope (see Out of Scope).
14. The `music_director` role check follows the existing pattern in `src/app/library/page.tsx`: query `profiles` table with `.select('role').eq('id', user.id).single()`, then check `profile?.role === 'music_director'`. Only runs when `user` is non-null.
15. A `NewSetlistButton` Client Component is created at `src/components/setlists/NewSetlistButton.tsx`, mirroring `src/components/library/NewSongButton.tsx` in structure: `isMusicDirector` prop, desktop hidden/md:inline-flex button, mobile FAB fixed position, loading state with `Loader2` spinner on click.
16. Empty state — no results from search query: render a `rounded-2xl border border-brand-brown/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center` container with message `"No setlists match your search."`.
17. Empty state — no setlists at all (first-time / empty database): render the same container styled card with message `"No setlists yet."`.
18. Error state — Supabase query fails: render the same container with message `"Unable to load setlists. Please try again."` instead of throwing or returning a blank page.
19. `PaginationControls` component (existing at `src/components/client/PaginationControls.tsx`) is rendered below the card list when `!fetchError && totalCount > 0`. It must be passed a `basePath="/setlists"` or the `buildUrl` function inside `PaginationControls` must target `/setlists` — the current implementation hardcodes `/library`. Either a `basePath` prop is added to `PaginationControls`, or a new `SetlistPaginationControls` is created. This must not break the library page.
20. `src/app/setlists/loading.tsx` is created. It renders 3 skeleton cards matching the responsive layout: desktop — horizontal skeleton rows with a wide left block (name) and narrower right block (metadata); mobile — stacked skeleton blocks (wide name, two narrow sub-lines). Uses `animate-pulse` and `bg-brand-brown/10` for skeleton fills.
21. The page `<main>` uses `bg-brand-cream dark:bg-brand-darker` and `font-sans`, consistent with existing pages.
22. All focusable elements (card links, button, search input) have visible focus rings using `focus-visible:ring-2 focus-visible:ring-brand-espresso`.
23. The sticky header uses `position: sticky; top: 0; z-index: 40` (or Tailwind `sticky top-0 z-40`) with a `bg-brand-cream dark:bg-brand-darker` background to prevent content bleed-through on scroll.
24. The page `<metadata>` export sets `title: 'Setlists — Saliw'` and `description: 'Browse and manage worship setlists.'`.
25. No Supabase client calls are made from Client Components on this page. All data fetching happens server-side in `page.tsx`.

---

## Out of Scope

- Building `/setlists/new` (the New Setlist creation form/page) — this task only renders the navigation target.
- Searching by leader name — `leader` is a UUID FK; searching the `profiles` table by `full_name` requires an additional join and is deferred.
- Displaying the full leader name resolved from `profiles` in card metadata — if fetching all leader names for a paginated list creates N+1 risk, a single batch lookup by `leader_id` set is acceptable but its design is delegated to the developer. A fallback display of "—" when leader name cannot be resolved is acceptable.
- Realtime updates (no WebSocket subscription on this page).
- Deleting or editing setlists from the index page.
- Sorting options other than `date DESC`.
- Dark mode deep testing — the feature uses established dark mode tokens (`dark:bg-brand-darker`, `dark:text-brand-cream`) per existing patterns; full dark mode audit is deferred to `@validator-agent`.

---

## Fallback Behaviors

- New Setlist button/FAB (depends on `music_director` role check): If the `profiles` table query fails or returns no row, `isMusicDirector` defaults to `false`. The button/FAB is not rendered. No hint text is shown — the page is usable for read-only access without it.
- Supabase setlists query fails: Page renders the error state message `"Unable to load setlists. Please try again."` with no pagination or search bar visibility change. The page does not throw or redirect.
- Leader name resolution fails (profile not found for a `leader_id`): Display `"—"` in the leader metadata slot rather than crashing.
- Song count query returns null: Display `0 songs` as a fallback.

---

## Resolved Ambiguities

- **`event_date` vs `date` column name** → Resolved from `src/types/supabase.ts` (`DbSetlist`) and `src/app/actions/setlistActions.ts`: the column is named `date`, not `event_date`. All queries must use `.date`.
- **`leader` column — text or FK?** → Resolved from `src/types/supabase.ts`: `leader_id: string` (a UUID foreign key referencing the user who owns the setlist, not a plain text `leader` column). The display name must be resolved via the `profiles` table using `leader_id`. There is no `leader` text column.
- **`music_director` role check mechanism** → Resolved from `src/types/Profile.ts` (`role: string`) and `src/app/library/page.tsx`: the role is stored in the `profiles` table as a plain string column. Check `profile?.role === 'music_director'` after querying `profiles` with the authenticated user's `id`.
- **Search behavior — name OR leader, or both must match?** → `leader` is a UUID FK, not searchable by name. Search applies `.ilike()` on `name` only in this task. Leader-name search is out of scope.
- **`?page=` absent — default behavior** → Resolved from `src/app/library/page.tsx` pattern: default to page 1. `parseInt(params.page ?? '1', 10)` with `Math.max(1, parsedPage)`.
- **Empty state messaging** → Resolved from `src/app/library/page.tsx` pattern: three distinct messages — fetch error, search-no-results, and no-records-at-all.
- **FAB navigation target** → Feature spec states "New Setlist Action" navigates somewhere. Resolved: navigates to `/setlists/new` (mirrors `/library/new` pattern for `NewSongButton`). The `/setlists/new` page itself is out of scope for this task.
- **Date display format** → Resolved from `src/app/setlists/[id]/page.tsx` which uses `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`. Same format applied here.
- **`PaginationControls` hardcodes `/library`** → Identified as a gap. Resolution: add a `basePath` prop to `PaginationControls` (defaulting to `/library` for backwards compatibility) so the setlists page can pass `basePath="/setlists"`. This is a backwards-compatible change.
- **`SearchBar` hardcodes `/library`** → Identified as a gap. Resolution: add a `basePath` prop to `SearchBar` (defaulting to `/library`) or create a thin `SetlistSearchBar` wrapper that passes `basePath="/setlists"`. Preference: add `basePath` prop to existing `SearchBar` for reuse.
- **`--brand-darker` CSS variable existence** → Confirmed defined in `src/styles/globals.css` as `--brand-darker: #1a1210`. Safe to reference in dark mode classes.
- **Sticky header — does loading.tsx also need it?** → `loading.tsx` is a Suspense boundary replacement for the page content only; the sticky header is part of page content, so `loading.tsx` must also include a header skeleton placeholder to prevent layout shift.
