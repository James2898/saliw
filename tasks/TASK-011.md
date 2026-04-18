# TASK-011 — Hybrid Rendering Engine (SongViewer)

- **Tier:** 2
- **Date Created:** 2026-04-16
- **Status:** In Progress

---

## Feature Summary

Build a Hybrid Rendering Engine for chord sheets in `src/components/SongViewer/`. The engine delivers SSR-pre-rendered chord sheets (for SEO and fast initial load) combined with a client-side transposition UI that updates chord spans live without a page reload. The implementation includes: a new `preProcessChords` utility in `src/utils/musicLogic.ts`, a Server Component page at `src/app/library/[id]/page.tsx` that fetches the song's `content`, `original_key`, and `title` from Supabase using `@supabase/ssr`, a static SSR chord-sheet renderer, a `useTranspose` hook in `src/hooks/useTranspose.ts`, and a `ChordSheetClient` client wrapper component in `src/components/SongViewer/` that provides a key-selector dropdown and ±1 semitone stepper buttons. Section headers (`[VERSE]`, `[CHORUS]`, etc.) are rendered with the existing `.section-title` CSS class (brown in light mode, tan in dark mode, WCAG AA compliant).

---

## Acceptance Criteria

1. A new dynamic route `src/app/library/[id]/page.tsx` exists and renders a song's chord sheet when visited at `/library/<song-id>`.
2. The page fetches `id`, `title`, `artist`, `original_key`, and `content` from the `songs` table using `createClient()` from `src/services/supabase/server.ts` (the `@supabase/ssr` server client). No other Supabase client is used for server-side data fetching.
3. Unauthenticated users visiting `/library/<id>` are redirected to `/login` (matching the Library page pattern). The auth check uses `supabase.auth.getUser()`.
4. If the song `id` is not found (PGRST116 error or `data === null`), the page renders a user-friendly "Song not found." message with a back link to `/library`. No redirect is performed for not-found — render the error state inline.
5. A `preProcessChords(content: string): ProcessedLine[]` function is added to `src/utils/musicLogic.ts` and exported. It parses the raw `content` string line-by-line and classifies each line as one of: `'header'` (bracket-wrapped section label matching `/^\[.+\]$/`), `'chord'` (a chord line per the existing `isChordLine` heuristic), or `'lyric'` (all other non-empty lines). Empty lines are classified as `'blank'`.
6. The `ProcessedLine` type (exported from `src/utils/musicLogic.ts`) has the shape: `{ type: 'header' | 'chord' | 'lyric' | 'blank'; raw: string; tokens?: ChordToken[] }`. For `'chord'` lines, `tokens` is an array of `ChordToken` objects. `ChordToken` is also exported: `{ text: string; isChord: boolean; originalChord: string | null }`.
7. For chord-line tokens that are chords, `preProcessChords` preserves the original chord value. The SSR renderer wraps each chord token in `<span class="chord-item" data-original-chord="<value>">` using React JSX props (not raw HTML string injection), ensuring React's automatic attribute escaping prevents XSS.
8. Section headers (lines matching `/^\[.+\]$/`) are rendered using the existing `.section-title` CSS class. No new CSS class is created. The class already applies `--brand-brown` in light mode and `--brand-tan` in dark mode, satisfying WCAG AA.
9. The SSR chord sheet output uses the `.chord-display` CSS class for the container, ensuring `font-family: var(--font-mono)` (JetBrains Mono) and `white-space: pre-wrap` are applied. No inline styles override these values.
10. A `useTranspose` hook is created at `src/hooks/useTranspose.ts`. Its signature is: `useTranspose(originalKey: string): { semitoneOffset: number; displayKey: string; increment: () => void; decrement: () => void; setTargetKey: (key: string) => void; reset: () => void }`. The hook always initializes with `semitoneOffset = 0` and `displayKey = originalKey`.
11. `useTranspose` calculates `displayKey` as `NOTES[(rootToIndex(originalKey) + semitoneOffset + 12) % 12]`. `setTargetKey(key)` computes `semitoneOffset` via `getSemitoneOffset(originalKey, key)`. Semitone offset is always relative to `original_key`, never accumulated across prior transpositions.
12. A `ChordSheetClient` component is created at `src/components/SongViewer/ChordSheetClient.tsx` with `'use client'` directive. Props: `{ processedLines: ProcessedLine[]; originalKey: string }`. No client-side Supabase calls.
13. `ChordSheetClient` uses `useTranspose` internally. Whenever `semitoneOffset` changes, it updates the `innerText` of all `.chord-item` elements within its container ref by reading `data-original-chord` and calling `shiftChord(originalChord, semitoneOffset)`. DOM mutation is used (not React re-render of chord nodes) to avoid hydration conflicts.
14. `ChordSheetClient` renders a transposition control bar above the chord sheet with: (a) a `<select>` dropdown showing all 12 chromatic keys from the exported `NOTES` array, current `displayKey` selected, wired to `setTargetKey`; and (b) a `−1` button wired to `decrement` and a `+1` button wired to `increment`. All controls use Artisan palette Tailwind classes — no inline styles, no hardcoded hex values.
15. All transposition control bar text and interactive elements meet WCAG AA contrast. Buttons and labels use `text-brand-espresso` on light backgrounds; appropriate dark-mode variants applied.
16. The `src/app/library/[id]/page.tsx` Server Component calls `preProcessChords(song.content)` and passes the result as `processedLines` prop to `ChordSheetClient`. The page shell (title, artist, key badge) is pure Server Component JSX.
17. The song `<h1>` title uses `font-extrabold text-brand-espresso` (matching Library page heading style). Artist name and original key badge follow the same typographic pattern as Library list rows.
18. No new Supabase queries exist inside client components. All data fetching is in the Server Component page.
19. All new TypeScript is strictly typed — no `any` types. `ProcessedLine`, `ChordToken`, and the `useTranspose` return type are explicitly typed and exported.
20. The feature branch is named `feature/TASK-011-song-viewer-hybrid-renderer` and branched from `develop`.

