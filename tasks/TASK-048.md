# TASK-048 — Extend Setlist Search to Include Song Title Matching

- **Tier:** 1
- **Date Created:** 2026-06-01
- **Status:** In Progress

---

## Feature Summary

The setlists list page (`/setlists`) currently filters setlists by name using case-insensitive `ilike` matching. This feature extends the search to also match setlists whose song list contains at least one song whose title matches the query. The match is OR-based: a setlist is returned if its name matches OR any of its song titles match. The existing alphabet filter continues to apply only to setlist names, not to song titles. Partial word matching (prefix/substring) is supported via `ilike` with `%query%` wrapping, consistent with the current name-search behavior.

---

## Acceptance Criteria

1. **AC-1 — OR match semantics:** When a user types a search query, the setlists list returns any setlist where the setlist name matches the query (case-insensitive, substring) OR any song title within that setlist matches the query (case-insensitive, substring). Both conditions use the same `%query%` ilike pattern already used for name search.

2. **AC-2 — Partial word matching:** Searching for a partial word (e.g. "Amaz") returns setlists containing songs with titles like "Amazing Grace". This is consistent with the existing name-search behavior (no change to matching semantics — same `%query%` ilike pattern).

3. **AC-3 — No duplicate setlists in results:** If a setlist matches both by name AND by song title, it appears only once in the results list. Deduplication must be enforced at the query level (e.g. via `distinct` or equivalent PostgREST technique) rather than in application code.

4. **AC-4 — Empty search shows all setlists:** When the search input is empty or cleared, all setlists are returned (no change from current behavior).

5. **AC-5 — Empty state message updated:** When a search query returns zero results, the empty-state message reads: "No setlists matching '[query]' in name or songs." This replaces any prior message that referenced name-only matching.

6. **AC-6 — No song-match highlighting:** When a setlist is returned because a song title matched (rather than the setlist name), the card UI does not highlight or annotate which song matched. The setlist card renders identically to a name-match result.

7. **AC-7 — Alphabet filter applies to setlist names only:** The existing `letter=` URL param filter continues to filter by the first letter of the setlist name only. It does NOT filter by the first letter of song titles. The alphabet filter and search query are applied independently; both can be active simultaneously (a setlist must satisfy both the letter filter on its name and the OR-search across name/song titles).

8. **AC-8 — Setlist cards render correctly for song-title matches:** Setlist cards returned via a song-title match display all existing card fields (setlist name, date, song count, song title list) without any regression to the existing card layout.

9. **AC-9 — No N+1 queries:** The extended search must not introduce an N+1 query pattern. Song titles must be fetched as part of the same Supabase queries that fetches setlists, using nested join/filter — not via a separate per-setlist query.

10. **AC-10 — Type safety:** The `setlist_songs` join is a one-to-many relationship from the setlist's perspective. The TypeScript type for the query result must declare the songs sub-array as an array type (e.g. `setlist_songs: { songs: { title: string } | null }[]`), not as a single object. This is the inverse of the BUG-017 many-to-one pattern already fixed in this file. The runtime shape must be verified against the actual PostgREST response before finalising the type declaration.

11. **AC-11 — No regression: existing name-only search still works:** When the search query matches only a setlist name (no song title match), the setlist is still returned. Existing behaviour is preserved.

12. **AC-12 — Server Component boundary preserved:** The search and filter logic remains in the Server Component (`src/app/setlists/page.tsx`). No Supabase query is moved to a Client Component as a result of this change.

13. **AC-13 — Dark mode:** If the empty-state message is rendered using any Tailwind named brand utility (e.g. `text-brand-espresso`), it must have an explicit `dark:` variant pair (e.g. `dark:text-brand-cream`). No new text/background color utilities may be added without their dark-mode counterpart.

---

## Out of Scope

