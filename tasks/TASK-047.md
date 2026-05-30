# TASK-047 — Add YouTube Link to Library Songs with Collapsible Embed Player

- **Tier:** 1
- **Date Created:** 2026-05-30
- **Status:** In Progress

---

## Feature Summary

Add a `youtube_url` field to library song records so that music directors can attach one YouTube video per song. On both the setlist viewer and the song viewer, a toggle button reveals a collapsible inline embed player. When no link is stored and the viewer has the `music_director` role, a prompt button opens a modal to add (or update) the link. When no link is stored and the viewer is not a music director, a neutral empty-state placeholder is shown. If the auto-scroll feature is active, the embed player is visually hidden — but an already-playing video is not destroyed, ensuring audio continues until the user explicitly stops it.

---

## Acceptance Criteria

### Database / Storage
1. The `songs` table gains a nullable `youtube_url` column (`text`, nullable, default `null`) via a new Supabase migration.
2. Only users with the `music_director` role can write (INSERT or UPDATE) `youtube_url`; all other roles are blocked at the RLS level, not just hidden in the UI.
3. Authenticated non-director users and unauthenticated visitors can read `youtube_url` through the existing SELECT policy (public).

### URL Validation
4. Accepted input formats on save are: full watch URL (`https://www.youtube.com/watch?v=...`), shortened URL (`https://youtu.be/...`), and embed URL (`https://www.youtube.com/embed/...`). All three formats are normalised to a canonical embed URL (`https://www.youtube.com/embed/<VIDEO_ID>`) before persisting to the database.
5. Any URL that does not match the three accepted patterns is rejected with a user-facing inline error: "Please enter a valid YouTube URL." The record is not saved.
6. An empty/blank submission clears the field (sets `youtube_url` to `null`) rather than being treated as an invalid URL.

### Add / Edit Modal (music_director only)
7. When a `music_director` views a song that has no YouTube link, a clearly labelled action (e.g. "Add YouTube link") is rendered in both the setlist viewer and the song viewer.
8. Clicking the action opens a modal containing a single text input pre-filled with the current `youtube_url` value (empty for new links, populated for edits). There is one modal — it doubles as both the add and edit flow.
9. The modal has a "Save" button and a "Cancel" button. Cancel closes the modal without saving. Save validates the URL (AC-5), then calls the Server Action.
10. On successful save, the modal closes, the UI reflects the new link immediately (optimistic update pattern consistent with existing codebase mutations), and a non-blocking success indicator is shown.
11. On Server Action failure, the modal stays open and displays a user-facing error message. The error must not be a raw technical string.
12. A `music_director` who has already stored a link sees the same "Add YouTube link" / edit trigger (the label may change to "Edit YouTube link") — tapping it opens the same modal pre-filled with the existing URL.

### Embed Toggle Behavior (all viewers)
13. When a YouTube link is present, a "Show video" toggle button is rendered in both the setlist viewer song card and the song viewer page.
14. The embed player starts **collapsed** (hidden) on every page load — it does not persist its open/closed state across navigation.
15. Clicking the toggle button expands the embed player (renders the `<iframe>`) and changes the button label to "Hide video" (or equivalent accessible label).
16. Clicking the toggle a second time collapses the embed (hides the `<iframe>` — it is not destroyed). The video pauses if it was playing because the browser suspends the `<iframe>` when it loses its rendered context. Note: this is acceptable behavior; there is no requirement to keep audio playing when the user explicitly collapses the embed.
17. The embed player is **responsive**: it fills the available column width with a 16:9 aspect ratio. There is no fixed pixel width or height. No maximum width constraint is imposed unless dictated by the parent container's existing layout.
18. If a song appears multiple times in a setlist (same song, different performance keys), each song card instance maintains its **own independent** toggle state; expanding one instance does not expand others.

### Unavailable / Invalid Video Handling
19. When the stored `youtube_url` passes validation but the video is private, deleted, or otherwise unavailable, the `<iframe>` renders normally — the YouTube embed itself displays its standard "Video unavailable" UI inside the frame. No additional error state is required from the application.
20. The application does not make any pre-flight network requests to verify video availability before rendering the embed.

### Empty State (non-music_director viewers)
21. When no YouTube link is stored and the viewer is not a `music_director`, a neutral placeholder is shown (e.g. a muted-text line: "No video available"). No action button or interactive control is rendered.
22. The placeholder must meet WCAG AA contrast against the Artisan card background. It must not use `--brand-tan` text on `--brand-cream` background (low-contrast pair).

