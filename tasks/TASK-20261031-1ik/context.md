<Role: Codebase Explorer (@codebase-explorer)>
<Context Bundle — Changelog Page & Navigation Link (Phase 2)>

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `CHANGELOG.md` | Data source at repo root (655+ lines); read server-side via Node `fs` without database or external parser dependencies. |
| `src/components/client/navbar.tsx` | Main navigation component; appends `{ href: "/changelog", label: "Changelog", Icon: History }` to `navLinks` with Lucide `History` icon. |
| `src/components/SongTags/TagFilterBar.tsx` | Canonical reference for Artisan filter chip styles (`bg-brand-espresso` / `bg-brand-cream/60`), border, and active state transitions. |
| `src/components/SongTags/SongTagBadge.tsx` | Reference implementation for semantic color-coded category badges (`Added`, `Changed`, `Fixed`, `Security`) with light/dark pairs. |
| `src/components/server/card.tsx` | Card shell component implementing `.main-card` Artisan borders and padding variants for release cards. |
| `src/styles/globals.css` | Defines Artisan color variables (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`) and semantic theme tokens. |
| `src/app/layout.tsx` | Root layout defining `title.template: "%s | Saliw"`; child route page title `"Changelog"` automatically formats to `"Changelog | Saliw"`. |
| `src/app/library/page.tsx` | Reference for public page layout (`min-h-screen bg-brand-cream dark:bg-brand-darker font-sans`), header layout, and search/filter patterns. |
| `src/components/dashboard/UpcomingSetlists.tsx` | Canonical UTC date formatting reference (`toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })`). |
| `scripts/parsers/hymnsMarkdownParser.ts` | Reference for zero-dependency pure markdown parsing with regex, string replacements, and isolated unit tests. |
| `vitest.config.ts` | Vitest configuration running in Node environment with `@/` path alias support for unit testing pure parser utilities. |
| `pbi-docs/PBI-20261031-navbar-expansion-and-changelog.md` | Authoritative specification document defining Phase 2 acceptance criteria and scope boundaries. |
| `.ai-toolbox/handoffs/2026-10-31-phase-2-changelog-page.md` | Phase 2 handoff document with settled architecture and lean-change ladder decisions. |

## Reuse Candidates
- `lucide-react` `History` icon — Already installed dependency. Import `History` in `src/components/client/navbar.tsx` and pass as `Icon: History` in `navLinks`.
- `src/components/SongTags/TagFilterBar.tsx:85-94` — Chip styling classes:
  - Active: `bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream shadow-xs`
  - Inactive: `bg-brand-cream/60 dark:bg-brand-espresso/60 text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown dark:hover:border-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10`
  - Pill geometry: `px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-all duration-200 cursor-pointer select-none`
  - Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1`
- `src/components/SongTags/SongTagBadge.tsx:9-19` — Semantic category badge color palette:
  - `Added`: `bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60`
  - `Changed`: `bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/60`
  - `Fixed`: `bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60`
  - `Security`: `bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60`
  - Fallback: `bg-brand-cream dark:bg-brand-espresso text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20`
- `src/components/server/card.tsx` — Reusable container wrapper `Card` using `.main-card` with configurable padding (`sm`, `md`, `lg`) and Artisan border colors.
- Node standard library `fs` (`fs.promises.readFile` / `fs.readFileSync`) & `path` — Zero-dependency file reading for Server Components.
- Next.js App Router metadata system — Root layout `title.template` (`%s | Saliw`) formats page title cleanly without hardcoded suffixes.

