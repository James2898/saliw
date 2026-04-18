# Context Bundle — Stage-Ready Setlist Viewer

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/setlists/page.tsx` | Existing setlists route — currently a stub (no [id] dynamic route exists yet) |
| `src/app/library/[id]/page.tsx` | Full SongViewer pattern: auth guard, role check, preProcessChords SSR, ChordSheetClient island |
| `src/components/SongViewer/ChordSheetClient.tsx` | Interactive chord sheet client component — must be reused or extended for per-song transpose in setlist view |
| `src/hooks/useTranspose.ts` | Manages semitone offset state; accepts `originalKey`, exposes `setTargetKey(key)` for jumping to `performance_key` |
| `src/hooks/useFontSize.ts` | Font size persistence hook used inside ChordSheetClient |
| `src/app/actions/setlistActions.ts` | All setlist Server Actions including `getSetlistWithSongs`, `updatePerformanceDetails` |
| `src/utils/musicLogic.ts` | `preProcessChords`, `shiftChord`, `getSemitoneOffset`, `NOTES`, `chordRegex` — all musical logic |
| `src/services/supabase/server.ts` | SSR Supabase client — `createClient()` async function |
| `src/services/supabase/client.ts` | Browser Supabase client — `createClient()` sync function |
| `src/types/supabase.ts` | `DbSetlistSong` and `DbSetlist` types; `DbSetlistSong` has `id, setlist_id, song_id, order_index, performance_key, singer` |
| `src/types/Setlist.ts` | Frontend `Setlist` type with `leader_id` ownership column |
| `src/types/Song.ts` | Frontend `Song` type |
| `src/types/Profile.ts` | `Profile` type with `role: string` field |
| `src/styles/globals.css` | All brand CSS variables and chord sheet CSS classes |
| `src/components/server/card.tsx` | Reusable `Card` server component with padding variants |
| `supabase/migrations/20260415000002_create_setlists_table.sql` | setlists schema — `leader_id` is the ownership column |
| `supabase/migrations/20260415000003_create_setlist_songs_table.sql` | setlist_songs schema and RLS policies |
| `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` | Adds `singer TEXT` column to setlist_songs |
| `docs/coding-guidelines.md` | Artisan palette, component boundary rules, musical integrity constraints |

## Reuse Candidates

- `src/components/SongViewer/ChordSheetClient.tsx` — Full interactive chord sheet with transpose controls, font size, and chords-hide toggle. Currently accepts `{ processedLines, originalKey }`. For the setlist viewer, `originalKey` must be replaced or overridden with `performance_key` from `setlist_songs`. The `useTranspose` hook inside it always initializes at offset 0 relative to `originalKey`, so passing `performance_key` directly as `originalKey` is the correct approach to initialize the display at the setlist key.

- `src/hooks/useTranspose.ts` — Exposes `setTargetKey(key)` which computes the offset from `originalKey` to a target key using `getSemitoneOffset`. If `ChordSheetClient` is reused with `performance_key` as `originalKey`, the hook will initialize at offset 0 (correct). If the song's `original_key` must also be displayed, it must be passed separately.

- `src/hooks/useFontSize.ts` — Already used inside `ChordSheetClient`. Uses `localStorage` with key `saliw-font-size`. Shared across all song viewers — acceptable for setlist view.

- `src/app/actions/setlistActions.ts` → `getSetlistWithSongs()` — Single-query join returning `setlist_songs` rows with embedded `songs` object (title, artist, original_key, content). This is the exact data shape needed for the setlist viewer. No new action needed for reading.

- `src/app/actions/setlistActions.ts` → `updatePerformanceDetails()` — Updates `performance_key` and/or `singer` on a `setlist_songs` row. Input: `{ id, setlist_id, performance_key?, singer? }`. RLS enforced: only `setlists.leader_id === auth.uid()` may update.

- `src/utils/musicLogic.ts` → `preProcessChords(content)` — Must be called server-side per song in the setlist to produce `ProcessedLine[]` arrays before passing to `ChordSheetClient`. Pattern established in `src/app/library/[id]/page.tsx`.

- `src/components/server/card.tsx` — `Card` with `padding` variants (`none | sm | md | lg`), `className` prop. Use for wrapping each song's chord sheet.

- `src/app/library/[id]/page.tsx` — Gold standard for the server component pattern: auth guard → role check → data fetch → `preProcessChords` → pass to client island.

## Patterns to Follow

- **Auth + Role Check Pattern:** See `src/app/library/[id]/page.tsx` lines 43–64 — `supabase.auth.getUser()` then `supabase.from('profiles').select('role').eq('id', user.id).single()`, with `isMusicDirector = profile?.role === 'music_director'` and graceful fallback to `false` on error.

- **SSR Chord Pre-processing:** See `src/app/library/[id]/page.tsx` line 112 — `preProcessChords(song.content)` called in the Server Component, result passed as `processedLines` prop to `ChordSheetClient`. For a setlist with N songs, call `preProcessChords` for each song's content in the server component.

- **Supabase SSR Client:** `import { createClient } from '@/services/supabase/server'` — `await createClient()` (async). Never use browser client in Server Components or Actions.

- **RLS ownership pattern for setlists:** `setlists.leader_id = auth.uid()` — checked by RLS on all mutating policies. The `leader_id` column in `setlists` table identifies the owner. To check if current user is the setlist leader, compare `setlist.leader_id === user.id` in the server component (after fetching setlist metadata).

- **Tailwind class string composition:** Array join pattern used throughout — `[...classNames].join(' ')` — no `clsx`/`cn` utility currently in use.

- **Dark mode:** Class-based via `.dark` ancestor. Variant syntax: `dark:text-brand-cream`, `dark:bg-brand-espresso`. Defined in `globals.css` `@variant dark`.

- **Chord sheet CSS classes:** `.chord-display`, `.chord-item`, `.chord-row`, `.section-title`, `.chords-hidden` — all defined in `src/styles/globals.css`. Do not redefine inline.

- **`force-dynamic` export:** All data-fetching pages use `export const dynamic = 'force-dynamic'` to prevent static caching of auth-dependent routes.

## Anti-Patterns Flagged

- `src/app/setlists/page.tsx` line 23–51: Uses inline `style` prop objects instead of Tailwind utility classes for layout and typography — violates the CSS-first Tailwind v4 approach used everywhere else. Do not replicate this pattern in the new `setlists/[id]/page.tsx`.

- `docs/api-discovery.md` line 25: Documents `deleteSetlistAction` as `MISSING` — the action actually exists in `setlistActions.ts` as `deleteSetlist`. Discovery doc is stale. Do not treat `deleteSetlist` as missing.

## MEMORY.md Notes

- No `MEMORY.md` exists at `/Users/adish/projects/saliw/MEMORY.md` (the repo root). The global memory at `~/.claude/projects/.../MEMORY.md` contains one relevant entry:
  - **useFontSize setState-in-effect bug:** Vercel build error caused by synchronous `setState` inside `useEffect`. Fixed with lazy `useState` initializer (`useState<number>(readStoredFontSize)` — the function reference, not the call). This pattern is already correctly implemented in `src/hooks/useFontSize.ts` line 52. Do not regress to `useState(readStoredFontSize())` (called form) in any new hook.

---

## Additional Findings

### setlist_songs Table — Full Schema

Columns (from migrations + `DbSetlistSong` type):
- `id` — uuid PRIMARY KEY (this is the junction row PK, referenced as `id` in all actions)
- `setlist_id` — uuid FK → `setlists.id` ON DELETE CASCADE
- `song_id` — uuid FK → `songs.id` ON DELETE CASCADE
- `order_index` — integer NOT NULL
- `performance_key` — text NOT NULL
- `singer` — text NULLABLE (added by migration 20260418000001)

No `lyrics` column exists on `setlist_songs`. Lyrics/chord content lives only in `songs.content`.

### setlists Table — Ownership Column

`leader_id` — uuid FK → `auth.users(id)` ON DELETE CASCADE. This is the ownership column for all RLS checks and "is this the setlist leader?" comparisons.

### Dynamic Route Gap

`src/app/setlists/[id]/` directory does **not exist**. The new setlist viewer page must be created at `src/app/setlists/[id]/page.tsx` — this is a net-new file.

### getSetlistWithSongs Return Shape

```typescript
Array<{
  id: string            // setlist_songs.id (junction PK)
  song_id: string
  order_index: number
  performance_key: string
  singer: string | null
  songs: {
    id: string
    title: string
    artist: string
    original_key: string
    content: string
  }
}>
```

### No IntersectionObserver Usage

Zero existing usage of `IntersectionObserver` in the codebase. Any scroll-spy or "current song" highlighting in the setlist viewer would be a new pattern with no existing precedent to follow.

### ChordSheetClient Props Interface (exact)

```typescript
interface ChordSheetClientProps {
  processedLines: ProcessedLine[]
  originalKey: string
}
```

To initialize the chord display at `performance_key` rather than `original_key`, pass `performance_key` as `originalKey`. The `useTranspose` hook will then treat `performance_key` as its zero-offset base. If the original key badge also needs to be shown, it must be passed separately as a display-only prop (requires a minor prop extension to `ChordSheetClient`).
