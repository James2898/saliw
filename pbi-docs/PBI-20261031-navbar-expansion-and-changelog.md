# PBI-20261031 — Navbar Full-Width Header Expansion and Changelog Page

- **Saved:** 2026-10-31
- **Source:** User request + `/design-grill` rounds decision record (chat, 2026-10-31)

---

## PBI (verbatim)

### Original Request

> i want to create a change log page for the saliw, and expland first the header of the nav bar to fully use the full witdth of the screen, the change log on the nabvar will be  at the end of the nav bar items

### Additional Feedback & Constraints

> 9. check the ai-tool-box repo how they handle and refrence it, 
> 10. let use history
> 11. check what is the industry standard
> 
> else is okay
> 
> also in parallel to  check for the /leak-check for the changelog content
> 
> also the page header and the change log task are separate  and will not be included in the same pr, the page header will be first push
> 
> /design-grill again for round 2

### Grill Decisions (2026-10-31)

| # | Decision | Answer | Source | Spec Section |
|---|---|---|---|---|
| Q1.1 | Data source for Changelog | Read and parse `CHANGELOG.md` directly on the server via Node `fs` (zero new DB tables or dependencies) | Recommendation accepted | Data model & Architecture |
| Q1.2 | Engineering metadata display | Filter out internal task artifacts (`(TASK-xxx)`, `(AC-x)`, `Affected files: ...`, `BUG-xxx`) from the public UI | Recommendation accepted | User/behaviour |
| Q1.3 | Scope of full-width expansion | Only `<Navbar />` expands to full-width; page body wrappers (`max-w-5xl`, `max-w-3xl`) stay centered | Recommendation accepted | Scope boundary |
| Q1.4 | Navbar width styling | Fluid `w-full px-4 sm:px-8` edge-to-edge layout with `flex-1` spacer between links and controls | Recommendation accepted | Layout & Non-functional |
| Q1.5 | Route access permissions | Publicly accessible to all visitors (guests and authenticated members) | Recommendation accepted | Scope & Security |
| Q1.6 | Navbar link placement | Placed at the end of `navLinks`: 4th item for guests (after Setlists), 5th item for members (after Musicians) | Recommendation accepted | Acceptance / UI Consistency |
| Q1.7 | Mobile navigation parity | Included in `navLinks` array so it automatically appears in `#mobile-sidebar` drawer | Recommendation accepted | Mobile / Non-functional |
| Q1.8 | Visual presentation | Vertical reverse-chronological timeline using Saliw's Artisan palette (`brand-cream`, `brand-brown`, `brand-tan`, `brand-espresso`) | Recommendation accepted | UI Design & Theming |
| Q1.9 / Q2.2 | Release heading format | Display friendly formatted dates (e.g. "October 30, 2026") with ISO anchors (`#release-2026-10-30`), stripping `[Unreleased]` | Research (`ai-toolbox/CHANGELOG.md`) + recommendation accepted | User/behaviour |
| Q1.10 | Navbar item icon | `History` icon from `lucide-react` | User decision | UI Design |
| Q1.11 / Q2.3 | Category filtering | Client-side filter chips (`All`, `Added`, `Changed`, `Fixed`, `Security`) matching `TagFilterBar` styling | Industry standard + recommendation accepted | User/behaviour & Scope |
| Q2.1 | PR sequencing | **PR 1**: Navbar full-width header expansion (Changelog link deferred to avoid 404s).<br>**PR 2**: Changelog page implementation + wiring `History` link in navbar. | User requirement + recommendation accepted | Workflow & Release management |
| Q2.4 | Desktop release jump list | Sticky release date sidebar index on desktop (`lg:block`) with jump anchors and item counts | Research (`ai-toolbox`) + recommendation accepted | Desktop UX |
| Q2.5 | Navbar padding classes | `w-full px-4 sm:px-8` (replacing `max-w-5xl mx-auto px-4 sm:px-8`) | Code (`navbar.tsx:213`) + recommendation accepted | Layout |
| Q2.6 | Changelog page container width | `max-w-4xl mx-auto px-4 sm:px-8` | Recommendation accepted | Layout & Typography |
| Audit | Security & leak status | Clean — 0 secrets, 0 API keys, 0 private paths, 0 emails across `CHANGELOG.md` | `leak-check` audit verified | Security & Compliance |

---

## Analysis

### Acceptance Criteria

#### Phase 1: Navbar Full-Width Header Expansion (PR 1 — First Push)

- [ ] The `<nav>` interior container in `src/components/client/navbar.tsx` replaces `max-w-5xl mx-auto px-4 sm:px-8` with `w-full px-4 sm:px-8`.
- [ ] On viewports from `md` up to ultra-wide (`2560px+`), the brand logo and nav links remain anchored to the left edge (with `px-4 sm:px-8` padding) and the right-hand controls (Theme toggle, Greeting, Profile, Login/Logout) remain anchored to the right edge via `flex-1` spacer.
- [ ] Existing navigation links (`Dashboard`, `Library`, `Setlists`, and conditional `Musicians`) maintain their standard gap (`gap-1 ml-4`), hover, focus ring, and active route highlight styles.
- [ ] The mobile hamburger button on viewports `< md` remains flush to the right edge with standard padding and triggers the `#mobile-sidebar` drawer properly.
- [ ] PR 1 does NOT introduce the Changelog link yet, ensuring no broken navigation or 404 links exist on `main` before the page is built.
- [ ] All existing page body wrappers (`src/app/page.tsx` at `max-w-5xl`, `src/app/library/page.tsx` and `src/app/setlists/page.tsx` at `max-w-3xl`) remain unaffected and properly centered.
- [ ] Existing automated unit tests pass without regressions (`npm run test:unit`).

