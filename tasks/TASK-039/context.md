# Context Bundle — A–Z Alphabet Filter Bar (Song Library + Setlist List)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/library/page.tsx` | Song Library page — Server Component; owns searchParams, Supabase query with `.or(title.ilike / artist.ilike)`, pagination derivation |
| `src/app/setlists/page.tsx` | Setlist List page — Server Component; owns searchParams, Supabase query with `.ilike("name", ...)`, pagination derivation |
| `src/components/client/SearchBar.tsx` | Existing search input — uses `useRouter` + `router.replace` to push `?q=` URL param; debounced 300ms; must coexist with new `?letter=` param |
| `src/components/client/PaginationControls.tsx` | Existing pagination — `buildUrl` constructs URLSearchParams from `q`, `pageSize`, `page`; must be extended to thread `letter` param through |
| `src/components/client/PageSizeSelect.tsx` | Existing page-size selector — `buildUrl` constructs URLSearchParams from `q`, `pageSize`; must thread `letter` param through |
| `src/components/client/button.tsx` | Shared Button component — `variant="ghost"` / `variant="primary"` / `variant="secondary"`, size `sm/md/lg`; use for each letter chip |
| `src/components/server/card.tsx` | Server Card shell — `main-card` CSS class, Artisan border; reference for static UI containers |
| `src/styles/globals.css` | CSS variable definitions — `--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`, `--brand-tan-alpha`, `--color-brand-*` Tailwind v4 tokens |
| `src/app/actions/songActions.ts` | `getAllSongs()` Server Action — unfiltered full-library fetch; the Library page queries Supabase inline (not via this action), so the inline query is the target |
| `src/app/actions/setlistActions.ts` | Setlist mutation actions — reference for PostgREST pattern and Supabase client usage |

## Reuse Candidates

- `src/components/client/button.tsx` — Each letter in the A–Z bar can be rendered as a `<Button variant="ghost" size="sm">` with an active-state override (swap to `variant="primary"` when selected). The `forwardRef` + `disabled` + focus-visible ring already match Artisan standards.
- `src/components/client/PaginationControls.tsx` — The `buildUrl` helper (line 21–32) assembles `URLSearchParams` from `q`, `pageSize`, `page`. This function must be updated to accept an optional `letter` param and pass it through every navigation call. The existing pattern is the reference for how `letter` should be wired.
- `src/components/client/PageSizeSelect.tsx` — Same `buildUrl` helper pattern (line 16–22). Must also thread `letter` through.
- `src/components/client/SearchBar.tsx` — The `router.replace` pattern (line 39–41) shows how URL params are built for search. The new `AlphabetFilter` component should follow the same `router.replace` approach, resetting `page` to 1 on letter change and preserving `pageSize` and `q`.

## Patterns to Follow

- **URL-param-driven filter state:** See `src/app/library/page.tsx` lines 37–52 and `src/app/setlists/page.tsx` lines 43–58 — all filter/pagination state lives in `searchParams` (a `Promise<{...}>`). The new `letter` param follows the exact same pattern: read it server-side from `params.letter`, sanitize (single uppercase A–Z or empty), pass to Supabase query, and pass as a prop to the new Client Component for active-state highlighting.
- **PostgREST `ilike` with `^` anchor for letter filter:** The Library page already uses `.or("title.ilike.%${q}%,artist.ilike.%${q}%")` (line 85–87) and the Setlist page uses `.ilike("name", \`%${q}%\`)` (line 94). For the letter filter, use `.ilike("title", \`${letter}%\`)` (starts-with anchor, no leading %) on songs, and `.ilike("name", \`${letter}%\`)` on setlists — these compose cleanly alongside an existing `q` filter using a second `.filter()` chain call.
- **`router.replace` for filter navigation (no history pollution):** See `src/components/client/SearchBar.tsx` line 39 — `router.replace` is used so that rapidly clicking letters does not stack browser history entries. The new `AlphabetFilter` component must follow this same pattern.
- **Artisan active/inactive chip styling:** `button.tsx` variant classes show the pattern — `primary` = `bg-brand-tan text-brand-espresso border-brand-tan`, `ghost` = `bg-transparent text-brand-brown border-brand-brown`. For the selected letter, use `primary`; for unselected, use `ghost`. An "All" chip (clears the letter filter) follows the same pattern.
- **Dark mode explicit pairs:** See `MEMORY.md` BUG-005 / BUG-004 — every `text-brand-*` and `bg-brand-*` Tailwind utility on the filter bar must have an explicit `dark:` counterpart. Do not assume CSS variable backgrounds switch text color automatically.
- **React Compiler forward-ref declaration order:** See `MEMORY.md` BUG-007 — declare all helper functions (e.g. `buildUrl`, event handlers) before any `useEffect` or `useCallback` that references them.
- **React Compiler dependency arrays:** See `MEMORY.md` BUG-002 — use the whole object as the `useCallback` dep, not a property path (e.g. `[router]` not `[router.replace]`).

## Anti-Patterns Flagged

- `src/components/client/SearchBar.tsx` line 39: `router.replace` builds the URL as a template string `${basePath}?q=...` that silently drops all other existing params (`pageSize`, `page`, and the forthcoming `letter`). When a user types in the search box, the current `pageSize` and selected letter are lost. This is an existing anti-pattern — do not replicate it in the new `AlphabetFilter` component. The new component must build a full `URLSearchParams` object (like `PaginationControls.buildUrl`) that preserves all live params and only updates the one being changed.
- `src/components/client/PageSizeSelect.tsx` line 16–22 and `src/components/client/PaginationControls.tsx` line 21–32: Both `buildUrl` helpers do not currently include a `letter` param. When the new filter is added and these components navigate, they will silently drop the selected letter from the URL. These helpers must be updated as part of this task.

## MEMORY.md Notes

Relevant entries from project-root `MEMORY.md` for this feature category:

- **BUG-005 (UI State — Dark Mode):** All Tailwind named utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) require explicit `dark:` variants. Never assume a CSS-variable-switched background will carry text. Every chip in the A–Z bar needs `dark:` text and border pairs. Prevention: audit every utility class before committing.
- **BUG-004 (Dashboard components missing dark mode variants):** Same rule — applies to any new component introducing brand color utilities. Include `dark:` from the start, not as a follow-up.
- **BUG-007 (React Compiler forward reference):** In Client Components, declare helper functions (including `buildUrl`) above any hook that calls them. Violating this causes a hard Vercel build error.
- **BUG-002 (React Compiler useCallback property-path dep):** Do not write `[router.replace]` or `[obj.method]` in dependency arrays. Use the whole object `[router]`.
- **BUG-016 (Module-level constant shadows dynamic variable):** Do not introduce a module-level `const LETTERS = [...]` that shares a name with any dynamic variable derived from `searchParams` in the same scope. Use a distinct name (e.g. `ALPHABET`).
- **BUG-017 (PostgREST nested select shape):** Not directly applicable here (no nested join), but confirms that Supabase query shapes must be verified against the runtime response, not just TypeScript types.
- **Prettier formatting:** Run `npm run format` before every commit. Prettier v3 + `.prettierrc` is mandatory.
- **BUG-006 (Tailwind wildcard in MEMORY.md):** Do not write Tailwind arbitrary-value class patterns with wildcard `*` anywhere in source or docs files — Tailwind v4 will try to emit them as CSS.
