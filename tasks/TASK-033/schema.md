# Technical Schema — Worship Leader & Lineup on Setlist Pages

## Endpoint Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| Set / clear worship leader | `setSetlistWorshipLeader()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS | N/A |
| Add musician to lineup | `addSetlistMusician()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS | N/A |
| Remove musician from lineup | `removeSetlistMusician()` | `src/app/actions/setlistActions.ts` | `music_director` (edit page only) | EXISTS | N/A |
| Read lineup (edit + viewer) | `getSetlistLineup()` | `src/app/actions/setlistActions.ts` | public read (authenticated) | EXISTS | N/A |
| Populate WL + musician picker | `listMusicians()` | `src/app/actions/musicianActions.ts` | public read (authenticated) | EXISTS | N/A |

## Summary
- Total actions: 5
- EXISTS: 5
- MISSING: 0
- All-MISSING escalation: No
