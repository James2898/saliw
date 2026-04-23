# Context Bundle — Setlist Archive & Index Hub

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/page.tsx` | The target file — currently a bare stub with auth check only; must be replaced |
| `src/app/setlists/[id]/page.tsx` | Sibling page; establishes role-check pattern (isLeader), setlist data fetch pattern, dark mode classes, Card usage |
| `src/app/library/page.tsx` | Gold-standard reference — full server-side pagination + search + role check + FAB integration |
| `src/components/client/SearchBar.tsx` | Ready-to-use debounced search, routes to `/library?q=…`; needs a `basePath` prop or a setlists-specific clone |
| `src/components/client/PaginationControls.tsx` | Ready-to-use pagination; `buildUrl` is hardcoded to `/library` — needs a setlists version |
| `src/components/library/NewSongButton.tsx` | Only FAB implementation in codebase; dual desktop+mobile pattern to replicate |
| `src/components/server/card.tsx` | Reusable `<Card>` with `padding` variants; uses `.main-card` CSS class |
| `src/components/client/button.tsx` | `Button` component with `primary/secondary/ghost` variants and `sm/md/lg` sizes |
| `src/app/actions/setlistActions.ts` | `createSetlist`, `getSetlistById`, `deleteSetlist` — all mutations; no list/index query exists yet |
| `src/services/supabase/server.ts` | `createClient()` — canonical server-side Supabase factory |
| `src/types/supabase.ts` | `DbSetlist` type — `{ id, name, date, leader_id, is_public }` |
| `src/styles/globals.css` | All brand CSS variables and `.main-card` class defined here |
| `src/middleware.ts` | Does NOT protect `/setlists` — page is publicly readable (no redirect needed) |

## Reuse Candidates

- `src/components/client/SearchBar.tsx` — Debounced `?q=` search via `router.replace`; currently routes to `/library`. Reuse pattern directly but point URL at `/setlists`. No prop for `basePath` exists — either clone as `SetlistSearchBar.tsx` or add a `basePath` prop to the existing component.
- `src/components/client/PaginationControls.tsx` — Fully functional with `currentPage / totalCount / pageSize / q` props; `buildUrl` is hardcoded to `/library` (line 16). Needs a setlists variant or a `basePath` prop added.
- `src/components/library/NewSongButton.tsx` — The only FAB pattern in the codebase. Desktop hidden-on-mobile + mobile fixed-bottom-right (`fixed bottom-6 right-6 z-[80]`) pattern. For "New Setlist" FAB: replicate structure, swap route to `/setlists/new`, guard with `isMusicDirector`.
- `src/components/server/card.tsx` — Used in `[id]/page.tsx` for both error states and content containers. Reuse for setlist row cards or empty state.
- `src/components/client/button.tsx` — Available for any interactive controls.
- `src/app/actions/setlistActions.ts` — `createSetlist()` and `deleteSetlist()` are the relevant mutations. **No paginated list query exists in this file** — must be written directly in the page (pattern: `supabase.from('setlists').select(..., { count: 'exact' }).range(...)`) matching library/page.tsx lines 67–87.

## Patterns to Follow

- **Server-side pagination with URL params**: See `src/app/library/page.tsx` lines 33–93 — `searchParams: Promise<{ q?: string; page?: string }>`, sanitize `q` (strip `[(),%]`), clamp page, use `.range(offset, offset + PAGE_SIZE - 1)` with `{ count: 'exact' }`.
- **Role check (music_director)**: See `src/app/library/page.tsx` lines 44–58 — fetch `profiles.role` only when `user` is non-null; `isMusicDirector = profile?.role === 'music_director'`. Do not check role in middleware for read pages.
- **Auth without redirect (public page)**: See `src/app/setlists/[id]/page.tsx` line 21 — `supabase.auth.getUser()` result used for `isLeader` only; no `redirect()` call.
- **Supabase server client**: `import { createClient } from '@/services/supabase/server'` then `const supabase = await createClient()` — always `await` the factory.
- **Dark mode classes**: See `[id]/page.tsx` — pair `bg-brand-cream dark:bg-brand-darker` on `<main>`, `text-brand-espresso dark:text-brand-cream` on headings, `text-brand-brown dark:text-brand-tan` on secondary text.
- **Empty state**: `rounded-2xl border border-brand-brown/20 bg-[var(--brand-tan-alpha)] px-6 py-10 text-center` with `role="status" aria-live="polite"` — see library/page.tsx lines 127–133.
- **Tailwind brand utilities**: Use `bg-brand-cream`, `text-brand-espresso`, `text-brand-brown`, `text-brand-tan`, `border-brand-brown/20` etc. (Tailwind v4 `@theme` tokens from globals.css lines 13–27). Arbitrary values allowed for alpha: `bg-[var(--brand-tan-alpha)]`.
- **Input sanitization**: Strip PostgREST metacharacters from `q` — `q.slice(0, 100).replace(/[(),%]/g, '')` — see library/page.tsx line 37.
- **Mobile FAB dual-render pattern**: `hidden md:inline-flex` for desktop button + `md:hidden fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-full` for mobile FAB — see `NewSongButton.tsx` lines 57–101.

## Anti-Patterns Flagged

- `src/app/setlists/page.tsx` lines 17–46: Current stub uses inline `style={{}}` objects for brand colors (`backgroundColor: 'var(--brand-background)'`, `color: 'var(--brand-espresso)'`) rather than Tailwind utility classes. This violates the Tailwind-first guideline in `docs/coding-guidelines.md` — do not replicate; use `className` with Tailwind utilities instead.
- `src/components/client/PaginationControls.tsx` line 16: `buildUrl` hardcodes `/library` — anti-pattern for a shared component. If this component is reused for setlists, the URL must be corrected (add `basePath` prop or use a dedicated setlists version).
- `src/components/client/SearchBar.tsx` lines 31–37: `router.replace` routes hardcoded to `/library` — same concern as above.

## MEMORY.md Notes

- **useFontSize setState-in-effect bug** (from `~/.claude/projects/-Users-adish-projects-saliw/memory/MEMORY.md`): Synchronous `setState` inside `useEffect` caused a Vercel build error; fixed with a lazy `useState` initializer. Relevant if any Client Component in this feature initializes state from a prop or effect — use lazy initializer form `useState(() => computeValue())` rather than `useState(computeValue())` or `setState(...)` inside an effect.
- No project-level `MEMORY.md` exists at `/Users/adish/projects/saliw/MEMORY.md`.
