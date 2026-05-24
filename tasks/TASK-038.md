# TASK-038 — Append Songs FAB (Setlist Detail Page)

- **Tier:** 1 (Medium)
- **Date Created:** 2026-05-24
- **Status:** Complete

---

## Feature Summary

Add a second Floating Action Button (FAB) to the setlist detail page on desktop, positioned on the left side of the screen vertically aligned with the existing auto-scroll FAB on the right. The new FAB is visible only to authenticated `music_director` users and only on `lg:` breakpoint and larger. Clicking it opens a modal containing a scrollable list of all songs in the library. Each song row shows a checkbox, song title, and artist name. Songs already present in the setlist are shown as pre-checked and disabled (to prevent duplicate insertion). After the user checks one or more new songs and clicks Save, those songs are appended to the end of the setlist in the order they appear in the list (top-to-bottom), the modal closes, and the setlist view refreshes to show the additions. If no songs exist in the library, an empty-state message is displayed. Loading and error states are handled visibly.

---

## Acceptance Criteria

1. **Append Songs FAB is hidden on mobile and tablet — renders only at `lg:` breakpoint and larger** using `hidden lg:flex` (explicit responsive guard required; see Amendment AM-1).
2. The FAB is positioned `fixed` on the left side of the viewport at `bottom-6 left-6` (same vertical offset as the auto-scroll FAB on the right; `z-50`).
3. The FAB is **not rendered in the DOM at all** for non-`music_director` users (server-side guard via `{isLeader && ...}` conditional in `SetlistViewerClient`, not CSS-only hiding).

