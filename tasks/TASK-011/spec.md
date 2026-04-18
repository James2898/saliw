# Spec — Hybrid Rendering Engine (SongViewer)

## Feature Summary

Build a Hybrid Rendering Engine for chord sheets in `src/components/SongViewer/`. The engine delivers SSR-pre-rendered chord sheets (for SEO and fast initial load) combined with a client-side transposition UI that updates chord spans live without a page reload. The implementation includes: a new `preProcessChords` utility in `src/utils/musicLogic.ts`, a Server Component page at `src/app/library/[id]/page.tsx` that fetches the song's `content`, `original_key`, and `title` from Supabase using `@supabase/ssr`, a static SSR chord-sheet renderer, a `useTranspose` hook in `src/hooks/useTranspose.ts`, and a `ChordSheetClient` client wrapper component in `src/components/SongViewer/` that provides a key-selector dropdown and ±1 semitone stepper buttons. Section headers (`[VERSE]`, `[CHORUS]`, etc.) are detected via regex and rendered with the existing `.section-title` CSS class (brown in light mode, tan in dark mode, WCAG AA compliant).

## Acceptance Criteria

1. A new dynamic route `src/app/library/[id]/page.tsx` exists and renders a song's chord sheet when visited at `/library/<song-id>`.
2. The page fetches `id`, `title`, `artist`, `original_key`, and `content` from the `songs` table using `createClient()` from `src/services/supabase/server.ts` (the `@supabase/ssr` server client). No other Supabase client is used for server-side data fetching.
3. Unauthenticated users visiting `/library/<id>` are redirected to `/login` (matching the Library page pattern). The auth check uses `supabase.auth.getUser()`.
4. If the song `id` is not found (PGRST116 error or `data === null`), the page renders a user-friendly "Song not found" message (not a raw error or blank page). No redirect is performed for not-found — render the error state inline.
5. A `preProcessChords(content: string): ProcessedLine[]` function is added to `src/utils/musicLogic.ts` and exported. It parses the raw `content` string line-by-line and classifies each line as one of: `'header'` (bracket-wrapped section label, e.g. `[VERSE]`), `'chord'` (a chord line per the existing `isChordLine` heuristic), or `'lyric'` (all other non-empty lines). Empty lines are classified as `'blank'`.
6. The `ProcessedLine` type (exported from `src/utils/musicLogic.ts`) has the shape: `{ type: 'header' | 'chord' | 'lyric' | 'blank'; raw: string; tokens?: ChordToken[] }`. For `'chord'` lines, `tokens` is an array of `ChordToken` objects representing each whitespace-delimited token with its original chord value (or null if not a chord token). `ChordToken` is also exported.
7. For chord-line tokens that are chords, `preProcessChords` preserves the original chord value for SSR annotation. The SSR renderer wraps each chord token in `<span class="chord-item" data-original-chord="<value>">` so client-side transposition can target it by `data-original-chord`.
8. Section headers (lines matching `/^\[.+\]$/` — a line containing only a bracket-wrapped label) are rendered using the existing `.section-title` CSS class. No new CSS class is created for this purpose. The class already applies `--brand-brown` in light mode and `--brand-tan` in dark mode, satisfying WCAG AA contrast.
9. The SSR chord sheet output uses the `.chord-display` CSS class (already defined in `src/styles/globals.css`) for the container, ensuring `font-family: var(--font-mono)` (JetBrains Mono) and `white-space: pre-wrap` are applied. No inline styles override these values.
10. A `useTranspose` hook is created at `src/hooks/useTranspose.ts`. Its signature is: `useTranspose(originalKey: string): { semitoneOffset: number; displayKey: string; increment: () => void; decrement: () => void; setTargetKey: (key: string) => void; reset: () => void }`. The hook always initializes with `semitoneOffset = 0` and `displayKey = originalKey`.
11. `useTranspose` calculates `displayKey` as the NOTES entry at index `(rootToIndex(originalKey) + semitoneOffset + 12) % 12` from `src/utils/musicLogic.ts`. It never stores the key as a raw string offset — it always derives `displayKey` from `semitoneOffset + originalKey`. `setTargetKey` accepts a key string from the NOTES array and computes `semitoneOffset` via `getSemitoneOffset(originalKey, targetKey)`.
12. A `ChordSheetClient` component is created at `src/components/SongViewer/ChordSheetClient.tsx` with `'use client'` directive. It accepts props: `{ processedLines: ProcessedLine[]; originalKey: string }`. It renders the chord sheet using the `processedLines` data (passed from the Server Component — no client-side Supabase call).
13. `ChordSheetClient` uses `useTranspose` internally. On mount and whenever `semitoneOffset` changes, it updates the `innerText` of all `.chord-item` elements within its container ref by reading their `data-original-chord` attribute and calling `shiftChord(originalChord, semitoneOffset)` from `src/utils/musicLogic.ts`. The DOM mutation approach is used (not re-rendering React nodes) to avoid hydration conflicts.
14. `ChordSheetClient` renders a transposition control bar above the chord sheet containing: (a) a `<select>` dropdown showing all 12 chromatic keys from `NOTES` (exported from `src/utils/musicLogic.ts`), with the current `displayKey` selected, wired to `setTargetKey`; and (b) a `-1` button wired to `decrement` and a `+1` button wired to `increment`. The control bar is styled with Artisan palette classes (no inline styles, no hardcoded hex values).
15. The transposition control bar and all interactive elements meet WCAG AA contrast requirements. Specifically: button and label text uses `text-brand-espresso` on `bg-brand-cream` backgrounds in light mode, and appropriate dark-mode variants.
16. The `src/app/library/[id]/page.tsx` Server Component calls `preProcessChords(song.content)` and passes the result as `processedLines` prop to `ChordSheetClient`. The Server Component renders the page shell (title, artist, key badge) as pure Server Component JSX; the chord sheet interactive area is the `ChordSheetClient` island.
17. The song title is rendered in an `<h1>` using `font-extrabold text-brand-espresso` styling (matching the Library page heading pattern). The artist name and original key badge follow the same typographic pattern as the Library list rows.
18. The implementation creates no new Supabase queries inside client components. All data fetching is done in the Server Component page.
19. All new TypeScript is strictly typed — no `any` types. `ProcessedLine`, `ChordToken`, and the `useTranspose` return type are all explicitly typed and exported.
20. The feature branch is named `feature/TASK-011-song-viewer-hybrid-renderer` and branched from `develop`.

