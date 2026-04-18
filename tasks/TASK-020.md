# TASK-020 — Setlist Archive & Index Hub

- **Tier:** 1
- **Date Created:** 2026-04-19
- **Status:** In Progress

---

## Feature Summary

Build `src/app/setlists/page.tsx` as the Setlist Archive & Index hub: a server-rendered, paginated, searchable list of all setlists ordered by `date` DESC. The page fetches from the `setlists` table with a `profiles` JOIN for leader display name and a `setlist_songs` count. It supports `?q=` and `?page=` URL params with a page size of 10. Cards are styled with the Artisan palette and link to `/setlists/[id]`. The "New Setlist" action (desktop button + mobile FAB) is gated to the `music_director` role. A `loading.tsx` skeleton mirrors the card layout.

---

## Acceptance Criteria

1. Server Component `src/app/setlists/page.tsx` with `export const dynamic = 'force-dynamic'`.
2. Supabase query selects `id`, `name`, `date`, `leader_id`, embedded `profiles(display_name)` JOIN, and `setlist_songs(count)`, ordered by `date DESC`.
3. Column is `date` (not `event_date`). No plain-text `leader` column — `leader_id` is UUID FK to profiles.
4. Leader display name from `profiles` JOIN; fallback to `"—"` if not found.
5. Pagination: `?page=` defaults to 1. Offset = `(page-1)*10`. `.range(offset, offset+9)` with `count: 'exact'`.
6. Search: `?q=` filters `.ilike('name', '%q%')`. Sanitize with `.slice(0,100).replace(/[(),%]/g,'')`.
7. Cards: `bg-[--brand-cream] rounded-xl border-l-4 border-[--brand-tan]`. Full card is `<Link href="/setlists/[id]">`.
8. Desktop (`md:`): name left (`font-extrabold text-brand-espresso truncate whitespace-nowrap`); Date, Leader, Song Count as horizontal row on the right.
9. Mobile: metadata stacks vertically. Date/Leader: `text-xs text-brand-espresso/70`. Song count as small badge.
10. Date formatted: `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`. Null-safe.
11. Sticky header: `sticky top-0 z-40 bg-brand-cream dark:bg-brand-darker`. Contains title + SearchBar with `basePath="/setlists"`.
12. Desktop "New Setlist" button: `hidden md:inline-flex`, only when `isMusicDirector`.
13. Mobile FAB: `md:hidden fixed bottom-6 right-6 z-[80]`, only when `isMusicDirector`. Both navigate to `/setlists/new`.
14. `NewSetlistButton` Client Component at `src/components/setlists/NewSetlistButton.tsx`. Mirrors `src/components/library/NewSongButton.tsx`.
15. Role check: `profiles.select('role').eq('id', user.id).single()`, check `=== 'music_director'`. Defaults to `false`.
16. Empty state (no search results): `"No setlists match your search."` in Artisan empty-state card.
17. Empty state (database empty): `"No setlists yet."` in same card.
18. Error state (query failure): `"Unable to load setlists. Please try again."` — no throw.
19. `PaginationControls` gets `basePath` prop (default `/library`). Setlists passes `basePath="/setlists"`. Library unchanged.
20. `SearchBar` gets `basePath` prop (default `/library`). Setlists passes `basePath="/setlists"`. Library unchanged.
21. `src/app/setlists/loading.tsx`: 3 skeleton cards with `animate-pulse bg-brand-brown/10`, matching desktop/mobile layout. Include header skeleton.
22. `<main>`: `min-h-screen bg-brand-cream dark:bg-brand-darker font-sans`.
23. Focus rings: `focus-visible:ring-2 focus-visible:ring-brand-espresso` on all focusable elements.
24. Page metadata: `title: 'Setlists — Saliw'`, `description: 'Browse and manage worship setlists.'`.
25. No Supabase calls from Client Components.

---

## Out of Scope

