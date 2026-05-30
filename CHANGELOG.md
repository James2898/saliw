# Changelog

All notable changes to the Saliw Music Portal are documented here.

---

## [Unreleased] — 2026-05-30

### Added

- YouTube link attachment and collapsible embed player for library songs (`TASK-047`)
  - New nullable `youtube_url` column on `songs` table via Supabase migration; RLS restricts writes to `music_director` role, reads remain public
  - URL normalisation accepts watch (`/watch?v=`), shortlink (`youtu.be/`), and embed formats; all canonicalised to `https://www.youtube.com/embed/<ID>` before persisting; blank submission clears the field
  - `YouTubeLinkModal` — shared add/edit modal with inline URL validation error, server-action error display, and focus trap; modal pre-filled with current URL on reopen
  - `SongYouTubeSection` (song viewer) and `SetlistSongSection` (setlist viewer) both implement: optimistic URL state update on save, 2-second transient "Saved!" indicator with `aria-live="polite"`, embed toggle button (Show/Hide video), responsive 16:9 `<iframe>`, and neutral "No video available" placeholder for non-directors
  - Embed collapse uses CSS `display:none` (not React unmounting) preserving the `<iframe>` DOM node; `<iframe>` hidden but not destroyed when auto-scroll is active (`visibility: hidden / pointer-events-none`) so in-progress audio continues
  - Add/edit trigger server-side role-guarded (`isMusicDirector` derived in Server Component); Server Action enforces `music_director` via RLS as defence-in-depth
  - All new UI elements carry explicit `dark:` Tailwind variant classes; named Artisan brand utilities used throughout (no `bg-[var(--brand-card-bg)]`, BUG-021)
  - Affected files: `src/app/actions/songActions.ts`, `src/components/client/YouTubeLinkModal.tsx` (new), `src/components/client/SongYouTubeSection.tsx` (new), `src/components/client/SetlistSongSection.tsx`, `src/app/library/[id]/page.tsx`, `supabase/migrations/YYYYMMDD_add_youtube_url_to_songs.sql` (new)

- Worship leader selector and musician lineup fields on the `/setlists/new` creation form (`TASK-046`)
  - New `SetlistPeopleLocalSection` controlled component (CREATE mode only; zero Server Action imports; callback props only; mirrors `SetlistPeopleSection` class constants)
  - Worship leader select (populated from `allMusicians`; defaults to neutral "— None —"; no DB write until Save)
  - Musician lineup: musician select + instrument input + Add button; appends `PendingLineupEntry` locally; each entry shows name, instrument, and Remove; empty state "No musicians added yet."
  - Add button disabled when instrument is empty/whitespace or no musician selected or roster is empty (AC-13/14/16); duplicate musician allowed (AC-20)
  - On Save (CREATE branch): `createSetlist` → `setSetlistWorshipLeader` (if selected) → `addSetlistMusician` loop → `router.push(/setlists/${newId})`; save button disabled with loading indicator for entire sequence
  - Error paths halt at each step: worship leader failure stops before lineup write; lineup failure shown with user-friendly message; raw Supabase errors never surfaced
  - `listMusicians()` result mapped to `{ id, name }` only — `notes` excluded (BUG-011); lazy `useState` initializers (BUG-001); handlers declared before JSX (BUG-007); BUG-008 separate error checks in people flush; all new brand utilities carry `dark:` pairs (BUG-004); no `bg-[var(--brand-card-bg)]` (BUG-021)
  - Visible only to `music_director` users (`isMusicDirector` derived server-side in `new/page.tsx` via `profiles.role`); not rendered in EDIT mode
  - Affected files: `src/app/setlists/new/page.tsx`, `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`, `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` (new)

---

## [Unreleased] — 2026-05-29

### Added

- Global interactive chord drawer with guitar fretboard and piano keyboard diagrams (`TASK-043`)
  - Single page-level fixed-bottom `ChordDrawer` mounted in `SetlistViewerClient` (not per-song inline)
  - Covers all songs in the setlist; `uniqueChords` computed via `useMemo` from all songs' transposed chord tokens (no `useEffect + setState`)
  - Per-song semitone offsets tracked in `songOffsets` state; initialised from `getSemitoneOffset(originalKey, performanceKey)` and updated on every transpose via `onOffsetChange` prop
  - Clicking any chord token fires the displayed (transposed) chord name via `span.innerText.trim()` and opens the drawer to the matching card
  - Guitar (6-string SVG, `0 0 100 120` viewBox) and piano (14 white + 10 black keys SVG, `0 0 140 60` viewBox) diagram modes; toggle in open drawer header
  - Auto-scrolls focused chord card to center using `offsetLeft - clientWidth/2 + cardWidth/2`
  - Closed state: small `Chords ↑` pill at bottom edge; open state: full-width slide-up drawer
  - `chord-drawer-panel` CSS class in `globals.css` restores `transform` transition suppressed by global `*` rule
  - `CHORD_REGISTRY` exports 18 worship chords including all required base chords (`C`, `C/E`, `G`, `G/B`, `D`, `D/F#`, `Em`, `Am`, `Bm`, `F`)
  - All BUG-002/004/007/019/020 prevention rules applied; zero Supabase imports in any changed file
  - Affected files: `src/utils/chordLibrary.ts`, `src/components/client/ChordDrawer.tsx`, `src/components/SongViewer/ChordSheetClient.tsx`, `src/components/client/SetlistSongSection.tsx`, `src/app/setlists/[id]/SetlistViewerClient.tsx`, `src/styles/globals.css`

---

## [Unreleased] — 2026-05-26

### Added

- Capo selector (frets 0–7) and CAGED shape picker inside the expandable song-controls panel (`TASK-042`)
  - Capo applies an inverse transpose to the chord display only: fret N shows open-position fingering shapes (sounding key minus N semitones via existing `shiftChord` utility); performanceKey and Go Live sync are unaffected
  - CAGED picker (C/A/G/E/D) is a visual-only performer reference aid; single-select with deselect; no effect on chord content
  - Both controls are pure React local state — never persisted to Supabase, localStorage, sessionStorage, or any external store
  - Collapsible panel `max-h-40` increased to `max-h-96` to accommodate the new rows (AM-1)
  - Module-level `CAPO_FRETS` and `CAGED_SHAPES` arrays for React.memo stability (BUG-019); all brand utilities paired with `dark:` variants (BUG-004)
  - Affected files: `src/components/SongViewer/ChordSheetClient.tsx`

---

## [Unreleased] — 2026-05-24

### Added

