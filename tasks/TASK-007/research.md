# Research — Backend Infrastructure (Songs, Setlists, Server Actions)

## Open Questions

- None. All ambiguities resolved from context.

## Resolved Decisions

- **Type update strategy** → Resolved from context: no existing pages import Song.ts or Setlist.ts; safe to update in place.
- **RLS role check** → Resolved from migration 20260415000000: role lives in `public.profiles.role`, use `is_music_director()` helper function in SQL.
- **content validation scope** → Resolved from musicLogic.ts: at least one `chordRegex` match required.
- **reorderSetlist input** → Uses `setlist_songs.id` (junction table PK) for precise per-row targeting.
- **Migration timestamps** → Sequential seconds from base: 000001, 000002, 000003.
- **deleteSetlistAction** → Now in scope; was previously MISSING in api-discovery.md.
