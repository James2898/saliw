# TASK-012 — Artisan Song Editor

- **Tier:** 2
- **Date Created:** 2026-04-17
- **Status:** In Progress

---

## Feature Summary

Build the Artisan Song Editor at `src/app/library/[id]/edit/`. The editor provides Music Directors with a monospaced textarea for editing song chord-sheet content, a live WYSIWYG preview panel, dirty-state detection with a guarded "Save Changes" button, a Paste & Clean utility, an unsaved-changes modal with full accessibility, and responsive layout (side-by-side on desktop, tabbed on mobile/tablet). RBAC is strictly enforced: only users with `music_director` role may access the edit route.

---

## Integration Contract

### Server Action Contract

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| Save song content | `updateSong()` | `src/app/actions/songActions.ts` | `music_director` | **EXISTS** | N/A |
| Fetch song for edit | Supabase query in page | `src/app/library/[id]/edit/page.tsx` | public read (RLS) | **EXISTS** | N/A |
| Fetch user profile/role | Supabase query in page | `src/app/library/[id]/edit/page.tsx` | own-row read | **EXISTS** | Degrade: redirect to read-only view |

### updateSong() Detail

- **Input:** `{ id: string; title?: string; artist?: string; original_key?: string; content?: string }`
- **Return:** `{ data: DbSong | null; error: string | null }`
- **Chord validation:** If `content` is provided, it must pass `hasValidChordContent()` (uses `chordRegex` from `musicLogic.ts`). Returns `{ data: null, error: 'Song content must contain at least one valid chord.' }` on failure.
- **RLS errors:** Code `42501` → "You do not have permission to perform this action." Code `PGRST116` → "Song not found."

---

## Files to Create

| Path | Type | Notes |
|------|------|-------|
| `src/app/library/[id]/edit/page.tsx` | Server Component | New route — does not exist |
| `src/components/client/SongEditorClient.tsx` | Client Component | All interactive state lives here |

## Files to Reference (Do Not Modify Unless Necessary)

| Path | Purpose |
|------|---------|
| `src/app/actions/songActions.ts` | `updateSong()` — call as-is, do not modify |
| `src/utils/musicLogic.ts` | `preProcessChords`, `chordRegex` — import only |
| `src/components/SongViewer/ChordSheetClient.tsx` | Render live preview — pass `processedLines` and `originalKey` |
| `src/components/server/card.tsx` | Card wrapper component |
| `src/app/library/[id]/page.tsx` | Reference for auth guard, RBAC, and back-link patterns |
| `src/app/library/page.tsx` | Reference for `music_director` role check pattern |
| `src/types/Song.ts` | `Song` type for props |
| `src/services/supabase/server.ts` | `createClient()` for SSR Supabase client |
| `src/styles/globals.css` | Artisan CSS variables (do not modify) |

---

## Acceptance Criteria

### Page Route (`src/app/library/[id]/edit/page.tsx`)

1. Server Component (`async` function, no `'use client'`). Export `const dynamic = 'force-dynamic'`.
2. Auth guard: `supabase.auth.getUser()` — redirect to `/login` if no user.
3. RBAC guard: query `profiles` table for `role` field using `user.id`. If `profile.role !== 'music_director'`, redirect to `/library/${id}`. Match the graceful-degrade pattern from `src/app/library/page.tsx` (wrap in try/catch, default to non-director on error).
4. Fetch full song row: `id, title, artist, original_key, content`. If not found (PGRST116 or `data === null`), render inline "Song not found." error state with back link to `/library` — no redirect.
5. Pass fetched song data to `<SongEditorClient song={song} />`.
6. Back link to `/library/${id}` styled identically to `src/app/library/[id]/page.tsx` (uses `ChevronLeft` from lucide-react, same Tailwind classes).
7. Page-level `<main>` uses `bg-brand-cream dark:bg-brand-darker` background and `max-w-5xl mx-auto` container (wider than viewer to accommodate side-by-side layout).

### Editor Client (`src/components/client/SongEditorClient.tsx`)