### Autoscroll Interaction
23. When the auto-scroll feature is active (running, not paused), the embed player's container is visually hidden (`visibility: hidden` or equivalent CSS that removes it from the visible layout without destroying the `<iframe>` DOM node).
24. If a video was playing inside the embed when auto-scroll was activated, the `<iframe>` is hidden but **not unmounted**; the video's audio/video stream continues in the background.
25. When auto-scroll is deactivated (paused or stopped), the embed container becomes visible again at its prior expanded/collapsed state — no state reset occurs.
26. The toggle button ("Show/Hide video") is also hidden while auto-scroll is active, so the user cannot interact with a non-visible embed.
27. Visual hiding must use CSS only (`visibility: hidden` or `display: none` with `pointer-events: none` — not React conditional unmounting), consistent with BUG-014/BUG-015 learnings that destroying the DOM node causes undesirable playback side-effects.

### Dark Mode
28. All new UI elements (toggle button, empty-state placeholder, modal, embed container) must have explicit `dark:` Tailwind variant classes alongside every named Artisan brand utility.

### Permissions — UI Layer
29. The add/edit trigger button is rendered only when the authenticated user has the `music_director` role. The check must be performed server-side (in a Server Component or Server Action), not by hiding a button solely in client-side state.
30. The "Save" Server Action must enforce `music_director` role via RLS; the UI-layer role check (AC-29) is defence-in-depth only and is not a substitute for the RLS enforcement.

### Server Action Constraints
31. The Server Action that updates `youtube_url` must handle PostgreSQL error code `23502` (NOT NULL violation, if the column were ever changed to NOT NULL in a future migration) and the general catch-all, returning user-facing messages rather than raw error strings.
32. The Server Action must be wrapped in `try/catch` — no unhandled Promise rejections.

---

## Out of Scope

- Per-setlist YouTube link overrides: the link is stored once per song in the library; setlist-specific overrides are not part of this task.
- Playlist or multiple videos per song.
- Video thumbnail previews in the song list before the embed is expanded.
- Any YouTube Data API integration (no API key, no metadata fetch).
- Video start time / timestamp parameters appended to the embed URL.
- Autoplay on embed expand.
- Persistent open/closed state stored in localStorage or user preferences.
- Mobile picture-in-picture or fullscreen behaviour beyond what the browser provides natively.
- Deleting a YouTube link independently (clearing the field via the edit modal with a blank submission covers this — AC-6).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `supabase/migrations/<timestamp>_add_youtube_url_to_songs.sql` | New migration: `ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS youtube_url text;` |
| `src/types/Song.ts` | Add `youtube_url?: string \| null` to frontend Song type |
| `src/types/supabase.ts` | Add `youtube_url: string \| null` to DbSong / generated Supabase type |
| `src/app/actions/songActions.ts` | Extend `createSong` and `updateSong` with `youtube_url` param + select column |
| `src/components/client/SongEditorClient.tsx` | Add YouTube URL input field to edit form |
| `src/components/client/NewSongFormClient.tsx` | Add YouTube URL field to new song form |
| `src/app/library/[id]/page.tsx` | Server Component; pass `isMusicDirector` and `youtube_url` to client |
| `src/components/client/SetlistSongSection.tsx` | Add embed toggle, player, add/edit button, empty state; consume `autoScroll.isActive` |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Extend `ClientSong` interface with `youtubeUrl: string \| null` |
| `src/app/setlists/[id]/page.tsx` | Extend `processedSongs` map: `youtubeUrl: entry.songs.youtube_url ?? null` |
| `src/components/client/YouTubeLinkModal.tsx` | **New file** — add/edit modal for YouTube URL, based on `SetlistSettingsModal.tsx` structure |

---

## Technical Schema

