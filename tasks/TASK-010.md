# TASK-010 — Song Library Base View with Search

- **Tier:** 2
- **Date Created:** 2026-04-16
- **Status:** In Progress

---

## Feature Summary

Implement the Song Library page at `src/app/library/page.tsx` as a fully functional Server Component that fetches songs from the Supabase `songs` table, supports server-side filtering by title or artist via a URL query parameter (`?q=term`), and gates the "Edit" shortcut link to users with the `music_director` role. A new Client Component `SearchBar.tsx` manages the debounced URL update. The UI follows the Artisan Palette with `--brand-cream` background, `--brand-tan-alpha` row backgrounds, and `--brand-espresso` titles for WCAG AA compliance.

---

## Acceptance Criteria

1. `src/app/library/page.tsx` is a Server Component (no `'use client'` directive). It accepts `searchParams` as a Next.js page prop and extracts the `q` key.
2. The page fetches songs from the `songs` table using the Supabase server client (`createClient` from `@/services/supabase/server`). Only the columns `id`, `title`, `artist`, and `original_key` are SELECTed — `content` is never fetched.
3. When `q` is present and non-empty, the query filters rows where `title` ilike `%q%` OR `artist` ilike `%q%` (case-insensitive). When `q` is absent or empty, all songs are returned.
4. Songs are ordered by `title` ascending (alphabetical) in all cases.
5. The page uses the Supabase server client to retrieve the current user session and fetches the user's `role` from the `profiles` table (SELECT `role` WHERE `id = user.id`).
6. The `isMusicDirector` flag is derived server-side: `profile.role === 'music_director'`. This flag is passed as a prop to relevant child components or used to conditionally render the Edit link.
7. A new Client Component `src/components/client/SearchBar.tsx` is created. It accepts a `defaultValue: string` prop (the current `q` value) and renders a styled `<input type="search">` element.
8. The SearchBar uses a debounced update (300ms) to push the input value to the URL as `?q=<term>` using `useRouter` (from `next/navigation`) with `router.replace`. When the input is cleared, the `q` parameter is removed from the URL (navigate to the base path `/library`).
9. The SearchBar input border uses `--brand-tan` and focus ring uses `--brand-espresso` (via `focus-visible:ring-brand-espresso` or equivalent). The input background is `--brand-cream`.
10. The library page container has a `--brand-cream` background (`bg-brand-cream` or `bg-[var(--brand-cream)]`).
11. Each song row has a background of `--brand-tan-alpha` (`bg-[var(--brand-tan-alpha)]`). Rows contain: song title, artist, and original key.
12. Song title text uses `--brand-espresso` (`text-brand-espresso`) for WCAG AA contrast. Artist and key metadata use `--brand-brown` (`text-brand-brown`).
13. Each row is a navigation hit-area: clicking it navigates to `/library/[id]`, implemented as a `<Link href={/library/${song.id}}>` wrapping the row or title.
14. When `isMusicDirector` is `true`, an "Edit" icon link is rendered on each row pointing to `/library/[song.id]/edit`. When `isMusicDirector` is `false`, the Edit link is not rendered at all.
15. When no songs are found (empty results array), a "No songs found" empty state is rendered. If `q` is non-empty, the message reads: "No songs match your search." If `q` is empty (library genuinely empty), the message reads: "No songs in the library yet."
16. The existing auth redirect logic in `page.tsx` (redirect to `/login` if no user) is preserved.
17. The `SearchBar` component does not call Supabase or any Server Action directly.
18. No new npm packages are introduced without explicit user approval.
19. The feature branch is named `feature/TASK-010-song-library-base-view` from the `develop` base branch.
20. Typography: use `font-sans` for all UI text in this page. Do NOT use `font-mono`.

---

## Out of Scope