- Per-match highlighting or annotation indicating which song caused a setlist to appear in results.
- Searching by artist name, song key, or any other song field beyond `title`.
- Extending the alphabet filter to cover song titles.
- Full-text search (FTS) or trigram indexing — ilike substring matching is sufficient for typical worship setlist sizes (5–10 songs per setlist).
- Pagination changes — the search extension does not change the existing pagination behaviour.
- Any changes to the setlist detail page (`/setlists/[id]`).
- Any changes to the song library page (`/library`).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/page.tsx` | Server Component where setlist search and filter logic lives; lines 51 (sanitization), 97-113 (current query), 212-254 (page component render); only file to modify |
| `src/app/library/page.tsx` | Reference for `.or()` pattern at line 99; provides example of PostgREST OR filter syntax |
| `docs/coding-guidelines.md` | Artisan palette and dark-mode variant requirements |

---

## Technical Schema

N/A — no API contract required for this task. Search extension is within the existing `setlist_songs` join shape.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-048/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-048/research.md` | Pending reconciliation questions + fallback behaviors |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before rendering any new UI text (dark-mode variants required for Artisan utilities).
- Read `docs/tech-stack.md` before choosing any utility library (if present in this project).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> Copied verbatim from codebase-explorer context and project MEMORY.md. These rules must not be re-read directly; trust this list.

- **BUG-011 — RLS policy widened to public without auditing all querying Server Actions:** If the `setlist_songs` or `songs` table RLS policies are modified to support public queries, ensure all Server Actions that read these tables are audited for unintended data exposure. Setlist title filtering must not leak song data that should be private.
- **BUG-017 — Anonymous arrow wrapper negates memoized callback stability:** The existing pattern in `src/app/setlists/page.tsx` correctly uses the one-to-many join shape `setlist_songs: { songs: { title: string } | null }[]`. Do not wrap `.map()` callbacks in inline arrow functions when extracting song titles; use extracted components or `.bind()` if staying inline.
- **Feedback — Run Prettier before committing:** Must run `npm run format` before every commit.

---

## Resolved Open Questions

> These reconciliation questions from `research.md` are answered based on codebase-explorer's implementation guidance.

- **Exact current empty-state message text:** The existing message wording is confirmed to live in `src/app/setlists/page.tsx` lines 212–254 (page component render section). The current text must be replaced with "No setlists matching '[query]' in name or songs." per AC-5.

- **Current Supabase query shape — setlist_songs join:** The select string is currently `"id, name, date, leader_id, is_public, setlist_songs(order_index, songs(title))"` at line 97-113. The `setlist_songs` join and nested `songs(title)` are already present for the card display; no new join is needed. The song-title filter will be applied via PostgREST nested filter on this existing join.

- **PostgREST filter mechanism for OR-filtering:** The Supabase JS client version in this project supports two-query union pattern: (1) name-matching arm via existing `.ilike("name", ...)` query; (2) song-matching arm via `.from("songs").select("id").ilike("title", ...)` → `.from("setlist_songs").select("setlist_id").in("song_id", matchingSongIds)` → union the `setlist_id` arrays → final fetch via `.in("id", unionIds)`. Reference: `src/app/library/page.tsx` line 99 demonstrates existing `.or()` usage; for complex nested filtering, the two-query union is more reliable than PostgREST nested OR.

- **SetlistRow type shape:** Type is defined at line 23. The type must declare `setlist_songs` as an array: `setlist_songs: { order_index: number; songs: { title: string } | null }[]`. This matches the one-to-many relationship already enforced by the current join.

- **setlist_songs FK structure:** The junction table `setlist_songs` has two FKs: `setlist_id → setlist.id` and `song_id → songs.id`. The join path is `setlist_songs.songs.title` (two hops: setlist_songs → songs via song_id FK, then songs.title field). No denormalisation; standard relational structure.

---

## Unresolved Pending Reconciliation

None. All reconciliation questions from `research.md` have been resolved.

---

## Amendments (from Context Bundle)

- **AM-1:** AC-5 requires the empty-state message to be updated from current wording "No setlists match your search." (line 146 in `src/app/setlists/page.tsx`) to "No setlists matching '[query]' in name or songs." This change must accompany the song-title search implementation. The message currently references name-only matching; it must be reworded to reflect the extended OR semantics.

---

## Contradictions Checked

