# Context Bundle — SetlistPeopleSection (Worship Leader + Lineup)

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/[id]/edit/page.tsx` | Server component that fetches setlist header, does role check, then passes data to SetlistBuilderClient — needs new props for lineup/worship-leader prefetch |
| `src/app/setlists/[id]/page.tsx` | Viewer server component — sequential awaits pattern; needs getSetlistLineup + worship_leader_id fetch added |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Viewer client component — needs new lineup/worshipLeader props threaded down for read-only display |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Edit client component — new SetlistPeopleSection must be mounted here; owns all state and action calls |
| `src/components/client/SetlistBuilder/SetlistPanel.tsx` | Panel layout/styling reference for SetlistPeopleSection wrapper structure |
| `src/components/client/SetlistBuilder/SortableSongRow.tsx` | Canonical select and row styling patterns; the select class is the exact pattern to follow in instrument/musician dropdowns |
| `src/components/client/SetlistBuilder/ErrorBanner.tsx` | Inline error display with role="alert"; reuse directly |
| `src/app/actions/setlistActions.ts` | Contains setSetlistWorshipLeader, addSetlistMusician, removeSetlistMusician, getSetlistLineup signatures |
| `src/app/actions/musicianActions.ts` | Contains listMusicians signature |
| `src/types/Musician.ts` | Musician and SetlistLineupEntry types |
| `src/types/supabase.ts` | DbSetlistMusician shape (returned by addSetlistMusician) |

## Reuse Candidates
- `src/components/client/SetlistBuilder/ErrorBanner.tsx` — Reuse directly for inline error display inside SetlistPeopleSection; already has role="alert" and dismiss button
- `src/components/client/SetlistBuilder/SortableSongRow.tsx` — The select element class `text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso` is the canonical pattern for musician/instrument dropdowns in SetlistPeopleSection
- `src/components/client/SetlistBuilder/SetlistPanel.tsx` — Row wrapper class `flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10` is the canonical lineup-entry row pattern
- `src/components/client/button.tsx` — Already used for Save/Remove CTAs throughout; use for "Add" and remove buttons in SetlistPeopleSection

## Patterns to Follow
- **Lazy useState initializer**: See `SetlistBuilderClient.tsx` lines 74–76 — all state seeded via `useState(() => initialValue)`, never inside useEffect. BUG-001 prevention.
- **Dark mode paired classes**: See `SetlistBuilderClient.tsx` inputClass (lines 291–294) — every Artisan palette utility has an explicit `dark:` pair. BUG-004 prevention.
- **Declaration-before-use**: See `SetlistBuilderClient.tsx` — all handlers declared before the render block. BUG-007 prevention; React Compiler rejects forward refs that hoisting would otherwise allow.
- **Split error checks, no compound guard**: See `cloneSetlist` in `setlistActions.ts` lines 523–529 — lineupFetchError and data presence are checked in two separate `if` blocks. Any multi-step action in SetlistPeopleSection must follow the same split-check pattern. BUG-008 prevention.
- **`!== undefined` payload guard**: See `updateSetlist` lines 412–419 — payload keys included only when `!== undefined`, never using `in` operator or falsy checks. BUG-009 prevention for any optimistic payload builder.
- **Parallel Promise.all for independent fetches**: See `edit/page.tsx` lines 85–89 — `getSetlistWithSongs` + `getAllSongs` are awaited together. The new `getSetlistLineup` + `listMusicians` fetches on the edit page must follow the same pattern.
- **Every return branch includes layout shell**: See `edit/page.tsx` lines 67–82, 91–107, 133–153 — each early-return error state independently includes the full `<main>` + max-width container. BUG-003 prevention.
- **inputClass for text inputs**: `w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/40 dark:placeholder:text-brand-tan/40 focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1` — from `SetlistBuilderClient.tsx` lines 291–294.
- **labelClass**: `block text-xs font-semibold uppercase tracking-widest text-brand-brown mb-1.5` — from `SetlistBuilderClient.tsx` line 297. Note: `text-brand-brown` has no `dark:` pair here; cross-check with coding guidelines before replicating.
- **Section heading pattern**: `text-sm font-semibold text-brand-brown/60 uppercase tracking-widest mb-4` — from `SetlistBuilderClient.tsx` line 352.

## Anti-Patterns Flagged
- `src/app/setlists/[id]/SetlistViewerClient.tsx` line 12: imports `ProcessedLine` from `@/utils/musicLogic`; when adding lineup props, import `SetlistLineupEntry` and `Musician` from `@/types/Musician`, not from supabase types — do not replicate the pattern of using `DbSetlistMusician` in client components.
- `src/app/setlists/[id]/page.tsx` lines 75–104: `getSetlistWithSongs` is fetched sequentially after `getSetlistById`. New `getSetlistLineup` and `listMusicians` fetches are independent of the setlist header check and must not be chained sequentially; fetch in parallel with `Promise.all`.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` line 297: `labelClass` uses bare `text-brand-brown` without a `dark:` pair — this is a latent BUG-004 instance; do not replicate in SetlistPeopleSection labels.

## MEMORY.md Notes
- **BUG-001**: All state in SetlistPeopleSection must be seeded via lazy `useState(() => initialValue)` initializers, never set inside `useEffect`. Applies to `localLineup`, `worshipLeaderId`, etc.
- **BUG-003**: Every early-return error branch added to `edit/page.tsx` or `page.tsx` must independently include the full layout shell. Do not assume a parent provides the shell.
- **BUG-004**: All Artisan palette Tailwind utilities must be paired with explicit `dark:` variants. Named utilities like `bg-brand-cream` do NOT inherit dark mode automatically.
- **BUG-007**: In `SetlistPeopleSection`, declare all handler functions and callbacks before any hook that references them. React Compiler rejects forward references that JS hoisting would otherwise allow.
- **BUG-008**: In any multi-step action handler (e.g. add musician then refetch lineup), split `if (fetchError)` and `if (!data)` into separate checks. Do not combine into `if (error || !data)`.
- **BUG-009**: In any payload builder for Server Actions, use `!== undefined` to gate field inclusion. Do not use `in` operator or falsy checks.
