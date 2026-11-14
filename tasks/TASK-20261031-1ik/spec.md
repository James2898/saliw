<Spec — Changelog Page & Navigation Item>
## Feature Summary
Implement a dedicated public Changelog route (`/changelog`) in Saliw that parses `CHANGELOG.md` directly on the server via Node `fs` without database overhead or external parsing dependencies. The page renders releases chronologically with friendly date headings, deep-link anchors, color-coded semantic category badges (`Added`, `Changed`, `Fixed`, `Security`), client-side category filter chips styled consistently with `TagFilterBar`, a sticky desktop release index sidebar, and sanitization of internal developer notes (e.g. ticket numbers and file lists). In addition, append a public "Changelog" item with the `History` icon to the primary navigation bar (`src/components/client/navbar.tsx`), integrating seamlessly into both desktop header and mobile drawer navigation.

## Acceptance Criteria
1. **Public Route & Metadata:** A new public route `/changelog` is implemented at `src/app/changelog/page.tsx` displaying document title `"Changelog | Saliw"` and descriptive open graph/meta tags, accessible to unauthenticated guests and authenticated members.
2. **Server-Side Markdown Ingestion:** The page reads `CHANGELOG.md` directly from the project root using Node `fs` (`fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')`) in a Server Component without introducing third-party markdown parsing libraries or database tables.
3. **Chronological Release Parsing & Heading Formatting:**
   - Release section headings matching `## [Unreleased] — YYYY-MM-DD` or `## YYYY-MM-DD` are parsed chronologically (most recent first).
   - The token `[Unreleased]` is stripped from public release headings.
   - Dates are formatted into human-friendly strings (e.g., `"2026-10-30"` becomes `"October 30, 2026"`).
   - Each release container renders an anchor ID attribute `id="release-YYYY-MM-DD"` enabling direct deep-linking via URL hash.
4. **Developer Note Sanitization:**
   - Internal ticket references (e.g., `(TASK-xxx)`, `(BUG-xxx)`) and acceptance criteria / audit markers (e.g., `(AC-x)`, `(AM-y)`, `(AC-x, AM-y)`) are stripped from bullet text in the public view.
   - Sub-bullet lines beginning with `Affected files:` and their nested child paths are excluded from primary public rendering.
5. **Category Section Badges & Palette:**
   - Under each release, entries are grouped or tagged by category (`Added`, `Changed`, `Fixed`, `Security`).
   - Category badges render semantic color coding meeting WCAG AA contrast against Artisan background themes:
     - `Added`: Emerald/green tint
     - `Changed`: Amber/brand tint
     - `Fixed`: Blue/indigo/violet tint
     - `Security`: Red/rose tint
   - Container layout uses `max-w-4xl mx-auto px-4 sm:px-8` and Artisan palette background/text styling (`brand-cream` / `brand-darker` / `brand-espresso`).
6. **Client-Side Category Filter Chips:**
   - A client component filter chip bar (`All`, `Added`, `Changed`, `Fixed`, `Security`) allows immediate client-side filtering without page reload.
   - Styling and active pill states match the visual patterns of `src/components/SongTags/TagFilterBar.tsx`.
   - Selecting a category filters the visible release entries to only those matching the active filter; if a release has zero matching entries under the active filter, that release section is cleanly hidden or collapsed.
   - An empty state message is displayed if no entries match the selected filter across all releases.
7. **Desktop Release Jump Index:**
   - On desktop viewports (`lg:` breakpoint), a sticky release navigation index is rendered alongside the release timeline.
   - The jump index lists all release dates with item count badges for each release.
   - Clicking a release date smoothly navigates to that release's anchor (`#release-YYYY-MM-DD`).
8. **Primary Navigation Bar Integration:**
   - `src/components/client/navbar.tsx` appends `{ href: "/changelog", label: "Changelog", Icon: History }` to `navLinks`.
   - The `History` icon is imported from `lucide-react`.
   - For unauthenticated visitors, the Changelog link appears as the 4th item (following Setlists).
   - For authenticated users, the Changelog link appears as the 5th item (following Musicians).
   - The Changelog link automatically renders in the mobile drawer (`#mobile-sidebar`) and reflects active route highlighting when `/changelog` is active.
9. **Graceful Error / Empty Fallback:**
   - If `CHANGELOG.md` cannot be read or is empty, the Server Component renders a user-friendly fallback state ("No changelog entries available.") rather than crashing or throwing an unhandled exception.

## Out of Scope
- Database storage, migrations, or Supabase tables for changelog entries.
- External markdown or AST parser dependencies (e.g., `remark`, `rehype`, `marked`).
- Editing, authoring, or mutating changelog entries via UI / admin forms.
- RSS/Atom feed generation or email subscription webhooks for changelog updates.

## Fallback Behaviors
- Missing or Unreadable `CHANGELOG.md`: The page renders a graceful empty state message in an Artisan card container ("No changelog entries available at this time.") without throwing a 500 error.
- Unmatched heading format: Any release heading that fails strict `YYYY-MM-DD` extraction falls back to rendering the raw heading string (with `[Unreleased]` stripped) and generates a sanitized slug for the anchor ID.
- Zero Filter Matches: If a user selects a category filter (e.g. `Security`) that has no matching items in the changelog, a clean empty state ("No entries match the category filter.") with a "Reset Filter" action button is displayed.

## Resolved Ambiguities
- Data source & storage → Read directly from `CHANGELOG.md` on the server using Node `fs`; no database tables or migrations needed (Source: PBI-20261031 Phase 2 spec).
- Visitor Permissions → Public route accessible to all visitors (guests and authenticated members) without auth redirects (Source: PBI-20261031 Phase 2 spec).
- Navigation placement → Appended to the end of `navLinks` in `src/components/client/navbar.tsx` with `History` icon; naturally places 4th for guests and 5th for members (Source: PBI-20261031 Phase 2 spec).
- Mobile navigation parity → Uses existing `navLinks` mapping so it renders into the mobile drawer (`#mobile-sidebar`) automatically (Source: PBI-20261031 Phase 2 spec).
- Developer note sanitization → Strip `(TASK-xxx)`, `(BUG-xxx)`, `(AC-x, AM-y)`, and omit `Affected files:` sub-bullets (Source: PBI-20261031 Phase 2 spec).