4. The FAB displays a recognizable "add" or "plus" icon (or music-note-plus variant) communicating "add songs to setlist."
5. The FAB carries `aria-label="Append songs to setlist"` for accessibility.
6. The FAB shows a visible tooltip on hover (e.g., `title="Add Songs"`) consistent with the existing auto-scroll FAB hover behavior.
7. The FAB uses Artisan palette with CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`, etc.) for automatic dark mode switching — no named utilities without `dark:` pairs.

8. Clicking the FAB opens the Append Songs modal.
9. The modal can be closed by clicking an explicit close button (X) in the modal header.
10. The modal can be closed by clicking the backdrop overlay outside the modal panel.
11. The modal can be closed by pressing the Escape key.
12. Closing the modal without saving resets all checkbox selections (state is discarded on close).
13. The modal has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal heading.
14. Focus is trapped inside the modal (Tab/Shift+Tab cycle only within modal-internal focusable elements).
15. When the modal opens, focus is placed on the first focusable element inside the modal (close button or first checkbox).
16. When the modal closes, focus returns to the FAB that triggered it.

17. The modal body contains a scrollable list of all songs from the `songs` table (fetched via `getAllSongs()`).
18. Each song row displays at minimum: song title and artist name.
19. Songs are ordered by **title ascending** (alphabetically) on every open, matching the Song Library page convention (see Resolved Open Questions).
20. Songs already present in the current setlist are rendered with their checkbox pre-checked and disabled, with visual indicator (muted/greyed row or "Already added" label) so the user understands why the checkbox cannot be changed.
21. Songs not yet in the setlist have an unchecked, enabled checkbox.

22. Checking an enabled checkbox marks the song for addition; unchecking removes the mark. Only enabled (not-yet-added) checkboxes respond to interaction.
23. Clicking anywhere on an enabled song row (title/artist area) also toggles its checkbox for usability. Disabled rows do not respond to clicks.
24. No song is ever added to the setlist more than once; the disabled pre-check state on existing songs is the sole guard against duplicates (RLS is the backend guard).

25. A "Save" button in the modal footer is enabled only when at least one new (non-disabled) song is checked.
26. When Save is clicked, a loading indicator (spinner or button disabled state) is shown immediately.
27. On successful save, all newly checked songs are appended to the end of the setlist, preserving the existing song order.
28. The songs are appended in **modal-list top-to-bottom order** among the checked songs, not click-sequence order.
29. On successful save, the modal closes and the setlist view reflects the newly added songs without requiring a manual page refresh.
30. Each inserted junction-table row includes: `setlist_id`, `song_id`, `order_index` (exact column name used by `addSongToSetlist()`), and `performance_key` (initialized to the song's `original_key`). See Resolved Open Questions for exact column name.

31. If the `songs` table contains zero rows, the modal body shows an empty-state message ("No songs in your library yet. Add songs in the Song Library first.") instead of a list.
32. The Save button is hidden or disabled in empty state.

33. While the song list is being fetched on modal open, a loading spinner or skeleton is shown; no empty flash.
34. If the song list fetch fails, an error message is shown with a retry affordance.
35. If the Save action fails, the modal remains open, selections are preserved, and an inline error is shown near the Save button. The modal does not close on failure.
36. All Server Action errors must be caught in try/catch and surfaced non-silently (per `docs/coding-guidelines.md`).

37. The FAB is rendered only for authenticated users with `music_director` role (server-side role check via `isLeader` in `SetlistViewerClient`).
38. If a non-`music_director` user triggers the Save Server Action directly, RLS policies on `setlist_songs` must reject the insert. The Server Action must surface an appropriate error.

39. All new UI elements (backdrop, panel, song rows, checkboxes, buttons, headings) use Artisan palette colors with CSS-variable arbitrary values or explicit `dark:` variants for every named utility class (per BUG-004 and BUG-005 prevention rules).

---

## Out of Scope

- Reordering songs within the setlist (separate feature).
- Removing songs from the setlist via this modal.
- Searching or filtering songs within the modal.
- Editing song metadata within the modal.
- Adding songs to the library from within this modal.
- Mobile/tablet variant (desktop-only, `lg:` breakpoint and larger).
- Changing the position or behavior of the existing auto-scroll FAB.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Host component where new FAB renders alongside `<AutoScrollToolbar>`; owns `isLeader`, `setlistId`, `autoScroll` state |
| `src/app/setlists/[id]/page.tsx` | Server Component that resolves `isLeader` from profile role and passes to `SetlistViewerClient` |
| `src/components/client/AutoScrollToolbar.tsx` | Existing FAB — CSS positioning, z-index, Artisan color tokens to mirror |
| `src/app/actions/songActions.ts` | `getAllSongs()` — fetch all songs, ordered by title ascending (public RLS) |
| `src/app/actions/setlistActions.ts` | `addSongToSetlist()` — single-song append with auto-computed `order_index` and `performance_key` |
| `src/components/client/logout-modal.tsx` | Reusable modal shell pattern: backdrop, `role="dialog"`, focus trap, Escape key handling, z-stack |
| `src/components/client/SetlistBuilder/LibraryPanel.tsx` | Song row UI pattern with title/artist/key layout to adapt for checkbox list |
| `src/components/client/button.tsx` | Shared `Button` component for Save/Cancel footer buttons |
| `src/styles/globals.css` | Artisan CSS variables (`--brand-*`, `--brand-*-alpha`, `--brand-background`, `--brand-card-bg`) |
| `src/types/supabase.ts` | `DbSetlistSong` type — junction table shape: `id`, `setlist_id`, `song_id`, `order_index`, `performance_key` |

---

## Technical Schema

N/A — no API contract required for this task. All data exchange uses existing Server Actions (`getAllSongs`, `addSongToSetlist`) and RLS policies on `setlist_songs` table.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-038/spec.md` | Full acceptance criteria + scope |
| Context Bundle | `tasks/TASK-038/context.md` | Reusable components + patterns + anti-patterns + MEMORY.md prevention rules |
| Research Notes | `tasks/TASK-038/research.md` | Open questions (now reconciled — see below) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (guides error handling, dark mode, code review expectations).
- Read `docs/tech-stack.md` to confirm available UI component libraries and Tailwind configuration.
- Read `docs/structure.md` to determine where to place the new `AppendSongsButton.tsx` and modal component files.
- **Run `npm run format` before every commit** (Prettier v3 is configured in `.prettierrc`).

