# Spec — Liturgy Assistant Setlist Integration & Key Recommendations

## Feature Summary
Integrate the AI Liturgy Assistant Drawer with the `SetlistBuilderClient` by implementing the `onApplySetlist` workflow (supporting both setlist replacement and appending while preserving sort order and performance keys), enabling single-song refresh with candidate exclusion in `LiturgyAssistantDrawer`, and enhancing key recommendation heuristics in `liturgyAgentActions.ts` by leveraging worship leader performance history and harmonic modulation transitions.

## Acceptance Criteria
1. **Apply Setlist (Empty State):** When the current setlist has zero songs (`localSongs.length === 0`), triggering "Apply Setlist" from `LiturgyAssistantDrawer` directly populates `localSongs` with the proposed songs, assigning sequential `sort_order` (1..N), preserving recommended `performance_key` values, setting the setlist state to dirty/unsaved, and closing the drawer.
2. **Apply Setlist (Replace Option):** When `localSongs.length > 0`, attempting to apply proposed songs displays an option or confirmation dialog allowing the user to "Replace All". Upon confirmation, all existing `localSongs` are replaced with the proposed songs with re-indexed `sort_order` (1..N) and designated `performance_key`, marking the setlist dirty and displaying a confirmation notification.
3. **Apply Setlist (Append Option):** When `localSongs.length > 0`, user can choose "Append to Setlist". Appending appends the proposed songs to the end of `localSongs`, assigning new `sort_order` values starting immediately after the highest existing `sort_order` (or continuous array length index), and marking the setlist dirty.
4. **Deduplication on Append:** When appending proposed songs to an existing setlist that already contains one or more of the proposed songs (matched by `song_id`), the duplicate songs are de-duplicated / skipped with an informational notification indicating any omitted duplicates to preserve list key uniqueness.
5. **Key & Note Preservation:** For every song applied from the drawer (via replace or append), the resulting item in `localSongs` must preserve the proposed `performance_key`. If a proposed song does not specify a `performance_key`, it falls back to the song's `original_key`.
6. **Single-Song Refresh Trigger:** In `LiturgyAssistantDrawer`, clicking the `RefreshCcw` icon button on an individual proposed song card initiates an isolated re-roll for that specific song slot.
7. **Single-Song Refresh Payload & Exclusion:** The single-song refresh action passes `excludedSongIds` containing the IDs of all currently proposed songs in the drawer and any existing songs in `localSongs` to ensure the replacement candidate is unique and does not duplicate existing selections.
8. **Single-Song Refresh UI & Loading State:** During an in-flight single-song refresh, only the targeted card's refresh button displays a loading spinner and is disabled against concurrent clicks; other song cards in the drawer remain interactive.
9. **Single-Song Refresh Slot Replacement:** When the single-song refresh successfully returns a candidate, it replaces only the targeted song at its exact index in the proposed list, maintaining the position, liturgy section tag/role, and generating a recommended `performance_key`.
10. **Single-Song Refresh Failure Handling:** If single-song refresh fails or returns no matching alternative song, an error toast is surfaced (e.g., "Unable to find an alternative song for this liturgy slot") and the existing proposed song in that slot is retained without data loss.
11. **Worship Leader History Query in `liturgyAgentActions`:** When `worshipLeaderId` is provided, the key recommendation logic in `liturgyAgentActions.ts` queries past setlists led by the specified leader in `setlist_songs` (joined with `setlists`) to determine if the leader has previously performed the song.
12. **Key Recommendation from History:** If the worship leader has previously performed the song, the recommended key prioritizes the leader's most recently used `performance_key` for that song.
13. **Harmonic Modulation Fallback:** If the worship leader has no performance history for the song (or `worshipLeaderId` is not provided), the key recommendation logic calculates a harmonic modulation suggestion based on the preceding song in the setlist (e.g. circle of fifths / Camelot / relative key / smooth vocal transition) or falls back to the song's `original_key`.
14. **Artisan Design System Compliance:** All newly rendered UI elements in the drawer and builder (buttons, dialogs, toasts, badges) must strictly conform to Saliw's Artisan palette (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`) and adhere to the standard 32px height baseline for toolbar buttons without generic emerald/sky/blue colors.

## Out of Scope
- Generating audio previews or automatic chord transposition playback for recommended keys.
- Changing database schema or creating new migration tables for worship leader profiles or vocal ranges.
- Full auto-save/immediate database write on apply (applying songs updates `localSongs` in `SetlistBuilderClient` memory; saving setlist remains user-triggered via the existing save mechanism).
- Rewriting the AI prompt engineering pipeline or LLM model provider.

## Fallback Behaviors
- **No Leader Selected (`worshipLeaderId` null or empty):** Key recommendation falls back to harmonic modulation relative to the preceding song in the setlist, or defaults to the song's `original_key`.
- **Single-Song Refresh API Failure or Empty Candidates:** Displays an error toast ("No alternative songs found matching liturgy criteria") and leaves the existing proposed song in place.
- **Worship Leader History Query Error:** If fetching leader history fails due to network or permission error, the action catches the error cleanly without unhandled rejection and falls back gracefully to `original_key`.

## Resolved Ambiguities
- **Replace vs Append Behavior:** Resolved by supporting both: if `localSongs` is empty, apply immediately populates; if `localSongs` already has items, prompt the user with Replace (overwrites with confirmation) vs Append (appends to bottom and re-indexes `sort_order`).
- **Duplicate Song Handling on Append:** Duplicate song IDs are filtered out on append to preserve unique React keys and avoid accidental duplicate tracks in the setlist, with an informational toast informing the user.
- **Key Fallback Order:** 1) Leader's past performance key for that song -> 2) Harmonic transition from adjacent song -> 3) Song's `original_key`.
