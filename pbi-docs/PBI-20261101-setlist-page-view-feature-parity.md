# PBI-20261101 — Setlist Page View Feature Parity & Edit Songs FAB

- **Saved:** 2026-11-01
- **Source:** User request + `/design-grill` rounds decision record (chat, 2026-11-01)

---

## PBI (verbatim)

### Original Request

> /design-grill the current setlist view when on page view, doesn thave the add songs button, i would like you to do indepth and see what other features are like this and propose implemnetation plan for it

### Additional Feedback & Constraints

> 1. fab in all modes anythign else okay

### Grill Decisions (2026-11-01)

| # | Decision | Answer | Source | Spec section |
|---|---|---|---|---|
| **Q1.1** | "Edit Songs" (Add/Manage Songs) button placement | Render the floating bottom-left `"Edit Songs"` FAB (`<AppendSongsButton />`) across **all modes** (remove `!isPageMode` guard at `SetlistViewerClient.tsx:606`) so leaders can add/remove/reorder songs directly in Page View (including when a setlist has 0 songs). | user | Scope / AC |
| **Q1.2** | Follower Realtime Stage Sync (`SONG_CHANGE` / `SECTION_CHANGE`) in Page View | Pass an `onRemoteSongChange` callback into `useSetlistSync` so incoming `SONG_CHANGE` and `SECTION_CHANGE` events switch the active song (`selectSongByIndex`) and reset `subPageIndex` to `0` when in Page View mode. | recommendation accepted · code `src/hooks/useSetlistSync.ts:697-750` | Integration / AC |
| **Q1.3** | Page View `"Transpose / Capo"` popover & compact header parity | Add **CAGED shape selector** (`C`, `A`, `G`, `E`, `D`), **Original Key `(Key)`** indicator, **Reset Key** button, and **Follower Override (`[Reset to Leader]`)** banner to the Page View controls popover; render `liveSyncState` (`Saving…` / `Synced`) and `syncError` feedback in `SetlistSongSection`'s compact header. | recommendation accepted · code `src/app/setlists/[id]/SetlistViewerClient.tsx:881-1007`, `src/components/client/SetlistSongSection.tsx:237-285` | User/Behaviour / AC |
| **Q1.4** | YouTube Video Embed & Worship Leader / Lineup in Page View | Render a compact single-line Worship Leader & Lineup summary in Page View mode, and hoist the YouTube controls/embed outside the multi-column CSS flow (`columns-1 lg:columns-2 xl:columns-3`) in Page View so opening a video does not get squished into column 1 or break column pagination. | recommendation accepted · code `src/app/setlists/[id]/SetlistViewerClient.tsx:707-732`, `src/app/setlists/[id]/SetlistViewerClient.tsx:1013-1072` | User/Behaviour / AC |
| **Q1.5** | `ChordDrawer` scoping, `capoOffset` prop & keyboard shortcut modal guard | In Page View, scope `uniqueChords` to `currentSong`, pass `capoOffset={isPageMode ? currentSongCapo : 0}` to `<ChordDrawer />`, and disable Page View `Space`/`Arrow` shortcuts while any modal (`AppendSongsModal`, `YouTubeLinkModal`, `SetlistSettingsModal`, or `ChordDrawer`) is open. Keep `SectionNavDeck` hidden in Page View. | recommendation accepted · code `src/app/setlists/[id]/SetlistViewerClient.tsx:189-212`, `src/app/setlists/[id]/SetlistViewerClient.tsx:472-511` | Edge/Error / AC |
| **Q1.6** | Active song index resilience on add/remove/reorder in Page View | Reconcile `activeSongIndex` against the active song's `junctionId` when `songs` updates via `router.refresh()` (stay on the same song if reordered, or clamp safely to `[0, Math.max(0, songs.length - 1)]` if removed). | recommendation accepted · code `src/app/setlists/[id]/SetlistViewerClient.tsx:285-297` | Data & State / AC |

---

## Analysis

### Acceptance Criteria

