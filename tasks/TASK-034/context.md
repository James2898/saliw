# Context Bundle — Musicians List UI Enhancement

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/musicians/page.tsx` | The only musicians list page — contains all list row markup to be changed |
| `src/app/actions/musicianActions.ts` | `listMusicians()` currently selects only `id, name` — must add `notes` to the SELECT |
| `src/types/Musician.ts` | `Musician` type already declares `notes: string | null`; no type change needed |
| `src/types/supabase.ts` | `DbMusician` confirms `notes: string | null` column exists on the DB table |
| `src/styles/globals.css` | All Artisan CSS variables and dark-mode rules; required for initials avatar color choices |
| `src/app/setlists/page.tsx` | Canonical list-row pattern: `border-l-4 border-[--brand-tan]`, dark variants, edit icon placement |
| `src/app/library/page.tsx` | Two-line row pattern (title + subtitle) with `dark:` pairings — closest structural analogue for name + notes |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Lineup rows already show musician name + instrument in a flex row; same domain, reference for row layout |
| `src/components/dashboard/GreetingStrip.tsx` | Only existing `rounded-full` use for a label pill — confirms no avatar/initials component exists yet |
| `supabase/migrations/20260427000001_widen_lineup_select_to_public.sql` | Confirms musicians table is now publicly readable; RLS context for BUG-011 |

## Reuse Candidates

- `src/app/musicians/page.tsx` — Extend in-place; all row markup, layout shell, RBAC guards, and error branches are already correct. The avatar circle and notes display are additive changes only.
- `src/app/library/page.tsx` lines 151–157 — Two-line stacked layout (`title` bold + `artist` muted below) is the direct pattern to replicate for musician `name` + `notes`. Already has correct `dark:` pairs (`dark:text-brand-cream` / `dark:text-brand-tan`).
- `src/styles/globals.css` — `--color-brand-tan` (`#bc8e5c`) on `--color-brand-espresso` (`#2d1f1b`) background is the established high-contrast pair for initials text on a dark circle. Inverse for light mode: espresso text on tan background.

## Patterns to Follow

- **List row shell**: See `src/app/musicians/page.tsx` lines 120–153 — existing `<li>` with `border-l-4 border-brand-tan`, `bg-brand-cream dark:bg-brand-espresso`, `rounded-xl p-4`, edit pencil at `absolute top-3 right-3`. All additions must fit inside the existing `<div>` without altering the outer shell.
- **Two-line stacked name + subtitle**: See `src/app/library/page.tsx` lines 151–157 — `font-bold text-brand-espresso dark:text-brand-cream` for primary text; `text-xs font-medium text-brand-brown dark:text-brand-tan mt-0.5` for secondary text. This is the exact pattern for rendering notes below the name.
- **Dark mode explicit pairing**: See `MEMORY.md` BUG-004 and BUG-005 — every named Tailwind utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must have an explicit `dark:` counterpart. This applies to the initials avatar circle and notes text.
- **Initials derivation**: No existing helper — must be written inline or as a pure function. Pattern: split `name` by whitespace, take first char of first and last tokens, uppercase. Handle single-token names by using only the first character.
- **React Compiler dep array rule**: See `MEMORY.md` BUG-002 — if any `useCallback`/`useMemo` is added (unlikely for a Server Component), never use object property paths as deps.
- **Layout shell independence**: See `MEMORY.md` BUG-003 — each early-return branch in the page already independently includes the full `<main>` shell. Do not break this pattern.

## Anti-Patterns Flagged

- `src/app/actions/musicianActions.ts` line 18: `listMusicians()` selects only `'id, name'` — omits `notes`. The `Musician` type and `DbMusician` type both include `notes`, but the query does not fetch it. Replicating this narrow select in any new code would be incorrect for this feature.
- `src/app/actions/musicianActions.ts` lines 46–47: `getMusicianById()` selects all columns including `notes` and `created_by` without an auth guard, on a now-publicly readable table (BUG-011). This is a latent data-leak risk. Do not add any public code path that calls `getMusicianById()`. Not directly relevant to this task, but do not replicate the all-columns select pattern in `listMusicians()`.

## MEMORY.md Notes

- **BUG-003**: Every return branch in a Server Component page must independently include the full layout shell (`<main>` wrapper). The musicians page already follows this — do not remove the shell from any error branch while editing.
- **BUG-004 / BUG-005**: Named Tailwind utilities do not auto-switch in dark mode. The initials avatar and notes text must each have explicit `dark:` variants. Especially note: `text-brand-tan` on `bg-brand-cream` is a low-contrast pair flagged in the guidelines — do not use it for the initials text on a light-mode avatar.
- **BUG-011**: `musicians` table SELECT policy is now `USING (true)` (public). `listMusicians()` currently selects only `id, name`, which is safe. When `notes` is added to the select list, this remains safe because `notes` is free-text musician bio data — not a sensitive internal field (`created_by` is the field to keep excluded). Confirm `notes` is not sensitive before widening the select.
- **BUG-007**: In Client Components using the React Compiler, declare all helper functions before the hooks that reference them. This task touches only the Server Component `musicians/page.tsx`, so no Client Component concern — but if a new Client Component is extracted for the avatar, this rule applies.
