# Research — Setlist People Section (Worship Leader + Lineup)

## Open Questions

- None.

## Resolved During Requirements Analysis

- **State management choice** → Server-confirm before local state update. Rationale: lineup edit is a slow flow, no rollback complexity needed, consistent with existing SetlistBuilderClient save pattern.
- **Worship leader name resolution** → Resolved client-side in `page.tsx` via `musiciansRaw.find(m => m.id === setlist.worship_leader_id)?.name ?? null`. No extra DB query; `listMusicians` is already fetched for lineup.
- **Unique constraint scope** → Composite (musician_id, instrument) per setlist, not per musician alone. Source: error code 23505 handler in `addSetlistMusician`.
- **Viewer prop shape** → Simplified `Array<{ name: string; instrument: string }>` rather than full `SetlistLineupEntry[]` to avoid exposing internal IDs in the client component.
- **`removeSetlistMusician` count-check gap** → Action does not check delete count (unlike `removeSongFromSetlist`). Stale-ID deletes silently succeed and produce correct end state in local UI. Not a blocker; out of scope to fix in this task.
- **BUG pattern applicability** — BUG-001 (lazy useState), BUG-002 (useCallback property path), BUG-004 (dark: variants), BUG-007 (forward references) all apply to `SetlistPeopleSection`. Acceptance criteria 3, 22, 23, 24 encode these guards explicitly.
