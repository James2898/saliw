# Context Bundle — Hymns Import Script

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `supabase/migrations/20260427000001_widen_lineup_select_to_public.sql` | Most recent migration — confirms naming convention |
| `src/services/supabase/client.ts` | Shows NEXT_PUBLIC_ env var names; contains explicit note prohibiting service-role key here |
| `src/services/supabase/server.ts` | Server-side Supabase client pattern using @supabase/ssr |
| `package.json` | Confirms no tsx/ts-node in devDependencies; @supabase/supabase-js ^2.103.0 |

## Reuse Candidates
- `src/services/supabase/client.ts` lines 11-12 — env var names to adopt: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the import script needs a separate admin client using `SUPABASE_SERVICE_ROLE_KEY` — do NOT reuse these modules, only the env var name convention

## Patterns to Follow
- Migration filenames: `YYYYMMDDHHMMSS_<snake_case_description>.sql` — most recent example `20260427000001_widen_lineup_select_to_public.sql` (date prefix + 6-digit zero-padded sequence suffix)
- Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client.ts lines 11-12); service-role key name is `SUPABASE_SERVICE_ROLE_KEY` (client.ts line 7 comment)
- No dotenv package in devDependencies — scripts outside Next.js must add `tsx` + `dotenv` as dev deps or use `node --env-file` flag (Node 20.6+)
- No tsx or ts-node in devDependencies — to run TypeScript scripts, add `tsx` as a dev dep or compile first with `tsc`

## Anti-Patterns Flagged
- `src/services/supabase/client.ts` line 7: comment states service-role key must NEVER appear in the browser client — import script must create a standalone admin client file, never import from this module

## MEMORY.md Notes
- BUG-008: Split compound guards — never combine `if (!data || error)` in multi-step operations; use separate explicit checks per step
- BUG-009: Use `!== undefined` throughout payload builders, not the `in` operator — mismatch causes explicit undefined to write null to DB
- BUG-011: Widening RLS without auditing all querying actions caused a data-leak risk — verify the new unique index migration does not conflict with existing RLS policies
- Prettier feedback: `npm run format` glob covers `src/**` only; scripts/ files need a separate prettier invocation before commit