#### Phase 2: Changelog Page & Navigation Item (PR 2 — Follow-up Push)

- [ ] A new public route `/changelog` is implemented at `src/app/changelog/page.tsx` with title `"Changelog | Saliw"` and descriptive metadata.
- [ ] The page reads `CHANGELOG.md` directly from the filesystem on the server via Node `fs` (Server Component), requiring no database migrations or third-party parsing dependencies.
- [ ] Release entries are parsed chronologically:
  - Headings formatted as `## [Unreleased] — YYYY-MM-DD` or `## YYYY-MM-DD` render with clean, friendly dates (e.g. `"October 30, 2026"`) with `[Unreleased]` stripped.
  - Releases render an HTML anchor `id="release-YYYY-MM-DD"` enabling direct deep-linking.
  - Category sections (`### Added`, `### Changed`, `### Fixed`, `### Security`) render with color-coded semantic badges.
- [ ] Technical developer notes are sanitized from the public UI:
  - Internal ticket keys `(TASK-xxx)` and AC markers `(AC-x, AM-y)` are stripped from bullet text.
  - Sub-bullets starting with `Affected files:` are hidden from primary view.
- [ ] Category filter chips (`All`, `Added`, `Changed`, `Fixed`, `Security`) allow instant client-side filtering, styled consistently with `src/components/SongTags/TagFilterBar.tsx`.
- [ ] On desktop (`lg:` breakpoint), a sticky release index displays all release dates with item count badges for fast jumping.
- [ ] The `/changelog` content is wrapped in `max-w-4xl mx-auto px-4 sm:px-8` within Saliw's Artisan palette (`brand-cream` / `brand-darker`).
- [ ] `navLinks` in `src/components/client/navbar.tsx` appends `{ href: "/changelog", label: "Changelog", Icon: History }`.
- [ ] The Changelog link is visible to all users: appears as the 4th item for unauthenticated guests (after Setlists) and 5th item for authenticated users (after Musicians).
- [ ] The Changelog link automatically renders in the mobile drawer (`#mobile-sidebar`) with active route styling.

---

### Scope & Out-of-Scope

- **In scope (PR 1):**
  - Updating `<Navbar />` header container from `max-w-5xl mx-auto` to `w-full px-4 sm:px-8`.
  - Responsive alignment and edge gutter verification on mobile, tablet, desktop, and ultra-wide screens.
- **In scope (PR 2):**
  - Server-side parsing and rendering of `CHANGELOG.md`.
  - Creating `src/app/changelog/page.tsx` and associated UI components (Timeline, Filter chips, Release index).
  - Adding `"Changelog"` with Lucide `History` icon to `navLinks` in `navbar.tsx`.
- **Out of scope (both PRs):**
  - Expanding page body containers across other routes (`/`, `/library`, `/setlists`) to full width (kept centered per AC).
  - Modifying Supabase database schema, tables, or RLS policies.
  - Installing external markdown parsing packages (e.g., `marked`, `react-markdown`).
  - Editing or administrative write UI for `CHANGELOG.md` (content remains git-managed and updated by `@release-manager`).

---

### Ambiguities & Risks

1. **Dead Link Prevention (Resolved by PR split):** Adding the Changelog link to the navbar in PR 1 before the page exists would create a broken 404 route on production. Explicitly deferring the navbar link to PR 2 eliminates this risk.
2. **Markdown Parsing Edge Cases:** `CHANGELOG.md` contains markdown bullets, bold text, inline code backticks, sub-bullets, and links. The server parser must cleanly extract entries without throwing runtime errors if future entries have slight formatting variations.
3. **Ultra-Wide Visual Balance:** On ultra-wide monitors (e.g. 3440px), stretching the navbar to 100vw while page content remains `max-w-5xl` creates a distinct visual layout. Confirmed in Grill that `w-full px-4 sm:px-8` is the desired behavior.

---

### Codebase-Aware Notes

- **Navbar Component:** `src/components/client/navbar.tsx`
  - Line 28–33: `navLinks` definition array.
  - Line 213: Main container `<div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-4">`. Replacing `max-w-5xl mx-auto` with `w-full` expands the header cleanly.
  - Line 231 & 413: RBAC filtering (`if (href === "/musicians" && !user) return null`). Appending Changelog here ensures it renders after Setlists for guests and after Musicians for logged-in users.
  - Line 412–438: Mobile drawer map reusing `navLinks`.
- **Changelog Data Source:** `CHANGELOG.md`
  - 655 lines at repository root. Verified clean of leaks, credentials, and local paths by `leak-check`.
- **Reusable Component & Style Conventions:**
  - `src/components/SongTags/TagFilterBar.tsx`: Reference for active/inactive Artisan chip styles (`bg-brand-brown text-brand-cream`, `hover:bg-brand-brown/10`).
  - `src/components/server/card.tsx`: Card styling conventions for Artisan borders and backgrounds.
  - `src/styles/globals.css`: Theme tokens (`--brand-cream`, `--brand-brown`, `--brand-tan`, `--brand-espresso`, `--brand-darker`).