#### 1. "Edit Songs" FAB in All Modes & Keyboard / Index Resilience
- [ ] In `src/app/setlists/[id]/SetlistViewerClient.tsx`, `<AppendSongsButton />` is rendered whenever `isLeader` is `true` regardless of whether `isPageMode` is active (removing the `!isPageMode` guard at line 606), including when the setlist is empty (`songs.length === 0`).
- [ ] `(derived)` When any modal dialog (`AppendSongsModal`, `YouTubeLinkModal`, `SetlistSettingsModal`) or `ChordDrawer` is open in Page View mode, pressing `Space`, `ArrowRight`, or `ArrowLeft` does not trigger song/sub-page stepping or `e.preventDefault()` on non-navigation interactions.
- [ ] `(derived)` When songs are added, removed, or reordered via `AppendSongsModal` while Page View mode is active, the active song index reconciles by preserving the previously active song's `junctionId` if still present, or clamping cleanly within `[0, Math.max(0, songs.length - 1)]` if the active song was removed.

#### 2. Follower Realtime Stage Sync in Page View
- [ ] `useSetlistSync` (`src/hooks/useSetlistSync.ts`) accepts an optional `onRemoteSongChange?: (junctionId: string) => void` callback (held in a stable `useRef`).
- [ ] When a follower receives a valid `SONG_CHANGE` or `SECTION_CHANGE` broadcast event on channel `setlist_sync:${setlistId}`, `onRemoteSongChange(junctionId)` is invoked in addition to the existing scroll behavior.
- [ ] In Page View mode, receiving `onRemoteSongChange(junctionId)` updates `activeSongIndex` to the matching song's index in `songs`, resets `subPageIndex` to `0`, and clears any local manual key override for that song so the follower transitions to the leader's active song and key.

#### 3. Page View Controls Popover & Compact Song Header Parity
- [ ] The Page View `"Transpose / Capo"` popover (`src/app/setlists/[id]/SetlistViewerClient.tsx`) displays the song's original key indicator `(Orig: <originalKey>)` and a `"Reset"` button whenever `currentSongActiveKey !== currentSong.originalKey` that restores `currentSong.originalKey` (and notifies live sync if `isLeader && isLive`).
- [ ] The Page View `"Transpose / Capo"` popover includes a **CAGED** shape picker (`C`, `A`, `G`, `E`, `D`) matching `ChordSheetClient.tsx` behavior: clicking an available shape sets `capo` to `getSemitoneOffset(shapeRoot, currentSongActiveKey)`, clicking the active shape again resets `capo` to `0`, and shapes requiring fret `> 7` are disabled (`disabled`, `aria-disabled="true"`).
- [ ] `(derived)` When a follower in Page View (`sync.isFollowing === true`) manually changes a song's key via the Page View popover (`-1`, `+1`, `<select>`, or Reset), local override mode is activated for that song, locking out incoming leader `KEY_CHANGE` broadcasts for that song and displaying the `"Overriding leader • [Reset to Leader]"` control to restore the leader's key.
- [ ] In `src/components/client/SetlistSongSection.tsx`, when `isCompactHeader={true}` is active, the header renders `liveSyncState` (`"Saving…"`, `"Synced"`, and `liveSyncState.errorMessage`) and `syncError` alerts alongside the Sync button for `isLeader`.

#### 4. YouTube Layout Fix, Compact People Summary & Chord Drawer Scoping
- [ ] In `src/app/setlists/[id]/SetlistViewerClient.tsx`, when `isPageMode` is active and `worshipLeaderName` or `lineup.length > 0` is present, a compact single-line summary of the Worship Leader and Lineup is rendered in the header region instead of being hidden.
- [ ] In Page View mode, the compact song header and YouTube video section (`SetlistSongSection.tsx` / `SetlistViewerClient.tsx`) are rendered outside (or span across) the CSS multi-column chord flow (`columns-1 lg:columns-2 xl:columns-3` with `translateX` sub-page transform) so that:
  1. Opening the 16:9 YouTube video embed does not squeeze the video into a single narrow column or push chord lines into extra sub-pages.
  2. Advancing to `subPageIndex > 0` (Page 2+) keeps the song header and YouTube controls visible rather than translating them off-screen to the left.
- [ ] In `src/app/setlists/[id]/SetlistViewerClient.tsx`, when `isPageMode` is active, `uniqueChords` passed to `<ChordDrawer />` is computed from the currently active song (`currentSong`) rather than all songs in the setlist, and `capoOffset={isPageMode ? currentSongCapo : 0}` is passed to `<ChordDrawer />`.
- [ ] `(derived)` All modified components adhere to Saliw's Artisan palette (`brand-cream`, `brand-tan`, `brand-brown`, `brand-espresso`, `brand-darker`) with explicit `dark:` pairs on named Tailwind utilities (`BUG-005`) and pass `tsc --noEmit`, `eslint`, and `vitest run` without errors.