- **AC-1 (OR match semantics):** ✅ No conflict. Two-query union approach correctly implements OR semantics.
- **AC-2 (Partial word matching):** ✅ No conflict. Both arms use `ilike` with `%query%` wrapping — consistent.
- **AC-3 (No duplicate setlists):** ✅ No conflict. Union deduplication via `[...new Set([...])]` per implementation approach.
- **AC-4 (Empty search shows all):** ✅ No conflict. Song-matching arm activates only when `q` is set (line 106).
- **AC-5 (Empty state message):** ⚠️ **AMENDED**. Current message (line 146) is "No setlists match your search." — name-only wording. Must be updated to "No setlists matching '[query]' in name or songs." See AM-1.
- **AC-6 (No song-match highlighting):** ✅ No conflict. Card rendering shows all fields uniformly; no match-source annotation.
- **AC-7 (Alphabet filter names only):** ✅ No conflict. Letter filter applies to `name` column only (line 112).
- **AC-8 (Setlist cards render):** ✅ No conflict. All required fields present in SetlistRow type (line 26).
- **AC-9 (No N+1):** ✅ No conflict. Fixed two-query approach; no per-setlist loops.
- **AC-10 (Type safety):** ✅ No conflict. SetlistRow correctly declares `setlist_songs` as array of objects (line 26).
- **AC-11 (No regression):** ✅ No conflict. Name-only matches still included in union.
- **AC-12 (Server Component boundary):** ✅ No conflict. All logic in Server Component (lines 95–120).
- **AC-13 (Dark mode):** ✅ No conflict. New empty-state text uses `text-brand-brown dark:text-brand-tan` — correct pairing. Existing container background (`bg-[var(--brand-tan-alpha)]` at line 200) lacks dark: variant, but this is not a new utility added by this task.

---

## Implementation Approach (Two-Query Union)

**Why not `.or()` directly?** PostgREST `.or()` syntax works for simple parent-column ORs but is unreliable for OR-filtering with nested joins. The two-query union approach is explicit and matches Supabase JavaScript patterns used elsewhere in this codebase.

**Query structure:**

When `q` (search query) is set:

1. **Name-matching arm:** Use the existing `.ilike("name", `%${q}%`)` query on `setlists` table; select only `id`.
   
2. **Song-matching arm:** 
   - Query `songs` table: `.from("songs").select("id").ilike("title", `%${q}%`)`
   - Extract song IDs: `matchingSongIds = (songs ?? []).map(s => s.id)`
   - Query `setlist_songs`: `.from("setlist_songs").select("setlist_id").in("song_id", matchingSongIds)`
   - Extract setlist IDs: `songMatchSetlistIds = (setlist_songs ?? []).map(r => r.setlist_id)`

3. **Union and deduplicate:**
   ```typescript
   const nameMatchIds = (nameMatchData ?? []).map(s => s.id);
   const unionIds = [...new Set([...nameMatchIds, ...songMatchSetlistIds])];
   ```

4. **Final fetch:** Use `.in("id", unionIds)` with the full select string: `"id, name, date, leader_id, is_public, setlist_songs(order_index, songs(title))"`. Apply `.range()` for pagination using `unionIds.length` as the total count.

5. **Apply letter filter as AND condition:** If `letter=` param is set, apply `.ilike("name", `${letter}%`)` on the final `.in()` query, narrowing the union *after* deduplication.

6. **When `q` is empty:** Skip the whole union; use the existing single-query path unchanged.

**Key constraints:**
- The `q` sanitization at line 51 (removes `[(),%]` chars) must be applied to `q` before any ilike interpolation.
- `SetlistRow` type at line 23 must remain or be updated to match actual PostgREST response shape.
- Pagination count = `unionIds.length` when union is active.
- Empty `unionIds` → skip final fetch, return count=0 (render empty state).

---

## Resolution

- **Completed:** 2026-06-01
- **Branch:** feature/TASK-048-setlist-search-song-titles
- **Base branch:** main
- **Files changed:**
  - `src/app/setlists/page.tsx` — replaced single-query name filter with two-query union approach (name arm + song-title arm via songs → setlist_songs junction) when `q` is set; updated empty-state messages to reference "in name or songs"
- **Notes:** When `q` is set, the code runs up to three preliminary queries (name arm, songs arm, junction arm) before the final paginated fetch. When `q` is empty, the original single-query path is used unchanged. The `count` for pagination comes from `count: "exact"` on the final `.in("id", unionIds)` query, correctly reflecting how many union IDs pass the optional letter filter. No new TypeScript types were added — `SetlistRow` already declared `setlist_songs` as an array. Build and Prettier both passed cleanly.
