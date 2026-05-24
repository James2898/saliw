# MEMORY.md — Bug Root Causes & Resolutions

> Maintained by `@debug-memory`. Read by agents when PM includes it in the Context Bundle.
> Agents that read: @codebase-explorer, @requirements-engineer, @fullstack-developer, @release-manager, @validator-agent.
> Only `@debug-memory` writes to this file.

---

## UI State

- **BUG-001** | 2026-04-18 | Feature: `Font Size Persistence`
  - **Root Cause:** `src/hooks/useFontSize.ts` called `setState` synchronously inside `useEffect` to read `localStorage` on mount, causing a guaranteed double-render that Next.js 15 / React 19 strict-mode lint treats as a compile error on Vercel.
  - **Resolution:** Replaced the `useEffect` + `setState` pattern with a `useState` lazy initializer — `useState(readStoredFontSize)` — in `src/hooks/useFontSize.ts`. The initializer runs once at construction time, produces no extra render, and returns `DEFAULT_SIZE` when `window` is undefined (SSR-safe).
  - **Prevention:** Never initialize React state from `localStorage` / `sessionStorage` via `useEffect` + `setState`. Always use a lazy initializer: `useState(() => readValue())`.

- **BUG-005** | 2026-04-24 | Feature: `Song Library Dark Mode`
  - **Root Cause:** `src/app/library/page.tsx` used hard-coded Artisan named utilities (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`) with no `dark:` variants on song row text, key badge, page heading, count line, and edit icon. The row container background used a CSS variable (`bg-[var(--brand-tan-alpha)]`) that auto-switches, but Tailwind named utilities do not respond to the `.dark` class automatically — they require explicit `dark:` pairing — so text became near-invisible against the switched background.
  - **Resolution:** Added explicit `dark:` variants throughout `src/app/library/page.tsx`: song title (`dark:text-brand-cream`), artist name (`dark:text-brand-tan`), key badge background/text/border (`dark:bg-brand-espresso` + matching text/border), page heading (`dark:text-brand-cream`), count line (`dark:text-brand-tan`), edit icon (`dark:text-brand-tan` + matching hover).
  - **Prevention:** Whenever a component background switches via a CSS variable (e.g. `bg-[var(--brand-tan-alpha)]`) but text/border/icon uses a named Tailwind utility (`text-brand-espresso`, `bg-brand-cream`), the text will silently break in dark mode. Always audit and add explicit `dark:` pairs for every named utility whenever a mixed auto-switch/named-utility pattern is used. This is a recurring Artisan pattern — every `text-brand-*`, `bg-brand-*`, and `border-brand-*` class must have a corresponding `dark:` variant.

- **BUG-018** | 2026-05-04 | Feature: `Upcoming Setlists Dashboard`
  - **Root Cause:** Supabase `setlists.date` column is typed `timestamptz`, not `date`. PostgREST returns full ISO 8601 timestamps like `"2026-05-10 00:00:00+00"`. All four call sites (`NextUpCard.tsx`, `UpcomingSetlists.tsx`, `setlists/page.tsx`, `setlists/[id]/page.tsx`) used `split("-").map(Number)` expecting a plain `"YYYY-MM-DD"` string. Splitting `"2026-05-10 00:00:00+00"` on `"-"` yields `["2026", "05", "10 00:00:00+00"]`, and `Number("10 00:00:00+00")` is `NaN`, so `new Date(2026, NaN, NaN)` produces Invalid Date. Secondary issue: `UpcomingRow.date` and `UpcomingSetlist.date` were typed as non-nullable `string`, masking the fact that the DB column is `timestamptz NULL`.
  - **Resolution:** Replaced split-parse with UTC-part extraction at all four call sites: `const dt = new Date(dateString); return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });`. Using `getUTC*` prevents timezone off-by-one: a date stored as midnight UTC renders as the correct local date regardless of browser timezone offset.
  - **Prevention:** When Supabase returns a `timestamptz` column, the value is a full ISO 8601 timestamp (`"YYYY-MM-DD HH:MM:SS+00"`), not a plain date string. Never use `split("-")` on it. Use `new Date(isoString)` then extract UTC parts (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) to construct a timezone-safe local date for display. Do not trust TypeScript types derived from hand-written interfaces — verify the actual DB column type against the Supabase dashboard before writing date parsing logic. Extract repeated UTC-date formatting to a shared `formatSetlistDate` utility in `src/utils/` before adding more call sites. Widen `UpcomingRow.date` and `UpcomingSetlist.date` to `string | null` to restore compile-time null safety.

---

## Architecture

- **BUG-007** | 2026-04-25 | Feature: `Navbar Sidebar`
  - **Root Cause:** The React Compiler enforces strict declaration order — `closeSidebar` and `openSidebar` were declared after the `useEffect` that called `closeSidebar()` inside its Escape key handler. JavaScript hoisting permits this at runtime, but the React Compiler rejects forward references at build time with "Cannot access variable before it is declared."
  - **Resolution:** Moved `openSidebar` and `closeSidebar` function declarations above the `useEffect` block that references them in `src/components/client/navbar.tsx`. No logic changed — declaration order only.
  - **Prevention:** In any React Client Component using the React Compiler, always declare helper functions before the hook (`useEffect`, `useCallback`, `useMemo`) that references them. Do not rely on JavaScript hoisting — the React Compiler treats forward references as hard build errors.

- **BUG-002** | 2026-04-24 | Feature: `Toggle Confirmation Dialogs (TASK-023)`
  - **Root Cause:** The project runs the **React Compiler** (Next.js 15). `useCallback` dependency arrays in `src/components/client/ServiceNavigator.tsx` referenced object property paths (e.g. `sync.toggleLive`, `sync.isLiveConnecting`). The React Compiler infers the whole parent object (`sync`) as the true dependency, not the individual property, and bails out with a hard compile error: `Compilation Skipped: Existing memoization could not be preserved. The inferred dependency was 'sync', but the source dependencies were [sync.toggleLive].`
  - **Resolution:** Changed all four `useCallback` dep arrays in `src/components/client/ServiceNavigator.tsx` to reference the whole `sync` object instead of its properties: `[sync.toggleLive]` → `[sync]`, `[sync.toggleFollow]` → `[sync]`, `[sync.isLiveConnecting, showGoLiveDialog]` → `[sync, showGoLiveDialog]`, `[sync.isStateChecking, showFollowDialog]` → `[sync, showFollowDialog]`.
  - **Prevention:** In this codebase, **never use object property paths as `useCallback` / `useMemo` deps** (e.g. `[obj.method]`, `[props.value]`). Always depend on the whole object (`[obj]`) or on a destructured primitive variable. The React Compiler rejects property-path deps as ambiguous and will fail the Vercel build.

- **BUG-006** | 2026-04-24 | Feature: `Song Library Dark Mode`
  - **Root Cause:** `MEMORY.md` sits at the project root and Tailwind v4 auto-scans all files under the project root for class names. A prevention note contained a wildcard arbitrary-value class pattern (bg + bracket + var + --brand- + asterisk); Tailwind parsed it as a real utility and emitted invalid CSS. Turbopack aborted the build with: `Parsing CSS source code failed — Unexpected token Delim('*')`.
  - **Resolution:** Replaced all wildcard class pattern strings with concrete specific examples (e.g. `bg-[var(--brand-tan-alpha)]`) so Tailwind no longer generates invalid classes from documentation text.
  - **Prevention:** Never write Tailwind arbitrary-value class patterns with a wildcard asterisk as literal strings in any file at or below the project root — including `.md` docs and inline code comments. Tailwind v4 will treat them as real classes and attempt to emit CSS. Use a concrete specific value or describe the pattern in prose.

---

## Auth & Permissions

- **BUG-011** | 2026-04-27 | Feature: `Setlist Lineup UI (TASK-033)`
  - **Root Cause:** When the `musicians` table SELECT policy was widened from `auth.role() = 'authenticated'` to `USING (true)` (migration `supabase/migrations/20260427000001_widen_lineup_select_to_public.sql`), only `listMusicians()` was narrowed to `'id, name'`. `getMusicianById()` in `src/app/actions/musicianActions.ts` was not audited and continues to select all columns including `notes` (free-text) and `created_by` (raw `auth.users` UUID). Because the table is now publicly readable, any future public-facing code path that calls this action will leak internal fields to unauthenticated callers.
  - **Resolution:** Not yet applied (no active data leak — `getMusicianById` is currently only called from the auth-gated `/musicians/[id]/edit` page). Required fix before any public musician profile feature: either add an early auth check to `getMusicianById` that returns `{ data: null, error: 'Unauthorized' }` for unauthenticated callers, or introduce a separate public-safe variant that selects only `'id, name'`.
  - **Prevention:** When widening any RLS SELECT policy from authenticated-only to public (`USING (true)`), audit every Server Action that queries that table — not just the action that triggered the migration. Actions previously safe under auth-gating become latent risks the moment the underlying policy is opened. Narrow column selection or add explicit auth guards to all affected actions before the migration is merged.

---

## Backend / DB

- **BUG-016** | 2026-05-03 | Feature: `Song Library (TASK-036)`
  - **Root Cause:** TASK-036 added a UNIQUE INDEX on `songs(title, artist)`. When the migration landed, Server Actions that mutate the `songs` table were never audited for PostgreSQL error code `23505` handling. `createSong` in `src/app/actions/songActions.ts:74–83` lacks explicit `23505` handling and falls through to the generic catch-all message ("Unable to create song. Please try again.") instead of the user-facing constraint-specific message ("A song with this title and artist already exists.").
  - **Resolution:** Not yet applied. Required before full release: add explicit error code `23505` handler to `createSong` following the reference pattern in `src/app/actions/setlistActions.ts:803`.
  - **Prevention:** Before merging any migration that adds a constraint (UNIQUE, NOT NULL, FK, CHECK), audit all Server Actions that mutate the affected table and confirm they explicitly handle the constraint's PostgreSQL error code (23505 for UNIQUE, 23502 for NOT NULL, 23503 for FK, 23514 for CHECK) before the generic catch-all. Reference pattern: `setlistActions.ts:803`. Add to `@validator-agent` checklist: grep for `.from('<table>').insert(` and `.from('<table>').upsert(`, then confirm each action has the required handler.

- **BUG-017** | 2026-05-04 | Feature: `Setlist Titles (TASK-??)`
  - **Root Cause:** PostgREST nested select shapes depend on FK cardinality direction. Many-to-one (child FK referencing parent) returns a **single object**; one-to-many (parent referenced by multiple children) returns an **array**. In `src/app/setlists/page.tsx`, the type declared `songs: { title: string }[]` (array) for a many-to-one FK join, and the accessor used `ss.songs[0]?.title`. PostgREST returned `{ songs: { title: "..." } }` (single object), so `ss.songs[0]` was always `undefined` and titles never displayed.
  - **Resolution:** Changed type from `songs: { title: string }[]` to `songs: { title: string } | null` and accessor from `ss.songs[0]?.title` to `ss.songs?.title` in `src/app/setlists/page.tsx`. Added `as unknown as SetlistRow[]` cast because the Supabase JS client's generated types still declare the join as an array (type inference does not match runtime shape for many-to-one joins).
  - **Prevention:** When using Supabase PostgREST nested selects, verify the FK direction with a runtime `console.log` of the raw response, not the TS type declaration. Many-to-one FK returns object; one-to-many returns array. Always cast via `as unknown` when the TS type does not match the observed runtime shape — do not trust the Supabase JS client's auto-generated types for nested joins.

- **BUG-019** | 2026-05-24 | Feature: `Alphabet Filter & Pagination (TASK-039)`
  - **Root Cause:** `src/components/client/AlphabetFilter.tsx` line 93–96 allocates the `chips` array inline in render body: `[{ label: "All", value: null }, ...ALPHABET.map(...)]`. No memo'd child consumes `chips` today, but the pattern is vulnerable: a future extraction of `AlphabetFilterChip` into a React.memo component would silently negate the memo because `chips` is re-allocated every render, creating a new object reference each time the parent re-renders. Same root cause as BUG-017 (callback allocation negating memo) but manifests as array/object allocation instead.
  - **Resolution:** Hoist the `chips` array to module scope (`const CHIPS = [{ label: "All", value: null }, ...ALPHABET.map(...)]`) so the reference is stable across renders.
  - **Prevention:** Never allocate arrays, objects, or other reference types inline in a render body if they will be passed to a memo'd child component. Either hoist to module scope (if static) or wrap in useMemo (if dynamic). This applies to any `[...].map(...)` or `{ key: value }` literal passed as a prop to `React.memo` or `useMemo`-wrapped components. Pattern also applies to callbacks (`BUG-017`): hoist static functions or wrap in useCallback before passing to memo'd children.
