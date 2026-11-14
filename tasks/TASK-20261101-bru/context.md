# Context Bundle — Song Performance History on Song Viewer (PBI-20261101)

## Relevant Files
| File | Why It's Relevant |
|------|-------------------|
| `pbi-docs/PBI-20261101-song-performance-history.md` | Authoritative PBI requirements, decision log, and acceptance criteria for song performance history |
| `src/app/library/[id]/page.tsx` | Server Component route for standalone song viewer; hosts SSR parallel data fetching and passes history to `SongDetailClient` |
| `src/app/library/[id]/SongDetailClient.tsx` | Client island managing interactive song viewer state (`targetKey`, `activeKey`, `uniqueChords`, `ChordDrawer`, `ChordSheetClient`) |
| `src/components/SongViewer/ChordSheetClient.tsx` | Client chord sheet component with live transposition, already supporting controlled `targetKey?: string` and `onKeyChange` notification |
| `src/components/client/SongYouTubeSection.tsx` | Reference pattern for collapsible inline sections with collapsed toggle button, responsive toolbar styling, and neutral muted empty state |
| `src/utils/worshipLeaderHistory.ts` | Existing grouping/sorting utility for worship leader song history; provides pattern for pure function with `slice(0, 10)` UTC date handling and tie-breaking |
| `src/components/client/SetlistBuilder/WorshipLeaderHistoryModal.tsx` | Precedent UI for rendering history rows with `SongKeyBadge`, `×N` multiplier badge, date format, and `"Current"` / `"Use key"` button states |
| `src/components/SongKey/SongKeyBadge.tsx` | Shared key badge component displaying musical keys with Artisan styling |
| `src/components/client/SongCard.tsx` | Shared composable card component with slots for badges, titles, and actions |
| `src/components/client/button.tsx` | Shared Artisan button component supporting `variant="ghost"` and `size="sm"` |
| `supabase/migrations/20261017010000_p2_rls_scoping.sql` | RLS definitions for setlists/setlist_songs and anon column-level permissions granting `SELECT (id, name)` on `public.musicians` |
| `src/types/Setlist.ts` | TypeScript interface defining `Setlist` structure with `worship_leader_id` referencing `musicians.id` |
| `src/types/Musician.ts` | TypeScript types for resolved `musicians: { id: string; name: string }` objects |

## Reuse Candidates
- `src/components/SongKey/SongKeyBadge.tsx` — Direct reuse for rendering the `performanceKey` badge in each history row.
- `src/components/client/button.tsx` — Direct reuse for the `"Current"` / `"Use key"` action buttons (`variant="ghost"`, `size="sm"`).
- `src/components/client/SongYouTubeSection.tsx` — Pattern reuse for the collapsible toggle button styling (`px-3 py-1.5 rounded-lg text-xs font-semibold border`), `aria-expanded` toggle behavior, and muted empty state (`<p className="text-xs text-brand-espresso/50 dark:text-brand-cream/40">No performance history</p>`).
- `src/components/SongViewer/ChordSheetClient.tsx` — Direct reuse of existing `targetKey?: string` prop (lines 93, 359–366) and `onKeyChange?: (key: string) => void` (lines 97, 350–356) for bidirectional key sync without modifying `ChordSheetClient` internals.
- `src/utils/worshipLeaderHistory.ts` — Pattern and module reuse: add a new pure export `groupSongPerformanceHistory` following the same `Map<string, ...>` grouping, `setlist.date.slice(0, 10)` parsing (preventing BUG-018), and multi-tier sorting.
- `src/components/client/SetlistBuilder/WorshipLeaderHistoryModal.tsx` — Reuse the exact `×N` repeat badge markup (`text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-brown/10 dark:bg-brand-tan/15 text-brand-espresso dark:text-brand-cream border border-brand-brown/15 dark:border-brand-tan/20`) and action button accessibility states (`disabled`, `aria-disabled`, `aria-label`).
- `next/link` (`Link`) — Standard Next.js client-side navigation component for linking to `/setlists/[lastSetlistId]` without full page reloads.

