# Spec — Append Songs FAB (Setlist Detail Page)

## Feature Summary

Add a second Floating Action Button (FAB) to the setlist detail page on desktop, positioned on the left side of the screen vertically aligned with the existing auto-scroll FAB on the right. The new FAB is visible only to authenticated `music_director` users and only on desktop viewports. Clicking it opens a modal containing a scrollable list of all songs in the library. Each song row shows a checkbox, song title, and artist name. Songs already present in the setlist are shown as pre-checked and disabled (to prevent duplicate insertion). After the user checks one or more new songs and clicks Save, those songs are appended to the end of the setlist in the order they were checked, the modal closes, and the setlist view refreshes to show the additions. If no songs exist in the library, an empty-state message is displayed. Loading and error states are handled visibly.

## Acceptance Criteria

### FAB Visibility and Layout
1. The Append Songs FAB is hidden on mobile and tablet viewports (i.e., it renders only at the same breakpoint at which the existing auto-scroll FAB becomes visible on desktop — breakpoint value to be confirmed against the existing FAB's CSS).
2. The FAB is positioned fixed on the left side of the viewport, at the same vertical position (top/bottom offset) as the auto-scroll FAB on the right side.
3. The FAB is not rendered at all in the DOM for users who do not have the `music_director` role (the auth guard must be applied at the Server Component level, not by CSS visibility alone, consistent with BUG-010 prevention rule).

### FAB Icon and Accessibility
4. The FAB displays a recognizable "add" or "plus" icon (or a music-note-plus variant) that communicates "add songs to setlist."
5. The FAB has an `aria-label` of `"Append songs to setlist"` (exact string to be confirmed against codebase convention — see Pending Reconciliation OQ-1).
6. The FAB has a visible tooltip on hover showing a short label (e.g., "Add Songs") consistent with the hover behavior of the existing auto-scroll FAB.
7. The FAB uses the Artisan palette: background `--brand-brown` / `--brand-espresso` with `--brand-cream` icon, plus explicit `dark:` variants for both background and icon (per BUG-004 and BUG-005 prevention rules).

### Modal Open/Close Behavior
8. Clicking the FAB opens the Append Songs modal.
9. The modal can be closed by clicking an explicit close button (X) in the modal header.
10. The modal can be closed by clicking the backdrop overlay outside the modal panel.
11. The modal can be closed by pressing the Escape key.
12. Closing the modal by any method without saving discards all checkbox selections (state is reset on close).
13. The modal has a visible `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal's heading element.
14. Focus is trapped inside the modal while it is open (keyboard Tab and Shift+Tab cycle only through modal-internal focusable elements).
15. When the modal opens, focus is placed on the first focusable element inside the modal (close button or search input if present).
16. When the modal closes, focus returns to the FAB that triggered it.

### Song List — Content and Order
17. The modal body contains a scrollable list of all songs in the library (`songs` table).
18. Each song row displays at minimum: song title and artist name.
19. Songs are ordered consistently on every open (exact ordering — alphabetical by title, or by created_at, or by library order — to be confirmed against codebase convention; see Pending Reconciliation OQ-2).
20. Songs already present in the current setlist are rendered with their checkbox pre-checked and the checkbox disabled, with a visual indicator (e.g., muted/greyed row or "Already added" label) so the user understands why the checkbox cannot be changed.
21. Songs not yet in the setlist have an unchecked, enabled checkbox.

### Checkbox Behavior
22. Checking a song's checkbox marks it for addition; unchecking removes the mark. Only enabled (not-yet-added) checkboxes respond to interaction.
23. The checkbox is the primary click target; clicking anywhere on the song row (title/artist area) also toggles the checkbox for that row (for usability), except for rows that are disabled (already in setlist).
24. No song is ever added to the setlist more than once; the disabled pre-check state on existing songs is the sole guard against duplicates (RLS is the backend guard).

### Save Button Behavior
25. A "Save" button is present in the modal footer and is enabled only when at least one new (non-disabled) song is checked.
26. When Save is clicked, a loading indicator (spinner or button disabled state) is shown immediately.
27. On successful save, all newly checked songs are appended to the end of the setlist, preserving the existing song order.
28. The songs are appended in the order they appear in the modal list (top-to-bottom checked order), not in check-selection order.
29. On successful save, the modal closes and the setlist view reflects the newly added songs without requiring a manual page refresh.
30. The junction table row(s) inserted must include the correct `setlist_id`, `song_id`, and a `position` (or `order`) value that places the new songs after all existing entries (exact column name to be confirmed — see Pending Reconciliation OQ-3).

### Empty State
31. If the `songs` table contains zero rows, the modal body shows an empty-state message (e.g., "No songs in your library yet. Add songs in the Song Library first.") instead of a list.
32. The Save button is hidden or disabled when the empty-state message is shown.

### Loading and Error States
33. While the song list is being fetched (on modal open), a loading spinner or skeleton is shown in the modal body; the song list does not flash empty before populating.
34. If the song list fetch fails, an error message is shown in the modal body (e.g., "Unable to load songs. Please try again.") with a retry affordance.
35. If the Save action fails on the server, the modal remains open, the selections are preserved, and an inline error message is shown near the Save button (e.g., "Unable to add songs. Please try again."). The modal does not close on failure.
36. Server Action errors must be caught in a try/catch and never allowed to propagate silently (per coding-guidelines.md).

### Auth Guard
37. The FAB is rendered only for authenticated users with the `music_director` role. The role check must be enforced server-side (Server Component or Server Action); hiding the FAB via CSS alone is not sufficient.
38. If a non-`music_director` user somehow triggers the Save Server Action (e.g., via direct API call), RLS policies on the junction table must reject the insert. The Server Action must surface an appropriate error rather than silently failing.

### Dark Mode
39. All modal elements (backdrop, panel, song rows, checkboxes, buttons, headings) use Artisan palette colors with explicit `dark:` Tailwind variants for every named utility class (per BUG-004 and BUG-005 prevention rules). No named Artisan utility may appear without a paired `dark:` variant.

## Out of Scope

- Reordering songs within the setlist (that is a separate feature).
- Removing songs from the setlist via this modal.
- Searching or filtering songs within the modal (not requested; may be added in a future task if the library grows large).
- Editing song metadata from within the modal.
- Adding songs to the library from within this modal (the empty-state message directs the user to the Song Library page instead).
- Mobile/tablet FAB or modal variant (desktop-only per the feature request).
- Changing the position of the auto-scroll FAB.
- Any change to the existing auto-scroll FAB behavior.

## Fallback Behaviors

- **Song list fetch MISSING/fails:** Modal body shows error message with retry. Save button is disabled. FAB remains visible (the modal can be reopened after retry).
- **Save Server Action MISSING:** Save button is disabled with hint text "Unable to save — service unavailable." Modal remains open. (Per gap-handling default: disable control + show hint, never silent mock.)
- **`music_director` role not present:** FAB is not rendered. No fallback control is shown to the user — the setlist is view-only, consistent with existing read-only behavior.

## Resolved Ambiguities

- **"Aligning to the auto-scroll" meaning** — Interpreted as: the same fixed vertical position (top or bottom offset) as the existing auto-scroll FAB, but on the opposite (left) side. Resolved from feature request context.
- **Duplicate prevention strategy** — Pre-check + disable existing songs in the modal list, rather than filtering them out entirely, so the user can see what is already in the setlist. Resolved by AC-20 (UX best practice; no conflicting spec).
- **Save order for appended songs** — Appended in modal-list order (top-to-bottom) among the checked songs, not click-sequence order. Resolved from general UX consistency; no conflicting spec found.
- **React Compiler compliance** — Modal Client Component must not use `useCallback` with object property path deps (per BUG-002 prevention rule). If `useCallback` is used, deps must reference the whole object.
- **Dark mode required** — All new UI elements must carry explicit `dark:` Tailwind variants (per BUG-004/BUG-005 prevention rules). This is a non-negotiable Artisan pattern.
- **Navbar auth visibility** — FAB must be absent from the DOM for non-`music_director` users, not just CSS-hidden (per BUG-010 prevention rule).
- **State init from storage** — If any modal state (e.g., last selected songs) is ever persisted to localStorage in a future iteration, it must use a `useState` lazy initializer, never `useEffect` + `setState` (per BUG-001 prevention rule). For this task, modal state is ephemeral (reset on close) so this rule does not apply directly, but is noted.

## Open Questions

- **OQ-1 (Pending Reconciliation)** — What `aria-label` string does the existing auto-scroll FAB use, and what naming convention is followed for FAB aria-labels in this codebase? AC-5 uses `"Append songs to setlist"` as a placeholder. (suggested resolution source: codebase-explorer to grep for `aria-label` near the auto-scroll FAB component in `src/`)
- **OQ-2 (Pending Reconciliation)** — What default ordering is applied to the songs list in the existing Song Library page? AC-19 requires a consistent order for the modal list; the modal should match the library convention. (suggested resolution source: codebase-explorer to inspect `src/app/library/page.tsx` or equivalent Song Library query)
- **OQ-3 (Pending Reconciliation)** — What is the exact column name for song ordering in the setlist–song junction table (`setlist_songs` or equivalent)? AC-30 refers to a `position` or `order` column. (suggested resolution source: codebase-explorer to inspect `supabase/migrations/` or `src/app/actions/setlistActions.ts` for insert patterns)
- **OQ-4 (Pending Reconciliation)** — At what Tailwind breakpoint does the existing auto-scroll FAB become visible? AC-1 requires the new FAB to use the same breakpoint. (suggested resolution source: codebase-explorer to grep for the auto-scroll FAB component's responsive class)
- **OQ-5 (Pending Reconciliation)** — Does the existing setlist detail page fetch song data via a single query or a paginated approach? If paginated, the modal song list must handle pagination or switch to a full-list fetch. (suggested resolution source: codebase-explorer to inspect `src/app/setlists/[id]/page.tsx` and related actions)
