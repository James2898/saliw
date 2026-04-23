# Spec — Dashboard Landing Page

## Feature Summary

Replace the stub `/dashboard` route with a functional landing page that greets the authenticated user by name, surfaces the most immediately relevant setlist (next upcoming or most recent past), exposes director-only quick actions, and provides at-a-glance visibility into recent library activity. All data is fetched in a single Server Component (`src/app/dashboard/page.tsx`) using parallel queries. The existing `DashboardLayout` already wraps the page in a `Card`; no additional card wrapper is added. A Supabase migration adds `created_at` and `updated_at` timestamp columns (with auto-update triggers) to both `songs` and `setlists` before any dashboard queries are issued.

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
17. For a `music_director` role user, a role pill with the text "Music Director" is rendered with `bg-brand-espresso` and `text-brand-cream` (or equivalent Artisan espresso-tone classes).
18. For a non-director role user, a role pill with the text "Musician" is rendered with `bg-brand-tan` and `text-brand-espresso` (or equivalent Artisan tan-tone classes).
19. For a `music_director` role user, the subtitle reads exactly: "You have everything ready for your next service."
20. For a non-director role user, the subtitle reads exactly: "Check what's coming up next."

### Next Up Setlist Hero

21. The hero queries the `setlists` table for rows where `date >= today` ordered by `date asc`, limit 1. If a row is found, that setlist is rendered as the "Next Up" hero.
22. If no upcoming setlist exists, the hero falls back to the most recent past setlist (`date < today` ordered by `date desc`, limit 1).
23. When a setlist is found (upcoming or past), the hero displays: the setlist name, the setlist date formatted in the same locale pattern used in `src/app/setlists/page.tsx` (`{ year: 'numeric', month: 'long', day: 'numeric' }`), and the song count (from `setlist_songs` aggregate).
24. The hero renders a "Open Stage View" primary button linking to `/setlists/{id}` regardless of user role.
25. For a `music_director` role user, the hero renders an edit pencil icon link to `/setlists/{id}/edit`. This icon is not rendered for non-director users.
26. The edit pencil icon has an accessible `aria-label` (e.g. "Edit {setlist.name}") matching the pattern used on the setlists list page.
27. When there are no setlists at all (both upcoming and fallback queries return empty), and the user is a `music_director`, the hero renders a "Create your first setlist" CTA linking to `/setlists/new`. The "Open Stage View" button is not rendered.
28. When there are no setlists at all and the user is not a director, the hero renders the text "No upcoming setlists — check back soon." and no CTA button.

### Quick Actions Rail

29. The Quick Actions rail is rendered only when `isMusicDirector` is `true`. It is completely absent from the DOM (not hidden via CSS) for non-director users.
30. The Quick Actions rail contains a "New Setlist" button linking to `/setlists/new`.
31. The Quick Actions rail contains an "Add Song" button linking to `/library/new`.

### Recent Songs

32. The Recent Songs widget queries the `songs` table for 5 rows ordered by `created_at desc`.
33. Each row displays: song title, artist name, and the `original_key` value rendered as a chip (matching the chip styling used in `src/app/library/page.tsx`: `text-xs font-semibold text-brand-brown bg-brand-cream rounded-lg px-2 py-0.5 border border-brand-brown/20`).
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

## Out of Scope

- Realtime or auto-refreshing data (WebSocket subscriptions, polling intervals)
- Pagination within any dashboard widget
- Search or filtering within any dashboard widget
- Song editing or setlist editing from the dashboard (links navigate away to dedicated pages)
- A count or summary of all songs / all setlists
- User profile editing or avatar display
- Any dashboard widget for non-authenticated (public) visitors
- Dark mode styling on the dashboard page (not included in the approved plan)
- Skeleton loading states or Suspense boundaries for individual widgets

## Fallback Behaviors

- **No setlists exist (director):** "Create your first setlist" CTA displayed in the Next Up hero; "Open Stage View" button absent; edit pencil absent.
- **No setlists exist (musician):** Static text "No upcoming setlists — check back soon." displayed in the Next Up hero; no CTA.
- **No songs exist:** Recent Songs widget renders "No songs in the library yet." text; no list rows.
- **Activity Feed empty:** Activity Feed renders nothing — no container, no message.
- **Supabase query error on any widget:** The page must not crash. Wrap each data fetch in try/catch; on error, the widget renders its empty state with a user-friendly message rather than propagating the exception.

## Resolved Ambiguities

- "Today" boundary for setlist queries → Resolved from approved plan: use `date >= today` (ISO date string comparison) for upcoming; `date < today` for past fallback.
- Date formatting locale → Resolved from `src/app/setlists/page.tsx:151-156`: `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`.
- Role pill color scheme → Resolved from approved plan: espresso tone for directors, tan tone for musicians; contrast constraint means musician pill must use `text-brand-espresso` on tan background.
- isMusicDirector derivation → Resolved from `src/app/library/page.tsx:44-58`: query `profiles.role` and compare to `'music_director'`; default `false` on error.
- Activity Feed relative time source → Resolved: computed server-side in the Server Component from `updated_at` field added by migration; no client-side `Date` calculation required.
- Double Card wrapper → Resolved from `src/app/dashboard/layout.tsx:8`: layout already wraps children in `<Card padding="lg">`; page component must not add another `Card`.
- Migration filename → Resolved from approved plan: `20260424000002_add_timestamps_to_songs_and_setlists.sql` (next sequential after `20260424000001`).
- Quick Actions visibility mechanism → Resolved from approved plan: completely absent from DOM for non-directors (conditional render, not CSS hide).
- Activity Feed empty state → Resolved from approved plan: render nothing — no message, no wrapper element.
- Button component for CTAs → Resolved from `src/components/client/button.tsx`: use the existing `Button` component with `variant="primary"`. For link-buttons (anchor tags styled as buttons), wrap with Next.js `Link` and style with equivalent Artisan classes, or pass `asChild` if supported (component does not currently expose `asChild`; use a styled `Link` with matching classes instead).