N/A — no API contract required for this task. `youtube_url` is a simple text field; all data flows through existing `updateSong` and `createSong` Server Actions.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-047/spec.md` | Acceptance criteria + scope + fallback behaviors |
| Context Bundle | `tasks/TASK-047/context.md` | Reusable components + patterns + anti-patterns |
| Research Notes | `tasks/TASK-047/research.md` | Open questions (all resolved) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code — follow Artisan palette naming and dark mode pairing rules.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001** (useState-in-effect): The YouTube URL state in `SongEditorClient` must use a lazy initializer (`useState(() => song.youtube_url ?? "")`) not a `useEffect` + `setState`. All other state fields in the file already follow this pattern.

- **BUG-007** (React Compiler forward reference): In any Client Component, declare all helper functions (`handleSave`, `handleClose`, modal callbacks) before the `useEffect` blocks that reference them. The YouTube modal and embed toggle handlers must be declared before their corresponding `useEffect`s.

- **BUG-002** (React Compiler useCallback property-path deps): If a `useCallback` in the embed component depends on `autoScroll.isActive` or `autoScroll.pause`, depend on the whole `autoScroll` object (`[autoScroll]`), not on the property path (`[autoScroll.isActive]`).

- **BUG-004 / BUG-005** (dark mode named utilities): All new JSX elements using Artisan palette named utilities must have explicit `dark:` variants. The embed player container, toggle button, and modal all need `dark:` pairs for every `text-brand-*`, `bg-brand-*`, and `border-brand-*` class.

- **BUG-020** (SSR hydration mismatch): Do not use `useState(() => typeof window !== "undefined")` as a mount guard. If the embed needs a client-only mount check (e.g. for `window.location`), use `useState(false)` + `useEffect(() => setMounted(true), [])`.

- **BUG-021** (CSS variable opacity): If using `bg-[var(--brand-card-bg)]` anywhere for the embed container, verify the variable is fully opaque. Prefer `bg-brand-cream dark:bg-brand-espresso` for the embed container background instead.

- **BUG-016** (missing `23505` handler in `createSong`): Still open — not blocking this task since `youtube_url` is not a unique column, but do not add a UNIQUE constraint to it.

- **BUG-014 / BUG-015** (iframe destruction side-effects): Do not unmount the `<iframe>` to hide it during autoscroll — CSS-only hide required (AC-23–27). Use `visibility: hidden` or `display: none` with `pointer-events: none` to preserve the DOM node while visually hiding it.

### Key Patterns to Follow

**Modal structure**: Copy `src/components/client/SetlistSettingsModal.tsx` — Artisan backdrop (`bg-[var(--brand-espresso)]/40 backdrop-blur-sm`), focus trap, Escape dismiss, helpers declared BEFORE any `useEffect` (BUG-007 prevention).

**State initializer**: Use lazy `useState(() => song.youtube_url ?? "")` in `SongEditorClient` — NOT `useEffect` + `setState` (BUG-001 prevention).

**useCallback deps**: If `useCallback` references `autoScroll.isActive`, depend on whole `autoScroll` object — NOT the property path (BUG-002 prevention).

**Iframe CSS hide**: Use `className={autoScroll?.isActive ? "invisible pointer-events-none" : ""}` or a `hidden` class toggle — never conditional rendering (`&&`) for the autoscroll hide path.

**Role check**: Server-side — query `profiles.role` in the Server Component (see `src/app/library/[id]/page.tsx` lines 47–59). Pass `isMusicDirector` as prop to client.

**Dark mode**: Every new named Artisan utility must have an explicit `dark:` pair. Use `bg-brand-cream dark:bg-brand-espresso` for embed container — NOT `bg-[var(--brand-card-bg)]` (BUG-021 prevention).

**processedSongs shape**: Extend object in `.map()` in `src/app/setlists/[id]/page.tsx` with `youtubeUrl: entry.songs.youtube_url ?? null`.

**Server Action mutation pattern**: See `src/app/actions/songActions.ts` `updateSong` — add `youtube_url?: string | null` to the input type; add it to the `updatePayload` filter (existing pattern handles it); add it to the `.select()` column list. Also add `23502` error handling (NOT NULL violation) — same try/catch pattern already in the file.

**inputBaseClass / labelClass reuse**: See `src/components/client/SongEditorClient.tsx` lines 12–22 — these module-level string constants define the Artisan form field appearance. Copy and reuse them in the YouTube URL input field inside `SongEditorClient` and `NewSongFormClient`.

**Anti-patterns to avoid**:
- Do NOT use `bg-black/50` for modal backdrop — use Artisan `bg-[var(--brand-espresso)]/40 backdrop-blur-sm` (seen in existing `SongEditorClient` Unsaved Changes Modal — avoid replicating)
- Do NOT unmount the `<iframe>` to hide it during autoscroll — CSS-only hide required
- Do NOT use `bg-[var(--brand-card-bg)]` for embed container — verify any CSS var is full-opacity, or use named brand utility (BUG-021)
- Do NOT add a UNIQUE constraint to `youtube_url` (not a unique field)
- Do NOT forward-reference helper callbacks before the `useEffect` that calls them (BUG-007)

### Resolved Open Questions

- **SELECT RLS policy for youtube_url** → The existing `songs` table SELECT policy is `USING(true)` in `supabase/migrations/20260418000003_allow_public_read_songs.sql`. The `youtube_url` column is automatically readable by all (public) with no policy change needed (source: context.md → Relevant Files)

- **Server Action names and paths** → `createSong` and `updateSong` in `src/app/actions/songActions.ts` handle song mutations; both need `youtube_url` extended to input type and select column list (source: context.md → Relevant Files)

- **Setlist viewer song card component** → `src/components/client/SetlistSongSection.tsx` is the per-song section in setlist viewer; it already receives `autoScroll` prop from `SetlistViewerClient` (source: context.md → Relevant Files)

- **Song viewer page component** → `src/app/library/[id]/page.tsx` is the song detail page; role check pattern lives here at lines 47–59 (source: context.md → Relevant Files)

- **Auto-scroll hook/context** → `src/hooks/useAutoScroll.ts` exports `UseAutoScrollReturn` with `isActive` boolean flag; this is the hide signal for AC-23–26 (source: context.md → Reuse Candidates)

- **Modal primitive** → `src/components/client/SetlistSettingsModal.tsx` is the canonical modal template: fixed backdrop with Artisan colors, centered panel, focus trap, Escape dismiss, focus-return-on-close (source: context.md → Reuse Candidates)

- **music_director role identifier** → The role string is `music_director` (used consistently throughout spec ACs and confirmed in context.md role-gate pattern at `src/app/library/[id]/page.tsx`)

---

## Resolution

- **Completed:** 2026-05-30
- **Branch:** feature/TASK-047-youtube-link-embed
- **Base branch:** main
- **Files changed:**
  - `supabase/migrations/20260530000001_add_youtube_url_to_songs.sql` — migration: adds nullable `youtube_url` text column to songs table
  - `src/types/Song.ts` — adds `youtube_url?: string | null` to frontend Song type
  - `src/types/supabase.ts` — adds `youtube_url: string | null` to DbSong type
  - `src/app/actions/songActions.ts` — extends `createSong` and `updateSong` with `youtube_url` param, updated select lists, added `23502` error handler to `updateSong`
  - `src/app/actions/setlistActions.ts` — extends `getSetlistWithSongs` to fetch `youtube_url` column in the songs sub-select
  - `src/components/client/YouTubeLinkModal.tsx` — **new file**: add/edit modal for YouTube URL; includes `normaliseYouTubeUrl` exported utility function
  - `src/components/client/SongYouTubeSection.tsx` — **new file**: client island for YouTube embed section in song viewer page (toggle, embed, add/edit/empty state)
  - `src/components/client/SetlistSongSection.tsx` — adds `songId`, `youtubeUrl`, `isMusicDirector` props; embed toggle + player + add/edit button + empty state + autoscroll CSS-hide
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — extends `ClientSong` with `youtubeUrl`, adds `isMusicDirector` to props and passes all to `SetlistSongSection`
  - `src/app/setlists/[id]/page.tsx` — maps `youtubeUrl` into `processedSongs`, passes `isMusicDirector` to both `SetlistViewerClient` instances
  - `src/app/library/[id]/page.tsx` — fetches `youtube_url` column, imports and renders `SongYouTubeSection`
  - `src/app/library/[id]/edit/page.tsx` — fetches `youtube_url` column, passes it to `SongEditorClient`
  - `src/components/client/SongEditorClient.tsx` — adds YouTube URL input field with lazy state initializer (BUG-001), normalisation on save, and dirty-tracking
  - `src/components/client/NewSongFormClient.tsx` — adds YouTube URL input field with normalisation on submit
- **Notes:**
  - `SongYouTubeSection.tsx` is a new client component not listed in the original Relevant Files table. It was needed because `src/app/library/[id]/page.tsx` is a Server Component and the YouTube embed requires client-side state (toggle, modal). The component is a thin client island following the existing pattern for `ChordSheetClient`.
  - RLS for `youtube_url` writes is covered by the existing `songs_update_music_director` and `songs_insert_music_director` policies (enforced via `is_music_director()`). No additional policy migration was needed.
  - The autoscroll CSS-hide (AC-23–27) uses `invisible pointer-events-none` on the wrapper div, which uses `visibility: hidden` semantics and preserves the `<iframe>` DOM node so in-progress audio continues.
  - Empty-state placeholder text uses `text-brand-espresso/50 dark:text-brand-cream/40` which is WCAG-compliant against the card background (avoiding the low-contrast `--brand-tan` on `--brand-cream` pair per AC-22).
  - `normaliseYouTubeUrl` is exported from `YouTubeLinkModal.tsx` and imported by both `SongEditorClient` and `NewSongFormClient` to avoid duplicating the normalization logic.

### AC-10 Fix (2026-05-30) — Transient "Saved!" Indicator

Previously the modal closed silently with no user feedback. Fixed by adding a `saveSuccess` boolean state to both `SongYouTubeSection.tsx` and `SetlistSongSection.tsx`. In each component's `handleYtSaveSuccess` callback, `setSaveSuccess(true)` fires immediately after the optimistic URL update, then `setTimeout(() => setSaveSuccess(false), 2000)` auto-clears after 2 s. A `<span aria-live="polite">Saved!</span>` with `text-green-700 dark:text-green-400` renders conditionally adjacent to each trigger button. The `isMusicDirector` branch (Add button) was wrapped in `<>...</>` fragment to allow the sibling indicator. No changes to `YouTubeLinkModal.tsx`.
