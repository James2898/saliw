# Context Bundle — Backend Infrastructure (Songs, Setlists, Server Actions)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/actions/authActions.ts` | Establishes the Server Action pattern: `'use server'`, `createClient()` from `@/services/supabase/server`, `{ error: string }` return shape |
| `src/app/actions/profileActions.ts` | Establishes mutation pattern: `supabase.auth.getUser()` for session identity, `{ success: true } \| { error: string }` return — new actions adopt `{ data, error }` shape |
| `src/services/supabase/server.ts` | Factory for server-side Supabase client using `@supabase/ssr` and anon key only; must be imported by all new actions |
| `src/services/supabase/client.ts` | Browser client — must NOT be used in Server Actions |
| `src/types/Song.ts` | Current type uses `id: number`, `key: string` — incompatible with new DB schema (`uuid`, `original_key`); safe to update (no pages import it) |
| `src/types/Setlist.ts` | Current type uses `id: number`, `leader: string`, missing `is_public` — safe to update (no pages import it) |
| `src/types/Profile.ts` | Uses `role: string` — confirms role field is in `profiles` table, not JWT |
| `src/utils/musicLogic.ts` | `chordRegex` export must be imported in `songActions.ts` for `content` validation; `shiftChord` and `getSemitoneOffset` available for transposition |
| `supabase/migrations/20260415000000_create_profiles_table.sql` | Only existing migration; establishes RLS pattern, timestamp convention, and that `profiles.role` stores role value (not JWT claim) |
| `docs/api-discovery.md` | Defines Technical Schema format for Supabase Server Actions (not HTTP endpoints); `deleteSetlistAction` was MISSING — now in scope |
| `docs/coding-guidelines.md` | Defines naming conventions, RLS security rules, no service role key, all mutations via Server Actions |
| `docs/tech-stack.md` | Stack locked: Next.js App Router, Supabase SSR, PostgreSQL |
| `docs/structure.md` | Confirms: mutations → `src/app/actions/`, DB types → `src/types/`, migrations → `supabase/migrations/` |

## Reuse Candidates

- `src/services/supabase/server.ts` — Import `createClient()` in every new Server Action file; do not redefine client logic
- `src/app/actions/profileActions.ts` — Use as the implementation template for session retrieval pattern (`supabase.auth.getUser()` + null check)
- `src/app/actions/authActions.ts` — Use as the template for error return shape; adopt `{ data: T | null, error: string | null }` consistently across all new actions
- `src/utils/musicLogic.ts` — Import `chordRegex` for `songs.content` validation in `createSong` and `updateSong`
- `supabase/migrations/20260415000000_create_profiles_table.sql` — Copy the RLS policy structure (ENABLE ROW LEVEL SECURITY, CREATE POLICY pattern, USING clause with `auth.uid()`)

## Patterns to Follow

- **Server Action file naming:** `<feature>Actions.ts` in `src/app/actions/` (e.g., `songActions.ts`, `setlistActions.ts`)
- **Return type:** `{ data: T | null, error: string | null }` for all new mutations (task spec standard)
- **Session retrieval:** `const { data: { user } } = await supabase.auth.getUser()` → check `if (!user) return { data: null, error: 'Unauthorized' }`
- **RLS role check:** Use a Postgres helper function `is_music_director()` that subqueries `public.profiles.role` via `auth.uid()` — the role is stored in `profiles`, not the JWT, so JWT claim checks will not work
- **Migration naming:** Timestamp prefix format `YYYYMMDDHHMMSS_description.sql`; use sequential seconds for same-day migrations (e.g., `20260415000001_`, `20260415000002_`)
- **Type file location:** `src/types/supabase.ts` for DB-layer types; update `Song.ts` and `Setlist.ts` to re-export from `supabase.ts` or align field names

## Anti-Patterns Flagged

- `src/types/Song.ts` line 3: `id: number` — DB spec requires `uuid`; `key: string` — DB spec requires `original_key: text`. Flag: these must be updated. No pages currently import this type so no downstream breakage.
- `src/types/Setlist.ts` lines 4-5: `id: number`, `leader: string` — DB spec requires `uuid`, `leader_id: uuid`, and adds `is_public: boolean`. Same safe update as Song.ts.
- `src/services/supabase/client.ts`: Must never be imported inside `src/app/actions/`. Only `server.ts` is permitted in Server Actions.

## MEMORY.md Notes

- N/A — MEMORY.md does not exist yet in this project. Treat as empty.
