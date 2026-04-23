# TASK-024 — Dashboard Landing Page

- **Tier:** 1
- **Date Created:** 2026-04-24
- **Status:** In Progress

---

## Feature Summary

Replace the stub `/dashboard` route with a functional landing page that greets the authenticated user by name, surfaces the most immediately relevant setlist (next upcoming or most recent past), exposes director-only quick actions, and provides at-a-glance visibility into recent library activity. All data is fetched in a single Server Component (`src/app/dashboard/page.tsx`) using parallel queries via `Promise.all`. The existing `DashboardLayout` already wraps the page in a `<Card>`; no additional card wrapper is added. A Supabase migration adds `created_at` and `updated_at` timestamp columns (with auto-update triggers) to both `songs` and `setlists` before any dashboard queries are issued.

---

## Acceptance Criteria

### Auth

1. A request to `/dashboard` with no authenticated Supabase session redirects to `/login` before any data query is executed.
2. A request to `/dashboard` with a valid session does not redirect and renders the page.

### Migration

3. Migration file `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql` exists and is valid SQL.
4. The migration adds `created_at timestamptz not null default now()` to the `songs` table.
5. The migration adds `updated_at timestamptz not null default now()` to the `songs` table.
6. The migration adds `created_at timestamptz not null default now()` to the `setlists` table.
7. The migration adds `updated_at timestamptz not null default now()` to the `setlists` table.
8. The migration defines a `set_updated_at()` trigger function that sets `NEW.updated_at = now()` on row update.
9. The migration attaches the trigger to both `songs` and `setlists` so that every `UPDATE` fires `set_updated_at()`.

### Type Definitions

10. `DbSong` in `src/types/supabase.ts` is updated to include `created_at: string` and `updated_at: string`.
11. `DbSetlist` in `src/types/supabase.ts` is updated to include `created_at: string` and `updated_at: string`.

### Architecture

12. All Supabase queries in the dashboard page run inside a single `Promise.all` call — no sequential awaits for data fetching after auth and profile checks.
13. No widget component (`GreetingStrip`, `NextUpHero`, `QuickActions`, `RecentSongs`, `ActivityFeed`) imports or calls `createClient` directly.
14. Widget components do not carry a `'use client'` directive unless they contain interactive browser logic. Pure display widgets must be Server Components.
15. The rendered `/dashboard` page has exactly one `.main-card` element in the DOM (the one provided by `DashboardLayout`); the page itself must not render a second `Card` wrapper.

### Greeting Strip

16. The greeting strip renders the text "Welcome back, {profile.full_name}" where `{profile.full_name}` is the value from `profiles.full_name` for the authenticated user.
17. For a `music_director` role user, a role pill with the text "Music Director" is rendered with `bg-brand-espresso` and `text-brand-cream`.
18. For a non-director role user, a role pill with the text "Musician" is rendered with `bg-brand-tan` and `text-brand-espresso`.
19. For a `music_director` role user, the subtitle reads exactly: "You have everything ready for your next service."
20. For a non-director role user, the subtitle reads exactly: "Check what's coming up next."

### Next Up Setlist Hero

21. The hero queries the `setlists` table for rows where `date >= today` ordered by `date asc`, limit 1. If a row is found, that setlist is rendered as the "Next Up" hero.
22. If no upcoming setlist exists, the hero falls back to the most recent past setlist (`date < today` ordered by `date desc`, limit 1).
23. When a setlist is found (upcoming or past), the hero displays: the setlist name, the setlist date formatted as `{ year: 'numeric', month: 'long', day: 'numeric' }` in `en-US` locale, and the song count (from `setlist_songs` aggregate).
24. The hero renders a "Open Stage View" primary button linking to `/setlists/{id}` regardless of user role.
25. For a `music_director` role user, the hero renders an edit pencil icon link to `/setlists/{id}/edit`. This icon is not rendered for non-director users.
26. The edit pencil icon has an accessible `aria-label` matching the pattern "Edit {setlist.name}".
27. When there are no setlists at all (both upcoming and fallback queries return empty), and the user is a `music_director`, the hero renders a "Create your first setlist" CTA linking to `/setlists/new`. The "Open Stage View" button is not rendered.
28. When there are no setlists at all and the user is not a director, the hero renders the text "No upcoming setlists — check back soon." and no CTA button.

