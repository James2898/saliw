# Context Bundle — Pipe-Delimited Chord Chart Detection Bug Fix (TASK-011)

> **Updated:** 2026-04-16 — Appended bug-fix context for pipe-delimited chord chart detection.

---

# Original Context Bundle — Hybrid Rendering Engine (SongViewer)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/utils/musicLogic.ts` | Contains `chordRegex`, `shiftChord`, `getSemitoneOffset`, `isChordLine`, `NOTES` — all reusable for preProcessChords and useTranspose |
| `src/types/supabase.ts` | `DbSong` type defines `content` (not `lyrics`), `original_key`, `title`, `id` — field name mismatch with task description |
| `supabase/migrations/20260415000001_create_songs_table.sql` | Confirms songs table schema; SELECT policy: `auth.role() = 'authenticated'` (no public access — auth required) |
| `supabase/migrations/20260415000000_create_profiles_table.sql` | `is_music_director()` function; profiles RLS; column-level REVOKE on role/email |
| `src/services/supabase/server.ts` | `createClient()` using `@supabase/ssr` — the only approved server-side Supabase client |
| `src/services/supabase/client.ts` | `createClient()` browser version using `@supabase/ssr` — for Client Components if needed |
| `src/app/actions/songActions.ts` | Pattern for Supabase server queries, auth check, RLS error handling (code 42501, PGRST116) |
| `src/app/library/page.tsx` | SSR data-fetching pattern: auth redirect, `createClient()`, `.from('songs').select(...)` — direct reuse model |
| `src/styles/globals.css` | `.chord-item`, `.section-title`, `.chord-display`, `.main-card` — all pre-defined; CSS variables `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-cream`, `--brand-darker` all confirmed defined |
| `src/components/server/card.tsx` | `Card` server component with `main-card` class — reuse for SongViewer shell |
| `src/components/client/SearchBar.tsx` | Pattern for Client Component with router interaction — follow this structure for useTranspose wrapper |
| `docs/coding-guidelines.md` | Artisan palette rules, hydration mismatch warning, chordRegex mandate, WCAG AA contrast flag |

## Reuse Candidates

- `src/utils/musicLogic.ts` — `chordRegex`, `shiftChord`, `getSemitoneOffset`, `isChordLine` are all directly reusable. `preProcessChords` is a new export to add here (not in a component).
- `src/services/supabase/server.ts` — `createClient()` must be used for all SSR data fetching in the SongViewer Server Component.
- `src/components/server/card.tsx` — `Card` component with `main-card` CSS class can wrap the SongViewer content shell.
- `src/app/library/page.tsx` — auth redirect pattern + Supabase `.select()` query pattern is the exact model for the SongViewer page's data fetch.
- CSS classes already defined in `src/styles/globals.css`: `.chord-item`, `.chord-display`, `.section-title` — do NOT redefine these inline.

## Patterns to Follow

- **SSR Data Fetching:** See `src/app/library/page.tsx` — `await createClient()` then `.from('songs').select(...)` inside an `async` Server Component. Redirect to `/login` if `!user`.
- **Client Component Structure:** See `src/components/client/SearchBar.tsx` — `'use client'` at top, minimal props, no Supabase calls, named export default.
- **Server Action Error Handling:** See `src/app/actions/songActions.ts` — try/catch wrapping all Supabase calls; map error codes 42501 and PGRST116 to user-friendly messages.
- **Artisan Styling:** Use Tailwind utility classes `text-brand-espresso`, `bg-brand-cream`, `border-brand-brown/20`, `font-mono` etc. Use `var(--brand-tan)` for arbitrary CSS values.

## Critical Schema Finding

The task description refers to a `lyrics` field. **This field does not exist.** The songs table column is named `content` (type: `text`). `DbSong.content` stores the combined chord sheet (chords interleaved with lyrics). All downstream agents must use `content`, not `lyrics`.

## Anti-Patterns Flagged

- `docs/coding-guidelines.md` Validator Checklist: `--brand-tan` text (`#BC8E5C`) on `--brand-cream` background (`#FDF8F3`) is a **flagged low-contrast pair**. The `.section-title` class currently uses `color: var(--brand-brown)` in light mode (correct) and `color: var(--brand-tan)` in dark mode only. Confirm the task's "brand-tan for headers" instruction applies only to dark mode, or request WCAG AA verification before implementation.
- `src/hooks/.gitkeep` — hooks directory is empty. `useTranspose` does not exist yet and must be created.
- `src/components/SongViewer/` — directory does not exist yet and must be created.
- `src/app/library/page.tsx` line 56: comment says "content (lyrics/chords) is intentionally excluded" — the Library list page deliberately omits `content`. The SongViewer page MUST include `content` in its select.

