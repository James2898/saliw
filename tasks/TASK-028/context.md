# Context Bundle — Skeleton Loading States for Dashboard and Song Library

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `/Users/adish/projects/saliw/src/app/setlists/loading.tsx` | The only existing skeleton loading implementation — the direct pattern to replicate |
| `/Users/adish/projects/saliw/src/app/page.tsx` | Dashboard page (root route, not `/dashboard/`); needs a new sibling `loading.tsx` |
| `/Users/adish/projects/saliw/src/app/library/page.tsx` | Song Library page; needs a new sibling `loading.tsx` |
| `/Users/adish/projects/saliw/src/components/dashboard/GreetingStrip.tsx` | Dashboard widget — skeleton must mirror its section shape (rounded-2xl card, p-6) |
| `/Users/adish/projects/saliw/src/components/dashboard/NextUpCard.tsx` | Dashboard hero widget — largest visual block; needs a prominent skeleton card |
| `/Users/adish/projects/saliw/src/components/dashboard/QuickActions.tsx` | Dashboard widget (music_director only) — two button-shaped placeholders |
| `/Users/adish/projects/saliw/src/components/dashboard/RecentSongs.tsx` | Dashboard widget — 5-row list; skeleton rows match song row layout |
| `/Users/adish/projects/saliw/src/components/dashboard/UpcomingSetlists.tsx` | Dashboard widget — 5-row list; skeleton rows match setlist row layout |
| `/Users/adish/projects/saliw/src/components/server/card.tsx` | Outer `<Card padding="lg">` shell wrapping all dashboard widgets |

## Reuse Candidates

- `/Users/adish/projects/saliw/src/app/setlists/loading.tsx` — Copy the inline skeleton pattern directly: `animate-pulse`, `bg-brand-brown/10` placeholder divs, `bg-brand-cream dark:bg-brand-darker` page background. No shared Skeleton component exists; all skeleton markup is inline per-page. Follow the same approach for both new files.

## Patterns to Follow

- **Inline animate-pulse skeletons (no shared component):** See `/Users/adish/projects/saliw/src/app/setlists/loading.tsx` — every skeleton element is an inline `<div>` with `animate-pulse bg-brand-brown/10`. No `<Skeleton>` component is imported anywhere. New loading files must follow the same inline approach.
- **Page wrapper classes:** Dashboard page uses `min-h-screen bg-brand-cream dark:bg-brand-darker p-4 sm:p-8 flex flex-col` + inner `max-w-5xl mx-auto` + `<Card padding="lg">`. Library page uses `min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans` + `max-w-3xl mx-auto`. Skeleton wrappers must mirror these exactly.
- **Dashboard widget card shape:** Every dashboard widget uses `rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6`. Skeleton cards must replicate this container so layout does not shift when real content loads.
- **Library row shape:** Each song row in `library/page.tsx` (lines 139–178) uses a `flex items-center gap-2 rounded-xl bg-[var(--brand-tan-alpha)] border border-brand-brown/10` wrapper with a title block and a key badge. Skeleton rows must mirror this.
- **Setlist loading pattern:** Header skeleton uses `h-9 w-36` title block, `h-10 w-full max-w-md` search bar, and `Array.from({ length: 3 })` to render N repeated skeleton cards.
- **aria-hidden="true":** All skeleton placeholder divs in the setlist loader carry `aria-hidden="true"`. Follow this pattern for accessibility.

## Anti-Patterns Flagged

- None observed in the files scanned that violate coding guidelines for this feature area.

## MEMORY.md Notes

- **BUG-004** (Dashboard components missing dark mode variants): All dashboard components must include explicit `dark:` Tailwind variants. The skeleton loading files must also pair every Artisan palette class with its `dark:` counterpart. Using `bg-brand-cream` alone without `dark:bg-brand-darker` (or `bg-brand-espresso` in card context) will break dark mode. This is the most directly relevant past bug for this task.
- **BUG-003** (Guest dashboard layout missing wrapper shell): Each return branch in a Server Component must independently include the layout shell. The dashboard `page.tsx` has two return branches (guest and authenticated). The `loading.tsx` does not branch — it is shown before any data fetch — so this bug does not apply directly, but note that the skeleton must mirror the authenticated layout (Card shell included) since that is the most common path.