### MEMORY.md Prevention Rules (inlined)

- **BUG-001:** Never seed React state from `localStorage`/`sessionStorage` via `useEffect + setState`. Use lazy `useState` initializer. Modal state is ephemeral (reset on close) so not directly applicable, but note for future extensions.

- **BUG-002:** Never use object property paths as `useCallback`/`useMemo` deps (e.g., `[props.onClose]`). Depend on the whole object or destructured primitives.

- **BUG-004 / BUG-005:** Named Tailwind utilities (`text-brand-espresso`, `bg-brand-cream`, etc.) do not auto-switch in dark mode. Use CSS-variable arbitrary values (`bg-[var(--brand-espresso)]`) or pair every named utility with an explicit `dark:` variant. **This is mandatory for all new UI elements in this task.**

- **BUG-007:** Declare all helper functions and callbacks **before** any `useEffect` that references them in Client Components. React Compiler rejects forward references. Hard build error on Vercel if violated.

- **BUG-010:** Do not render auth-required UI elements with CSS-only hiding (e.g., `hidden` class). Absent from DOM entirely for non-authorized users. The new FAB uses `{isLeader && <Component />}` server-side guard, not CSS hiding.

- **BUG-014:** Do not instantiate multiple instances of hooks like `useAutoScroll`. The new FAB should not create a second auto-scroll hook; `SetlistViewerClient` already owns the singleton.

- **BUG-016:** Module-level constants (e.g., `const PAGE_SIZE`) must not shadow similarly-named dynamic parameters or derived values in the same scope.

- **General (Prettier):** Run `npm run format` before every commit. Agents must not skip this.

---

## Amendments (from Context Bundle)

- **AM-1:** **AC-1 / Breakpoint Guard.** The spec requires the FAB to be "hidden on mobile and tablet — renders only at the same breakpoint as auto-scroll FAB." However, the existing auto-scroll FAB (`AutoScrollToolbar.tsx` line 18) has **no responsive guard**; it renders on all viewports. The context.md Anti-Patterns section correctly flags: "do not replicate absence of responsive guard — explicitly add `hidden lg:flex` to the new FAB's container." **Resolution:** The new FAB must explicitly include `hidden lg:flex` on its outer container to enforce desktop-only visibility, ensuring it does NOT appear on mobile/tablet. This is a hard requirement per the feature request and BUG-010 prevention (visible auth-required UI to non-authorized users is a risk). The class string should be: `"hidden lg:flex fixed bottom-6 left-6 z-50 flex-col items-end gap-2"`.

---

## Resolved Open Questions

- **OQ-1 (aria-label pattern):** AutoScrollToolbar.tsx line 116 uses `aria-label="Auto-scroll controls"` on the region wrapper. The main button (line 210–216) uses a dynamic, context-aware `aria-label`. For the new FAB (a standalone button), use the button-level pattern: `aria-label="Append songs to setlist"` as specified in AC-5. ✅ No conflict.

- **OQ-2 (sort order):** songActions.ts line 193 returns `.order("title", { ascending: true })`. Library/page.tsx line 83 confirms the same. The modal list must use alphabetical by title. ✅ Confirmed; incorporated into AC-19.

- **OQ-3 (order column name):** setlistActions.ts uses `order_index` throughout (lines 176, 323, etc.). The junction table column is `order_index`, not `position` or `order`. ✅ Confirmed; incorporated into AC-30.

- **OQ-4 (breakpoint):** AutoScrollToolbar.tsx line 18 has **no breakpoint guard**. The new FAB must explicitly add `hidden lg:flex` per task requirement and context.md anti-pattern flag (see Amendment AM-1). ✅ Resolved.

