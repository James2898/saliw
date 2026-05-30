# Context Bundle — YouTube Link Field for Library Songs

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/types/Song.ts` | Frontend Song type — needs `youtube_url?: string` added |
| `src/types/supabase.ts` | DbSong DB-layer type — needs `youtube_url: string \| null` added |
| `src/app/actions/songActions.ts` | `createSong` and `updateSong` Server Actions — both need `youtube_url` param and select column; `updateSong` already uses the filter-undefined payload pattern |
| `src/app/library/[id]/page.tsx` | Song viewer page — Server Component; fetches song, renders `ChordSheetClient`; role check pattern lives here |
| `src/app/library/[id]/edit/page.tsx` | Song edit page — hard redirects non-director users; passes `Song` prop to `SongEditorClient` |
| `src/components/client/SongEditorClient.tsx` | Editor form component — needs a YouTube URL input field and the edit-link-modal trigger |
| `src/components/client/NewSongFormClient.tsx` | New song form — needs YouTube URL field added |
| `src/components/client/SetlistSongSection.tsx` | Per-song section in setlist viewer; needs collapsible embed slot; receives `autoScroll` prop |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Setlist viewer orchestrator — manages `autoScroll` instance; passes it to each `SetlistSongSection` |
| `src/app/setlists/[id]/page.tsx` | Setlist viewer page — Server Component; builds `processedSongs`; must pass `youtube_url` through |
| `src/hooks/useAutoScroll.ts` | Exports `UseAutoScrollReturn` with `isActive` and `isScrolling` — the embed hide signal |
| `src/components/client/SetlistSettingsModal.tsx` | Canonical modal pattern: backdrop + centered panel, focus trap, Escape dismiss, `role="dialog"` + `aria-modal` |
| `src/components/client/AppendSongsModal.tsx` | Second canonical modal pattern (larger, with scrollable body + footer actions) |
| `src/components/client/logout-modal.tsx` | Simpler confirmation dialog pattern using the shared `Button` component |
| `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` | Compact two-button confirmation dialog pattern |
| `src/components/client/button.tsx` | Shared `Button` component with `primary` / `secondary` / `ghost` variants |
| `supabase/migrations/20260415000001_create_songs_table.sql` | Songs table DDL and RLS policy definitions; `is_music_director()` helper function |
| `supabase/migrations/20260418000003_allow_public_read_songs.sql` | Songs SELECT policy is `USING(true)` — songs are publicly readable |
| `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql` | Pattern for adding a nullable column to songs via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |
| `MEMORY.md` | Project bug log — all prevention rules |

## Reuse Candidates

- `src/components/client/SetlistSettingsModal.tsx` — Canonical modal template: backdrop (`fixed inset-0 z-[80]`), centered panel (`fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`), `role="dialog" aria-modal="true" aria-labelledby`, focus trap, Escape dismiss, focus-return-on-close. Copy this structure for the YouTube link edit modal.

- `src/components/client/AppendSongsModal.tsx` — Richer modal pattern with scrollable body and footer action row; useful if the YouTube modal needs more than a single input field.

- `src/app/actions/songActions.ts` `updateSong` — Already accepts optional fields and builds the payload by filtering `undefined` values (`Object.entries(fields).filter(([, v]) => v !== undefined)`). Extend this function by adding `youtube_url?: string | null` — the existing payload pattern handles it without modification to the filter logic.

- `src/hooks/useAutoScroll.ts` `UseAutoScrollReturn.isActive` — Boolean flag that is `true` whenever the auto-scroll feature is active. The embed panel should use `isActive` (not `isScrolling`) to trigger the hide: the embed must be hidden as soon as autoscroll activates, regardless of pause/resume state.

- `src/components/client/SetlistSongSection.tsx` — Already receives `autoScroll?: UseAutoScrollReturn` as a prop from `SetlistViewerClient`. The embed visibility logic belongs here; no new prop plumbing is required through the viewer client beyond adding `youtube_url`.

- `src/components/client/button.tsx` — Use `variant="ghost"` or `variant="primary"` for the embed toggle chevron/button to stay consistent with the existing design system.

- `src/components/server/card.tsx` — Wraps content in Artisan card shell; check whether the embed player should live inside or outside an existing `Card` in the song viewer page.

## Patterns to Follow

- **Server Action mutation pattern**: See `src/app/actions/songActions.ts` `updateSong` — add `youtube_url?: string | null` to the input type; add it to the `updatePayload` filter; add it to the `.select()` column list. Also add `23505` error handling if the new column ever gets a UNIQUE constraint (BUG-016 prevention).

- **Role-gate pattern (Server Component)**: See `src/app/library/[id]/page.tsx` lines 47–59 and `src/app/library/[id]/edit/page.tsx` lines 46–60 — query `profiles.role` server-side, derive `isMusicDirector` boolean, pass it as a prop to the Client Component. Do not expose role check logic in client code.

- **Modal pattern**: See `src/components/client/SetlistSettingsModal.tsx` — module-level CSS class constants for the backdrop and panel, `useRef` for panel and close button, `useEffect` for focus-on-open and Escape/Tab trap, `if (!isOpen) return null` guard, helpers declared before effects (BUG-007). The YouTube link edit modal must follow this same structure.

- **Collapsible section pattern**: No existing collapsible in the codebase — this is a new pattern. Use a controlled `useState(false)` for `isEmbedOpen`; render the `<iframe>` only when `isEmbedOpen && !autoScroll?.isActive`. The toggle button should be a small inline icon button in the song section header, styled like the existing inline action buttons (`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border`).

- **`processedSongs` shape extension**: See `src/app/setlists/[id]/page.tsx` lines 218–227 — `processedSongs` is built by mapping `songsRaw`. To pass `youtube_url` to `SetlistSongSection`, add it to the map result and extend `ClientSong` in `SetlistViewerClient.tsx`.

- **Supabase column addition migration**: See `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql` — `ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS singer text;`. New migration must follow the same one-statement pattern with `IF NOT EXISTS`.

- **Dark mode class pairing**: See `src/app/library/[id]/page.tsx` — every named Tailwind utility (`text-brand-espresso`, `bg-brand-cream`) must have an explicit `dark:` variant paired with it (BUG-004 / BUG-005 prevention).

- **`inputBaseClass` / `labelClass` reuse**: See `src/components/client/SongEditorClient.tsx` lines 12–22 — these module-level string constants define the Artisan form field appearance. Copy and reuse them in the YouTube URL input field inside `SongEditorClient`.

## Anti-Patterns Flagged

- `src/components/client/SongEditorClient.tsx` line 450–508: Unsaved Changes Modal uses inline `bg-black/50` for the backdrop instead of the canonical Artisan `bg-[var(--brand-espresso)]/40 backdrop-blur-sm`. Do not replicate this — use the Artisan backdrop class from `SetlistSettingsModal.tsx`.

- `src/app/actions/songActions.ts` line 61–71 (`createSong`): The `select()` column list is hard-coded as a string without `youtube_url`. When the column is added to the DB and the type is updated, this select string must be updated too or `data` will never return the URL — a silent data gap. Confirm both `createSong` and `updateSong` select lists are updated together.

- `src/app/actions/songActions.ts` lines 74–83 (`createSong`): Missing explicit `23505` UNIQUE constraint error handler (BUG-016, still unresolved). Do not add a new column that has a UNIQUE constraint without also adding the `23505` handler. The `youtube_url` column is not unique, so this is not triggered — but do not accidentally add a constraint.

## MEMORY.md Notes

Relevant prevention rules from `/Users/adish/projects/saliw/MEMORY.md` for this feature:

- **BUG-001** (useState-in-effect): The YouTube URL state in `SongEditorClient` must use a lazy initializer (`useState(() => song.youtube_url ?? "")`) not a `useEffect` + `setState`. All other state fields in the file already follow this pattern.

- **BUG-007** (React Compiler forward reference): In any Client Component, declare all helper functions (`handleSave`, `handleClose`, modal callbacks) before the `useEffect` blocks that reference them. The YouTube modal and embed toggle handlers must be declared before their corresponding `useEffect`s.

- **BUG-002** (React Compiler useCallback property-path deps): If a `useCallback` in the embed component depends on `autoScroll.isActive` or `autoScroll.pause`, depend on the whole `autoScroll` object (`[autoScroll]`), not on the property path (`[autoScroll.isActive]`).

- **BUG-004 / BUG-005** (dark mode named utilities): All new JSX elements using Artisan palette named utilities must have explicit `dark:` variants. The embed player container, toggle button, and modal all need `dark:` pairs for every `text-brand-*`, `bg-brand-*`, and `border-brand-*` class.

- **BUG-020** (SSR hydration mismatch): Do not use `useState(() => typeof window !== "undefined")` as a mount guard. If the embed needs a client-only mount check (e.g. for `window.location`), use `useState(false)` + `useEffect(() => setMounted(true), [])`.

- **BUG-021** (CSS variable opacity): If using `bg-[var(--brand-card-bg)]` anywhere for the embed container, verify the variable is fully opaque. Prefer `bg-brand-cream dark:bg-brand-espresso` for the embed container background instead.

- **BUG-016** (missing `23505` handler in `createSong`): Still open — not blocking this task since `youtube_url` is not a unique column, but do not add a UNIQUE constraint to it.

- **BUG-017** (PostgREST FK join shape): Not directly relevant, but if `getSetlistWithSongs` is modified to JOIN to songs and return `youtube_url`, verify the join shape is many-to-one (returns object, not array) and cast via `as unknown as` if needed.
