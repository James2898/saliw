# Spec — YouTube Link Field & Collapsible Embed Player (TASK-047)

## Feature Summary

Add a `youtube_url` field to library song records so that music directors can attach one YouTube video per song. On both the setlist viewer and the song viewer, a toggle button reveals a collapsible inline embed player. When no link is stored and the viewer has the `music_director` role, a prompt button opens a modal to add (or update) the link. When no link is stored and the viewer is not a music director, a neutral empty-state placeholder is shown. If the auto-scroll feature is active, the embed player is visually hidden — but an already-playing video is not destroyed, ensuring audio continues until the user explicitly stops it.

## Acceptance Criteria

### Database / Storage
1. The `songs` table gains a nullable `youtube_url` column (`text`, nullable, default `null`) via a new Supabase migration.
2. Only users with the `music_director` role can write (INSERT or UPDATE) `youtube_url`; all other roles are blocked at the RLS level, not just hidden in the UI.
3. Authenticated non-director users and unauthenticated visitors can read `youtube_url` through the existing SELECT policy (public or auth-gated — to be confirmed by explorer; see Open Questions).

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
22. The placeholder must meet WCAG AA contrast against the Artisan card background. It must not use `--brand-tan` text on `--brand-cream` background (low-contrast pair per coding-guidelines.md).

### Autoscroll Interaction
23. When the auto-scroll feature is active (running, not paused), the embed player's container is visually hidden (`visibility: hidden` or equivalent CSS that removes it from the visible layout without destroying the `<iframe>` DOM node).
24. If a video was playing inside the embed when auto-scroll was activated, the `<iframe>` is hidden but **not unmounted**; the video's audio/video stream continues in the background.
25. When auto-scroll is deactivated (paused or stopped), the embed container becomes visible again at its prior expanded/collapsed state — no state reset occurs.
26. The toggle button ("Show/Hide video") is also hidden while auto-scroll is active, so the user cannot interact with a non-visible embed.
27. Visual hiding must use CSS only (`visibility: hidden` or `display: none` with `pointer-events: none` — not React conditional unmounting), consistent with BUG-014/BUG-015 learnings that destroying the DOM node causes undesirable playback side-effects.

### Dark Mode
28. All new UI elements (toggle button, empty-state placeholder, modal, embed container) must have explicit `dark:` Tailwind variant classes alongside every named Artisan brand utility, per BUG-004 and BUG-005 prevention rules.

### Permissions — UI Layer
29. The add/edit trigger button is rendered only when the authenticated user has the `music_director` role. The check must be performed server-side (in a Server Component or Server Action), not by hiding a button solely in client-side state.
30. The "Save" Server Action must enforce `music_director` role via RLS; the UI-layer role check (AC-29) is defence-in-depth only and is not a substitute for the RLS enforcement.

### Server Action Constraints
31. The Server Action that updates `youtube_url` must handle PostgreSQL error code `23502` (NOT NULL violation, if the column were ever changed to NOT NULL in a future migration) and the general catch-all, returning user-facing messages rather than raw error strings.
32. The Server Action must be wrapped in `try/catch` — no unhandled Promise rejections (per coding-guidelines.md Architecture checklist).

## Out of Scope

- Per-setlist YouTube overrides: the link is stored once per song in the library; setlist-specific overrides are not part of this task.
- Playlist or multiple videos per song.
- Video thumbnail previews in the song list before the embed is expanded.
- Any YouTube Data API integration (no API key, no metadata fetch).
- Video start time / timestamp parameters appended to the embed URL.
- Autoplay on embed expand.
- Persistent open/closed state stored in localStorage or user preferences.
- Mobile picture-in-picture or fullscreen behaviour beyond what the browser provides natively.
- Deleting a YouTube link independently (clearing the field via the edit modal with a blank submission covers this — AC-6).

## Fallback Behaviors

- **YouTube link absent, viewer is music_director:** Render an "Add YouTube link" action button in the song card (setlist viewer) and on the song viewer page. The button opens the add/edit modal.
- **YouTube link absent, viewer is not music_director:** Render a neutral empty-state text placeholder. No interactive control is shown.
- **YouTube link present, video unavailable:** The `<iframe>` renders and YouTube's own "Video unavailable" message is displayed inside it. No application-level fallback UI is required.
- **Server Action fails on save:** Modal remains open; inline error message is displayed; no optimistic update is committed.
- **Auto-scroll active:** Embed container and toggle button are visually hidden via CSS; `<iframe>` DOM node is preserved so in-progress playback continues.

## Resolved Ambiguities

- **Accepted URL formats** → Full watch URL, youtu.be shortlink, and embed URL are all accepted; all are normalised to the canonical embed format on save. Resolved from user-confirmed spec (all three).
- **Add vs. Edit modal** → Single modal, pre-filled when a link exists. Resolved from user-confirmed spec.
- **Embed open/closed persistence** → Always starts collapsed on page load; no localStorage or session persistence. Resolved from user-confirmed spec.
- **Embed size constraints** → Responsive, 16:9 aspect ratio, no fixed pixel dimensions, fills parent container. Resolved from user-confirmed spec.
- **Multiple song instances in setlist** → Each card instance has its own independent toggle state. Resolved from user-confirmed spec.
- **Invalid/private video** → Rely on YouTube's native embed error UI; no application-level error state required. Resolved from user-confirmed spec.
- **Autoscroll hide behaviour** → Visual CSS hide only (not unmount); in-progress audio/video continues. Resolved from user-confirmed spec.
- **Dark mode requirement** → All new components must carry explicit `dark:` variants per BUG-004/BUG-005 prevention patterns in MEMORY.md.
- **Role enforcement** → Must be at RLS layer; UI-layer gating is defence-in-depth only. Resolved from coding-guidelines.md Security section.
- **Embed collapse on user toggle** → When the user explicitly hides the player via the toggle, the `<iframe>` is hidden (collapsed); the browser may pause the video as a side-effect of the `<iframe>` leaving the rendered layout. This is acceptable — no requirement to continue audio when the user deliberately collapses the player (distinct from the autoscroll hidden-but-playing requirement in AC-23/24).