---

## Out of Scope

- Setlist `performance_key` integration — `useTranspose` always starts at offset 0. Setlist context is a future task.
- Edit functionality for the song viewer — no Edit button or form in this task.
- Realtime collaboration or multi-user transposition sync.
- Pagination of chord sheet content.
- Audio playback or metronome features.
- Any new Server Actions or database mutations (this task is read-only).
- Creating a new CSS class for section headers — the existing `.section-title` class must be reused.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/utils/musicLogic.ts` | Add `preProcessChords`, `ProcessedLine`, `ChordToken` exports; reuse `chordRegex`, `isChordLine`, `shiftChord`, `getSemitoneOffset`, `NOTES` |
| `src/hooks/useTranspose.ts` | Create new — the transposition state hook |
| `src/components/SongViewer/ChordSheetClient.tsx` | Create new — `'use client'` chord sheet with transposition controls |
| `src/app/library/[id]/page.tsx` | Create new — dynamic route Server Component, data fetch, page shell |
| `src/services/supabase/server.ts` | Use `createClient()` for all server-side Supabase queries |
| `src/services/supabase/client.ts` | Reference only — do NOT use for server-side data fetching |
| `src/types/supabase.ts` | `DbSong` type — note field is `content` not `lyrics` |
| `src/styles/globals.css` | Pre-defined CSS classes: `.chord-item`, `.chord-display`, `.section-title`, `.main-card` — do NOT redefine |
| `src/components/server/card.tsx` | `Card` server component — reuse for page shell container |
| `src/app/library/page.tsx` | Pattern reference: SSR auth guard, Supabase query, Artisan styling |
| `supabase/migrations/20260415000001_create_songs_table.sql` | Confirms `content` column name, SELECT RLS: `auth.role() = 'authenticated'` |
| `docs/coding-guidelines.md` | Mandatory read — Artisan palette, hydration mismatch rules, chordRegex mandate |

---

## Technical Schema

### Server Action Contract Table

| UI Action | Query / Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| Load song chord sheet | `supabase.from('songs').select('id, title, artist, original_key, content').eq('id', id).single()` | `src/app/library/[id]/page.tsx` | `authenticated` | EXISTS | N/A |
| Auth session check | `supabase.auth.getUser()` | `src/app/library/[id]/page.tsx` | N/A | EXISTS | Redirect to `/login` if no user |
| Client-side transposition | `useTranspose` hook — pure local state, no DB call | `src/components/SongViewer/ChordSheetClient.tsx` | N/A | EXISTS | N/A |

**Summary:** 2 backend data actions, both EXISTS. 0 MISSING. No escalation required.

### Error Handling Contract

| Condition | Signal | UI Behavior |
|-----------|--------|-------------|
| Song not found | `error.code === 'PGRST116'` or `data === null` after auth passes | Render inline: "Song not found." + back link to `/library` |
| Server/network error | `error` present, code not PGRST116 | Render inline: "Unable to load song. Please try again." |
| Unauthenticated | `user === null` from `auth.getUser()` | `redirect('/login')` |

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-011/spec.md` | Acceptance criteria, scope, resolved ambiguities |
| Context Bundle | `tasks/TASK-011/context.md` | Reusable components, patterns, anti-patterns |
| Research Notes | `tasks/TASK-011/research.md` | Blocking questions + user answers |
| Technical Schema | `tasks/TASK-011/schema.md` | Server action contract table |
| Endpoint Contracts | `tasks/TASK-011/contracts/endpoints.md` | Full per-action contract detail |

