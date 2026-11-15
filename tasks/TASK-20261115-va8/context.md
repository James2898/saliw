## Context Bundle — Liturgy Assistant Setlist Integration & Key Recommendations

### Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/types/liturgyAgent.ts` | Contract definitions (`LiturgyAgentRequest`, `ProposedSong`, `KeySource`, `LiturgyStepProgress`, `LiturgyAgentResponse`). |
| `src/app/actions/liturgyAgentActions.ts` | Server action `generateSetlistProposalAction`; handles song tag filtering, needs leader history queries & harmonic modulation. |
| `src/app/actions/__tests__/liturgyAgentActions.test.ts` | Unit tests for proposal generation, count validation boundaries, step logging, and exclusion filters. |
| `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` | Slide-over drawer UI; needs single-song refresh wiring, key select change handling, and replace vs. append selection. |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Parent component managing `localSongs` state, dirty detection, drawer mounting, and setlist saving. |
| `src/app/actions/setlistActions.ts` | Existing server actions containing `getWorshipLeaderSongHistory` and setlist mutations. |
| `src/utils/worshipLeaderHistory.ts` | Utilities `groupWorshipLeaderSongHistory` and types for aggregating leader key performance history. |
| `src/utils/musicLogic.ts` | Musical utilities (`NOTES`, `getSemitoneOffset`, `shiftChord`) for harmonic transition calculations. |
| `src/components/SongKey/SongKeySelect.tsx` | Reusable key dropdown component rendered in proposed song cards. |
| `src/components/SongKey/SongKeyBadge.tsx` | Key badge component for displaying original / performance keys. |
| `src/components/SongTags/SongTagBadge.tsx` | Tag badge component for displaying `joyful` and `solemn` vibes. |
| `src/types/supabase.ts` | Database types (`DbSetlist`, `DbSetlistSong`, `DbSong`, `DbMusician`). |

### Reuse Candidates
- `src/app/actions/setlistActions.ts` (`getWorshipLeaderSongHistory`) — Directly reusable or mirrorable query to fetch past performance keys for `worshipLeaderId` from `setlists` and `setlist_songs`.
- `src/utils/worshipLeaderHistory.ts` (`groupWorshipLeaderSongHistory`) — Directly reusable pure helper to aggregate past setlist rows into `WorshipLeaderSongHistoryItem[]` with repeat counts and latest sung dates.
- `src/utils/musicLogic.ts` (`NOTES`, `getSemitoneOffset`) — Reusable chromatic scale constant and semitone offset calculation for circle-of-fifths / harmonic modulation transitions.
- `src/components/SongKey/SongKeySelect.tsx` — Pre-existing dropdown used in drawer cards; pass an `onChange` handler to update `recommendedKey` in `proposedSongs`.
- `src/components/SongKey/SongKeyBadge.tsx` & `SongTagBadge.tsx` — Existing Artisan UI components used for key badges and vibe badges in proposed song cards.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` (`handleAdd`, `handleKeyChange`) — Existing patterns for populating `SortableSong` objects and modifying performance keys.

### Patterns to Follow
- **SortableSong State & Indexing:** See `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` lines 156-175 (`handleAdd`). Songs are stored with `junctionId: null` (unpersisted), `songId`, `title`, `artist`, `originalKey`, `performanceKey`, and sequential `orderIndex`.
- **Worship Leader ID Resolution:** See `SetlistBuilderClient.tsx` line 150:
  ```ts
  const activeWorshipLeaderId = setlistId === null ? pendingWorshipLeaderId : editWorshipLeaderId;
  ```
  Pass `activeWorshipLeaderId` to `LiturgyAssistantDrawer` as `currentWorshipLeaderId`.
- **Lazy State Initialization:** See `SetlistBuilderClient.tsx` lines 108-120: Always initialize state via lazy function closures `useState(() => initialValue)` to avoid hydration mismatches (BUG-001).
- **Date String Extraction on timestamptz:** See `src/utils/worshipLeaderHistory.ts` line 54: Always slice Supabase `timestamptz` date strings with `.slice(0, 10)` (BUG-018).
- **Server Action Try/Catch & Session Check:** See `src/app/actions/setlistActions.ts` lines 964-972: Always wrap server actions in `try/catch` and check authenticated user via `await supabase.auth.getUser()`.
- **Exclusion Set Filtering:** See `src/app/actions/liturgyAgentActions.ts` lines 85-91: Use `Set(excludedSongIds)` for efficient candidate filtering during initial generation or single-song re-rolls.

### Anti-Patterns Flagged
- `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` line 84 & 254: `className="brand-espresso"` violates Tailwind syntax — must be `className="text-brand-espresso"`.
- `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` line 297: `<SongKeySelect onChange={() => {}} value={song.recommendedKey} />` provides a no-op handler, silently ignoring user key adjustments.
- `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` lines 301-303: `<RefreshCcw>` button has no `onClick` handler, loading spinner, or accessible label.
- `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` line 314: Hardcodes `onApplySetlist(proposedSongs, "replace")` without checking `hasExistingSongs` or offering the user an Append choice.
- `src/components/client/SetlistBuilder/LiturgyAssistantDrawer.tsx` line 98: `useState(currentWorshipLeaderId || "")` does not synchronize when `currentWorshipLeaderId` changes in parent.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` line 631: Passes `currentWorshipLeaderId={pendingWorshipLeaderId}`, which is null in Edit mode; should pass `activeWorshipLeaderId`.
- `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` line 632: Passes empty callback `onApplySetlist={() => {}}`.
- `src/app/actions/liturgyAgentActions.ts` lines 50-68: Mocked `stepsExecuted` claims `leader_history` and `harmonic_optimization` ran without executing database queries or music math. Lacks `try/catch` and `auth.getUser()` check.

### MEMORY.md Notes
- `MEMORY.md` file does not exist on disk (treated as empty). Extracted project rules and known domain bug patterns from `GEMINI.md`:
  - **Saliw Modal Dialog Selector:** In tests, never query `role="dialog"` alone; always scope by `aria-labelledby` (e.g. `[role="dialog"][aria-labelledby="..."]`) as the layout mounts a background mobile drawer with `role="dialog"`.
  - **React Compiler & Immutability Rules:** Never assign directly to global window properties like `window.location.hash`. Direct mutation causes fatal compiler errors.
  - **Artisan Color Palette:** UI indicators, tag chips, and buttons must strictly use Artisan variables (`brand-espresso`, `brand-cream`, `brand-brown`, `brand-tan`, `brand-darker`). Never introduce generic Tailwind color classes (`emerald`, `sky`, `blue`, `green`).
  - **Toolbar Action Strips & Buttons:** Toolbar action strips must use `flex-wrap` to prevent mobile overflow, and buttons must conform to standard 32px height (`h-8` or `px-3 py-1.5 text-xs font-semibold rounded-lg`).
  - **Timestamptz UTC Extraction (BUG-018):** Compare dates using `.slice(0, 10)` against UTC today strings.
  - **Lazy State Initializers (BUG-001):** Prevent hydration mismatch by using `useState(() => val)`.
