# Context Bundle — Items Per Page Pagination Control

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/page.tsx` | Setlists list page — Server Component, owns `PAGE_SIZE = 10`, passes `pageSize` to `PaginationControls`, reads `?page` from URL `searchParams` |
| `src/app/library/page.tsx` | Library list page — identical Server Component architecture, owns `PAGE_SIZE = 10`, same URL param pattern |
| `src/components/client/PaginationControls.tsx` | Existing pagination component — accepts `pageSize` prop; uses `useRouter` + `router.replace` to navigate by URL param; must be extended to add items-per-page control |
| `src/components/client/SearchBar.tsx` | Pattern reference for client-side URL param navigation (`router.replace`, debounce, `basePath` prop) — the items-per-page select will follow the same URL-update pattern |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Canonical `selectClass` definition: the only place in the codebase where a reusable select class string is named and extracted |
| `src/components/client/SetlistBuilder/SortableSongRow.tsx` | Second example of inline select styling for Artisan palette |
| `src/components/client/NewSongFormClient.tsx` | Third select example — uses `inputBaseClass` with `cursor-pointer font-mono font-bold` for key selectors |
| `src/components/client/SongEditorClient.tsx` | Fourth select example using same `inputBaseClass` pattern |
| `src/components/client/button.tsx` | Shared Button component — `ghost` variant used by pagination nav buttons; no change needed |
| `src/styles/globals.css` | Artisan palette CSS variable definitions and dark mode switching (class-based via `.dark`) |

## Reuse Candidates

- `src/components/client/PaginationControls.tsx` — The primary change surface. Extend `PaginationControlsProps` to add an optional `pageSize?: number` prop (already exists as a required prop — add `onPageSizeChange` or handle entirely via URL inside the component). Add a `<select>` inside the `<nav>` whose `onChange` calls `router.replace` with `?pageSize=N&page=1`. The component already imports `useRouter` — no new import needed.

- `buildUrl` helper at line 20 of `PaginationControls.tsx` — Extend the signature to accept a `pageSize` parameter and include `params.set("pageSize", String(pageSize))` so all four nav buttons carry the currently-selected page size when navigating pages.

- `selectClass` constant from `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` line 25 — The established Artisan-correct select class string. Value: `"text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso"`. Copy this string (or inline it) for the new items-per-page `<select>` — it already has correct dark mode variants.

## Patterns to Follow

- **URL-param driven Server Component pagination:** See `src/app/setlists/page.tsx` lines 28–49 and `src/app/library/page.tsx` lines 26–44. Both pages read `searchParams` as a `Promise`, parse the `?page` param with integer validation + clamping, compute `offset = (requestedPage - 1) * PAGE_SIZE`, and call Supabase `.range(offset, offset + PAGE_SIZE - 1)`. Adding `?pageSize=` requires: (1) reading `params.pageSize` with parse-and-validate against the allowed set `[10, 25, 50, 100]`, falling back to `10` on invalid input; (2) replacing `const PAGE_SIZE = 10` with the parsed value; (3) passing `pageSize` down to `PaginationControls`.

- **URL navigation via `router.replace`:** See `PaginationControls.tsx` lines 20–25 and `SearchBar.tsx` lines 38–43. Both use `router.replace` (not `router.push`) to avoid polluting browser history. The items-per-page `onChange` handler must follow the same pattern. When page size changes, reset `?page=1`.

- **`searchParams` interface with `Promise<{...}>`:** See `src/app/setlists/page.tsx` line 29 and `src/app/library/page.tsx` line 25. Both type `searchParams` as `Promise<{ q?: string; page?: string }>`. Add `pageSize?: string` to both interfaces.

- **Input sanitization on URL params:** See `src/app/setlists/page.tsx` lines 46–49 for the parse-clamp pattern. For `pageSize`, validate against the allowed set — reject values not in `[10, 25, 50, 100]` and fall back to `10`.

- **Dark-mode select Artisan pattern:** Use the `selectClass` from `SetlistPeopleSection.tsx` line 25 as the template — already has `dark:bg-brand-espresso` and `dark:text-brand-cream` pairs.

- **`basePath` prop threading:** Both list pages pass `basePath` to `PaginationControls`. Extend `buildUrl` in `PaginationControls.tsx` so that `pageSize` is included in the URL for all nav button clicks — otherwise page size resets to default whenever the user navigates to next/prev page.

## Anti-Patterns Flagged

- `src/app/setlists/page.tsx` line 16 and `src/app/library/page.tsx` line 14: `const PAGE_SIZE = 10` is a module-level constant. When `pageSize` becomes URL-driven, this constant must be replaced by a parsed-and-validated variable — do not leave the constant and shadow it with a local, as the Supabase `.range()` call would silently use the wrong value.

- `src/components/client/SetlistBuilder/SortableSongRow.tsx` line 81: inline select class string is not extracted to a named constant. Do not replicate this pattern; use a named class constant for the items-per-page select.

## MEMORY.md Notes

- **BUG-001 (Prevention):** Never initialize React state from `localStorage`/`sessionStorage` via `useEffect` + `setState`. If the items-per-page control ever needs a persisted preference, use a `useState` lazy initializer. For this task, URL params are the source of truth — no localStorage involvement.

- **BUG-002 (Prevention):** The React Compiler rejects `useCallback` dep arrays that reference object property paths (e.g. `[router.replace]`). The new `onChange` handler in `PaginationControls.tsx` should be a plain inline arrow (no `useCallback`) or depend on the whole `router` object.

- **BUG-005 (Prevention):** Every `text-brand-*`, `bg-brand-*`, and `border-brand-*` named Tailwind utility must have an explicit `dark:` pair. The new `<select>` element must use the `selectClass` string from `SetlistPeopleSection.tsx` — it already has the correct dark variants.

- **BUG-007 (Prevention):** Declare any helper functions (`buildUrl`, handler functions) before the hook (`useRouter`, any `useCallback`) that references them inside `PaginationControls.tsx`. The React Compiler rejects forward references.

- **BUG-006 (Prevention):** Do not write Tailwind arbitrary-value class patterns with wildcard asterisks in any file under the project root, including `.md` files. Use concrete specific class names only.
