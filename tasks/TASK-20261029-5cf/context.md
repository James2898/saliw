# Context Bundle — Worship Leader Song History in the Setlist Builder

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `pbi-docs/PBI-20261030-worship-leader-song-history.md` | Authoritative feature specification and grill decisions for worship leader song history modal, button placement, and actions. |
| `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` | Renders the worship leader select in create mode; needs the 'History' button beside the select when a leader is assigned. |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Renders worship leader select and lineup in edit mode; needs the 'History' button and the new `onWorshipLeaderChange` callback. |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Central client island for setlist builder; mounts People section in both modes, holds modal state, and wires `handleAdd` / `handleKeyChange`. |
| `src/app/setlists/[id]/edit/page.tsx` | Edit page server component; currently renders `SetlistPeopleSection` outside builder; needs to pass initial people data into `SetlistBuilderClient`. |
| `src/app/setlists/new/page.tsx` | Create page server component; passes roster musicians to `SetlistBuilderClient`. |
| `src/app/actions/setlistActions.ts` | Location for the new read-only Server Action (`getWorshipLeaderSongHistory`) querying past setlists for a musician. |
| `src/components/client/SongCard.tsx` | Reusable card component (`badgeSlot`, `actionsSlot`, `footerSlot`) to display each (song, key) performance row. |
| `src/components/SongKey/SongKeyBadge.tsx` | Renders the musical key badge for the row's performance key. |
| `src/components/SongTags/SongTagBadge.tsx` | Renders standardized song tag badges (Joyful, Solemn, Hymn) with proper Artisan palette classes. |
| `src/components/client/SetlistBuilder/LibraryPanel.tsx` | Reference implementation for local tag chip filtering (`TAG_OPTIONS`, active styling, case-insensitive tag matching). |
| `src/components/client/AppendSongsModal.tsx` | Modal reference for backdrop blur, responsive panel sizing, keyboard focus trap, and Escape dismissal. |
| `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` | Accessible dialog pattern reference for focus management and keyboard accessibility. |
| `src/types/Song.ts` | Exports `STANDARD_SONG_TAGS`, `SongTag`, and `SongSummary` types. |
| `src/types/Musician.ts` | Exports `Musician` and `SetlistLineupEntry` types. |
| `MEMORY.md` | Past bug records, React Compiler restrictions, and date/PostgREST join conventions. |

