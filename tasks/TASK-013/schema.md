# Technical Schema — Artisan New Song Entry Point & Stage-Ready UI Controls

## Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| Submit New Song form | `createSong()` | `src/app/actions/songActions.ts` | `music_director` | **EXISTS** | N/A |
| Role check for NewSongButton (library page) | Supabase query on `profiles` table | `src/app/library/page.tsx` | own-row read | **EXISTS** | Degrade to `isMusicDirector = false` on error |
| Role check for `/library/new` page | Supabase query on `profiles` table | `src/app/library/new/page.tsx` (new) | own-row read | **EXISTS** (pattern exists; page is new) | Redirect to `/library` on error or non-director |
| Font size persistence | `localStorage` key `"saliw-font-size"` | Client-side only — no Supabase | N/A | **EXISTS** (browser API) | Clamp to default 16px if unavailable |
| Hide Chords toggle | Client state only — CSS class toggle | `ChordSheetClient.tsx` | N/A | **EXISTS** (CSS-only, no backend) | N/A |
| Stage Mode toggle | Client state only — CSS class toggle | `ChordSheetClient.tsx` | N/A | **EXISTS** (CSS-only, no backend) | N/A |
| `/library/new` page route | N/A — page component | `src/app/library/new/page.tsx` | music_director (RBAC redirect) | **MISSING — create as part of this task** | Page must be created; gap is intentional new work |

## Summary

- Total data actions: 7
- EXISTS: 6
- MISSING: 1 (the `/library/new` route — created as part of this task, not a backend gap)
- All-MISSING escalation: No (only 1 MISSING, and it is intentional new work explicitly in scope)