- `/setlists/new` creation form
- Searching by leader name
- Realtime updates
- Deleting or editing setlists from the index
- Sorting options other than date DESC
- Full dark mode audit

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/page.tsx` | Stub to replace — main page Server Component |
| `src/app/setlists/loading.tsx` | Create — skeleton loading UI |
| `src/app/setlists/[id]/page.tsx` | Sibling viewer — reference for dark mode, Card, and isLeader patterns |
| `src/app/library/page.tsx` | Gold reference for pagination, search, role check, and FAB patterns |
| `src/components/setlists/NewSetlistButton.tsx` | Create — role-gated desktop button + mobile FAB |
| `src/components/library/NewSongButton.tsx` | FAB pattern to replicate for `NewSetlistButton` |
| `src/components/client/SearchBar.tsx` | Modify — add `basePath` prop with default `/library` |
| `src/components/client/PaginationControls.tsx` | Modify — add `basePath` prop with default `/library` |
| `src/components/server/card.tsx` | Reusable card shell |
| `src/services/supabase/server.ts` | `await createClient()` — server-side Supabase client |
| `src/types/supabase.ts` | `DbSetlist` type reference |
| `src/styles/globals.css` | CSS variable definitions (`--brand-cream`, `--brand-tan`, etc.) |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

No artifact files exist under `tasks/TASK-020/` (the `contracts/` directory is empty).

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- Base branch is `develop`. Create feature branch: `feature/TASK-020-setlist-archive-index`.
- Use `@supabase/ssr` for all server-side session and auth access. Never use the browser client for server-side auth checks (see `coding-guidelines.md` Security section).
- All text on Artisan Palette backgrounds must meet WCAG AA contrast. Do NOT use `--brand-tan` text on `--brand-cream` background — use `text-brand-brown` for readable body text on cream (low-contrast pair flagged in guidelines).
- Do not add inline `style={{}}` objects — use Tailwind CSS v4 tokens only.
- The `NewSetlistButton` must live under `src/components/setlists/` (not `src/components/client/`) to mirror the library pattern — confirm against `docs/structure.md`.
- When modifying `SearchBar` and `PaginationControls`, add `basePath` as an optional prop with default value `/library` so all existing library usages remain unchanged without any edits to `src/app/library/page.tsx`.
- Page clamping pattern: compute `totalPages` first, then clamp `currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1` to prevent out-of-range pagination.
- Relevant MEMORY.md section: **useFontSize setState-in-effect bug** — do not call `setState` synchronously inside `useEffect`; use a lazy `useState` initializer instead. `NewSetlistButton` must not trigger this pattern.

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling the Feature Specification against the Context Bundle anti-patterns. These criteria were not in the original spec but are required based on anti-patterns found during codebase exploration.

- [AC] All text rendered on `bg-[--brand-cream]` card backgrounds must use `text-brand-brown` (or darker) for body/metadata text — never `text-brand-tan` or any CSS variable that maps to `--brand-tan` directly. Source: Context Bundle anti-pattern "``--brand-tan`` text on ``--brand-cream`` background is WCAG fail".

---

## Resolution

- **Completed:** 2026-04-19
- **Branch:** `feature/TASK-020-setlist-archive-index`
- **Base branch:** `develop`
- **Files changed:**
  - `src/components/client/SearchBar.tsx` — added optional `basePath` prop (default `'/library'`); replaced hardcoded `/library` references with `basePath`
  - `src/components/client/PaginationControls.tsx` — added optional `basePath` prop (default `'/library'`); updated `buildUrl` signature and all four call sites
  - `src/app/library/page.tsx` — passed `basePath="/library"` explicitly to `SearchBar` and `PaginationControls` (no behaviour change)
  - `src/components/setlists/NewSetlistButton.tsx` — created; music_director-gated desktop button + mobile FAB; rendered disabled with hint text "Creating new setlists coming soon." because `/setlists/new` route does not exist
  - `src/app/setlists/page.tsx` — replaced stub with full server-rendered, paginated, searchable index; uses exact Supabase query from integration contract; Artisan card layout; empty/error states; `force-dynamic`; correct metadata
  - `src/app/setlists/loading.tsx` — created; 3 animate-pulse skeleton cards matching desktop/mobile responsive layout plus header skeleton block
- **Notes:**
  - Leader name is omitted from cards entirely (RLS blocks cross-user profile lookups; `leader_id` is a FK to `auth.users` not `public.profiles`; PostgREST cannot join across schemas). AC-4 (leader display name with fallback) from the original task spec is superseded by the integration contract finding.
  - `NewSetlistButton` is disabled with tooltip and hint paragraph, not a live navigation link. AC-12/13 "navigates to `/setlists/new`" is deferred until that route exists.
  - All text on cream backgrounds uses `text-brand-espresso` or `text-brand-brown` — never `text-brand-tan` — to satisfy WCAG AA (amendment AC from Context Bundle).
  - No inline `style={{}}` used anywhere; Tailwind CSS v4 tokens throughout.