## Patterns to Follow
- **Parallel Server Component SSR Data Fetching:** See `src/app/library/[id]/page.tsx:65-79` and `src/app/setlists/[id]/page.tsx:159-167`. Fetch the song and performance history records concurrently via `Promise.all([ ... ])` inside the Server Component.
- **Controlled/Uncontrolled Key State Synchronization:** See `src/components/SongViewer/ChordSheetClient.tsx:341-366` and `src/app/library/[id]/SongDetailClient.tsx:60-65`. Lift `activeKey` and `targetKey` to `SongDetailClient`, pass `targetKey` and `onKeyChange` to `ChordSheetClient`, and guard setter updates (`prev === next ? prev : next`) to prevent circular re-render loops (BUG-027).
- **Timezone-Safe Date Comparison & Slicing:** See `src/utils/worshipLeaderHistory.ts:53-55` and `src/app/actions/setlistActions.ts:978-988`. Use `setlists.date.slice(0, 10)` and `new Date().toISOString().slice(0, 10)` in UTC format to avoid timezone shifts and `NaN` errors with `timestamptz` columns (BUG-018).
- **Public Column-Level Safe Querying:** See `supabase/migrations/20261017010000_p2_rls_scoping.sql:58-68` and `src/app/actions/musicianActions.ts:22-28`. Unauthenticated guests only have access to `musicians(id, name)`. Explicitly select only `id, name` on `musicians` joins (never `*` or `notes, created_by`) to avoid Postgres permission errors (`42501`) under RLS.
- **Saliw Artisan Palette & Explicit Dark Mode Pairing:** See `docs/coding-guidelines.md:40-47` and `MEMORY.md` (BUG-005). Pair every named brand utility with its `dark:` variant (`text-brand-espresso dark:text-brand-cream`, `bg-brand-cream dark:bg-brand-espresso`, `border-brand-brown/20 dark:border-brand-tan/20`). Never use generic Tailwind colors (`blue`, `sky`, `green`).
- **Screen Reader Announcements for Transposition:** See `src/components/client/SetlistBuilder/WorshipLeaderHistoryModal.tsx:280-285`. Provide an `aria-live="polite"` status element to announce key transpositions triggered from the history list.

## Anti-Patterns Flagged
- `src/app/setlists/page.tsx` line 105: Type mismatch with PostgREST join cardinality (BUG-017) — many-to-one joins (such as `setlists -> musicians` or `setlist_songs -> setlists`) return a single object or `null`, not an array. Never index with `[0]`.
- `src/hooks/useFontSize.ts` line 12: Synchronous `setState` in `useEffect` on mount (BUG-001) — initialize state via `useState` lazy initializer or default props instead of effect-based hydration.
- `src/app/actions/musicianActions.ts` line 89 (`getMusicianById`): Selecting `*` or restricted columns (`notes`, `created_by`) without checking caller auth (BUG-011) — unauthenticated queries fail with permission denied on column-level RLS. Always restrict selection to `id, name`.
- `src/components/client/AlphabetFilter.tsx` line 93: Inline allocation of objects/arrays in component render body (BUG-019) — hoist static arrays/options to module scope.

## MEMORY.md Notes
- **BUG-001 (UI State):** Never initialize React state from external storage via `useEffect` + `setState`. Use `useState(() => readValue())`.
- **BUG-002 (Architecture):** React Compiler rejects object property paths in `useCallback` / `useMemo` dependency arrays (e.g. `[item.key]`). Depend on the entire object or destructured primitive.
- **BUG-005 (UI State):** Artisan palette utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) require explicit `dark:` counterparts. Without explicit pairing, elements become unreadable in dark mode.
- **BUG-007 (Architecture):** React Compiler enforces strict declaration order. Helper functions invoked inside hooks must be declared before the hook that references them.
- **BUG-011 (Auth & Permissions):** `public.musicians` table restricts `anon` role to `(id, name)`. Any public-facing query must select only `id, name` to avoid 42501 permission denied errors.
- **BUG-017 (Backend / DB):** PostgREST nested joins: Many-to-one FK returns a single object; one-to-many returns an array. Verify runtime shape and cast via `as unknown` if generated TS types mismatch.
- **BUG-018 (UI State / Date Parsing):** `setlists.date` is a `timestamptz` column returning full ISO 8601 strings. Never use `split("-")`. Use `slice(0, 10)` in UTC convention or `getUTC*` methods to prevent timezone off-by-one errors.
- **BUG-019 (Backend / Memoization):** Hoist static arrays and objects to module scope to prevent re-allocating references on every render.
- **BUG-027 (UI State):** Avoid infinite loops in controlled/uncontrolled hybrid state (`targetKey`, `onKeyChange`). Use `useRef` for callbacks and guard state updates with `prev === next ? prev : next`.
