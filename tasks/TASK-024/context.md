# Context Bundle — Dashboard Feature

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/dashboard/page.tsx` | Current stub to be replaced — auth guard pattern already in place |
| `src/app/dashboard/layout.tsx` | Wraps children in a `<Card padding="lg">` on `bg-brand-cream` — do not re-add a Card inside the page |
| `src/app/library/page.tsx` | Canonical role-gating pattern: profile fetch + `isMusicDirector` flag |
| `src/app/setlists/page.tsx` | Canonical date formatting with `toLocaleDateString` and `SetlistRow` query shape |
| `src/services/supabase/server.ts` | SSR Supabase client — must `await createClient()` |
| `src/components/server/card.tsx` | Server-side Card component used in layout — props: `padding`, `className`, `children` |
| `src/components/client/button.tsx` | Client Button component — variants: `primary`, `secondary`, `ghost`; sizes: `sm`, `md`, `lg` |
| `src/types/supabase.ts` | `DbSong` and `DbSetlist` type definitions — no `created_at`/`updated_at` columns yet |
| `docs/coding-guidelines.md` | Artisan palette tokens, WCAG AA rules, SSR component boundary rules |
| `MEMORY.md` | BUG-001 (lazy useState) and BUG-002 (React Compiler useCallback deps) |

## Reuse Candidates

- `src/services/supabase/server.ts` — `createClient()` must be used for all server-side Supabase access; import as `import { createClient } from '@/services/supabase/server'`
- `src/app/library/page.tsx` (lines 44–58) — role-gating block: fetch `profiles.role`, compare to `'music_director'`, wrap in try/catch, default to `false`; copy this verbatim
- `src/app/setlists/page.tsx` (lines 150–156) — date formatting pattern: `new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`
- `src/components/server/card.tsx` — already rendered by `dashboard/layout.tsx`; do NOT nest another Card inside `page.tsx` (the layout already provides the card shell)
- `src/components/client/button.tsx` — use for any CTA links on the dashboard (e.g., "Go to Library", "Go to Setlists")

## Patterns to Follow

- **Auth guard with redirect:** See `src/app/dashboard/page.tsx` — `supabase.auth.getUser()` then `if (!user) redirect('/login')`; the dashboard page already has this skeleton, extend it
- **Role gating (isMusicDirector):** See `src/app/library/page.tsx` lines 44–58 — fetch `profiles` table with `.select('role').eq('id', user.id).single()`, wrap in `try/catch`, default to `false`
- **Supabase SSR client:** See `src/services/supabase/server.ts` — always `await createClient()` (async function); import from `@/services/supabase/server`
- **Count queries:** See `src/app/setlists/page.tsx` line 72–84 — use `{ count: 'exact', head: false }` on `.select()` to get row count in one round-trip
- **Empty states:** See `src/app/library/page.tsx` lines 123–133 — `rounded-2xl border border-brand-brown/20 bg-[var(--brand-tan-alpha)]` container with `role="status" aria-live="polite"`
- **Typography tokens:** `text-brand-espresso` for headings, `text-brand-brown` for subheadings/labels, `text-xs font-semibold uppercase tracking-widest` for eyebrow text (see dashboard stub lines 19–21)
- **Page background:** `min-h-screen bg-brand-cream` (layout already sets this via `DashboardLayout`)
- **Migration naming:** `YYYYMMDDNNNNNN_description.sql` — e.g. `20260424000001_rls_music_director_mutations.sql`; next migration would be `20260424000002_...` or a new date prefix

## Anti-Patterns Flagged

- `src/app/setlists/page.tsx` line 110: uses `dark:bg-brand-darker` — verify `--brand-darker` CSS variable is defined in `src/styles/` before referencing it in new dashboard code (per coding-guidelines.md line 109 audit checklist)
- `src/types/supabase.ts`: `DbSong` has no `created_at` or `updated_at` columns; if the dashboard plan references these fields they do not yet exist in the type or (presumably) in the schema — a migration will be required before querying them

## MEMORY.md Notes

- **BUG-001 (UI State):** Never initialize React state from `localStorage`/`sessionStorage` via `useEffect` + `setState`. Always use a lazy `useState` initializer: `useState(() => readValue())`. Relevant if any dashboard client component persists user preferences.
- **BUG-002 (Architecture / React Compiler):** Never use object property paths as `useCallback` or `useMemo` deps (e.g. `[obj.method]`, `[props.value]`). Depend on the whole object (`[obj]`) or a destructured primitive. This codebase runs the React Compiler and property-path deps cause a hard Vercel build failure.
