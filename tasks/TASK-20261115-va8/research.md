# Research — Liturgy Assistant Setlist Integration & Key Recommendations

## Open Questions
- None. (No blocking product decisions required from the user.)

## Notes for Task-Logger & Codebase-Explorer Reconciliation
- **Pending Reconciliation:** Exact type definition and state shape for `localSongs` in `SetlistBuilderClient.tsx` (suggested resolution source: `src/components/setlist/SetlistBuilderClient.tsx`).
- **Pending Reconciliation:** Exact signature and return payload of the single-song re-roll action in `liturgyAgentActions.ts` (suggested resolution source: `src/actions/liturgyAgentActions.ts` or `src/lib/liturgyAgent.ts`).
- **Pending Reconciliation:** Schema structure of `setlist_songs` and foreign keys linking worship leader in `setlists` (suggested resolution source: `supabase/migrations` or schema docs).