8. `'use client'` directive at top. Props: `{ song: Song }` (import `Song` from `@/types/Song`).
9. **Textarea:** `font-mono` class (JetBrains Mono), `white-space: pre` style, `spellCheck={false}`, `aria-label="Song chord sheet editor"`. No external editor libraries.
10. **Dirty-state:** `isDirty` = `currentContent !== song.content`. The "Save Changes" button has `disabled={!isDirty}`. When disabled, apply `opacity-50 cursor-not-allowed` visual style. When enabled, apply active Artisan button styles.
11. **Paste & Clean button:** Labeled "Clean". On click, processes `currentContent`: (a) splits on `/\r?\n|\r/`, (b) trims trailing whitespace from each line with `.trimEnd()`, (c) re-joins with `\n`. Updates textarea state. Does NOT save to database.
12. **Responsive layout:**
    - Desktop (`lg:` and above): Two-column grid `lg:grid lg:grid-cols-2 lg:gap-6`. Editor in left column, preview in right column. Both panels visible simultaneously.
    - Mobile/tablet (below `lg:`): Tab bar with two buttons: "Edit" and "Preview". Active tab is visually distinguished (e.g., `border-b-2 border-brand-espresso`). Default active tab: "Edit". Only the active panel is rendered (conditional render, not CSS hide).
13. **Live Preview:** Imports `preProcessChords` from `@/utils/musicLogic` and `ChordSheetClient` from `@/components/SongViewer/ChordSheetClient`. Preview calls `preProcessChords(currentContent)` on every render and passes result to `<ChordSheetClient processedLines={...} originalKey={song.original_key} />`. No Supabase calls in preview.
14. **Save action:** On "Save Changes" click, calls `updateSong({ id: song.id, content: currentContent, title: song.title, artist: song.artist, original_key: song.original_key })`. Use `useState` for `isSaving` (boolean) to disable button and show "Saving..." label during submission. On success (`data` returned): update the content baseline (reset dirty state) and show a brief inline "Saved!" confirmation that auto-dismisses after 2 seconds. On error: display `error` string as inline message near the save button in `text-red-700 dark:text-red-400`. Error is cleared when user next types.
15. **Navigation guard — Modal:** When the user clicks a navigation link (e.g., the back link to `/library/${id}`) while `isDirty` is true, intercept the click, prevent default navigation, and show the unsaved-changes modal. The modal must:
    - Have `role="dialog"`, `aria-modal="true"`, `aria-labelledby="unsaved-modal-title"`.
    - Have a title element with `id="unsaved-modal-title"` (e.g., "Unsaved Changes").
    - Have two action buttons: "Stay" (dismisses modal, no navigation) and "Leave" (proceeds with navigation using `router.push(href)` from `next/navigation`).
    - Be closable via `Escape` key.
    - Trap focus within the modal while open (focus must not leave the modal dialog).
    - Render in a full-screen overlay (`fixed inset-0 bg-black/50 z-50`).
16. **beforeunload listener:** Add a `window.addEventListener('beforeunload', handler)` in a `useEffect` that sets `event.returnValue = ''` when `isDirty` is true. Remove the listener on cleanup. This supplements the modal for browser-level navigation (tab close / refresh).
17. **Error for empty content:** If the user clears all content and clicks Save, the `updateSong` action returns a chord-validation error. Display it inline — no special client-side pre-validation needed (rely on server action response).
18. **Artisan styling rules (all elements):**
    - Page background: `bg-brand-cream dark:bg-brand-darker`
    - Card/panel surface: `bg-brand-cream dark:bg-brand-espresso` with `border border-brand-brown/20 dark:border-brand-tan/20 rounded-2xl`
    - Primary text: `text-brand-espresso dark:text-brand-cream`
    - Secondary text / labels: `text-brand-brown dark:text-brand-tan`
    - Textarea background: `bg-brand-cream dark:bg-brand-espresso`
    - No hardcoded hex values anywhere. No inline styles for colors.
    - All interactive elements must have `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1` for keyboard accessibility.

---

## Out of Scope

- Editing `title`, `artist`, or `original_key` fields. These are passed through unchanged on save.
- Real-time collaboration.
- Autosave / draft persistence to local storage or database.
- `beforeunload` handling for in-app link navigation (handled by modal instead).

---

## Branch

`feature/TASK-012-artisan-song-editor` (branch off `develop`)