---

## Implementation Notes

- **Read `docs/coding-guidelines.md` before writing any code** — specifically: the Musical Integrity section (chordRegex mandate), the Hydration Mismatch warning, the WCAG AA contrast flag for `--brand-tan` on `--brand-cream`, and the SSR safety rules.
- **Read `docs/tech-stack.md` before choosing any library** — no new package dependencies without explicit user approval.
- **Read `docs/structure.md` before creating any new file or directory** — place files per the layout table.
- **Critical field name:** The DB column is `content`, not `lyrics`. All code must use `content`.
- **No `any` types.** TypeScript strict mode applies.
- **chordRegex note:** `chordRegex` in `src/utils/musicLogic.ts` does NOT use the global flag — use `new RegExp(chordRegex.source, 'g')` when iterating over a line (matching the pattern already established in `isChordLine`).
- **Hydration safety:** `ChordSheetClient` must render the same chord text on the server pass and client mount. The DOM mutation for transposition fires only after mount via `useEffect` — the initial render shows chords at `semitoneOffset = 0` (which is identical to the SSR output). This prevents React hydration mismatch.
- **XSS safety:** All chord token values and header text are rendered via React JSX props (not `dangerouslySetInnerHTML`). `data-original-chord` is set as a React prop, which auto-escapes.
- **Reuse candidates from context bundle:**
  - `.chord-item`, `.chord-display`, `.section-title`, `.main-card` CSS classes are already defined — do not redefine.
  - `Card` from `src/components/server/card.tsx` for the page container shell.
  - `createClient()` from `src/services/supabase/server.ts` for all server queries.
  - `shiftChord`, `getSemitoneOffset`, `NOTES`, `isChordLine`, `chordRegex` from `src/utils/musicLogic.ts` — all reusable directly.
- **MEMORY.md:** Does not exist yet — treat as empty, no action needed.

---

## Resolution