## MEMORY.md Notes

- N/A — MEMORY.md does not exist yet for this project.

---

# Bug-Fix Context Bundle — Pipe-Delimited Chord Chart Detection

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/utils/musicLogic.ts` | Primary fix target — `preProcessChords`, `isChordLine`, `chordRegex`, `ChordToken`, `ProcessedLine` |
| `src/components/SongViewer/ChordSheetClient.tsx` | Consumes `ProcessedLine[]`; renders `chord-item` spans via `data-original-chord`; transposition uses `useEffect` DOM mutation — no change needed here if fix emits `type: 'chord'` |
| `src/app/library/[id]/page.tsx` | Calls `preProcessChords(song.content)` — no changes needed |
| `src/app/actions/songActions.ts` | Imports `musicLogic.ts` — must not be broken by the fix |
| `tasks/TASK-011.md` | Resolution section must be updated |
| `CHANGELOG.md` | Needs a new [Unreleased] entry |

## Root Cause

The broken input format:
```
[Intro]| F | C | G | Am7 || F | C | G | Am7 |
```

Line classification breakdown:
1. `HEADER_REGEX` (`/^\[.+\]$/`) does NOT match — content continues after `]`. Correctly falls through.
2. `isChordLine` splits on `\s+` producing tokens: `[Intro]|`, `F`, `|`, `C`, `|`, `G`, `|`, `Am7`, `||`, `F`, `|`, `C`, `|`, `G`, `|`, `Am7`, `|` (17 tokens). Only 8 are valid chords; 9 are `[Intro]|`, `|`, `||`, `|` etc. Ratio = 8/17 ≈ 47% — FAILS the `> 0.5` threshold. The line is classified as a lyric.
3. Even if ratio passed 50%, the chord tokens between pipes ARE matched by `anchoredChordRegex` correctly — so the tokenizer works; only the line classifier is wrong.

**Fix strategy:** Before the `isChordLine` call, detect pipe-delimited chart lines with a lightweight regex (e.g. `/\|/` present in line AND line contains chord-like tokens between pipes). Strip/treat pipe characters as non-chord tokens, classify the line as `type: 'chord'`, and run the existing tokenizer on the cleaned segments. Pipe characters are emitted as `{ isChord: false }` tokens so the visual bar structure is preserved.

**Alternative fix strategy (simpler):** Add pipe-chart detection as a new step (priority 2.5, before `isChordLine`). Use a regex like `/^.*\|.*\|/` to detect pipe-chart lines. For such lines, split on `|` to get segments, then further split each segment on `\s+`, testing each non-empty token against `anchoredChordRegex`. Emit pipe characters as non-chord tokens. The resulting tokens array goes into `type: 'chord'` — no client component changes needed.

## Reuse Candidates

- `anchoredChordRegex` — already constructed in `preProcessChords` above the `lines.map()`. Reuse it for pipe-chart token testing — do NOT construct it again inside the map.
- `ChordToken` shape `{ text, isChord, originalChord }` — emit pipe-chart tokens in this exact shape.
- `type: 'chord'` ProcessedLine variant — reuse to avoid changes to `ChordSheetClient.tsx`.

## Patterns to Follow

- **Regex hoisting:** All `new RegExp(...)` calls must be hoisted above the `lines.map()` — see existing `anchoredChordRegex` pattern. Do NOT construct regex inside the loop body.
- **Token splitting:** Split on capturing `(\s+)` to preserve whitespace tokens for alignment — follow the existing pattern on line 208 of `musicLogic.ts`.
- **Non-chord fallback:** Any segment that fails `anchoredChordRegex` (e.g. `|`, `||`, `[Intro]`) is emitted as `{ text: segment, isChord: false, originalChord: null }`.

## Anti-Patterns to Avoid

- Do NOT construct regex inside `.map()` or `.forEach()` — validator finding #1 on the original TASK-011 implementation.
- Do NOT add a `type: 'chart'` variant to `ProcessedLine` — would require updating `ChordSheetClient.tsx` and re-running the full render path. Use `type: 'chord'` instead.
- Do NOT modify `chordRegex` itself — the current regex correctly matches `F`, `C`, `G`, `Am7` etc. The problem is the line classifier, not the chord matcher.
- Do NOT touch `isChordLine` — it is correct for standard chord lines. Pipe-chart lines need a separate early-exit branch in `preProcessChords`.

## MEMORY.md Notes

- N/A