## Reuse Candidates
- `src/components/client/SongCard.tsx` — Reuse directly for each history row: song title and artist in main text, `SongTagBadge` list in `badgeSlot`, `SongKeyBadge` and action button ('Add' / 'Use key' / 'Current') in `actionsSlot`, and last sung date plus repeat count ('×N') in `footerSlot`.
- `src/components/SongKey/SongKeyBadge.tsx` — Reuse directly to display each performance row's musical key.
- `src/components/SongTags/SongTagBadge.tsx` — Reuse directly with `size="sm"` for the song's current tags.
- `src/components/client/button.tsx` — Reuse `Button` (`variant="ghost"`, `size="sm"`) for the 'History' trigger button beside the select and row action buttons.
- `src/types/Song.ts` (`STANDARD_SONG_TAGS`) — Reuse the canonical standard tags array to generate chip filter options (All, Joyful, Solemn, Hymn).
- `src/components/client/SetlistBuilder/LibraryPanel.tsx` (L10–13, L90–120) — Reuse the local tag chip pattern: module-level `TAG_OPTIONS`, active pressed styling, and case-insensitive matching against `song.tags`.
- `src/components/client/AppendSongsModal.tsx` & `CloneSetlistDialog.tsx` — Reuse the accessible modal layout: backdrop, focus trap on Tab, Escape key dismissal, and return focus to trigger ref.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` (`handleAdd` & `handleKeyChange`) — Reuse existing state mutations directly: 'Add' appends the song and sets performance key; 'Use key' updates the existing song's `performanceKey`.

## Patterns to Follow
- **Modal Accessibility & Focus Trap:** See `src/components/client/AppendSongsModal.tsx:350-381` and `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx:35-77` — Use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus first interactive control on open, cycle Tab focus, handle Escape to close, and return focus to the trigger button ref.
- **Local Tag Filter Chips:** See `src/components/client/SetlistBuilder/LibraryPanel.tsx:10-13, 90-120` — Hoist `TAG_OPTIONS` to module scope, maintain `selectedTag` in local state, use `aria-pressed` for toggle state, and match tags case-insensitively.
- **Server Action Contract Shape:** See `src/app/actions/setlistActions.ts:19-66` — All actions use `'use server'`, wrap in `try/catch`, verify auth via `supabase.auth.getUser()`, and return `{ data: T | null, error: string | null }`.
- **Nested PostgREST Join Typing:** See `src/app/actions/setlistActions.ts:492-509` — When joining many-to-one foreign keys, cast Supabase array return types via `as unknown as T` to match the runtime single-object relation.
- **Responsive Toolbar Strips:** See `docs/coding-guidelines.md:49-53` — Use `flex flex-wrap items-center gap-2` to prevent clipping on mobile; align trigger button height to standard 32px (`h-8` or `px-3 py-1.5 text-xs font-semibold rounded-lg`).
- **Full-Screen Mobile Modal:** Responsive modal panel: full-screen on mobile (`fixed inset-0 w-full h-full rounded-none`) with scrollable body (`overflow-y-auto`), transitioning to a centered card on desktop (`md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(90vw,48rem)] md:max-h-[85vh] md:rounded-2xl`).
- **Live Announcements for Screen Readers:** Include an `aria-live="polite"` container (`sr-only`) to announce actions ('Added <Title> in key <Key>' or 'Updated <Title> key to <Key>') without closing the modal.
- **Lazy State Initializers:** See `MEMORY.md` (BUG-001) — Seed all React state hooks with lazy initializers (`useState(() => initialVal)`).

## Anti-Patterns Flagged
- `src/app/setlists/[id]/edit/page.tsx` lines 143–148: `allSongs` projection strips `tags` from song objects. The new `getWorshipLeaderSongHistory` action must explicitly query `songs.tags` itself and not rely on library items from the edit page props.
- `src/app/setlists/[id]/edit/page.tsx` lines 160–174: `SetlistPeopleSection` is rendered outside `SetlistBuilderClient` as a detached sibling card. Do not leave it detached; it must move inside `SetlistBuilderClient` in edit mode so worship leader selection is unified with the builder state.
- `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` lines 126–144: The select element is rendered directly inside a block container without a flex wrapper. It must be wrapped in `flex flex-wrap items-center gap-2` to place the 'History' button beside it.
- `MEMORY.md` BUG-002: Object property paths in `useCallback` dependency arrays (e.g. `[sync.toggleLive]`) are rejected by the React Compiler. Always depend on the entire object or destructure primitive variables.
- `MEMORY.md` BUG-005: Named Tailwind classes (`text-brand-espresso`, `bg-brand-cream`) require explicit `dark:` counterparts when rendered over dynamic backgrounds to ensure WCAG AA contrast.
- `MEMORY.md` BUG-007: Forward references of helper functions inside hooks are rejected by the React Compiler. Always declare handler functions before any hooks (`useEffect`, `useCallback`, `useMemo`) that reference them.
- `MEMORY.md` BUG-018: `setlists.date` is a `timestamptz` column. Splitting with `split('-')` causes `NaN` in Date constructors. Always use `slice(0, 10)` or UTC date parts.
- `MEMORY.md` BUG-019: Reference allocations (e.g. `chips` array) directly in render body break memoization. Hoist static arrays to module scope.

## MEMORY.md Notes
- **BUG-001 (UI State):** Never initialize state from storage or props via `useEffect` + `setState`. Always use lazy initializers `useState(() => readValue())`.
- **BUG-002 (Architecture):** Next.js 15 React Compiler enforces whole-object or primitive dependencies in `useCallback` / `useMemo`. Never pass object property paths like `[obj.prop]`.
- **BUG-005 (UI State / Dark Mode):** Named Artisan utilities (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must always have explicit `dark:` pairs to prevent invisible text in dark mode.
- **BUG-007 (Architecture):** React Compiler enforces declaration order. Always declare functions before the hooks (`useEffect`, `useCallback`) that call them.
- **BUG-017 (Backend / PostgREST):** PostgREST nested selects return an object for many-to-one joins, but Supabase JS types may declare an array. Cast with `as unknown as T`.
- **BUG-018 (DB / Date Handling):** `setlists.date` is `timestamptz` (`'YYYY-MM-DD HH:MM:SS+00'`). Never use `split('-')`. Use `slice(0, 10)` (matching `edit/page.tsx:182`) or UTC date part extraction.
- **BUG-019 (UI State / Performance):** Never allocate arrays or objects inline in render bodies passed to children. Hoist static arrays (like tag options) to module scope.
- **BUG-020 (UI State):** Never use `useState(() => typeof window !== 'undefined')` as an SSR mount guard in client components. Use `useState(false)` + `useEffect(() => setMounted(true), [])` with eslint disable comment.
- **BUG-024 (Auth / API):** Use modern Supabase publishable keys; legacy JWT keys are revoked.
- **BUG-027 (UI State / Callbacks):** Capture child `onStateChange` callbacks in `useRef` and guard against no-op state updates to prevent circular render loops.