### Quick Actions Rail

29. The Quick Actions rail is rendered only when `isMusicDirector` is `true`. It is completely absent from the DOM (not hidden via CSS) for non-director users.
30. The Quick Actions rail contains a "New Setlist" button linking to `/setlists/new`.
31. The Quick Actions rail contains an "Add Song" button linking to `/library/new`.

### Recent Songs

32. The Recent Songs widget queries the `songs` table for 5 rows ordered by `created_at desc`.
33. Each row displays: song title, artist name, and the `original_key` value rendered as a chip (`text-xs font-semibold text-brand-brown bg-brand-cream rounded-lg px-2 py-0.5 border border-brand-brown/20`).
34. Each song row is a link to `/library/{id}`.
35. When the `songs` table is empty, the Recent Songs widget renders the text "No songs in the library yet." and no list rows.

### Activity Feed

36. The Activity Feed widget fetches in parallel: 5 latest songs by `updated_at desc` and 5 latest setlists by `updated_at desc`.
37. The two result sets are merged in JavaScript and sorted by `updated_at desc`, then the top 6 items are taken.
38. Each activity row renders: a type icon (`Music` from lucide-react for songs, `ListMusic` for setlists), the item name, and a relative time string (e.g. "2 hours ago", "3 days ago").
39. The relative time string is computed in the Server Component from `updated_at` relative to the current server timestamp at render time.
40. When both the songs and setlists fetches return empty results, the Activity Feed renders nothing — no empty state message, no container element.

### Responsive Layout

41. On viewports narrower than the `md` breakpoint (768 px), the Recent Songs widget and Activity Feed widget stack vertically, each taking full width.
42. On viewports at `md` and wider, Recent Songs occupies the left column and Activity Feed occupies the right column in a `grid-cols-2 gap-6` grid.
43. The Greeting Strip, Next Up Hero, and Quick Actions Rail are each full-width across all breakpoints.
44. The Quick Actions Rail appears in document order after the Next Up Hero and before the Recent Songs / Activity Feed grid.

### Artisan Design & Accessibility