---

### Scope & Out-of-Scope

- **In scope:**
  - Enabling `<AppendSongsButton />` FAB across both Continuous Scroll and Page View modes.
  - Guarding Page View keyboard navigation (`Space`, `ArrowLeft`, `ArrowRight`) when modal dialogs (`AppendSongsModal`, `YouTubeLinkModal`, `SetlistSettingsModal`) or `ChordDrawer` are open.
  - Preserving active song selection (`junctionId` tracking + bounds clamping) when songs are added, removed, or reordered in Page View.
  - Wiring `onRemoteSongChange` in `useSetlistSync` so followers in Page View switch songs on `SONG_CHANGE` and `SECTION_CHANGE` broadcasts.
  - Upgrading the Page View `"Transpose / Capo"` popover with Original Key display, Reset Key button, CAGED shape picker (`C`, `A`, `G`, `E`, `D`), and Follower Override (`[Reset to Leader]`) state.
  - Displaying `liveSyncState` (`Saving…` / `Synced` / error) and `syncError` in `SetlistSongSection`'s compact header.
  - Rendering a compact Worship Leader & Lineup summary in Page View mode.
  - Separating the compact song header and YouTube embed from the horizontally translated CSS multi-column container in Page View mode.
  - Scoping `ChordDrawer` `uniqueChords` to the active song and passing `capoOffset={currentSongCapo}` in Page View mode.
- **Out of scope:**
  - Displaying `SectionNavDeck` floating badge column in Page View mode (explicitly kept hidden in Page View per Q1.5).
  - Enabling `AutoScrollToolbar` in Page View mode (remains disabled in Page View per `TASK-20261020-347` AC-9).
  - Modifying Supabase database tables, RLS policies, or Server Action signatures in `src/app/actions/setlistActions.ts`.
  - Modifying the standalone Song Viewer (`/library/[id]`) or Setlist Edit page (`/setlists/[id]/edit`).

---

### Ambiguities & Risks

1. **CSS Multi-Column & Sub-Page Translation Boundary (`SetlistViewerClient.tsx:1013-1072`):**
   - Currently, `SetlistViewerClient` wraps the entire `<SetlistSongSection />` inside `<div ref={songContentRef} style={{ transform: translateX(-${subPageIndex * 100}%) }} className={responsiveColumnsClass}>`. Because `SetlistSongSection` renders both the compact header, the YouTube section, and `<MemoChordSheetClient />`, applying `columns-2` or `columns-3` and `translateX` on the outer wrapper causes the header and YouTube iframe to flow inside column 1 and slide off-screen on Page 2+.
   - **Mitigation:** Either pass the multi-column + `translateX` wrapper props/refs down into `SetlistSongSection` so only the `<MemoChordSheetClient />` viewport is columnized and translated, or render the compact header + YouTube block above `songContainerRef` in Page View while keeping `SetlistSongSection`'s sync/YouTube logic intact.
2. **Follower Manual Override Synchronization Between Popover and `ChordSheetClient`:**
   - In Continuous Scroll mode, `ChordSheetClient` tracks `isOverridingLeader` internally when its own `increment`/`decrement`/`setTargetKey` buttons are clicked (`ChordSheetClient.tsx:212-243`). In Page View mode, `SetlistViewerClient` controls `targetKey={songKeys[currentSong.junctionId]}` externally via the popover, which triggers `ChordSheetClient`'s `useEffect` (`ChordSheetClient.tsx:359-366`) and sets `isOverridingLeader(true)` inside `ChordSheetClient`, while `SetlistViewerClient`'s popover also reads `songKeys[currentJunctionId]`.
   - **Mitigation:** Ensure `SetlistViewerClient` tracks per-song follower override state (or shares state with `ChordSheetClient`) so that when `sync.overrideKeys` updates from a leader broadcast, `SetlistViewerClient` applies the leader's key to `songKeys[junctionId]` unless that song is currently marked as overridden by the follower, and clicking `[Reset to Leader]` clears the override and adopts `sync.overrideKeys.get(junctionId)`.
