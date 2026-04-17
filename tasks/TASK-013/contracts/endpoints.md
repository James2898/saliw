# Endpoint Contracts — Artisan New Song Entry Point & Stage-Ready UI Controls

---

## Submit New Song Form — EXISTS

- **Action:** `createSong()` in `src/app/actions/songActions.ts`
- **Input Type:**
  ```ts
  { title: string; artist: string; original_key: string; content: string }
  ```
- **Return Type:**
  ```ts
  { data: DbSong | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (enforced by Supabase RLS INSERT policy on `songs` table)
- **Supabase Table(s) Affected:** `songs`
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | Unauthorized (no user session) | Returns `{ error: 'Unauthorized' }` — display inline near submit button |
  | RLS rejection (non-director) | Returns `{ error: 'You do not have permission to perform this action.' }` — display inline |
  | Content has no valid chord | Returns `{ error: 'Song content must contain at least one valid chord.' }` — display inline |
  | Server/DB error | Returns `{ error: 'Unable to create song. Please try again.' }` — display inline |
  | Unexpected exception | Returns `{ error: 'An unexpected error occurred. Please try again.' }` — display inline |
- **Gap Strategy:** N/A — action exists and is fully implemented.

---

## Role Check (Library page / New Song page) — EXISTS

- **Action:** Supabase query on `profiles` table, pattern from `src/app/library/page.tsx` lines 39–52
- **Query:**
  ```ts
  supabase.from('profiles').select('role').eq('id', user.id).single()
  ```
- **Return:** `profile.role === 'music_director'` → boolean `isMusicDirector`
- **RLS Role Required:** `profiles_select_own` policy (own-row read)
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | Profile fetch fails / throws | Catch block sets `isMusicDirector = false` — button not rendered, page redirects non-director |
  | Profile row missing | `profile` is null → `isMusicDirector = false` |
- **Gap Strategy:** N/A — degrades gracefully to non-director.

---

## Font Size Persistence — EXISTS (browser API)

- **Storage:** `localStorage`, key `"saliw-font-size"`, value is a number serialized as string (e.g., `"18"`)
- **Read:** On `useEffect` mount in `useFontSize` hook — `parseInt(localStorage.getItem('saliw-font-size') ?? '16', 10)`
- **Write:** On each `increase`, `decrease`, `reset` call — `localStorage.setItem('saliw-font-size', String(newValue))`
- **SSR Safety:** `useEffect` only runs on the client. Initial server render uses default 16.
- **Error States:**
  | Condition | UI Behavior |
  |-----------|-------------|
  | `localStorage` unavailable (SSR) | Default 16px used; no error thrown |
  | Stored value is NaN or out of range | Clamp: `Math.min(48, Math.max(12, parsedValue || 16))` |
- **Gap Strategy:** N/A.

---

## Hide Chords Toggle — EXISTS (client-only)

- **Mechanism:** `chordsHidden` boolean state in `ChordSheetClient.tsx`
- **CSS:** `.chords-hidden .chord-item { opacity: 0; }` in `src/styles/globals.css`
- **Effect:** Chord spans become invisible; their layout space is preserved. Lyric alignment is not disrupted.
- **No backend call required.**

---

## Stage Mode Toggle — EXISTS (client-only)

- **Mechanism:** `stageMode` boolean state in `ChordSheetClient.tsx`
- **CSS:** `.stage-mode .section-title { border-left-width: 6px; filter: saturate(1.5); }` in `src/styles/globals.css`
- **Effect:** Section headers (`[VERSE]`, `[CHORUS]`, etc.) have a wider left border and increased color saturation for low-light visibility.
- **No backend call required.**

---

## `/library/new` Page Route — MISSING (create in this task)

- **Type:** New Next.js Server Component page
- **Path:** `src/app/library/new/page.tsx`
- **Auth guard:** `supabase.auth.getUser()` — redirect to `/login` if no user
- **RBAC guard:** Query `profiles` table — redirect to `/library` if not `music_director`
- **Renders:** `<NewSongFormClient />` at `src/components/client/NewSongFormClient.tsx`
- **Gap Strategy:** This is explicitly in-scope new work, not a missing dependency. No UI disabling needed — the route simply does not exist yet and will be created.