45. All text rendered on Artisan Palette backgrounds meets WCAG AA contrast ratio. Specifically, `--brand-tan` text must not be placed on `--brand-cream` background (known low-contrast pair per coding guidelines).
46. The role pill for "Music Director" uses `bg-brand-espresso` tone — providing sufficient contrast for `text-brand-cream` (Cream #FDF8F3 on Espresso #2D1F1B).
47. The role pill for "Musician" uses `bg-brand-tan` tone — the pill label must use `text-brand-espresso` (not `text-brand-cream`) to maintain contrast.
48. Interactive elements (buttons, links) have visible `focus-visible` ring styles consistent with existing patterns in the codebase (e.g., `focus-visible:ring-2 focus-visible:ring-brand-espresso`).
49. The page `<title>` (via `export const metadata`) is set to "Dashboard — Saliw".

---

## Out of Scope

- Realtime or auto-refreshing data (WebSocket subscriptions, polling intervals)
- Pagination within any dashboard widget
- Search or filtering within any dashboard widget
- Song editing or setlist editing from the dashboard (links navigate away to dedicated pages)
- A count or summary of all songs / all setlists
- User profile editing or avatar display
- Any dashboard widget for non-authenticated (public) visitors
- Dark mode styling on the dashboard page
- Skeleton loading states or Suspense boundaries for individual widgets

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/page.tsx` | Current stub — replace with full implementation; auth guard skeleton already present |
| `src/app/dashboard/layout.tsx` | Wraps children in `<Card padding="lg">` — do NOT add another Card inside the page |
| `src/app/library/page.tsx` | Canonical role-gating pattern (lines 44–58) and key chip styling to copy |
| `src/app/setlists/page.tsx` | Canonical date formatting pattern (`toLocaleDateString`) to copy |
| `src/services/supabase/server.ts` | SSR Supabase client — always `await createClient()` (async function) |
| `src/components/server/card.tsx` | Server Card component — already provided by layout; props: `padding`, `className`, `children` |
| `src/components/client/button.tsx` | Client Button — variants: `primary`, `secondary`, `ghost`; sizes: `sm`, `md`, `lg` |
| `src/types/supabase.ts` | `DbSong` and `DbSetlist` type definitions — add `created_at` and `updated_at` fields |
| `docs/coding-guidelines.md` | Artisan palette tokens, WCAG AA rules, SSR component boundary rules |
| `supabase/migrations/` | Migration directory — add `20260424000002_add_timestamps_to_songs_and_setlists.sql` here |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Files to Create / Modify

### New files

| Path | Notes |
|------|-------|
| `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql` | See migration SQL below |
| `src/components/dashboard/GreetingStrip.tsx` | Server Component — receives `fullName`, `isMusicDirector` as props |
| `src/components/dashboard/NextUpCard.tsx` | Server Component — receives setlist data and `isMusicDirector` as props |
| `src/components/dashboard/QuickActions.tsx` | Server Component — rendered only when `isMusicDirector` is true |
| `src/components/dashboard/RecentSongs.tsx` | Server Component — receives songs array as props |
| `src/components/dashboard/ActivityFeed.tsx` | Server Component — receives merged activity items as props |

### Modified files

| Path | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Full rewrite — fetch all data, pass props to widget components |
| `src/types/supabase.ts` | Add `created_at: string` and `updated_at: string` to `DbSong` and `DbSetlist` |

### Untouched files

`src/app/dashboard/layout.tsx`, navbar, `src/components/server/card.tsx`, `src/components/client/button.tsx`, all existing routes

---

## Migration SQL

File: `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql`

```sql
alter table public.songs
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.setlists
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists setlists_set_updated_at on public.setlists;
create trigger setlists_set_updated_at before update on public.setlists
  for each row execute function public.set_updated_at();
```

---

## Supabase Query Reference

### Auth + profile (sequential — must precede the parallel block)

```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

let isMusicDirector = false
let fullName = ''
try {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  isMusicDirector = profile?.role === 'music_director'
  fullName = profile?.full_name ?? ''
} catch {}
```

### Parallel data block (one Promise.all — no sequential awaits after auth)

```ts
const todayISO = new Date().toISOString().slice(0, 10)

const [upcomingRes, recentSongsRes, activitySongsRes, activitySetlistsRes] = await Promise.all([
  // Next Up: upcoming setlists
  supabase
    .from('setlists')
    .select('id, name, date, setlist_songs(count)')
    .gte('date', todayISO)
    .order('date', { ascending: true })
    .limit(1),

  // Recent Songs widget
  supabase
    .from('songs')
    .select('id, title, artist, original_key')
    .order('created_at', { ascending: false })
    .limit(5),

  // Activity Feed — songs side
  supabase
    .from('songs')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5),

  // Activity Feed — setlists side
  supabase
    .from('setlists')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5),
])
```

### Next Up fallback (only when upcomingRes returns empty — second sequential await is acceptable here)

```ts
// If upcomingRes.data is empty, fetch most recent past setlist
const pastRes = await supabase
  .from('setlists')
  .select('id, name, date, setlist_songs(count)')
  .lt('date', todayISO)
  .order('date', { ascending: false })
  .limit(1)
```

### Date formatting (copy from setlists/page.tsx)

```ts
new Date(dateString).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
```

### Activity Feed merge + sort

```ts
const songs = (activitySongsRes.data ?? []).map(s => ({ type: 'song' as const, id: s.id, name: s.title, updated_at: s.updated_at }))
const setlists = (activitySetlistsRes.data ?? []).map(s => ({ type: 'setlist' as const, id: s.id, name: s.name, updated_at: s.updated_at }))
const feed = [...songs, ...setlists]
  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  .slice(0, 6)
```

---

## Widget Design Tokens

### Section wrapper (for each widget section)

```html
<section class="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
```

### Original key chip (copy from library/page.tsx)

```html
<span class="text-xs font-semibold text-brand-brown bg-brand-cream rounded-lg px-2 py-0.5 border border-brand-brown/20">
  {original_key}
