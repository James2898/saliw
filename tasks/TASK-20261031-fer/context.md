<Role: Codebase Explorer (@codebase-explorer)>
<Context Bundle — Navbar Full-Width Header Expansion (PR 1)>

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/navbar.tsx` | Main navigation component; line 213 interior container is updated from `max-w-5xl mx-auto px-4 sm:px-8` to `w-full px-4 sm:px-8`. |
| `src/app/layout.tsx` | Root layout mounting `<Navbar />` globally above page `{children}`. |
| `src/app/page.tsx` | Home/Dashboard view; verifies page content wrapper uses centered `w-full max-w-5xl mx-auto` and is unaffected. |
| `src/app/library/page.tsx` | Song library view; verifies page content wrapper uses centered `max-w-3xl mx-auto` and is unaffected. |
| `src/app/setlists/page.tsx` | Setlists view; verifies page content wrapper uses centered `max-w-3xl mx-auto` and is unaffected. |
| `docs/coding-guidelines.md` | Artisan design tokens, standard button heights (`h-9`), and mobile responsive flex conventions. |
| `docs/structure.md` | Directory layout guidelines for App Router pages and client/server components. |
| `pbi-docs/PBI-20261031-navbar-expansion-and-changelog.md` | Authoritative PBI document defining the PR 1 and PR 2 phasing boundaries. |

## Reuse Candidates
- `src/components/client/navbar.tsx:213` — The interior `<div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-4">`: modify width classes in place (`w-full px-4 sm:px-8 h-16 flex items-center gap-4`) while reusing all existing children, links, and triggers.
- `src/components/client/navbar.tsx:257` — Spacer element `<div className="flex-1" />`: already exists and separates left-aligned brand/links from right-aligned utility controls.
- Tailwind v4 core utilities (`w-full`, `px-4`, `sm:px-8`, `flex-1`, `flex`, `items-center`, `gap-4`) — Standard utility classes already present in the project without custom CSS.
- `src/components/client/navbar.tsx:192-208` (`iconBtnClass` & `authBtnClass`) — Established Artisan button tokens and focus rings (`focus-visible:ring-brand-brown focus-visible:ring-offset-2`).

## Patterns to Follow
- Fluid Edge-to-Edge Navigation: See `src/components/client/navbar.tsx:212-213` — outer `<nav>` stays `sticky top-0 z-50 bg-[var(--brand-background)] border-b border-brand-brown/20` while interior container stretches `w-full px-4 sm:px-8`.
- Opposing Edge Anchoring via Flex-1 Spacer: See `src/components/client/navbar.tsx:257` — `<div className="flex-1" />` pushes navigation links flush left and user/theme controls flush right across all screen widths up to ultra-wide (2560px+).
- Independent Centered Page Content Containers: See `src/app/page.tsx:187` (`max-w-5xl mx-auto`) and `src/app/library/page.tsx:196` (`max-w-3xl mx-auto`) — page-level body layouts remain constrained and centered independently of the full-width navbar.
- Phased Safe Release (Dead-Link Prevention): Deferring the Changelog navbar item to Phase 2 / PR 2 prevents broken 404 links on `main` before the route exists.

## Anti-Patterns Flagged
- `src/components/client/navbar.tsx:212`: `<nav className="... text-brand-espresso dark:text-brand-espresso">` contains a duplicate dark class declaration (`dark:text-brand-espresso`) on the nav container; children explicitly specify `dark:text-brand-cream` or `dark:text-brand-tan`. Do not replicate redundant container text classes.
- Modifying page-level body wrappers (`max-w-5xl` or `max-w-3xl`) across `src/app/**/page.tsx`: Violates AC 6 and scope boundaries; only `navbar.tsx` should be modified for Phase 1.
- Adding `/changelog` route link to `navLinks` in `navbar.tsx` during PR 1: Violates AC 7; would introduce a dead 404 link on production prior to Phase 2.

## MEMORY.md Notes
- `MEMORY.md` does not exist in repository/worktree (treated as empty / N/A).
- Notice from `GEMINI.md`: Saliw layout mounts a mobile navigation drawer with `role="dialog"`. In automated/Playwright tests, never query `[role="dialog"]` alone without scoping by `aria-label="Navigation menu"` or specific modal IDs to avoid collisions with `LogoutModal`.
