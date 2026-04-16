# Spec — Song Library Base View with Search

## Feature Summary

Implement the Song Library page at `src/app/library/page.tsx` as a fully functional Server Component that fetches songs from the Supabase `songs` table, supports server-side filtering by title or artist via a URL query parameter (`?q=term`), and gates the "Edit" shortcut link to users with the `music_director` role. A new Client Component `SearchBar.tsx` manages the debounced URL update. The UI follows the Artisan Palette with `--brand-cream` background, `--brand-tan-alpha` row backgrounds, and `--brand-espresso` titles for WCAG AA compliance.

## Acceptance Criteria

1. `src/app/library/page.tsx` is a Server Component (no `'use client'` directive). It accepts `searchParams` as a Next.js page prop and extracts the `q` key.
2. The page fetches songs from the `songs` table using the Supabase server client (`createClient` from `@/services/supabase/server`). Only the columns `id`, `title`, `artist`, and `original_key` are SELECTed — `content` is never fetched.
3. When `q` is present and non-empty, the query filters rows where `title` ilike `%q%` OR `artist` ilike `%q%` (case-insensitive). When `q` is absent or empty, all songs are returned.
4. Songs are ordered by `title` ascending (alphabetical) in all cases.
5. The page uses the Supabase server client to retrieve the current user session and fetches the user's `role` from the `profiles` table (SELECT `role` WHERE `id = user.id`).
6. The `isMusicDirector` flag is derived server-side: `profile.role === 'music_director'`. This flag is passed as a prop to relevant child components or used to conditionally render the Edit link.
7. A new Client Component `src/components/client/SearchBar.tsx` is created. It accepts a `defaultValue: string` prop (the current `q` value) and renders a styled `<input type="search">` element.
8. The SearchBar uses a debounced update (300ms) to push the input value to the URL as `?q=<term>` using `useRouter` (from `next/navigation`) with `router.replace`. When the input is cleared, the `q` parameter is removed from the URL (navigate to the base path).
9. The SearchBar input border uses `--brand-tan` and focus ring uses `--brand-espresso` (via Tailwind `focus-visible:ring-brand-espresso` or equivalent CSS variable). The input background is `--brand-cream`.
10. The library page container has a `--brand-cream` background (via `bg-[var(--brand-cream)]` or `bg-brand-cream`).
11. Each song row has a background of `--brand-tan-alpha` (via `bg-[var(--brand-tan-alpha)]`). Rows are rendered as a list, with each row containing: song title, artist, and original key.
12. Song title text uses `--brand-espresso` (`text-brand-espresso`) for WCAG AA contrast. Artist and key metadata use `--brand-brown` (`text-brand-brown`).
13. Each row is a navigation hit-area: clicking it navigates to `/library/[id]`. This is implemented as a `<Link href={/library/${song.id}}>` wrapping the row or the title.
14. When `isMusicDirector` is `true`, an "Edit" icon link is rendered on each row pointing to `/library/[song.id]/edit`. When `isMusicDirector` is `false`, the Edit link is not rendered — guests and standard users see only the row navigation link.
15. When no songs are found (empty results array), a "No songs found" empty state is rendered. If `q` is non-empty, the message distinguishes a search with zero results: e.g., "No songs match your search." If `q` is empty (library is genuinely empty), the message reads: "No songs in the library yet."
16. The existing auth redirect logic in `page.tsx` (redirect to `/login` if no user) is preserved.
17. The `SearchBar` component does not call Supabase or any Server Action directly.
18. No new npm packages are introduced without explicit user approval.
19. The feature branch is named `feature/TASK-010-song-library-base-view` from the `develop` base branch.
20. Typography: use `font-sans` (Plus Jakarta Sans) for all UI text in this page. Do NOT use `font-mono`.

## Out of Scope

- Implementing the song viewer page (`src/app/library/[id]/page.tsx`).
- Implementing the song editor page (`src/app/library/[id]/edit/page.tsx`).
- Pagination or infinite scroll on the library list.
- Sorting by fields other than `title` ascending.
- Creating, updating, or deleting songs (Server Actions for mutations are out of scope for this view task).
- Adding any new Supabase RLS policies (existing public SELECT and music_director write policies are sufficient).
- Dark mode variants for the library page (dark mode support may be added in a future task).
- Any animations beyond what Tailwind `transition-*` utilities provide.

## Fallback Behaviors

- **Edit link (RBAC):** If the user's `profiles` row does not have `role === 'music_director'`, the Edit link is simply not rendered. No disabled state — the element is absent entirely.
- **Profile fetch error:** If the `profiles` table query fails or returns no row, default `isMusicDirector` to `false` (do not throw — degrade gracefully to no Edit links).
- **Songs query error:** If the Supabase songs query returns an error, render the "No songs found" empty state with message: "Unable to load songs. Please try again." Do not throw an unhandled exception.
- **Empty search:** When the SearchBar input is cleared entirely, navigate to `/library` (no `?q` param), triggering a full unfiltered fetch server-side.

## Resolved Ambiguities

- **Which columns to SELECT for songs:** `id, title, artist, original_key` only — `content` excluded per task description (payload minimization). Source: task description.
- **How to derive `isMusicDirector`:** Fetch `role` from `profiles` table server-side, compare to string `'music_director'`. Source: `src/types/Profile.ts` (`role: string`), `src/app/actions/profileActions.ts` (profiles table confirmed EXISTS).
- **`--brand-tan-alpha` value:** `#bc8e5c26` (confirmed in `src/styles/globals.css`).
- **WCAG AA compliance:** `--brand-tan` on `--brand-cream` is flagged as a low-contrast pair in `docs/coding-guidelines.md`. Song titles must use `--brand-espresso`. Artist/key use `--brand-brown`.
- **SearchBar routing:** Use `useRouter().replace()` to avoid polluting browser history with every keystroke. Source: Next.js App Router patterns.
- **Edit link visibility when no session:** If no user exists, page redirects before rendering — Edit link RBAC check is irrelevant for unauthenticated users.
- **SearchBar file location:** `src/components/client/SearchBar.tsx` — follows PascalCase component naming and the `src/components/client/` directory rule from `docs/structure.md`.
- **`useSearchParams` for initial value:** The `defaultValue` for SearchBar is passed from the server page via the `q` searchParam — no need for `useSearchParams` in the client component.