</span>
```

### Role pill — Music Director

```html
<span class="bg-brand-espresso text-brand-cream text-xs font-semibold px-3 py-1 rounded-full">
  Music Director
</span>
```

### Role pill — Musician

```html
<span class="bg-brand-tan text-brand-espresso text-xs font-semibold px-3 py-1 rounded-full">
  Musician
</span>
```

### Focus ring (apply to all interactive elements)

```
focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:outline-none
```

### Responsive two-column grid (Recent Songs + Activity Feed)

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- RecentSongs -->
  <!-- ActivityFeed -->
</div>
```

---

## Fallback Behaviors

| Scenario | Expected behavior |
|----------|------------------|
| No upcoming setlists (director) | Next Up hero shows "Create your first setlist" CTA to `/setlists/new`; "Open Stage View" absent; edit pencil absent |
| No upcoming setlists (musician) | Next Up hero shows "No upcoming setlists — check back soon."; no CTA |
| No songs | Recent Songs renders "No songs in the library yet."; no list rows |
| Activity Feed both empty | Renders nothing — no container, no message |
| Supabase query error on any widget | Wrap each fetch in try/catch; on error render the widget's empty state; page must not throw |

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-024/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-024/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-024/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- Widget components go in `src/components/dashboard/` (new directory — see `docs/structure.md` for placement rationale; these are server-rendered display components, not interactive).
- `createClient()` from `src/services/supabase/server.ts` is **async** — always `await` it.
- Role-gating pattern: copy verbatim from `src/app/library/page.tsx` lines 44–58 — `profiles.role` comparison in try/catch, default `isMusicDirector = false`.
- The `Button` component (`src/components/client/button.tsx`) does not expose an `asChild` prop. For link-styled-as-button CTAs, wrap Next.js `Link` with equivalent Artisan classes, or place a `Button` inside a `Link` if the component supports it.
- Do NOT reference `--brand-darker` in any new dashboard code — dark mode is out of scope for this task, and the variable's presence in `src/styles/` has not been confirmed.
- `lucide-react` is locked at `^0.525.0` — import `Music` and `ListMusic` from it for the Activity Feed icons.
- Activity Feed relative time must be computed server-side (Server Component); do not use client-side `Date` calls.
- Read `MEMORY.md` sections **BUG-001** and **BUG-002** before writing any client component code.

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling `spec.md` against `context.md`. These criteria were not in the original spec but are required based on anti-patterns or MEMORY.md notes found during codebase exploration.

- [AC] **BUG-001 guard:** If any dashboard widget requires a Client Component with local state, the initial state value must use a lazy `useState` initializer (e.g. `useState(() => readValue())`) — never synchronous `setState` inside `useEffect`. Source: MEMORY.md BUG-001.
- [AC] **BUG-002 guard:** In any dashboard Client Component using `useCallback` or `useMemo`, dependency arrays must reference the whole object or a destructured primitive — never an object property path (e.g. `[obj.method]`). Property-path deps cause a hard Vercel build failure with the React Compiler. Source: MEMORY.md BUG-002.

---

## Amendment — Public Dashboard View (2026-04-24)

> Added after initial ship. User requested that unauthenticated visitors be able to view `/dashboard` with a distinct marketing-style layout (not the authenticated dashboard). AC numbering continues from 49.

### Behavior

50. A request to `/dashboard` with **no authenticated Supabase session** does **not** redirect. The page renders the `<PublicDashboardView />` component instead of the authenticated composition.
51. A request to `/dashboard` with a valid session renders the existing authenticated composition unchanged — AC 16–49 remain satisfied with no behavioral or visual regression.
52. `/dashboard` is removed from `PROTECTED_PATHS` in `src/middleware.ts`. `/dashboard/profile` remains protected via an explicit `PROTECTED_PATHS` entry so unauthenticated access to `/dashboard/profile` still redirects to `/login`.
53. On the public path (`user === null`), the page performs **no Supabase data queries** — the `Promise.all` block and the `profiles` fetch are never reached. The only Supabase call is the `auth.getUser()` check already required for auth detection.

### Public View Content