- Implementing the song viewer page (`src/app/library/[id]/page.tsx`).
- Implementing the song editor page (`src/app/library/[id]/edit/page.tsx`).
- Pagination or infinite scroll on the library list.
- Sorting by fields other than `title` ascending.
- Creating, updating, or deleting songs (Server Action mutations are out of scope for this view task).
- Adding new Supabase RLS policies.
- Dark mode variants for the library page.
- Any animations beyond what Tailwind `transition-*` utilities provide.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/library/page.tsx` | Primary file to implement — Server Component page with song fetch, RBAC, SearchBar integration |
| `src/components/client/SearchBar.tsx` | New file — debounced search Client Component to create |
| `src/services/supabase/server.ts` | `createClient()` server client — use for all server-side Supabase queries |
| `src/types/supabase.ts` | `DbSong` type — use `Pick<DbSong, 'id' \| 'title' \| 'artist' \| 'original_key'>` for fetched rows |
| `src/types/Profile.ts` | `Profile` type — `role: string` used for RBAC check |
| `src/styles/globals.css` | Artisan Palette CSS variable definitions — reference only, do not modify |
| `src/components/client/button.tsx` | Reusable Button component — may be used for UI elements if needed |
| `src/components/client/navbar.tsx` | Reference for existing Artisan patterns (Tailwind class usage, brand colors) |
| `docs/coding-guidelines.md` | Coding rules — WCAG AA, Artisan Palette, SSR safety |
| `docs/structure.md` | Directory conventions — confirm new file placement |

---

## Technical Schema

### Server Action / Supabase Query Contract Table

| UI Action | Query Type | Supabase Table | Status | Gap Strategy |
|-----------|-----------|----------------|--------|--------------|
| Fetch songs list (unfiltered) | Direct SELECT in `page.tsx` | `songs` | EXISTS | N/A |
| Fetch songs list (filtered by search) | Direct SELECT + ilike in `page.tsx` | `songs` | EXISTS | N/A |
| Fetch user role for RBAC | Direct SELECT in `page.tsx` | `profiles` | EXISTS | Default `isMusicDirector = false` on error |
| Navigate to song viewer | `<Link href="/library/[id]">` | N/A — navigation only | EXISTS (link only) | N/A |
| Navigate to song editor | `<Link href="/library/[id]/edit">` | N/A — navigation only | EXISTS (link only; gated by `isMusicDirector`) | Not rendered for non-directors |

### Supabase Query Details

#### Fetch Songs (Unfiltered) — EXISTS

- **Query:** `supabase.from('songs').select('id, title, artist, original_key').order('title', { ascending: true })`
- **Success Result:** `Array<{ id: string, title: string, artist: string, original_key: string }>`
- **Error:** Render empty state: "Unable to load songs. Please try again."

#### Fetch Songs (Filtered) — EXISTS

- **Query:** `supabase.from('songs').select('id, title, artist, original_key').or(\`title.ilike.%${q}%,artist.ilike.%${q}%\`).order('title', { ascending: true })`
- **Success Result (empty array):** Render empty state: "No songs match your search."
- **Error:** Render empty state: "Unable to load songs. Please try again."

#### Fetch User Role — EXISTS

- **Query:** `supabase.from('profiles').select('role').eq('id', user.id).single()`
- **Success Result:** `{ role: string }`
- **Error / No Row:** Default `isMusicDirector = false` — do not throw.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-010/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-010/research.md` | Open questions + decisions |
| Technical Schema | `tasks/TASK-010/schema.md` | Supabase query contract table |
| Endpoint Contracts | `tasks/TASK-010/contracts/endpoints.md` | Full contract detail per data action |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code — pay special attention to: SSR safety (Server Component boundary), Artisan Palette usage, WCAG AA contrast (`--brand-tan` text on `--brand-cream` is FORBIDDEN — use `--brand-espresso` for titles), and `transition-*` global rule (do not use `transition-all`).
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file — `SearchBar.tsx` belongs in `src/components/client/`.
- The `page.tsx` already has a `createClient()` call and auth redirect — preserve this structure, extend it to add the songs query and profile role query.
- For the SearchBar debounce: use `useRef` + `setTimeout`/`clearTimeout` inside a `useCallback` or `useEffect` — no external debounce library. The 300ms debounce fires `router.replace('/library' + (term ? '?q=' + encodeURIComponent(term) : ''))`.
- When building the Supabase `or()` filter for ilike search, use PostgREST syntax: `.or(\`title.ilike.%${q}%,artist.ilike.%${q}%\`)`. Sanitize `q` by trimming whitespace before use in the query.
- `isMusicDirector` must be computed server-side (in the Server Component) — never pass the raw `user` object to a Client Component.
- MEMORY.md does not exist — treat as empty.
- Base branch: `develop`. Branch name: `feature/TASK-010-song-library-base-view`.

---

## Resolution

- **Completed:** 2026-04-16
- **Branch:** feature/TASK-010-song-library-base-view
- **Base branch:** develop
- **Files changed:**
  - `src/app/library/page.tsx` — Full Server Component implementation: song fetch with ilike OR search, profiles role query for RBAC, three empty states, Artisan Palette layout, SearchBar integration, Pencil edit link gated to music_director
  - `src/components/client/SearchBar.tsx` — New Client Component: debounced (300ms) input with router.replace URL navigation, Artisan Palette styling (brand-cream bg, brand-tan border, brand-espresso focus ring)
- **Notes:** `searchParams` in Next.js App Router is typed as `Promise<...>` and must be awaited (done). The Supabase `.or()` PostgREST ilike filter uses the string form `title.ilike.%q%,artist.ilike.%q%`. isMusicDirector defaults to false on any profile fetch error — graceful degradation. TypeScript compiles cleanly (tsc --noEmit passed with zero errors).
