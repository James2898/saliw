# Endpoint Contracts — Hybrid Rendering Engine (SongViewer)

> This project uses Next.js Server Components + Supabase SSR, not REST endpoints.
> Contracts are expressed as Server Component query contracts per docs/api-discovery.md.

---

## Load Song Chord Sheet — EXISTS

- **Query:** `supabase.from('songs').select('id, title, artist, original_key, content').eq('id', songId).single()`
- **Location:** `src/app/library/[id]/page.tsx` (Server Component, inside `async` function body)
- **Client:** `createClient()` from `src/services/supabase/server.ts` ONLY — uses `@supabase/ssr` `createServerClient`
- **Input:** `songId: string` — from `params.id` (Next.js dynamic route segment, type-safe via `Promise<{ id: string }>`)
- **RLS Role Required:** `authenticated` — SELECT policy: `auth.role() = 'authenticated'`
- **Supabase Table:** `public.songs`
- **Success Return Type:**
  ```typescript
  {
    id: string
    title: string
    artist: string
    original_key: string
    content: string
  }
  ```
- **Error States:**
  | Condition | Supabase Signal | UI Behavior |
  |-----------|----------------|-------------|
  | Song not found | `error.code === 'PGRST116'` or `data === null` | Render inline "Song not found." with back link to `/library` |
  | Unauthenticated (RLS hides row) | `data === null` (RLS silently hides) | Covered by auth guard — `redirect('/login')` fires first |
  | Server/network error | `error` object present, code not PGRST116 | Render inline "Unable to load song. Please try again." |
- **Gap Strategy:** N/A — query EXISTS and is verified via migration + RLS policy.

---

## Auth Session Check — EXISTS

- **Query:** `supabase.auth.getUser()`
- **Location:** `src/app/library/[id]/page.tsx` (Server Component, before data fetch)
- **Client:** `createClient()` from `src/services/supabase/server.ts`
- **RLS Role Required:** N/A — identity check only
- **Success Return Type:** `{ data: { user: User | null }, error: AuthError | null }`
- **Error States:**
  | Condition | Signal | UI Behavior |
  |-----------|--------|-------------|
  | No session / expired token | `user === null` | `redirect('/login')` |
  | Auth service error | `error` present | `redirect('/login')` (treat as unauthenticated) |
- **Gap Strategy:** N/A — EXISTS.

---

## Client-Side Transposition (useTranspose hook) — No Backend Call

- **Type:** Pure client-side state — no Supabase query involved.
- **Input:** `originalKey: string` (passed from Server Component as prop)
- **State managed:** `semitoneOffset: number` (initializes at 0)
- **Derived:** `displayKey: string` computed from `NOTES[(rootToIndex(originalKey) + semitoneOffset + 12) % 12]`
- **DOM mutation:** Reads `data-original-chord` from `.chord-item` spans; writes `shiftChord(originalChord, semitoneOffset)` to `element.innerText`
- **Gap Strategy:** N/A — purely local computation, no backend dependency.