54. `src/components/dashboard/PublicDashboardView.tsx` exists and is a Server Component (no `'use client'` directive, no hooks).
55. The public view renders an `<h1>` with classes `text-3xl md:text-4xl font-extrabold tracking-tight text-brand-espresso` and exact text **"Plan Sunday. Lead the room."**.
56. The public view renders a subtitle `<p>` with classes `text-base text-brand-brown max-w-prose` and exact text **"Saliw keeps your worship team in sync — chord charts that transpose on the fly, setlists that every musician can follow, and live key changes during service."**.
57. The public view renders a primary CTA `<Link href="/login">` with the exact label "Sign in" and an `ArrowRight` lucide icon at `size={18}`. It uses the same focus-ring and primary-button class pattern as `NextUpCard.tsx`'s "Open Stage View" link (`bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream` plus `focus-visible:ring-2 focus-visible:ring-brand-espresso`).
58. The public view renders a secondary CTA `<Link href="/library">` with the exact label "Browse the song library", styled as ghost/secondary (transparent background, `border border-brand-brown/30`), with no icon.
59. Below the CTAs, the public view renders a `grid grid-cols-1 md:grid-cols-3 gap-6` feature strip with three `<section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">` cards, in this order:
    1. `Music` icon (size 24) — title "Chord charts that transpose" — description "Change keys live without rewriting a single chord."
    2. `ListMusic` icon (size 24) — title "Setlists that sync" — description "Everyone sees the same song and key during service."
    3. `Sparkles` icon (size 24) — title "Built for worship" — description "Crafted for directors, musicians, and the moments in between."
60. The public view does **not** render: Greeting strip, Next Up hero, Quick Actions, Recent Songs, or Activity Feed.
61. The page `<title>` stays "Dashboard — Saliw" (metadata unchanged).
62. The public view renders inside the existing `DashboardLayout` `<Card>` wrapper — it does not introduce a second `Card` element (same constraint as AC 15).
63. No `--brand-tan` text is placed on `--brand-cream` background in the public view (WCAG AA, per coding guidelines).
64. All interactive elements in the public view use `focus-visible:ring-2 focus-visible:ring-brand-espresso` focus styling, consistent with the rest of the codebase.

---

## Branch

Create and work on: `feature/TASK-024-dashboard-landing` branched from `develop`.

## Commit Message

```
feat(TASK-024): implement dashboard landing page with widgets
```

---

## Resolution

- **Completed:** 2026-04-24
- **Branch:** `feature/TASK-024-dashboard-landing`
- **Base branch:** `develop`
- **Files changed:**
  - `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql` — new migration adds `created_at`/`updated_at` + `set_updated_at()` trigger to `songs` and `setlists` (AC 3–9).
  - `src/types/supabase.ts` — added `created_at: string` and `updated_at: string` to `DbSong` and `DbSetlist` (AC 10–11).
  - `src/app/dashboard/page.tsx` — full rewrite. Auth guard + profile fetch (sequential) then single `Promise.all` for upcoming setlist / recent songs / activity songs / activity setlists. Next Up fallback to most recent past setlist is a second await gated on the upcoming query returning empty and not errored. Composes the five new widgets. `metadata.title = 'Dashboard — Saliw'`.
  - `src/components/dashboard/GreetingStrip.tsx` — Server Component. Renders "Welcome back, {fullName}" plus role pill (`bg-brand-espresso text-brand-cream` / `bg-brand-tan text-brand-espresso`) and role-specific subtitle.
  - `src/components/dashboard/NextUpCard.tsx` — Server Component. Renders setlist name, `en-US` long-date, song count, "Open Stage View" primary link, pencil edit link (director-only, `aria-label="Edit {name}"`). Empty state renders "Create your first setlist" CTA for director / "No upcoming setlists — check back soon." for non-director.
  - `src/components/dashboard/QuickActions.tsx` — Server Component with "New Setlist" → `/setlists/new` and "Add Song" → `/library/new`. Rendered only when `isMusicDirector` — absent from DOM otherwise (page-level conditional, not CSS-hidden).
  - `src/components/dashboard/RecentSongs.tsx` — Server Component. 5 rows, chip class matches spec exactly, link to `/library/{id}`, empty message.
  - `src/components/dashboard/ActivityFeed.tsx` — Server Component. `Music`/`ListMusic` icons, server-computed relative time string, returns `null` when items list is empty so nothing renders in the DOM.
