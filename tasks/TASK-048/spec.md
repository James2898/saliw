# Spec — Setlist Search: Include Song Title Matching

## Feature Summary

The setlists list page (`/setlists`) currently filters setlists by name using a case-insensitive `ilike` match on the `name` column. This feature extends the search to also match setlists whose song list contains at least one song whose title matches the query. The match is OR-based: a setlist is returned if its name matches OR any of its song titles match. The existing alphabet filter continues to apply only to setlist names, not to song titles. Partial word matching (prefix/substring) is supported via `ilike` with `%query%` wrapping, consistent with the current name-search behavior.

## Acceptance Criteria

1. **AC-1 — OR match semantics:** When a user types a search query, the setlists list returns any setlist where the setlist name matches the query (case-insensitive, substring) OR any song title within that setlist matches the query (case-insensitive, substring). Both conditions use the same `%query%` ilike pattern already used for name search.

2. **AC-2 — Partial word matching:** Searching for a partial word (e.g. "Amaz") returns setlists containing songs with titles like "Amazing Grace". This is consistent with the existing name-search behavior (no change to matching semantics — same `%query%` ilike pattern).

3. **AC-3 — No duplicate setlists in results:** If a setlist matches both by name AND by song title, it appears only once in the results list. Deduplication must be enforced at the query level (e.g. via `distinct` or equivalent PostgREST technique) rather than in application code.

4. **AC-4 — Empty search shows all setlists:** When the search input is empty or cleared, all setlists are returned (no change from current behavior).

5. **AC-5 — Empty state message updated:** When a search query returns zero results, the empty-state message reads: "No setlists matching '[query]' in name or songs." This replaces any prior message that referenced name-only matching.

6. **AC-6 — No song-match highlighting:** When a setlist is returned because a song title matched (rather than the setlist name), the card UI does not highlight or annotate which song matched. The setlist card renders identically to a name-match result. (Scope is limited to returning the correct results; per-match highlighting is out of scope for this task.)

7. **AC-7 — Alphabet filter applies to setlist names only:** The existing `letter=` URL param filter continues to filter by the first letter of the setlist name only. It does NOT filter by the first letter of song titles. The alphabet filter and search query are applied independently; both can be active simultaneously (a setlist must satisfy both the letter filter on its name and the OR-search across name/song titles).

8. **AC-8 — Setlist cards render correctly for song-title matches:** Setlist cards returned via a song-title match display all existing card fields (setlist name, date, song count, song title list) without any regression to the existing card layout.

9. **AC-9 — Performance: query stays a single round trip:** The extended search must not introduce an N+1 query pattern. Song titles must be fetched as part of the same Supabase query that fetches setlists, using a nested join/filter — not via a separate per-setlist query.

10. **AC-10 — Type safety: setlist_songs join returns an array:** The `setlist_songs` join is a one-to-many relationship from the setlist's perspective (one setlist has many setlist_songs rows). The TypeScript type for the query result must declare the songs sub-array as an array type (e.g. `setlist_songs: { songs: { title: string } | null }[]`), not as a single object. This is the inverse of the BUG-017 many-to-one pattern already fixed in this file. The runtime shape must be verified against the actual PostgREST response before finalising the type declaration.

11. **AC-11 — No regression: existing name-only search still works:** When the search query matches only a setlist name (no song title match), the setlist is still returned. Existing behaviour is preserved.

12. **AC-12 — Server Component: no client-side data fetching introduced:** The search and filter logic remains in the Server Component (`src/app/setlists/page.tsx`). No Supabase query is moved to a Client Component as a result of this change.

13. **AC-13 — Dark mode: no new hard-coded Artisan utilities without dark: variants:** If the empty-state message is rendered using any Tailwind named brand utility (e.g. `text-brand-espresso`), it must have an explicit `dark:` variant pair (e.g. `dark:text-brand-cream`). No new text/background color utilities may be added without their dark-mode counterpart.

## Out of Scope

- Per-match highlighting or annotation indicating which song caused a setlist to appear in results.
- Searching by artist name, song key, or any other song field beyond `title`.
- Extending the alphabet filter to cover song titles.
- Full-text search (FTS) or trigram indexing — ilike substring matching is sufficient for typical worship setlist sizes (5–10 songs per setlist).
- Pagination changes — the search extension does not change the existing pagination behaviour.
- Any changes to the setlist detail page (`/setlists/[id]`).
- Any changes to the song library page (`/library`).

## Fallback Behaviors

- If the Supabase query for the extended search fails (network error or PostgREST error), the page must display the same error state it currently shows for a failed setlist fetch. The empty-state message "No setlists matching..." must NOT appear for an error condition — error and empty states must remain distinct.
- If `setlist_songs` join returns no rows for a given setlist (empty setlist), that setlist is still returned when its name matches the query, and is correctly excluded when only the song-title arm of the OR is checked.

## Resolved Ambiguities

- **OR vs AND match semantics** → OR (name matches OR any song title matches). [ASSUMED] The user's phrasing "include the song inside the setlist when i use the search" implies they want additional results surfaced, not a narrowing conjunction. OR is the natural interpretation and is the more useful default for a worship leader searching by memory of a song they recall being in a set.
- **Partial word matching** → Supported via same `%query%` ilike pattern as existing name search. [ASSUMED] Consistency with existing behaviour; no reason to restrict song-title matching to full-word only.
- **Empty-state message wording** → "No setlists matching '[query]' in name or songs." [ASSUMED] The current message (exact wording to be confirmed by explorer) references name only; extending it to mention songs is the minimal accurate change. The exact current wording is a Pending Reconciliation item.
- **Song-match highlighting** → Not required. [ASSUMED] The feature request does not mention any visual indicator. Adding highlighting would be scope creep for an initial implementation; it can be a follow-up if users need it.
- **Alphabet filter scope** → Applies to setlist names only, unchanged. [ASSUMED] The alphabet filter is a navigation aid for browsing setlists A–Z by their own names; extending it to song titles would change the filter's semantic meaning and is not implied by the request.
- **Performance ceiling** → Typical worship setlists have 5–10 songs; ilike on a small join is acceptable. No FTS index needed at this scale. [ASSUMED from PM context note.]
- **Deduplication** → Enforced at query level to avoid returning a setlist twice when both name and song title match. [ASSUMED] Standard correctness requirement; application-level deduplication would be fragile against pagination.