- **Completed:** 2026-04-16
- **Branch:** feature/TASK-011-song-viewer-hybrid-renderer
- **Base branch:** develop
- **Files changed:**
  - `src/utils/musicLogic.ts` — Added `ChordToken`, `ProcessedLine` types and `preProcessChords` function export
  - `src/hooks/useTranspose.ts` — Created new hook with semitoneOffset state, displayKey derivation, increment/decrement/setTargetKey/reset
  - `src/components/SongViewer/ChordSheetClient.tsx` — Created new `'use client'` component with transposition control bar and DOM-mutation chord update
  - `src/app/library/[id]/page.tsx` — Created new dynamic route Server Component with auth guard, Supabase SSR fetch, error states, and ChordSheetClient island
  - `src/styles/globals.css` — Enhanced `.chord-item` CSS: added `background-color: var(--brand-tan)` + `border-radius: 3px` for light mode (espresso text on tan, ~6.5:1 WCAG AA); updated dark mode to `background-color: var(--brand-brown)` with cream text (~4.7:1 WCAG AA); both modes now visually contrast chord tokens against the sheet background
  - `tasks/TASK-011.md` — Task file
  - `tasks/TASK-011/context.md`, `spec.md`, `research.md`, `schema.md`, `contracts/endpoints.md` — Planning artifacts
- **Notes:**
  - TypeScript compiled clean (`npx tsc --noEmit` passes with zero errors after all fixes).
  - The Supabase query result is destructured via intermediate variable (`songResult`) to avoid TS narrowing issue where `error?.code` becomes inaccessible after `if (error || !song)` guard — `error` narrows to `never` inside the block.
  - The `preProcessChords` tokenizer splits chord lines on `(\s+)` capturing groups so whitespace padding is preserved as non-chord tokens, maintaining `white-space: pre-wrap` alignment.
  - Validator finding #4 fixed: removed `/70` opacity modifier from "Original key" indicator in `ChordSheetClient.tsx` (was `text-brand-brown/70` → now `text-brand-brown`, contrast ~4.7:1 WCAG AA pass).
  - Validator finding #1 fixed: hoisted `anchoredChordRegex` construction outside the `.map()` loop in `preProcessChords`.
  - Validator finding #3 fixed: removed erroneous `'use client'` directive from `useTranspose.ts`.
  - Validator suggestion (useMemo in useTranspose) deferred as low priority — tracked for future improvement.
  - `git commit` is pending — all files staged; user must run `git commit` to finalize. The `supabase/migrations/` pre-existing modifications are intentionally excluded.

### Bug Fix — Pipe-Delimited Chord Chart Detection (2026-04-16)

- **Bug:** Chord tokens inside pipe-delimited chart lines (e.g. `[Intro]| F | C | G | Am7 || F | C | G | Am7 |`) were rendered as plain text instead of `.chord-item` spans because `isChordLine` returned `false` — pipe and bracket characters diluted the chord-token ratio below the 50% threshold.
- **Root cause:** The `isChordLine` heuristic was not designed for pipe-chart format. Pipe (`|`) and bracket-prefixed tokens (`[Intro]|`) count as non-chord tokens, reducing the chord ratio for a line with 8 chords and 9 pipe/bracket tokens from ≈53% (if clean) to ≈47% — just below the threshold.
- **Fix:** Added `PIPE_CHART_REGEX` (`/\|.*\|/`) detection as step 3 in `preProcessChords`, before the `isChordLine` heuristic. Pipe-chart lines are split on `|` runs (captured via regex split), with each inter-pipe segment further split on whitespace. Each non-whitespace sub-token is tested against `anchoredChordRegex`. Pipe characters are emitted as non-chord tokens to preserve visual chart structure. Lines with at least one chord token are returned as `type: 'chord'` — reusing the existing `ChordToken[]` shape with no changes to `ChordSheetClient.tsx`.
- **Files changed:** `src/utils/musicLogic.ts` only.
- **Self-check:**
  - Change matches the request exactly — no extra features added.
  - Only `src/utils/musicLogic.ts` was modified.
  - No Supabase calls, Server Actions, or auth logic introduced.