## Out of Scope

- Setlist `performance_key` integration — `useTranspose` always starts at offset 0 (`original_key`). Setlist context is a future task.
- Edit functionality for the song viewer — no Edit button or form in this task (Edit is already accessible from the Library list for music_directors).
- Realtime collaboration or multi-user transposition sync.
- Pagination of chord sheet content.
- Audio playback or metronome features.
- Any new Server Actions or database mutations (this is read-only).
- Creating a new CSS class for section headers — the existing `.section-title` class must be reused.

## Fallback Behaviors

- **Song not found (PGRST116 / null data):** The page renders inline: a centered message "Song not found." in `text-brand-brown` on `bg-brand-cream`, with a back link to `/library`. No redirect, no raw error thrown.
- **Supabase fetch error (non-404):** Render inline: "Unable to load song. Please try again." in the same styling. Do not expose the raw Supabase error string to the UI.
- **Unauthenticated user:** `redirect('/login')` — matching the Library page pattern.

## Resolved Ambiguities

- **`lyrics` field name** → The DB column is `content` (type: text). All code uses `content`. The task description's use of "lyrics" referred to this field. Source: `src/types/supabase.ts`, `supabase/migrations/20260415000001_create_songs_table.sql`.
- **Header format** → Lines matching `/^\[.+\]$/` (entire line is a bracket-wrapped label) are classified as `'header'`. Inline brackets within lyric lines are not treated as headers. Source: inferred from chord sheet format convention.
- **`dangerouslySetInnerHTML` XSS risk** → The SSR output is constructed by the `preProcessChords` utility from stored DB content (not raw user HTTP input at render time). However, the content was created by a music_director via a Server Action. To prevent stored XSS, chord token values and header text must be HTML-escaped before insertion into `data-original-chord` attributes and `innerText`. Use React's default JSX escaping for all rendered text. The `data-original-chord` attribute value must be set via React prop (which escapes it automatically), not via raw HTML string injection.
- **Route access guard** → Per-page redirect using `supabase.auth.getUser()` + `redirect('/login')`, matching the existing Library page pattern. Middleware may also run but the page-level guard is the canonical check.
- **Page route scope** → Confirmed in scope: `src/app/library/[id]/page.tsx` must be created. Source: user answer Q1.
- **Transposition UI** → Key selector dropdown (12 chromatic keys) + ±1 semitone stepper. Source: user answer Q2.
- **Performance key initialization** → Always start at offset 0 (`original_key`). Setlist integration is out of scope. Source: user answer Q3.
- **Header color** → Use existing `.section-title` CSS class (brown light / tan dark). Do not override or create a new class. Source: user answer Q4 + coding-guidelines.md WCAG AA flag.

## Open Questions

- None.
