# Endpoint Contracts — Song Library Base View with Search

Note: This project uses Next.js Server Components + Supabase directly. There are no REST endpoints. All data access is via direct Supabase client queries in the Server Component page.

---

## 1. Fetch Songs List — EXISTS

- **Query:** `supabase.from('songs').select('id, title, artist, original_key').order('title', { ascending: true })`
- **Table:** `songs`
- **RLS Role Required:** Public read (authenticated users can SELECT — existing policy confirmed via `songActions.ts` usage)
- **Success Result:** Array of `{ id: string, title: string, artist: string, original_key: string }`
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | Supabase returns error | Render empty state: "Unable to load songs. Please try again." |
  | Empty array (no songs) | Render empty state: "No songs in the library yet." |
- **Gap Strategy:** N/A — EXISTS

---

## 2. Fetch Songs List with Search Filter — EXISTS

- **Query:** `supabase.from('songs').select('id, title, artist, original_key').or('title.ilike.%q%,artist.ilike.%q%').order('title', { ascending: true })`
  - Note: Supabase PostgREST `.or()` with ilike: `or(\`title.ilike.%${q}%,artist.ilike.%${q}%\`)`
  - Alternative: chain `.ilike('title', '%q%')` OR use `.or()` with two ilike conditions
- **Table:** `songs`
- **RLS Role Required:** Public read
- **Success Result:** Array of `{ id: string, title: string, artist: string, original_key: string }` (may be empty)
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | Supabase returns error | Render empty state: "Unable to load songs. Please try again." |
  | Empty array (search returned zero) | Render empty state: "No songs match your search." |
- **Gap Strategy:** N/A — EXISTS

---

## 3. Fetch User Role for RBAC — EXISTS

- **Query:** `supabase.from('profiles').select('role').eq('id', user.id).single()`
- **Table:** `profiles`
- **RLS Role Required:** `profiles_select_own` policy (user reads their own row — confirmed via `navbar.tsx` pattern)
- **Success Result:** `{ role: string }` — check `role === 'music_director'`
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | Query error or no row returned | Default `isMusicDirector = false` — degrade gracefully, do not throw |
- **Gap Strategy:** N/A — EXISTS. On error: `isMusicDirector` defaults to `false`.

---

## 4 & 5. Navigation Links — EXISTS (links only, no data fetch)

- **Viewer:** `<Link href={/library/${song.id}}>` — no backend call
- **Editor:** `<Link href={/library/${song.id}/edit}>` — no backend call; rendered only when `isMusicDirector === true`
- **Gap Strategy:** N/A — these are navigation-only links. The destination pages (`/library/[id]` and `/library/[id]/edit`) are not implemented in this task, but the links are valid Next.js routes that can be implemented in future tasks.
