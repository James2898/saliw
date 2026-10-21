# Test Plan & Test Cases: Song Tags (`joyful`, `solemn`, `hymn`) Schema Migration & UI/UX

**Feature Branch:** `feature/song-tags-schema-ui`  
**Date:** 2026-10-21  
**Target Environment:** Local `http://localhost:3002` (and non-prod Supabase instance)

---

## 1. Test Matrix Overview

| Case ID | Category | Component / Surface | Scenario | Expected Evidence / Assertion |
|---|---|---|---|---|
| **TC-01** | Schema / DB | `public.songs` | Schema migration definition & GIN index | `tags text[] NOT NULL DEFAULT '{}'::text[]` + GIN index `idx_songs_tags` |
| **TC-02** | Types | `src/types/` | TypeScript type contracts | `SongTag`, `DbSong.tags`, `Song.tags`, `SongSummary.tags` typed properly |
| **TC-03** | Server Action | `songActions.ts` | `createSong` persists sanitized tags | `tags` lowercase, trimmed, empty removed, saved in database |
| **TC-04** | Server Action | `songActions.ts` | `createSong` default empty array | When `tags` undefined/omitted, defaults to `[]` |
| **TC-05** | Server Action | `songActions.ts` | `updateSong` updates tags | Updates tags array cleanly when specified |
| **TC-06** | Server Action | `songActions.ts` | `updateSong` preserves existing tags when undefined | When `tags` undefined, `tags` omitted from update payload |
| **TC-07** | Server Action | `songActions.ts` | `getAllSongs` returns `tags` | Returns `tags` column alongside `id, title, artist, original_key` |
| **TC-08** | UI - Editor | `NewSongFormClient` | Multi-select tag chips | Chip selector shows `[+ Joyful]`, `[+ Solemn]`, `[+ Hymn]`, toggles active accents |
| **TC-09** | UI - Editor | `SongEditorClient` | Artisan editor tags & dirty tracking | Toggling tags marks form dirty, "Save Changes" enabled, persists on save |
| **TC-10** | UI - Viewer | Song Viewer (`/library/[id]`) | Tag badges beside key & artist | Active tag badges rendered in header with color accents (amber/purple/emerald) |
| **TC-11** | UI - Library | Song Library (`/library`) | Quick filter bar rendering | Bar shows `All`, `Joyful`, `Solemn`, `Hymn` with active state |
| **TC-12** | UI - Library | Song Library (`/library`) | Tag filter URL navigation | Clicking tag updates URL with `?tag=joyful`, resets `page=1`, preserves `q`, `letter`, `pageSize` |
| **TC-13** | UI - Library | Song Library (`/library`) | Song row badges | Each song card displays active tag badges |
| **TC-14** | UI - Picker | Setlist Picker (`LibraryPanel`) | Picker tag filter & search composition | Picker quick filter buttons filter songs client-side alongside title/artist search |
| **TC-15** | UI - Picker | Setlist Picker (`LibraryPanel`) | Picker song item badges | Song items in SetlistBuilder LibraryPanel display tag badges |

---

## 2. Detailed Test Cases

### TC-01: Schema Migration & GIN Index
- **File:** `supabase/migrations/20261021000000_add_tags_to_songs.sql`
- **Steps:**
  1. Inspect migration SQL.
  2. Verify `ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];`.
  3. Verify `CREATE INDEX IF NOT EXISTS idx_songs_tags ON public.songs USING gin (tags);`.
  4. Verify existing RLS policies (`songs_select_public`, `songs_insert_music_director`, `songs_update_music_director`) cover the new column.

### TC-02: TypeScript Type Safety
- **Files:** `src/types/Song.ts`, `src/types/supabase.ts`
- **Steps:**
  1. Verify `SongTag` is defined as `"joyful" | "solemn" | "hymn" | (string & {})`.
  2. Verify `STANDARD_SONG_TAGS` constant exported with labels and values.
  3. Verify `Song` has `tags?: SongTag[]`.
  4. Verify `SongSummary` includes `tags`.
  5. Verify `DbSong` in `supabase.ts` contains `tags: string[]`.
  6. Run `npx tsc --noEmit` and expect zero compilation errors.

### TC-03 to TC-07: Server Action Unit Tests
- **File:** `src/app/actions/__tests__/songActions.test.ts`
- **Steps:**
  1. Run `npm run test:unit`.
  2. Verify `createSong` persists sanitized tags `["joyful", "solemn"]`.
  3. Verify `createSong` defaults to `[]` when tags are omitted.
  4. Verify `updateSong` updates tags and handles sanitization.
  5. Verify `updateSong` does not overwrite tags when `tags` is undefined in payload.
  6. Verify `getAllSongs` selects and returns `tags`.

### TC-08: Tag Selector UI in Create Song Form
- **File:** `src/components/client/NewSongFormClient.tsx`
- **Steps:**
  1. Navigate to `/library/new`.
  2. Verify `SongTagSelector` renders pills `[+ Joyful]`, `[+ Solemn]`, `[+ Hymn]`.
  3. Click `[+ Joyful]` -> state toggles to `✓ Joyful` with warm amber styling.
  4. Click `[+ Solemn]` -> state toggles to `✓ Solemn` with purple styling.
  5. Click `✓ Joyful` -> state toggles back to `+ Joyful`.
  6. Verify accessibility: buttons have `role="switch"` and correct `aria-checked` values.

### TC-09: Artisan Song Editor Tag Management
- **File:** `src/components/client/SongEditorClient.tsx`
- **Steps:**
  1. Navigate to `/library/[id]/edit`.
  2. Verify existing song tags are reflected in the tag selector.
  3. Toggle a tag on/off.
  4. Verify `isDirty` changes to `true` and "Unsaved changes" indicator appears.
  5. Click "Save Changes".
  6. Verify save request payload contains the updated `tags` array.

### TC-10: Song Viewer Metadata Display
- **File:** `src/app/library/[id]/page.tsx`
- **Steps:**
  1. Navigate to `/library/[id]`.
  2. In header section, check metadata row containing artist and original key.
  3. Verify active tag badges appear alongside key with proper color accent and uppercase text.

### TC-11 & TC-12: Song Library Tag Quick Filter Bar
- **File:** `src/app/library/page.tsx`
- **Steps:**
  1. Navigate to `/library`.
  2. Verify Tag Quick Filter bar renders `All`, `Joyful`, `Solemn`, `Hymn`.
  3. Click `Joyful` -> URL changes to `/library?tag=joyful`.
  4. Verify `page` is reset to `1`.
  5. Enter search term or select alphabet letter; verify `tag=joyful` is preserved in the URL.
  6. Click `All` -> URL changes to `/library` (removes `tag` param).

### TC-13: Song Library Row Badges
- **File:** `src/app/library/page.tsx`
- **Steps:**
  1. In the song library list, inspect song rows.
  2. For songs with tags, verify tag badges (`SongTagBadge`) render next to the song title.

### TC-14 & TC-15: Setlist Builder Library Panel Picker
- **File:** `src/components/client/SetlistBuilder/LibraryPanel.tsx`
- **Steps:**
  1. Navigate to `/setlists/new` or `/setlists/[id]/edit`.
  2. Locate the Song Library panel on the right.
  3. Verify tag quick filter chips (`All`, `Joyful`, `Solemn`, `Hymn`) are displayed above the search input.
  4. Select `Joyful` -> list filters down to songs containing `joyful` tag.
  5. Enter search query -> list filters by both tag and text.
  6. Verify song rows in the picker display tag badges.