- One-click Section Navigator Deck for the setlist song viewer (`TASK-045`)
  - Floating badge deck: vertical fixed column on desktop (≥768 px, `z-[45]`, right margin, vertically centered); horizontally-scrollable fixed row on mobile (below sticky navbar at `top-16`)
  - Badges derived from `processedLines` `type: "header"` objects via `deriveSections()`; abbreviated per section type (IN, V1/V2, CH, BR, PC, IL, TAG, CODA, OUT; unrecognized → first 3 chars uppercased)
  - Repeated-section numbering: each occurrence counted by parse order across all songs (AC-4)
  - Deck suppressed when fewer than 2 sections detected or when viewer is in edit mode
  - IntersectionObserver tracks topmost-visible section header; active badge highlighted (full opacity / `bg-[var(--brand-tan)]`); inactive badges at 0.4 opacity
  - Click-to-scroll: `targetY = el.getBoundingClientRect().top + window.scrollY − navbarHeight − 8`; `behavior: "smooth"`
  - Auto-scroll interplay: `pause()` on `onPointerDown` (BUG-013); resume via 3-frame stable-scrollY settle-detector, not IO (BUG-015)
  - Shared auto-scroll instance received as prop from `SetlistViewerClient` — no new `useAutoScroll()` calls (BUG-014)
  - All fixed-element surfaces use CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`) for automatic dark-mode switching (BUG-004/BUG-021)
  - SSR-safe: `mounted` guard renders `null` on server and first hydration (AC-16)
  - Accessibility: `aria-label` on each badge (e.g. `"Verse 1"`); `aria-current="true"` on active badge; IO-absent fallback renders all badges at full opacity (AC-22)
  - Stable `id="section-{junctionId}-{lineIndex}"` added to each section header span in `ChordSheetClient.tsx` for scroll targeting
  - Affected files: `src/components/client/SectionNavDeck.tsx` (new), `src/components/SongViewer/ChordSheetClient.tsx`, `src/components/client/SetlistSongSection.tsx`, `src/app/setlists/[id]/SetlistViewerClient.tsx`

- Spacebar keyboard shortcut to activate, pause, and resume autoscroll (`TASK-041`)
  - Space when inactive: calls `toggle()` to activate autoscroll and begin scrolling at the current (or default) speed
  - Space when active+scrolling: pauses scrolling (panel stays visible)
  - Space when active+paused: resumes scrolling
  - Shortcut suppressed when focus is inside INPUT, TEXTAREA, SELECT, or contentEditable elements
  - Listener registered with `{ passive: false }` on `window` to allow synchronous `preventDefault`; cleaned up on unmount
  - Toolbar displays "Space to play/pause" keyboard hint — client-side only (SSR suppressed via lazy `useState` initializer)
  - BUG-007 compliant: `toggle` declared before the `useEffect` that references it
  - BUG-014/BUG-019 injection pattern preserved: no new `useAutoScroll()` calls in child components
  - Affected files: `src/hooks/useAutoScroll.ts`, `src/components/client/AutoScrollToolbar.tsx`

- Setlist viewer settings modal with gear icon, Font tab, and Chords tab for display preferences (`TASK-040`)
  - Gear/settings icon button added to setlist viewer header row (inline with date and Hide Chords button); `aria-label="Open display settings"`
  - Two-tab modal (Font / Chords) with ARIA role=dialog, tablist/tab/tabpanel semantics, focus trap, Escape + backdrop dismiss
  - Font tab: reuses `useFontSize` hook (lifted to SetlistViewerClient — AM-1 single source of truth) + new `useChordFontSize` hook (`"saliw-chord-font-size"` localStorage key); min 12px, max 48px, step 2
  - Chords tab: 5 Artisan palette chord background presets + "No background"; 5 high-contrast chord font color presets; all applied immediately via CSS custom properties
  - `.chord-item` in globals.css converted to `color: var(--chord-color, #c0392b)` / `background-color: var(--chord-bg, transparent)` custom properties (AM-2); variables injected on `.chord-display` container ref
  - All 4 preferences persisted in localStorage with BUG-001 lazy initializers; SSR-safe
  - All named Tailwind brand utilities carry explicit `dark:` variants (BUG-004 compliant)
  - Affected files: `src/components/client/SetlistSettingsModal.tsx` (new), `src/hooks/useChordFontSize.ts` (new), `src/hooks/useChordColor.ts` (new), `src/app/setlists/[id]/SetlistViewerClient.tsx`, `src/components/SongViewer/ChordSheetClient.tsx`, `src/components/client/SetlistSongSection.tsx`, `src/styles/globals.css`

- A–Z alphabet filter bar on Song Library and Setlist List pages (`TASK-039`)
  - 27 clickable chips ("All" + A–Z) rendered above results on both `/library` and `/setlists`
  - Server-side prefix filter: `.ilike("title", "X%")` on songs; `.ilike("name", "X%")` on setlists
  - AND-composed with existing search term; both filters active simultaneously (AC-7/AC-8)
  - Letter state stored in `?letter=A` URL param — bookmarkable, back/forward-restoring (AC-10)
  - `router.replace` navigation; page resets to 1 on letter change (AC-6)
  - Clicking active letter deselects it (AC-5); clicking "All" always clears filter (AC-3)
  - Descriptive empty-state messages for letter-only, search-only, and combined filter cases (AC-9)
  - Mobile layout: `flex flex-wrap` multi-row — no horizontal scroll (AC-17)
  - All `bg-brand-*`/`text-brand-*`/`border-brand-*` utilities have explicit `dark:` pairs (BUG-004/BUG-005)
  - `PaginationControls.buildUrl` and `PageSizeSelect.buildUrl` thread `letter` param (AC-18)
  - `SearchBar` preserves `letter` param via full `URLSearchParams` builder — no silent drops (AM-2/AC-19)
  - Affected files: `src/components/client/AlphabetFilter.tsx` (new), `src/app/library/page.tsx`, `src/app/setlists/page.tsx`, `src/components/client/SearchBar.tsx`, `src/components/client/PaginationControls.tsx`, `src/components/client/PageSizeSelect.tsx`

- Append Songs FAB on setlist detail page (desktop-only, `lg:` breakpoint and larger) for `music_director` users (`TASK-038`)
  - Desktop-only FAB (`hidden lg:flex`, `fixed bottom-6 left-6 z-50`) opens a scrollable song-picker modal
  - Songs already in the setlist are pre-checked and disabled; new songs can be multi-selected via checkbox or row click
  - Save appends checked songs sequentially (no `Promise.all`) to avoid `MAX(order_index)` race condition
  - Modal supports close via X button, backdrop click, and Escape key; focus trap and focus return to FAB on close
  - All Artisan colors via CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`) — BUG-004 safe
  - FAB is removed from DOM for non-`music_director` users via `{isLeader && ...}` server-side guard (BUG-010 safe)
  - Affected files: `src/components/client/AppendSongsButton.tsx` (new), `src/components/client/AppendSongsModal.tsx` (new), `src/app/setlists/[id]/SetlistViewerClient.tsx`, `src/app/setlists/[id]/page.tsx`

## [Unreleased] — 2026-05-19

### Added

- Items-per-page selector (10 / 25 / 50 / 100) on Setlists and Song Library list views (`TASK-037`)
  - Persisted via `?pageSize=N` URL query parameter; page resets to 1 on change
  - Selector follows Artisan palette with explicit `dark:` variants (BUG-004 safe)
  - Accessible via `<label htmlFor="pageSize">` + native `<select>`; keyboard navigable
  - Server-side validation: invalid or absent `pageSize` defaults to 10
  - PaginationControls renders even when totalCount === 0 (nav buttons auto-disabled)
  - Affected files: `src/app/setlists/page.tsx`, `src/app/library/page.tsx`, `src/components/client/PaginationControls.tsx`

## [Unreleased] — 2026-05-03

### Added

- Bulk-import script for 173 English Hymnal hymns (`TASK-036`)
  - Affected files: `scripts/parsers/hymnsMarkdownParser.ts`, `scripts/import-hymns.ts`, `supabase/migrations/20260503000001_songs_title_artist_unique_index.sql`
  - Note: AC9/AC10 (real DB execution + idempotent re-run verification) deferred — pending user-supplied SUPABASE_SERVICE_ROLE_KEY

### Changed

- TASK-035 extension: removed manual-scroll auto-pause; reduced speed range to 5 steps × 5 px/s (1→5 px/s … 5→25 px/s); default speed changed from 3 to 1 (`TASK-035`)
  - The `scroll` event listener that called `cancelRaf` on user wheel/touch input has been removed entirely; `lastScrollYRef` is gone. The rAF loop now runs uninterrupted regardless of manual scrolling.
  - `MAX_SPEED` reduced from 10 to 5; `speedToPxPerSecond(n)` simplified to `n * 5`; slider `max` attribute and `aria-label` updated to reflect "of 5"; `DEFAULT_SPEED` changed from 3 to 1.
  - Invalidates original AC 9, 10, 16, 17, 19 as documented in the task resolution notes.
  - Affected files: `src/hooks/useAutoScroll.ts`, `src/components/client/AutoScrollToolbar.tsx`

## [Unreleased] — 2026-04-27

### Changed

- Standardize loading indicators and save/error feedback for all async buttons across the portal (`TASK-034`)
  - Every async button now shows a Lucide `Loader2` spinner with `animate-spin` and present-progressive label while in flight; button is `disabled` and all sibling async buttons on the same resource are also locked (`isAnyPending`).
  - Inline error messages use `role="alert"` and `text-red-700 dark:text-red-400` uniformly; `text-red-500` in `GoLiveButton` and `FollowLeaderButton` corrected to `text-red-700` (WCAG AA on cream background).
  - `LogoutModal` gains optional `isSigningOut` and `error` props; `Navbar` wires loading + "Sign out failed. Please try again." error state for sign-out failure visibility.
  - `ErrorBanner` in `SetlistBuilder` updated to `text-red-700 dark:text-red-400` + full `dark:` pairs on dismiss button (BUG-004).
  - Affected files: `src/components/client/LoginForm.tsx`, `src/components/client/ForgotPasswordForm.tsx`, `src/components/client/ResetPasswordForm.tsx`, `src/components/client/EditProfileForm.tsx`, `src/components/client/MusicianForm.tsx`, `src/components/client/NewSongFormClient.tsx`, `src/components/client/SongEditorClient.tsx`, `src/components/client/SetlistBuilder/SetlistPanel.tsx`, `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx`, `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx`, `src/components/client/SetlistBuilder/ErrorBanner.tsx`, `src/components/client/GoLiveButton.tsx`, `src/components/client/FollowLeaderButton.tsx`, `src/components/client/logout-modal.tsx`, `src/components/client/navbar.tsx`

## [Unreleased] — 2026-04-27

### Added

- feat(metadata): add per-page browser-tab titles via `metadata.title.template`; homepage reads `Saliw` via `title.default`, all 17 other pages supply plain strings or `generateMetadata` without suffix
  - Affected files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/library/page.tsx`, `src/app/library/new/page.tsx`, `src/app/library/[id]/page.tsx`, `src/app/library/[id]/edit/page.tsx`, `src/app/setlists/page.tsx`, `src/app/setlists/new/page.tsx`, `src/app/setlists/[id]/page.tsx`, `src/app/setlists/[id]/edit/page.tsx`, `src/app/musicians/page.tsx`, `src/app/musicians/new/page.tsx`, `src/app/musicians/[id]/edit/page.tsx`, `src/app/profile/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/auth/auth-code-error/page.tsx`

## [Unreleased] — 2026-04-27

### Added

- Setlist People Section: worship leader assignment and instrumentalist lineup management on the setlist edit page; read-only people block on the setlist viewer page (`TASK-033`)
  - Affected files: `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx`, `src/app/setlists/[id]/edit/page.tsx`, `src/app/setlists/[id]/page.tsx`, `src/app/setlists/[id]/SetlistViewerClient.tsx`

## [Unreleased] — 2026-04-27

### Added

- Musicians Roster CRUD UI at `/musicians` (`TASK-032`)
  - Affected files: `src/app/musicians/page.tsx`, `src/app/musicians/new/page.tsx`, `src/app/musicians/[id]/edit/page.tsx`, `src/app/musicians/loading.tsx`, `src/components/client/MusicianForm.tsx`, `src/components/client/navbar.tsx`

## [Unreleased] — 2026-04-26

### Added

- Phase 2 DB schema wiring: TypeScript types and Server Actions for musicians and worship-leader management (`TASK-031`)
  - `DbSetlist` extended with `worship_leader_id: string | null`; `DbSetlistSong.singer` removed; `DbMusician` and `DbSetlistMusician` added to `src/types/supabase.ts`.
  - New `src/types/Musician.ts` exports `Musician` and `SetlistLineupEntry` frontend types.
  - New `src/app/actions/musicianActions.ts` with `listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician` (all returning `{ data: T | null; error: string | null }`).
  - `updateSetlist` extended with optional `worship_leader_id?: string | null` (omit preserves, `null` clears, string sets).
  - `setSetlistWorshipLeader` added as a one-line wrapper around `updateSetlist`.
  - `addSetlistMusician`, `removeSetlistMusician`, `getSetlistLineup` (ordered by instrument then musician name) added to `setlistActions.ts`.
  - `cloneSetlist` updated to copy `worship_leader_id`, drop `singer` mapping, and bulk-copy `setlist_musicians` with rollback on lineup-insert failure.
  - `npx tsc --noEmit` exits with code 0; zero `setlist_songs.singer` references remain in `src/`.
  - Affected files: `src/types/supabase.ts`, `src/types/Setlist.ts`, `src/types/Musician.ts`, `src/app/actions/musicianActions.ts`, `src/app/actions/setlistActions.ts`

- Clone setlist feature in the setlist editor page (`TASK-029`)
  - Ghost "Clone setlist" button with Copy icon renders in edit mode only (hidden in create mode); positioned top-right above the two-column builder layout.
  - Clicking opens `CloneSetlistDialog` — an accessible confirmation modal with role="dialog", aria-modal, focus trap (Tab/Shift+Tab cycles between Cancel and Confirm), and Escape key dismiss.
  - On confirm, calls `cloneSetlist` Server Action which duplicates the setlist header (name + " copy", same date and is_public) and all `setlist_songs` rows (preserving performance_key, singer, order_index) in a single transaction with rollback on failure.
  - On success, navigates to the cloned setlist's edit page (`/setlists/{newId}/edit`).
  - Errors surface via the existing inline `ErrorBanner` component; dialog closes before error is shown.
  - Affected files: `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`

## [Unreleased] — 2026-04-25

### Added

- Forgot Password and Reset Password flows; Magic Link login removed (`TASK-029`)
  - Removed mode toggle, all magic-link state/JSX/handlers, and `sendMagicLinkAction` from `LoginForm.tsx` and `authActions.ts`; email + password is now the sole login method.
  - Added "Forgot password?" `<Link>` below Submit in `LoginForm.tsx`.
  - New `/forgot-password` Server Component page with full layout shell; redirects authenticated users to `/`; renders `ForgotPasswordForm` Client Component.
  - New `/reset-password` Server Component page with full layout shell; no session check (PKCE callback establishes session before user arrives); renders `ResetPasswordForm` Client Component.
  - `ForgotPasswordForm`: submits via `sendPasswordResetAction`, shows success confirmation in place of the form, always-visible "Back to sign in" link, pending/error states.
  - `ResetPasswordForm`: client-side password-match guard before calling `updatePasswordAction`; "Request a new link" link surfaces when error contains "expired or invalid"; pending/error states.
  - `sendPasswordResetAction`: always returns `{ success: true }` for non-error (prevents user enumeration); uses `NEXT_PUBLIC_SITE_URL` for `redirectTo`.
  - `updatePasswordAction`: `redirect('/login')` placed outside try/catch per documented Next.js NEXT_REDIRECT pattern.
  - Affected files: `src/components/client/LoginForm.tsx`, `src/app/actions/authActions.ts`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/components/client/ForgotPasswordForm.tsx`, `src/components/client/ResetPasswordForm.tsx`

### Changed

- Moved the "Go Live" button out of the sticky setlist toolbar and into the setlist header row, next to the setlist name, date, and Edit Setlist link (`TASK-026`)
  - Extracted the Go Live button, its confirmation dialog, focus-restoration ref, and inline `liveError` alert into a new `GoLiveButton` client component; the button remains gated on `isLeader` and consumes the same `sync` slice from `useSetlistSync`.
  - `ServiceNavigator` no longer renders Go Live state/UI; it continues to own the Follow Leader control for non-leader viewers.
  - Setlist header and page structure moved into the `SetlistViewerClient` client boundary so the header row can render the new client-side button alongside the server-rendered title and date.
  - Affected files: `src/components/client/GoLiveButton.tsx`, `src/components/client/ServiceNavigator.tsx`, `src/app/setlists/[id]/SetlistViewerClient.tsx`, `src/app/setlists/[id]/page.tsx`

## [Unreleased] — 2026-04-24

### Changed

- Dashboard promoted to root route `/`; `/dashboard` and `/dashboard/profile` now issue HTTP 308 permanent redirects (`TASK-025`)
  - Affected files: `src/app/page.tsx`, `src/app/profile/page.tsx`, `src/components/client/navbar.tsx`, `src/middleware.ts`, `next.config.ts`

### Added

- Dashboard landing page with Greeting, Next Up hero, Quick Actions (director-only), Recent Songs, and Upcoming Setlists widgets (`TASK-024`)
  - All authenticated widget data fetched in a single `Promise.all` (Next Up limit-1, Recent Songs, Upcoming Setlists limit-5) in the Server Component; widgets are pure display Server Components receiving data via props.
  - Next Up hero falls back to the most recent past setlist when no upcoming exists; director-only empty-state CTA to `/setlists/new`.
  - Upcoming Setlists widget renders up to 5 upcoming setlists with name, song count, and long-format date; each row links to `/setlists/{id}` with focus-visible ring styling; empty state "No upcoming setlists scheduled.".
  - Supabase migration adds `created_at` / `updated_at` + `set_updated_at()` trigger to `songs` and `setlists`.
  - Public marketing view at `/dashboard` for unauthenticated visitors: hero headline "Saliw (sa·líw)" with italic meaning subtitle and public-toned description, three-card feature strip (Music / ListMusic / Sparkles), and a responsive two-column grid (`md:grid-cols-2`) below the feature cards containing the Recent Songs widget (left) and the Upcoming Setlists widget (right) — mirroring the authenticated dashboard layout. RLS restricts guest visibility (`setlists` → `is_public = true` rows; `songs` → public read policy). `/dashboard` removed from `PROTECTED_PATHS`; `/dashboard/profile` remains protected. Guest path performs exactly two Supabase table queries in a single `Promise.all` (upcoming setlists + recent songs) plus the `auth.getUser()` branch check — no `profiles` read on the guest path.
  - Affected files: `src/app/dashboard/page.tsx`, `src/components/dashboard/GreetingStrip.tsx`, `src/components/dashboard/NextUpCard.tsx`, `src/components/dashboard/QuickActions.tsx`, `src/components/dashboard/RecentSongs.tsx`, `src/components/dashboard/UpcomingSetlists.tsx`, `src/components/dashboard/PublicDashboardView.tsx`, `src/middleware.ts`, `src/types/supabase.ts`, `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql`
- Confirmation dialogs for Go Live and Follow Leader toggles (`TASK-023`)
  - Affected files: `src/components/client/ServiceNavigator.tsx`

## [Unreleased] — 2026-04-23

### Added

- SetlistBuilder: drag-and-drop setlist composition interface for Music Directors (`TASK-022`)
  - Affected files: `src/app/setlists/[id]/edit/page.tsx`, `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`, `src/components/client/SetlistBuilder/SetlistPanel.tsx`, `src/components/client/SetlistBuilder/SortableSongRow.tsx`, `src/components/client/SetlistBuilder/LibraryPanel.tsx`, `src/components/client/SetlistBuilder/ErrorBanner.tsx`, `src/app/actions/songActions.ts`, `package.json`, `package-lock.json`
- `getAllSongs` Server Action: pre-fetch full song library ordered by title (`TASK-022`)
- Instant client-side song search (title + artist filter) with no URL changes (`TASK-022`)
- Dirty-state Save Order with batch position update via `updateSetlistSongOrder` (`TASK-022`)
- Inline dismissible error banner (`role="alert"`) for all action failures (`TASK-022`)
- Artisan empty state: dashed brown border on cream background in Setlist Panel (`TASK-022`)
- Active drag feedback: brand-tan border and shadow on dragged row (`TASK-022`)

## [Unreleased] — 2026-04-19

### Added

- **Collaborative Realtime Sync: Go Live & Follow Leader** (`TASK-021`)
  - Director "Go Live" toggle in `ServiceNavigator` bar (leader-only): D-1/D-2/D-3/D-8 states; Supabase Broadcast channel `setlist_sync:${setlistId}` with `self: false`; `bg-red-600 text-white animate-pulse` LIVE badge; inline error on connection failure.
  - Key change auto-persist: per-song 400ms debounced persist via `updatePerformanceDetails` + `KEY_CHANGE` broadcast on success; RF-1 monotonic sequence guard prevents stale broadcasts across debounce windows; RF-5 `latestKeyRef` stale-closure guard; D-4/D-5/D-6 per-song sync status UI in `SetlistSongSection`.
  - "Follow Leader" toggle (authenticated non-leader only): State Check on enable fetches current `performance_key` for all songs; `Map<junctionId, performanceKey>` snapshot stored as revert target; F-2/F-3/F-6/F-7/F-8 states; green `w-2 h-2 bg-green-500` synced dot; "Lost connection." indicator on subscription drop.
  - Incoming broadcast handling: `SONG_CHANGE` → `scrollIntoView({ behavior: 'smooth', block: 'start' })`; `KEY_CHANGE` → `overrideKeys` Map update → `externalKey` prop chain; RF-2-guarded `useEffect` in `ChordSheetClient` prevents redundant chord mutations on initial mount.
  - Font size and chord-visibility preferences are never overridden by sync events (out of scope per spec).
  - Affected files: `src/utils/realtimeEvents.ts` (NEW), `src/hooks/useSetlistSync.ts` (NEW), `src/app/setlists/[id]/SetlistViewerClient.tsx` (NEW), `src/components/SongViewer/ChordSheetClient.tsx`, `src/components/client/SetlistSongSection.tsx`, `src/components/client/ServiceNavigator.tsx`, `src/app/setlists/[id]/page.tsx`

- **Setlist Archive & Index Hub** (`TASK-020`)
  - `src/app/setlists/page.tsx` — Full server-rendered, paginated, searchable setlist index replacing the prior stub; `force-dynamic`; fetches from `setlists` with embedded `setlist_songs(count)`; `?q=` search with PostgREST metacharacter sanitization; `?page=` pagination with `count: 'exact'` and page-clamp guard; three distinct empty/error states; `music_director` RBAC gate for New Setlist controls; Artisan card layout with `border-l-4 border-[--brand-tan]`; sticky header containing title, count subtitle, and `SearchBar`; page metadata `title: 'Setlists — Saliw'`.
  - `src/app/setlists/loading.tsx` — Created; 3 `animate-pulse bg-brand-brown/10` skeleton cards matching desktop/mobile card layout, plus header skeleton (title, button, count, search bar).
  - `src/components/setlists/NewSetlistButton.tsx` — Created; `music_director`-gated Client Component; desktop `hidden md:inline-flex` button and mobile `fixed bottom-6 right-6 z-[80]` FAB; rendered disabled with hint text "Creating new setlists coming soon." until `/setlists/new` route is built; no `setState`-in-`useEffect` pattern.
  - `src/components/client/SearchBar.tsx` — Added optional `basePath` prop (default `'/library'`); replaces hardcoded `/library` with `basePath` in `router.replace` calls; existing library usage unchanged.
  - `src/components/client/PaginationControls.tsx` — Added optional `basePath` prop (default `'/library'`); updated `buildUrl` signature and all four call sites; existing library usage unchanged.
  - `src/app/library/page.tsx` — Passes `basePath="/library"` explicitly to `SearchBar` and `PaginationControls` (no behaviour change).
  - Known deviation: leader display name omitted from cards — `profiles_select_own` RLS blocks cross-user profile lookups and PostgREST cannot join across the `auth` schema boundary; approved in integration contract.
  - Affected files: `src/app/setlists/page.tsx`, `src/app/setlists/loading.tsx`, `src/components/setlists/NewSetlistButton.tsx`, `src/components/client/SearchBar.tsx`, `src/components/client/PaginationControls.tsx`, `src/app/library/page.tsx`

---

## [Unreleased] — 2026-04-18

### Added

- **Stage-Ready Setlist Viewer** (`TASK-018`)
  - Long-scrolling setlist viewer page at `/setlists/[id]` with auth guard, setlist header display, and per-song chord sheets initialized to each song's stored `performance_key`.
  - Sticky `ServiceNavigator` — fixed sidebar on desktop (lg+), sticky top bar on mobile; IntersectionObserver scroll-spy highlights the active song in `--brand-tan`; observer disconnected on unmount to prevent memory leaks.
  - Per-song `SetlistSongSection` with `useTransition`-gated Sync button (leader-only); captures current transpose key via `onKeyChange` callback; success Check icon for 2 seconds on save; inline error display on failure; disabled + Loader2 spinner while in-flight.
  - `ChordSheetClient` wrapped in `React.memo` at call site to prevent re-renders from IntersectionObserver state changes.
  - `preProcessChords` called server-side for all songs; no SSR hydration mismatches.
  - Affected files: `src/app/setlists/[id]/page.tsx`, `src/components/client/ServiceNavigator.tsx`, `src/components/client/SetlistSongSection.tsx`, `src/app/actions/setlistActions.ts` (added `getSetlistById`), `src/components/SongViewer/ChordSheetClient.tsx` (added optional `onKeyChange` prop)

- Edit button on song viewer page (`/library/[id]`) that navigates to the edit view; visible to `music_director` role only.
  - Affected files: `src/app/library/[id]/page.tsx`

- **Setlist Songs Junction Actions** (`TASK-017`)
  - `src/app/actions/setlistActions.ts` — fixed `addSongToSetlist` to compute `order_index` server-side via MAX query and validate `original_key` against `NOTES`; renamed `reorderSetlist` → `updateSetlistSongOrder`; added `removeSongFromSetlist` (delete + sequential re-index loop), `updatePerformanceDetails` (conditional payload build preserving omitted `singer`), and `getSetlistWithSongs` (single join query, no N+1)
  - `src/types/supabase.ts` — extended `DbSetlistSong` with `singer: string | null`
  - `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` — adds nullable `singer TEXT` column to `public.setlist_songs`
  - Affected files: `src/app/actions/setlistActions.ts`, `src/types/supabase.ts`, `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql`

---

## [Unreleased] — 2026-04-17

### Added

- **Artisan New Song Entry Point & Stage-Ready UI Controls** (`TASK-013`)
  - `src/components/library/NewSongButton.tsx` — New Client Component; renders only for `music_director` (DOM-absent for non-directors); desktop inline button (`bg-brand-tan`, `rounded-xl`, Plus icon, "New Song" label, `hover:scale-105 hover:shadow-md`) and mobile FAB (`fixed bottom-6 right-6 z-[80]`, icon-only with `aria-label`); Loader2 loading state on click while `router.push('/library/new')` fires; WCAG AA contrast confirmed (espresso on tan ~6.5:1)
  - `src/app/library/new/page.tsx` — New dynamic Server Component route; auth guard (redirect `/login`) + RBAC guard (redirect `/library` for non-directors, graceful degrade on profile fetch failure); renders `NewSongFormClient`; page title "New Song — Saliw"; back link to `/library` with ChevronLeft; Artisan `bg-brand-cream dark:bg-brand-darker` styling
  - `src/components/client/NewSongFormClient.tsx` — New Client Component form; fields: `title`, `artist`, `original_key` (NOTES select), `content` (textarea, `font-mono`, `spellCheck={false}`); calls existing `createSong()` Server Action; navigates to `/library/[id]` on success; inline error display; "Creating..." label + disabled state during submission
  - `src/hooks/useFontSize.ts` — New custom hook; 12–48px range, 2px steps, default 16px; `localStorage` persistence (`"saliw-font-size"`); SSR-safe `useEffect` read with clamping; `useCallback`-memoized `increase`, `decrease`, `reset`; does not apply CSS variable (consumer responsibility)
  - `src/components/SongViewer/ChordSheetClient.tsx` — Extended with three Stage-Ready control groups: (1) Font-size group (A− / `NNpx` indicator / A+) applying `--chord-font-size` CSS variable via DOM mutation on `sheetRef`; (2) Hide Chords toggle toggling `chords-hidden` class on `.chord-display`; (3) Stage Mode toggle toggling `stage-mode` class on `.chord-display`; all buttons with full Artisan focus rings and `aria-pressed`
  - `src/styles/globals.css` — `.chord-display` extended with `font-size: var(--chord-font-size, 1rem)`; new rules: `.chords-hidden .chord-item { opacity: 0; }` (preserves layout/lyric alignment); `.stage-mode .section-title { border-left-width: 6px; filter: saturate(1.5); }` for low-light stage visibility
  - `src/app/library/page.tsx` — Updated to render `<NewSongButton isMusicDirector={isMusicDirector} />` in the page header flex row (uses existing role check, no new Supabase query)

- **Artisan Song Editor** (`TASK-012`)
  - `src/app/library/[id]/edit/page.tsx` — New dynamic Server Component route for Music Directors; enforces auth via `supabase.auth.getUser()` (redirects to `/login`) and RBAC via `profiles.role` check (redirects to read-only view for non-directors); fetches full song row; graceful not-found inline error state; passes song to `SongEditorClient`
  - `src/components/client/SongEditorClient.tsx` — New `'use client'` editor component; monospaced textarea (`font-mono`, `white-space: pre`, `spellCheck={false}`); dirty-state detection disables "Save Changes" until edits exist; "Clean" button strips trailing whitespace per line and normalizes `\r\n`/`\r` → `\n`; live WYSIWYG preview via `preProcessChords` + `ChordSheetClient`; responsive layout (side-by-side grid on `lg+`, tabbed "Edit"/"Preview" on mobile); `updateSong()` Server Action call with inline success and error feedback; "Unsaved Changes" modal with `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape-to-close, Tab focus trap, and backdrop-click dismiss; `beforeunload` listener for browser-level navigation guard
  - No new dependencies; uses existing `updateSong`, `preProcessChords`, `chordRegex`, `ChordSheetClient`, and `Song` type
  - Artisan Palette: `bg-brand-cream dark:bg-brand-darker` page, `bg-brand-cream dark:bg-brand-espresso` panels, `text-brand-espresso dark:text-brand-cream` body text; WCAG AA focus rings on all interactive elements

### Fixed

- **Pipe-delimited chord chart detection in `preProcessChords`** (`TASK-011`)
  - `src/utils/musicLogic.ts` — Added `PIPE_CHART_REGEX` (`/\|.*\|/`) and a new step-3 branch in `preProcessChords` to detect pipe-delimited chord chart lines (e.g. `[Intro]| F | C | G | Am7 || F | C | G | Am7 |`) before the `isChordLine` heuristic. Pipe and double-pipe characters are emitted as non-chord tokens; inter-pipe chord tokens (F, C, G, Am7, etc.) are emitted as `{ isChord: true, originalChord: VALUE }` in the existing `ChordToken` shape. Result is classified as `type: 'chord'` so `ChordSheetClient.tsx` wraps them in `.chord-item[data-original-chord]` spans with no client-side changes required. Live transposition via `useTranspose` applies automatically.
  - Root cause: `isChordLine` counted `|` and `[Intro]|` as non-chord tokens, reducing the chord ratio below the 50% threshold — line was misclassified as lyric.
  - No changes to `ChordSheetClient.tsx`, `chordRegex`, or any Supabase queries.

---

## [Unreleased] — 2026-04-16

### Added

- **Hybrid Rendering Engine — SongViewer with Live Transposition** (`TASK-011`)
  - `src/utils/musicLogic.ts` — Added `preProcessChords(content): ProcessedLine[]` function; exports `ProcessedLine` and `ChordToken` discriminated union types; classifies chord-sheet lines as header/chord/lyric/blank with whitespace-preserving tokenization for alignment
  - `src/hooks/useTranspose.ts` — New `useTranspose(originalKey)` hook managing semitone offset state; derives `displayKey` from `NOTES` array; exposes `increment`/`decrement`/`setTargetKey`/`reset`; always calculates offset relative to `original_key`, never accumulated
  - `src/components/SongViewer/ChordSheetClient.tsx` — New `'use client'` chord sheet component; renders transposition control bar (12-key dropdown + ±1 stepper); applies transposition via DOM mutation of `.chord-item[data-original-chord]` spans in `useEffect` to avoid React hydration mismatch; uses `.chord-display` and `.section-title` CSS classes
  - `src/app/library/[id]/page.tsx` — New dynamic route Server Component; auth guard via `supabase.auth.getUser()`; fetches `content`, `original_key`, `title`, `artist` from `songs` table via `@supabase/ssr`; calls `preProcessChords` SSR-side and passes result as prop to `ChordSheetClient`; inline error states for not-found and server error
  - Artisan Palette: `text-brand-espresso`/`bg-brand-cream` light mode; `text-brand-cream`/`bg-brand-espresso` dark mode; all controls WCAG AA compliant
  - `src/styles/globals.css` — Chord token styling enhanced: `.chord-item` now renders with a visible badge background in both modes — light: espresso text on tan background (~6.5:1 contrast, WCAG AA); dark: cream text on brown background (~4.7:1 contrast, WCAG AA); `border-radius: 3px` added for pill-badge appearance; no new dependencies

- **Song Library Base View with Server-Side Search** (`TASK-010`)
  - `src/app/library/page.tsx` — Full Server Component: fetches `songs` table (id/title/artist/original_key only; `content` excluded for payload minimization), applies `ilike` OR filter on `title`/`artist` when `?q` param is present, orders by `title` ascending; derives `isMusicDirector` server-side via `profiles.role` query; implements three empty states (fetch error, search zero-results, empty library)
  - `src/components/client/SearchBar.tsx` — New Client Component: debounced 300ms `router.replace` URL navigation, Artisan Palette styling (brand-cream background, brand-tan border, brand-espresso focus ring), accessible with `aria-label`
  - RBAC: "Edit" Pencil icon link per row visible only to `music_director` users; guests and standard users see navigation-only rows
  - Artisan Palette: brand-cream container, brand-tan-alpha row backgrounds, brand-espresso titles (WCAG AA), brand-brown artist/key metadata

---

## [Unreleased] — 2026-04-15

### Added

- **Musical Logic Engine: chord detection, transposition, and key offset utilities** (`TASK-011`)
  - `src/utils/musicLogic.ts` — hardened `chordRegex`: replaced trailing `\b` with `(?![a-zA-Z0-9#/])` to prevent `#` (non-word character) from causing boundary backtracking that previously dropped `#` from chord tokens such as `F#`, `C#`, and `D/F#`; `F#` and `C#` are now correctly recognised by `isChordLine`
  - `NOTES` readonly 12-element chromatic scale array (`C` through `B`, sharps preferred except `Bb`)
  - `chordRegex` exported `RegExp` matching standard chord notation including slash chords, quality suffixes (maj, min, dim, aug, sus, add, numbered), and sharp/flat roots; anchored to prevent mid-word false positives
  - `shiftChord(chord, semitones)` transposes root and optional slash bass note independently using canonical `NOTES` indices
  - `getSemitoneOffset(originalKey, performanceKey)` returns 0–11 semitone offset; returns 0 for unrecognised keys
  - `isChordLine(line)` heuristic: guards against lyric-indicator words (`I`, `A`, `To`, etc.), then requires >50% of whitespace-delimited tokens to be valid chord tokens
  - Affected files: `src/utils/musicLogic.ts`

### Changed

- **Navbar login/logout inline labels + logout confirmation modal** (`TASK-010`)
  - Removed all tooltip markup (`role="tooltip"`, `group`, `group-hover`) from auth buttons
  - Desktop navbar login button now shows "Login" text inline to the left of the LogIn icon; logout button shows "Logout" text inline to the left of the LogOut icon
  - Auth greeting "Hi, {full_name}!" (fallback "Hi there!") preserved in desktop navbar and mobile sidebar footer
  - Logout flow now requires confirmation via a modal dialog (Cancel / Sign out) before signing out; focus returns to the triggering button on cancel
  - Mobile sidebar auth button remains icon-only and correctly opens the logout confirmation modal
  - Affected files: `src/components/client/navbar.tsx`, `src/components/client/logout-modal.tsx`, `src/components/client/button.tsx`

### Added

- **Navbar UI enhancements: tooltip, auth greeting, and logout confirmation modal** (`TASK-009`)
  - `src/components/client/navbar.tsx` — Login button shows "Sign in to Saliw" tooltip on hover (CSS `group-hover`, zero JS); logout button shows "Sign out" tooltip for parity; authenticated greeting "Hi, {full_name}!" displayed in desktop navbar and mobile sidebar footer (falls back to "Hi there!" if `full_name` is null); full name fetched from `profiles` table via RLS-safe client-side query after auth state change; logout buttons (desktop + mobile) gate sign-out behind `LogoutModal` confirmation; modal trigger preserves focus and returns it on cancel
  - `src/components/client/logout-modal.tsx` — New: Artisan-styled confirmation dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap (Tab cycles Cancel ↔ Sign out), Escape key dismissal, backdrop click dismissal, `bg-brand-espresso/40` backdrop, `rounded-2xl` panel
  - `src/components/client/button.tsx` — Updated to use `forwardRef` for ref-based focus management in the modal

- **Strict auth wall and middleware guard** (`TASK-008`)
  - `src/middleware.ts` — added `PROTECTED_PATHS` constant (`/dashboard`, `/library`, `/setlists`); destructures `user` from `supabase.auth.getUser()`; redirects to `/login` for any unauthenticated request matching a protected path or sub-path; existing cookie handling and session refresh preserved; updated comment to reflect new auth-gating behavior; no redirect loop possible — `/login` is not in `PROTECTED_PATHS` and static assets are excluded by `config.matcher`
  - `src/app/dashboard/page.tsx` — converted to `async` Server Component; added `createClient` from `@/services/supabase/server` and `redirect` from `next/navigation`; `getUser()` called server-side; redirects to `/login` if no authenticated user (defense-in-depth)
  - `src/app/library/page.tsx` — added `redirect('/login')` guard on null user; removed "Browse as guest" fallback; `user.email` rendered directly (TypeScript narrows to non-null past the guard)
  - `src/app/setlists/page.tsx` — same changes as `library/page.tsx`
  - No RLS migrations added — existing policies already enforce `auth.role() = 'authenticated'` for SELECT on `songs`, `setlists`, and `setlist_songs`
  - `getUser()` used exclusively (not `getSession()`) for server-side session validation to ensure JWT is verified against Supabase servers

- **Backend infrastructure: songs/setlists schema, RLS, and Server Actions** (`TASK-007`)
  - `supabase/migrations/20260415000001_create_songs_table.sql` — `songs` table with uuid PK, `original_key`, `created_by` FK; RLS: authenticated SELECT, music_director INSERT/UPDATE/DELETE via `is_music_director()` helper function
  - `supabase/migrations/20260415000002_create_setlists_table.sql` — `setlists` table with `leader_id`, `is_public`; RLS: authenticated SELECT, leader_id-scoped UPDATE/DELETE
  - `supabase/migrations/20260415000003_create_setlist_songs_table.sql` — `setlist_songs` junction table with `performance_key`, `order_index`; RLS: authenticated SELECT via parent join, leader_id INSERT/UPDATE/DELETE via subquery
  - `src/app/actions/songActions.ts` — `createSong`, `updateSong`, `deleteSong`; chordRegex content validation; consistent `{ data, error }` return shape; no service role key
  - `src/app/actions/setlistActions.ts` — `createSetlist`, `addSongToSetlist`, `reorderSetlist`, `deleteSetlist`; performance_key defaults to song's original_key on add
  - `src/types/supabase.ts` — new file; exports `DbSong`, `DbSetlist`, `DbSetlistSong` matching exact DB column names
  - `src/types/Song.ts` — updated: `id: string` (uuid), `original_key` replaces `key`
  - `src/types/Setlist.ts` — updated: `id: string`, `leader_id` replaces `leader`, `is_public` added, embedded `songs[]` removed

- **Login page UI + Supabase auth** (`TASK-006`)
  - `src/app/(auth)/login/page.tsx` — Server Component; calls `supabase.auth.getUser()` on load and redirects authenticated users to `/` before rendering; no flash of login form for signed-in users
  - `src/components/client/LoginForm.tsx` — Client Component; mode toggle (Password / Magic Link); email+password form calls `signInWithPasswordAction` via `useTransition`; magic link form calls `sendMagicLinkAction` via `useTransition`; inline feedback `<p>` for all error and success states; feedback cleared on field change; no toast library; no direct Supabase calls
  - `src/app/actions/authActions.ts` — `signInWithPasswordAction` (server-side `redirect('/')` on success outside try/catch to preserve `NEXT_REDIRECT`; unified error copy prevents user enumeration) and `sendMagicLinkAction` (returns `{ success: true }`, uses `NEXT_PUBLIC_SITE_URL` for `emailRedirectTo`); both actions use `@supabase/ssr` server client only; no `SUPABASE_SERVICE_ROLE_KEY` reference
  - `src/app/auth/auth-code-error/page.tsx` — Server Component; plain error message for failed PKCE exchanges ("The link may have expired or already been used.") with a link back to `/login`; Artisan palette styling
  - All text WCAG AA compliant: `text-brand-espresso` (~14:1) and `text-brand-brown` (~4.8:1) on cream; `text-brand-tan` on cream never used; input borders `border-brand-brown`; focus rings `ring-brand-brown`
  - No new npm dependencies introduced; `package.json` unchanged

- **Individual Profile Settings page** (`TASK-005`)
  - `profiles` table created in Supabase with columns `id`, `email`, `full_name`, `role`; RLS enabled with `profiles_select_own` (SELECT) and `profiles_update_own` (UPDATE, `auth.uid() = id`) policies; column-level `REVOKE UPDATE (role, email)` applied as defense-in-depth
  - `src/types/Profile.ts` — plain `export type Profile` with four snake_case fields matching the table schema
  - `src/app/actions/profileActions.ts` — `updateProfileAction` Server Action: auth-gated via `supabase.auth.getUser()`, accepts and writes only `{ full_name }`, wrapped in `try/catch`, no `SUPABASE_SERVICE_ROLE_KEY` reference
  - `src/app/dashboard/profile/page.tsx` — Server Component; server-side `redirect('/login')` for unauthenticated access; renders "Profile not found" error state when profile row is missing; passes profile prop to `<EditProfileForm>`
  - `src/components/client/EditProfileForm.tsx` — Client Component; email field rendered `readOnly` and excluded from submission; `role` field absent from DOM; `useTransition` for pending state; inline success/error `<p>` feedback cleared on `onChange`; no toast library used; all colors WCAG AA compliant (`text-brand-brown`, `text-brand-espresso`; `text-brand-tan` never used)
  - Affected files: `supabase/migrations/20260415000000_create_profiles_table.sql`, `src/types/Profile.ts`, `src/app/actions/profileActions.ts`, `src/components/client/EditProfileForm.tsx`, `src/app/dashboard/profile/page.tsx`

---

## [Unreleased] — 2026-04-14

### Added

- **Mobile hamburger menu + sidebar drawer** (`TASK-004`)
  - Added `isOpen` state with `openSidebar` / `closeSidebar` helpers to the existing `Navbar` component
  - Desktop layout (md+) is pixel-unchanged; all existing desktop nav links, theme toggle, and auth button remain inside `hidden md:flex` wrappers
  - Mobile (<md): hamburger button (`Menu` icon from lucide-react) shown via `md:hidden`; has `aria-label="Open navigation menu"` and `aria-expanded={isOpen}`
  - Left-side drawer (`<aside role="dialog" aria-modal="true">`) slides in with CSS `translate-x` transition (300ms ease-in-out); slides out when closed
  - Drawer contains: Saliw brand header with X close button, all 3 nav links (Dashboard/Library/Setlists) with active state, theme toggle with label text, auth (sign-in/sign-out) button
  - Clicking any nav link inside drawer closes it via `onClick={closeSidebar}`
  - Semi-transparent backdrop (`bg-brand-espresso/40`) with `onClick={closeSidebar}` — clicking outside drawer closes it
  - Escape key closes drawer; event listener attached on open and cleaned up on close
  - `document.body.style.overflow = "hidden"` applied while drawer is open to prevent scroll-through; restored on close
  - Focus management: focus moves to X close button on open; returns to hamburger button on close
  - Drawer background: `bg-[var(--brand-background)]` — cream in light mode, `--brand-darker` in dark mode; text uses `text-brand-espresso dark:text-brand-cream` throughout
  - New Lucide icons added to imports: `Menu`, `X`
  - No new package dependencies; no changes to `globals.css` or any file other than `src/components/client/navbar.tsx`
  - Affected files: `src/components/client/navbar.tsx`

### Fixed

- **Dark mode activating from OS preference instead of explicit user toggle** (`TASK-004`)
  - Added `@variant dark (&:where(.dark, .dark *));` to `src/styles/globals.css` to override Tailwind v4's default dark-mode strategy from `prefers-color-scheme` media query to class-based toggling; `dark:` utility variants now only activate when `.dark` is present on an ancestor, not when the OS is in dark mode
  - Affected files: `src/styles/globals.css`

- **Navbar text invisible on cream background** (`TASK-004`)
  - Added `text-brand-espresso dark:text-brand-cream` to `<nav>` container so nav children inherit an explicit color value independently of Tailwind utility cascade timing
  - Removed `color` from the global `*{transition-property}` rule in `src/styles/globals.css`; the unlayered `*` rule had higher cascade precedence than `@layer utilities`, causing text color to transition from its inherited/initial value on every page load — rendering nav text invisible against the cream background during the 300ms transition window
  - Affected files: `src/components/client/navbar.tsx`, `src/styles/globals.css`

### Added

- **Sticky top navigation bar with Artisan aesthetic** (`TASK-004`)
  - New Client Component `src/components/client/navbar.tsx` — sticky top nav for all pages
  - Brand logo: music note icon (`lucide-react` `Music`) in brown square linking to `/`, with bold "Saliw" label
  - Navigation links with Lucide icons: Dashboard (`LayoutDashboard`) → `/dashboard`, Library (`Library`) → `/library`, Setlists (`List`) → `/setlists`
  - Active link highlighted with `bg-brand-brown/10 text-brand-brown` (light) / `bg-brand-tan/10 text-brand-tan` (dark) using `usePathname()`
  - Light/dark theme toggle (Moon/Sun icons) persisting preference to `localStorage` key `"theme"` via `document.documentElement.classList`
  - Auth icon button: `LogIn` when unauthenticated (navigates to `/login`), `LogOut` when authenticated (calls `supabase.auth.signOut()` + `router.refresh()`); state driven by `supabase.auth.onAuthStateChange`
  - Background uses semantic token `bg-[var(--brand-background)]` (cream ↔ dark) — dark-mode aware
  - Inserted into `src/app/layout.tsx` so navbar appears on every route
  - Affected files: `src/components/client/navbar.tsx`, `src/app/layout.tsx`

---

## [Unreleased] — 2026-04-13

### Added

- **Artisan Visual Identity & Base UI Components** (`TASK-003`)
  - `Button` Client Component with `primary` / `secondary` / `ghost` variants and `sm` / `md` / `lg` sizes; WCAG AA compliant (tan-on-cream combination excluded)
  - `Card` Server Component with `rounded-3xl`, `.main-card` CSS class, and `none | sm | md | lg` padding prop
  - Dashboard layout shell: full-width cream outer `<div>` wrapping `Card` at `max-w-5xl`, centred horizontally
  - Dashboard placeholder page with espresso heading and brown subheading
  - Homepage updated to use Tailwind utilities (no inline styles) and showcase all `Button` and `Card` variants
  - Dark mode handled via `.dark` class and semantic tokens in `globals.css` — no per-component dark mode logic required
  - Affected files: `src/components/client/button.tsx`, `src/components/server/card.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/page.tsx`

### Fixed

- **PostCSS plugin missing for Tailwind v4** (`TASK-003`)
  - Added `postcss.config.mjs` with `@tailwindcss/postcss` plugin so Tailwind v4 brand-color utilities compile correctly
  - Added `@tailwindcss/postcss ^4.2.2` to `devDependencies`
  - Affected files: `postcss.config.mjs`, `package.json`, `package-lock.json`

- **Next.js 15+ App Router foundation scaffold** (`TASK-001`)
  - Replaced Vite + React Router with Next.js 15.5 App Router and TypeScript strict mode
  - Tailwind CSS v4 CSS-first configuration with Artisan Palette `@theme` block in `src/styles/globals.css`
    - `--brand-cream: #FDF8F3`, `--brand-tan: #BC8E5C`, `--brand-brown: #835B43`, `--brand-espresso: #2D1F1B`, `--brand-darker: #1A1210`
    - Fixed `--brand-tan-alpha` double-`#` typo from original Vite CSS
  - Server Component root layout (`src/app/layout.tsx`) with `next/font/google` — Plus Jakarta Sans (UI) + JetBrains Mono (chords)
  - Hydration-safe base styles: inline `backgroundColor: "#fdf8f3"` on `<body>` prevents cream background flash before stylesheet loads
  - ESLint configured with `next/core-web-vitals` + RSC boundary `no-restricted-imports` rule for `@supabase/ssr` and `@supabase/supabase-js` in server component files
  - Directory structure per `docs/structure.md`: `src/app/`, `src/app/actions/`, `src/app/(auth)/`, `src/app/dashboard/`, `src/app/library/`, `src/app/setlists/`, `src/components/client/`, `src/components/server/`, `src/hooks/`, `src/services/`, `src/types/`, `src/utils/`, `src/styles/`, `tasks/`, `public/`
  - TypeScript types migrated from `src/interface/` to `src/types/` (`Song`, `Setlist`, `Singer`, `View`)
  - `src/utils/musicLogic.ts` — exports `NOTES`, `chordRegex`, `shiftChord`, `getSemitoneOffset`; establishes shared musical logic boundary per coding guidelines
  - Vite legacy source preserved in `_vite-legacy/` for future migration tasks
  - Affected files: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `src/types/Song.ts`, `src/types/Setlist.ts`, `src/types/Singer.ts`, `src/types/View.ts`, `src/utils/musicLogic.ts`, `tasks/TASK-001.md`, directory scaffolding