- **Notes:**
  - No `'use client'` directive added to any new file — every widget is a pure display Server Component and receives data via props. This satisfies AC 13–14 and sidesteps BUG-001 / BUG-002 entirely (no `useState`, `useEffect`, `useCallback`, or `useMemo` anywhere in this task).
  - The `Button` client component was not reused for links — per task Implementation Notes, wrapping `Link` with equivalent Artisan classes avoids an unnecessary client-boundary for non-interactive CTAs and keeps every widget a Server Component.
  - The Next Up fallback query is a second sequential `await` (the task file explicitly permits this when `upcomingRes.data` is empty). AC 12 is still satisfied because all widget-data fetches are in the single `Promise.all`.
  - `serverNow` (Activity Feed relative time baseline) is taken after all Promise.all resolves; drift vs individual query timestamps is sub-second and inconsequential for minute/hour/day granularity.
  - `npx tsc --noEmit` passes clean. `npx next lint` surfaces only pre-existing warnings in `ServiceNavigator.tsx` and `useSetlistSync.ts` — no new warnings introduced by this task.
  - The page renders inside the `DashboardLayout` `<Card>` (one `.main-card` in DOM, AC 15). The page itself uses a plain `<div className="flex flex-col gap-6">` wrapper — no second Card.

### Amendment resolution — Public Dashboard View (2026-04-24)

- **Files changed (amendment):**
  - `src/components/dashboard/PublicDashboardView.tsx` (NEW) — Server Component. Hero `<h1>` + subtitle, primary "Sign in" CTA → `/login` with `ArrowRight` icon (size 18), secondary "Browse the song library" CTA → `/library`, three-card feature strip (`Music` / `ListMusic` / `Sparkles`). No `'use client'`, no hooks, no Supabase.
  - `src/middleware.ts` (MODIFIED) — `PROTECTED_PATHS` changed from `['/dashboard']` to `['/dashboard/profile']`. `/dashboard` itself is now public; `/dashboard/profile` is still matched (both as exact and via `startsWith(p + '/')` for any deeper subpath).
  - `src/app/dashboard/page.tsx` (MODIFIED) — Dropped `redirect('/login')`; if `user === null`, the component returns `<PublicDashboardView />` immediately, before the `profiles` fetch or the `Promise.all` data block. Authenticated composition is byte-identical to the pre-amendment version. Removed the now-unused `redirect` import and added the `PublicDashboardView` import.
- **AC added:** 50–64 (Public Dashboard View).
- **Notes:**
  - Authenticated flow (AC 16–49) is untouched — I only added an early-return branch at the `!user` check and did not modify any code reachable when `user` is truthy.
  - Guest path performs zero Supabase data queries. The only Supabase call on the public path is the existing `auth.getUser()` which the middleware already made; the in-page `auth.getUser()` is also needed to decide branching. No `profiles`, `songs`, or `setlists` reads happen for guests.
  - `PublicDashboardView` is a Server Component — no `'use client'`, no `useState`/`useEffect`/`useCallback`/`useMemo` — so BUG-001 / BUG-002 guards are not relevant to this amendment.
  - No `text-brand-tan on bg-brand-cream` anywhere in the public view. Hero h1 uses `text-brand-espresso` on the `bg-brand-cream` layout card. Subtitle uses `text-brand-brown`. Primary CTA uses `text-brand-espresso` on `bg-brand-tan` (matches AC 47 contrast rule). Feature card titles use `text-brand-espresso`, descriptions use `text-brand-brown`, icons use `text-brand-brown`.
  - All interactive links use the same `focus-visible:ring-2 focus-visible:ring-brand-espresso` pattern present in `NextUpCard.tsx`.
  - `npx tsc --noEmit` passes clean. `npx next lint` surfaces only the same pre-existing warnings as before — no new warnings in any file touched by this amendment.
