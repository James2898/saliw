# Plan: Auto-generate chord drafts for English Hymnal songs from Open Hymnal Project ABC sources

> **Status:** DRAFT — for review on a different machine before kickoff.
> **Author:** drafted with Claude Code on 2026-05-03 after the TASK-036 import landed.
> **Depends on:** TASK-036 (PR #71) — 173 English Hymnal songs already in the `songs` table, mostly with `original_key='C'` and lyrics-only `content`.

---

## 1. Context

After TASK-036 the user has 173 English Hymnal hymns in Saliw, almost all of them lyrics-only. Adding chords manually would take ~14 hours of focused musician work. The user is solo and cannot scale it. The Tagalog hymnal counterpart isn't in Saliw yet, Ultimate Guitar scraping is off the table, and the only physical resource is a hard-copy hymnal book.

A research pass (2026-05-03) found that **The Open Hymnal Project** (openhymnal.org) publishes its hymns as **ABC Plus notation source files** — public domain, plain text, machine-readable. A GitHub mirror exists at [mzealey/openhymnal](https://github.com/mzealey/openhymnal). ABC files contain the actual notes, key signature, and lyrics; harmonic analysis software (music21) can derive chord-letter symbols from the notes.

This plan automates **draft chord generation** for the English hymns. It does not produce musician-approved final content — it produces editable starting points that the user reviews in an in-app chord editor (separate plan, not in scope here).

### Why this is worth doing

- ABC Plus → MusicXML → chord letters is a real, working pipeline (music21 has been used this way for years in research and music-information-retrieval projects).
- ~80% of the user's 173 hymns are popular traditional hymns — high overlap with Open Hymnal's corpus.
- Output quality on diatonic hymns is high enough that the user is *editing*, not *creating from scratch*. Realistic per-hymn audit time drops from 5–10 min to 1–2 min.

### Why this is NOT a silver bullet

- Title matching is fuzzy; some hymns won't match (estimated 20–40 misses out of 173).
- Chord placement (which beat the chord lands on) is approximate, not perfect.
- Passing tones can mislead music21's chord inference.
- Output requires musician review before being marked "approved." This plan does not skip that step — it just makes the review faster.

---

## 2. Open questions (must be resolved before kickoff)

These need answers from the user. They are blocking — do not start the implementation chain until each is decided.

1. **Python environment available on the target machine?** The pipeline is Python-only (music21 has no JS port). Confirm Python 3.10+ and pip are available, or willingness to install.
2. **Build the in-app chord editor first, or in parallel?** The editor is required to actually use the pipeline output. Recommended: editor first (it's smaller, immediately useful, and unblocks any data source). This plan **assumes** editor is built first or in parallel — flag if user disagrees.
3. **Add `chords_approved_at TIMESTAMPTZ` column to `songs`?** Required to distinguish auto-generated drafts from musician-verified content. Without it, every reviewer (including the user themselves later) will be unsure which hymns have been audited. Strongly recommended yes.
4. **Output column: overwrite `content` or use a new `content_draft` column?** Overwriting `content` is destructive — if pipeline output is wrong, the original lyrics-only content is gone. Safer: write drafts to a new `content_draft` column and only promote to `content` on user approval. **Recommended:** new column.
5. **What to do for hymns the pipeline can't match?** Options: (a) leave them as-is, the user enters chords manually; (b) flag them with a `needs_chords` boolean for later prioritization. Recommended: (b).
6. **Time budget?** Honest estimate is 1.5–2 days of focused dev for the pipeline, plus the editor build (~1 evening). Confirm willingness.

---

## 3. Pipeline architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Open Hymnal Project ABC archive (downloaded once)          │
│  ~300 hymns × .abc files                                    │
└────────────────────────────┬────────────────────────────────┘
                             │ unzip
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  abc_files/  (one .abc per hymn)                            │
└────────────────────────────┬────────────────────────────────┘
                             │ abc2xml.py (or python-abc) → MusicXML
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  musicxml_files/  (one .musicxml per hymn)                  │
└────────────────────────────┬────────────────────────────────┘
                             │ music21 ingest
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  For each hymn:                                              │
│   1. Parse score → music21.stream.Score                      │
│   2. score.chordify() → vertical chords per beat             │
│   3. roman.romanNumeralFromChord() → chord letter            │
│   4. Extract lyrics aligned to notes (ABC `w:` lines)        │
│   5. Walk measures, emit chord-line + lyric-line pairs       │
│   6. Detect [VERSE]/[CHORUS] from ABC `P:` part markers      │
│   7. Extract original_key from ABC `K:` header               │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  drafts.jsonl  (one record per matched hymn)                 │
│  { saliw_song_id, title, original_key, content_draft }       │
└────────────────────────────┬────────────────────────────────┘
                             │ Supabase service-role upsert
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  songs.content_draft populated; chords_approved_at = NULL    │
└─────────────────────────────────────────────────────────────┘
```

### Title matching strategy

For each ABC file:
1. Read the `T:` (title) header and any `T:` continuation lines.
2. Normalize: lowercase, strip punctuation, collapse whitespace, drop common prefixes ("The ", "A ").
3. Compare against the 173 Saliw `songs.title` values using:
   - Exact match → confident match
   - Levenshtein distance ≤ 3 → high-confidence match
   - Token-set ratio ≥ 0.85 (using `rapidfuzz`) → medium-confidence match
   - Below threshold → no match, log to `unmatched.csv` for manual review
4. Output a `matches.csv` with columns: `abc_file, abc_title, saliw_song_id, saliw_title, match_method, confidence`.
5. **User reviews `matches.csv` before any DB write** (--dry-run mode prints to stdout instead of writing).

---

## 4. Chord generation logic (the music21 part)

This is the riskiest section. Honest assessment of accuracy expectations per category:

| Hymn type | Estimated accuracy | Notes |
|---|---|---|
| Pure diatonic (I-IV-V-vi-ii) | 85–95% | "Joy to the World", "Holy Holy Holy" — music21 nails these |
| Mostly diatonic with secondary dominants | 70–85% | "Crown Him with Many Crowns" — V/V often confused with bII |
| Modulating hymns | 50–70% | "Be Thou My Vision" — music21 follows the new key but may emit awkward labels |
| Modal hymns (rare in Western hymnals) | 40–60% | Most hymns aren't modal, but Plainsong settings exist |

### Rules to apply

1. **Chord-per-beat or chord-per-bar?** Default to **chord-per-bar** for hymns. Chord-per-beat over-segments and produces noise. Use `score.chordify().chordifyByMeasure()` or equivalent grouping.
2. **Inversion suppression.** Output root-position chords by default (`G` not `G/B`) — hymnal accompaniments often imply inversions but musicians prefer simple chord symbols. Make this a flag (`--include-inversions`) if the user wants them.
3. **Voice-leading filter.** music21's chord output sometimes labels passing tones as full chords. Filter: if a chord lasts < 1 beat AND it's adjacent to a chord that contains all its notes minus one, treat it as a passing tone and merge.
4. **Key extraction.** Use the ABC `K:` header (e.g., `K:D` → original_key=D). Validate against Saliw's allowed 12-note set. If ABC uses a flat key not in Saliw's set (e.g., "Eb"), map to the enharmonic equivalent that *is* in the set (Saliw uses `Bb`, so `Eb` would need a decision — flag in the matches.csv).
5. **Lyric alignment.** ABC stores lyrics as `w:` lines below the music with hyphen-syllable mapping (e.g., `w: Joy to the world, the Lord is come`). Walk the score notes in order, attach syllables, then emit `chord` + `\n` + `lyric line` pairs grouped by phrase (every 4 bars or until a rest).

### What we are NOT trying to do

- Generate chord substitutions or jazz reharmonizations.
- Handle key changes mid-song with full musicological correctness — flag them, let the user fix.
- Match the exact chord choices a particular musician would prefer — output is canonical, not personal.

---

## 5. Schema changes

### New migration

`supabase/migrations/<timestamp>_songs_chord_drafts.sql`:

```sql
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS content_draft text,
  ADD COLUMN IF NOT EXISTS chords_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_chords boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.songs.content_draft IS
  'Auto-generated chord-over-lyric draft from openhymnal pipeline. Promoted to content on musician approval.';
COMMENT ON COLUMN public.songs.chords_approved_at IS
  'NULL when content is auto-generated or unverified; set to now() when a music_director approves the chord chart.';
COMMENT ON COLUMN public.songs.needs_chords IS
  'True for hymns where the pipeline could not produce a chord draft and manual entry is required.';
```

**RLS impact:** none. New columns inherit existing policies (`songs_select_*`, `songs_modify_music_director_only`).

**Action audit per BUG-016:** `createSong`, `updateSong`, `cloneSong` (if exists) must be checked to confirm they don't reject NULL on the new columns. The new columns are nullable / have defaults, so no breakage expected — but verify in code review.

### What we are NOT changing

- The existing `content` column stays as the "official" chord chart. The pipeline never writes to it directly.
- No changes to RLS policies.
- No new tables.

---

## 6. Repo structure

The pipeline is a Python project, separate from the Saliw Next.js app. Place under `tools/openhymnal-chord-pipeline/` to keep it out of the main TypeScript build.

```
tools/openhymnal-chord-pipeline/
├── README.md                       # how to run, env requirements
├── pyproject.toml                  # uv or poetry config; pinned music21, abc2xml, rapidfuzz, supabase-py
├── src/
│   ├── fetch_archive.py            # download + unzip Open Hymnal ABC archive
│   ├── convert_abc_to_xml.py       # batch ABC → MusicXML
│   ├── match_titles.py             # fuzzy match ABC titles to Saliw song IDs
│   ├── generate_chords.py          # music21 → chord-over-lyric format
│   ├── format_saliw_content.py     # emit Saliw chord-sheet text
│   ├── upsert_drafts.py            # service-role write to songs.content_draft
│   └── main.py                     # CLI entrypoint with subcommands
├── tests/
│   ├── fixtures/                   # 5 sample ABC files for unit tests
│   ├── test_title_matcher.py
│   ├── test_chord_generator.py
│   └── test_format_output.py
└── output/                         # gitignored — matches.csv, drafts.jsonl, unmatched.csv
```

Run order (CLI subcommands):

```
uv run main.py fetch              # one-time: download + unzip archive
uv run main.py match              # write matches.csv; user reviews
uv run main.py generate           # ABC → MusicXML → chord drafts → drafts.jsonl
uv run main.py upsert --dry-run   # print what would be written
uv run main.py upsert             # write to Supabase songs.content_draft
```

Each step is idempotent and re-runnable.

---

## 7. Acceptance criteria (draft)

These will be refined by `@requirements-engineer` when the chain is invoked. Listing the rough shape now so reviewers can sanity-check scope.

| # | Criterion |
|---|---|
| AC1 | Migration adds `content_draft`, `chords_approved_at`, `needs_chords` columns; existing RLS policies untouched |
| AC2 | `fetch_archive.py` downloads the latest Open Hymnal ABC archive and unzips it idempotently |
| AC3 | `match_titles.py` produces `matches.csv` with exact + Levenshtein + token-set fuzzy matching against the 173 English Hymnal songs |
| AC4 | `generate_chords.py` converts 5 sample ABC files (fixtures) to chord-over-lyric format passing snapshot tests |
| AC5 | Generated content always uses `[VERSE N]` / `[CHORUS]` / `[REFRAIN]` section markers consistent with Saliw format |
| AC6 | `original_key` extraction from ABC `K:` header is validated against Saliw's 12-note allowed set; enharmonic remapping documented |
| AC7 | `upsert_drafts.py --dry-run` prints first 3 records without DB contact; without `--dry-run` it upserts via `service_role` |
| AC8 | All un-matched hymns get `needs_chords = true` set on their existing rows |
| AC9 | Pipeline does NOT modify `songs.content` for any row (only `content_draft`, `original_key`, `needs_chords`) |
| AC10 | Re-running the pipeline is idempotent — no duplicate drafts, `chords_approved_at` never reset to NULL by an automated run |
| AC11 | README documents the full pipeline run order, env variables, and quality caveats |
| AC12 | Sample audit: take 10 random matched hymns; user (or musician) reviews chord output and reports % that are "musically reasonable" — target ≥70% to consider the pipeline successful |

---

## 8. Risks & open issues

1. **Python ↔ TypeScript split.** The pipeline lives in Python, the app is TypeScript. Long-term, this is two ecosystems to maintain. Mitigation: pipeline is a one-shot tool, run when needed; not part of the app build.
2. **License audit.** Open Hymnal Project content is described as freely distributable. Need to confirm the specific license allows derivative works (chord transcriptions). Their FAQ should clarify; if ambiguous, ask them via the project's listed contact.
3. **Music21 install footprint.** Music21 has substantial dependencies (matplotlib, numpy). Use `uv` or a venv; do not contaminate global Python.
4. **abc2xml availability.** The `abc2xml` tool is BSD-licensed Python; confirm it handles Open Hymnal's ABC Plus dialect (which has extensions over standard ABC). Fallback: use `python-abc` library directly with music21's ABC parser.
5. **Hymn-numbering mismatch with Saliw IDs.** Saliw `songs` are indexed by UUID, not hymn number. The pipeline matches on title; if titles drift, manual mapping is needed. Mitigation: `matches.csv` is reviewed before write.
6. **The pipeline "works" definition.** AC12 sets a 70% reasonable-output target. Below that, the pipeline is more trouble than it's worth. Decide upfront whether to ship at 70%, 80%, 90% — and what to do if accuracy is below 70% on the user's specific hymnal.
7. **Re-running after schema migration.** If a music_director has already approved (`chords_approved_at IS NOT NULL`) chord content for a song, the upsert MUST NOT overwrite it. Pipeline upsert logic needs an explicit `WHERE chords_approved_at IS NULL` guard.

---

## 9. Suggested execution flow when kickoff happens

1. **Pre-flight on the target machine:**
   - Confirm Python 3.10+ + uv.
   - Confirm the user has built (or scheduled) the in-app chord editor — the pipeline is useless without a way to review drafts.
   - Resolve all open questions in §2.

2. **Route through `/project-manager` as Tier 2** (new tooling, schema change, external data source — qualifies as Tier 2):
   - `@codebase-explorer` — confirm schema, find the existing `songs` Server Actions, locate any Python tooling conventions in repo (likely none).
   - `@requirements-engineer` — answer the open questions and convert §7 into testable acceptance criteria.
   - `@integration-contract` — even though the pipeline is Python, it writes to Supabase; the contract step locks the upsert payload schema and confirms the `WHERE chords_approved_at IS NULL` guard.
   - `@task-logger` — produce TASK-NNN.md.
   - `@fullstack-developer` — implement (Python skill required).
   - `@release-manager` + `@validator-agent` — usual gates.

3. **Post-merge audit:**
   - Run pipeline once against current `songs` table.
   - Manually review 10 random outputs.
   - If quality ≥ 70%, proceed with full audit in the editor over weeks/months.
   - If quality < 70%, document why and decide whether to tune music21 parameters or abandon.

---

## 10. What I am NOT planning here

- The in-app chord editor (separate plan).
- Importing additional hymnals (Tagalog, Cebuano, etc.) — same pattern, different sources.
- Real-time chord generation as users add new songs — out of scope; this is a one-shot batch tool.
- Improving music21's chord-inference accuracy at the library level — out of scope.
- Building a UI for reviewing `matches.csv` — CSV review is fine for one-time use.
- Solving the BUG-016 follow-up (`createSong` 23505 handling) — separate task.

---

## 11. References

- Open Hymnal Project: http://openhymnal.org/
- GitHub mirror (data + build scripts): https://github.com/mzealey/openhymnal
- Open Hymnal 2014 ABC archive: http://openhymnal.org/OpenHymnal2014.06.abc
- music21 documentation: https://web.mit.edu/music21/
- abc2xml converter: http://abcplus.sourceforge.net/abc2xml.html
- ABC notation standard: https://abcnotation.com/wiki/abc:standard:v2.1
- Related Saliw work: TASK-036 (PR #71) — the import this plan builds on
- Memory entry (relevant): BUG-016 (UNIQUE INDEX vs Server Action error mapping)

---

**Next action when you pick this up on the other machine:**

1. Read this file in full.
2. Answer the six open questions in §2.
3. If answers are settled and Python is available, route through `/project-manager` with: "Implement the openhymnal chord-import pipeline per `plans/openhymnal-chord-import.md`. Tier 2."
4. If editor isn't built yet, route the editor first as a separate Tier 1 task — don't start this until the editor exists.