## Patterns to Follow
- Server Component Data Ingestion: In `src/app/changelog/page.tsx`, read `CHANGELOG.md` directly via `path.join(process.cwd(), "CHANGELOG.md")` during server render. Keep the route pure Server Component and pass parsed data down to interactive client controls (filter chips, timeline).
- Pure Parser Module Separation: Extract parsing logic into a dedicated pure utility (e.g. `src/utils/changelogParser.ts`) following the design of `scripts/parsers/hymnsMarkdownParser.ts`. Keep it free of I/O or DOM dependencies so it can be thoroughly unit tested via Vitest.
- Timezone-Safe UTC Date Parsing (BUG-018): Extract year, month, and day explicitly from `YYYY-MM-DD` strings and construct `new Date(Date.UTC(year, month - 1, day))` with `timeZone: "UTC"` in `toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })` to prevent off-by-one calendar shifts across local browser timezones.
- NavLinks Array-Driven RBAC & Order: In `src/components/client/navbar.tsx`, append `{ href: "/changelog", label: "Changelog", Icon: History }` after `/musicians` in `navLinks`. Because `/musicians` is skipped for unauthenticated guests (`if (href === "/musicians" && !user) return null`), `/changelog` automatically renders as 4th item for guests (after Setlists) and 5th item for members (after Musicians). Mobile drawer (`#mobile-sidebar`) reuses the same array automatically.
- Accessible Deep-Link Anchors: Assign `id="release-YYYY-MM-DD"` (or unique slug if multiple entries share a date) to each release section heading with `scroll-mt-20` so smooth anchor jumps clear the 64px sticky navbar (`sticky top-0 h-16`).
- Desktop Sticky Jump Index: Wrap the sidebar index in `sticky top-24 hidden lg:block` to keep release dates and badge counters accessible while scrolling the timeline.
- Dual-Theme Artisan Color Pairings (BUG-005): Ensure every named Tailwind utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) is accompanied by an explicit `dark:` counterpart (e.g. `text-brand-espresso dark:text-brand-cream`, `bg-brand-cream dark:bg-brand-darker`).

## Anti-Patterns Flagged
- Installing Third-Party Markdown Parsers: Do not install `marked`, `react-markdown`, `remark`, or `showdown`. The lean-change ladder mandates standard library Node `fs` and regex parsing for structured changelog entries.
- Unscoped Dialog Queries in Tests: Per `GEMINI.md`, the layout permanently mounts `#mobile-sidebar` with `role="dialog"`. Never query `document.querySelector('[role="dialog"]')` alone in Playwright verification without scoping by `aria-label` or specific modal ID.
- Missing `dark:` Variant on Named Utilities: Flagged in `BUG-005`. Named brand utilities do not automatically respond to `.dark` class without explicit `dark:` pairing.
- Inline Object/Array Props in Memoized Children: Flagged in `BUG-019` / `MEMORY.md`. Hoist static category filter definitions (`TAG_OPTIONS` / `CATEGORY_OPTIONS`) to module scope rather than allocating inline inside component render loops.
- Object Property Paths in Hook Dependency Arrays: Flagged in `BUG-002`. The React Compiler treats `[obj.prop]` as ambiguous and fails build compilation. Depend on primitives or the parent object directly.
- Direct Window Check in `useState` Initializer: Flagged in `BUG-020`. Never write `useState(() => typeof window !== "undefined")` as a mount guard in client components.

## MEMORY.md Notes
- **BUG-007 (React Compiler Declaration Order):** In React Client Components, always declare helper functions and callbacks before any hook (`useEffect`, `useCallback`, `useMemo`) that references them. The React Compiler enforces strict declaration order and treats forward references as fatal build errors.
- **BUG-005 (Artisan Dark Mode Utility Pairing):** Every component using named Tailwind brand utilities (`text-brand-espresso`, `bg-brand-cream`, `border-brand-brown`) must include explicit `dark:` counterparts (`dark:text-brand-cream`, `dark:bg-brand-espresso`, `dark:border-brand-tan`). Background CSS variables auto-switch, but Tailwind named classes do not.
- **BUG-018 (Date Parsing & Timezone Offsets):** When parsing dates formatted as `"YYYY-MM-DD"`, never pass them naively to local date constructors. Parse year, month, and day into `Date.UTC()` and format with `timeZone: "UTC"` to avoid local timezone rollback.
- **BUG-002 (React Compiler Dependency Arrays):** Never place object property paths in `useCallback` or `useMemo` dependency arrays (e.g. `[filter.category]`). Use destructured primitive variables or hoist static constants.
- **BUG-020 (SSR Hydration Mount Guards):** Do not use `useState(() => typeof window !== "undefined")`. For client-only mounting states, use `useState(false)` + `useEffect(() => setMounted(true), [])` with the appropriate eslint-disable annotation.
- **BUG-006 (Tailwind v4 Documentation Scanner Guard):** Never write arbitrary Tailwind class patterns containing wildcard asterisks (`*`) in code comments, markdown docs, or text strings under the project root. Tailwind v4 scans all files and crashes compilation on delimiter asterisks.
- **BUG-025 (Worktree Symlink Dev Server):** When verifying locally in a git worktree, start dev server with `npx next dev -p <port>` (no `--turbopack` flag) to avoid symlink resolution errors.