3. **Keyboard Listener Modal Detection (`SetlistViewerClient.tsx:496`):**
   - `AppendSongsButton` owns `isModalOpen` internally (`AppendSongsButton.tsx:71`), and `SetlistSongSection` owns `isYtModalOpen` (`SetlistSongSection.tsx:151`).
   - **Mitigation:** In `SetlistViewerClient`'s `handleKeyDown` listener, checking `document.querySelector('[role="dialog"][aria-modal="true"]') !== null` (in addition to `settingsOpen || isDrawerOpen`) reliably guards against `AppendSongsModal`, `YouTubeLinkModal`, `SetlistSettingsModal`, and any future modal dialog without prop-drilling modal open booleans through multiple layers (note: the mobile nav drawer in `navbar.tsx` does not set `aria-modal="true"` when closed, or is only mounted/open when menu is active).

---

### Codebase-Aware Notes

- **`src/app/setlists/[id]/SetlistViewerClient.tsx`**:
  - Line 135–139: `useSetlistSync` instantiation — pass `onRemoteSongChange` here.
  - Line 171–186: `songKeys` and `songCapos` state maps.
  - Line 189–212: `uniqueChords` memo — scope to `isPageMode && currentSong ? [currentSong] : songs`.
  - Line 285–347: Page View state (`activeSongIndex`, `subPageIndex`, `isSongControlsPopoverOpen`) and transpose/capo handlers (`handlePageTransposeDown`, `handlePageTransposeUp`, `handlePageKeySelect`, `handlePageCapoSelect`).
  - Line 370–431: `ResizeObserver` measuring `songContainerRef` and `songContentRef` for `totalSubPages` and `fitScale`.
  - Line 472–511: `handleKeyDown` for `Space`, `ArrowRight`, `ArrowLeft` — add modal dialog guard.
  - Line 606–612: `{isLeader && !isPageMode && <AppendSongsButton ... />}` — remove `!isPageMode`.
  - Line 707–732: `{!isPageMode && (worshipLeaderName || lineup.length > 0) && ...}` — add compact Page View variant.
  - Line 810–1009: Page View sub-header (`Song X of Y`, `Page M / N`, per-song `Cols` switcher, and `"Transpose / Capo"` popover) — add Original Key, Reset button, CAGED shape picker, and Follower Override banner.
  - Line 1013–1073: Page View song content wrapper and `<SetlistSongSection />`.
  - Line 1130–1137: `<ChordDrawer />` — pass `capoOffset={isPageMode ? currentSongCapo : 0}`.
- **`src/hooks/useSetlistSync.ts`**:
  - Line 27–34: `UseSetlistSyncParams` — add `onRemoteSongChange?: (junctionId: string) => void`.
  - Line 697–713: `REALTIME_EVENTS.SONG_CHANGE` broadcast handler — invoke `onRemoteSongChangeRef.current?.(junctionId)`.
  - Line 735–750: `REALTIME_EVENTS.SECTION_CHANGE` broadcast handler — invoke `onRemoteSongChangeRef.current?.(junctionId)`.
- **`src/components/client/SetlistSongSection.tsx`**:
  - Line 237–285: `isCompactHeader` branch — add `liveSyncState` (`Saving…` / `Synced` / `errorMessage`) and `syncError` rendering (reusing lines 300–338 & 383–390 from the standard header).
  - Line 396–552: YouTube toggle button, `Edit YouTube link` button, and 16:9 `<iframe>` container — ensure clean layout outside multi-column pagination in Page View.
- **`src/components/SongViewer/ChordSheetClient.tsx`**:
  - Line 44–59: `CAGED_SHAPES` and `CAGED_SHAPE_ROOTS` constants (can be exported or shared with `SetlistViewerClient.tsx`).
  - Line 359–379: `targetKey` and `externalKey` synchronization effects.
- **`src/components/client/AppendSongsButton.tsx` & `src/components/client/AppendSongsModal.tsx`**:
  - Existing `"Edit Songs"` FAB and auto-saving modal (`TASK-20261018-e7m`) — reused as-is.
- **`src/components/client/ChordDrawer.tsx`**:
  - Line 487–507: Already accepts `capoOffset?: number` prop (`capoOffset = 0`) and passes `capoOffsetProp={capoOffset}` to `GuitarSVG` (line 638).