- **OQ-5 (pagination):** songActions.ts `getAllSongs()` (lines 178–209) returns all songs with no pagination. The setlist detail page uses `getSetlistWithSongs()` (setlistActions.ts lines 436–494) which is paginated by order within the setlist (not by page count). The modal should call `getAllSongs()` directly, not attempt pagination. ✅ Confirmed; incorporated into AC-17.

---

## Implementation Plan

**Files to Create:**
1. `src/components/client/AppendSongsButton.tsx` — Main FAB component (desktop-only, `hidden lg:flex`, isLeader guard).
2. `src/components/client/AppendSongsModal.tsx` — Modal component (scrollable song list, checkboxes, Save/Cancel buttons, focus trap, Escape handling).

**Files to Modify:**
1. `src/app/setlists/[id]/SetlistViewerClient.tsx` — Add modal open/close state; render `<AppendSongsButton />` inside `{isLeader && ...}` conditional.

**Key Implementation Decisions:**
- **FAB and Modal as separate files:** Keep modal logic isolated from the FAB for testability.
- **CSS constants at module level:** Follow `AutoScrollToolbar.tsx` pattern — declare all class strings as `const` at module level.
- **CSS-variable arbitrary values:** Use `bg-[var(--brand-espresso)]` instead of named utilities to auto-switch dark mode without `dark:` pairs on every class.
- **Sequential song additions:** Call `addSongToSetlist()` in a loop with `await` to avoid `order_index` race condition (each call computes `MAX(order_index) + 1` server-side).
- **Focus management:** Implement focus trap using Tab/Shift+Tab listeners; move focus to first checkbox on open; return focus to FAB on close.
- **Error handling:** All Server Action errors caught in try/catch; inline error message displayed near Save button; modal remains open on failure.
- **Load state prevention:** Show skeleton or spinner while `getAllSongs()` fetches; no empty-state flash.
- **State reset:** Modal state (checkboxes, error) reset to initial state when modal closes (via closing callback or state reset in useEffect).

---

## Resolution

- **Completed:** 2026-05-24
- **Branch:** feat/append-songs-fab
- **Base branch:** main
- **Files changed:**
  - `src/components/client/AppendSongsButton.tsx` — new desktop-only FAB component; owns the song-fetch lifecycle (fetch on click, not in useEffect, to satisfy React Compiler lint rule `react-hooks/set-state-in-effect`); passes songs + fetch state down to modal
  - `src/components/client/AppendSongsModal.tsx` — new modal component; scrollable song list with checkboxes; pre-checks/disables existing songs; sequential save loop (no Promise.all to avoid order_index race); focus trap + Escape key + backdrop dismiss; all Artisan colors via CSS-variable arbitrary values
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — added `AppendSongsButton` import; added `songId` field to `ClientSong` interface; added `existingSongIds` useMemo; added `{isLeader && <AppendSongsButton ... />}` render alongside `<AutoScrollToolbar>`
  - `src/app/setlists/[id]/page.tsx` — added `songId: entry.song_id` to `processedSongs` map to supply the songs table PK (not junction table PK) needed for duplicate detection
- **Notes:**
  - The React Compiler ESLint rule `react-hooks/set-state-in-effect` rejects calling async setState-invoking functions inside `useEffect` bodies. To satisfy this, song fetching was moved to the FAB's click handler (`openModal`), which opens the modal immediately (spinner visible) and fetches concurrently. The modal receives songs as props rather than fetching internally. This matches AC-33 (no empty flash — spinner shown from open).
  - `ClientSong.songId` is a new field (songs table PK, separate from `junctionId` which is the setlist_songs PK). The page.tsx was updated to populate it from `entry.song_id` in `getSetlistWithSongs()` results.
  - All Artisan colors use `bg-[var(--brand-espresso)]` style CSS-variable arbitrary values (no named Tailwind utilities without dark: pairs) — BUG-004/BUG-005 prevention.
  - All helper functions declared before the `useEffect` hooks that reference them — BUG-007 prevention.
  - Save loop is sequential (`for...of` with `await`) not `Promise.all` — avoids MAX(order_index) race condition (anti-pattern in context.md).
