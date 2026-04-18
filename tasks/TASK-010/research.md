# Research — Song Library Base View with Search

## Open Questions

- None. All ambiguities resolved from codebase context.

## Resolution Log

| Question | Resolution | Source |
|----------|-----------|--------|
| Does the `songs` table exist? | YES — `DbSong` type confirmed in `src/types/supabase.ts` | `src/types/supabase.ts` |
| Does the `profiles` table exist with a `role` column? | YES — `Profile.ts` has `role: string`; `navbar.tsx` queries `profiles` table | `src/types/Profile.ts`, `src/components/client/navbar.tsx` |
| Which Supabase client to use on the server? | `createClient` from `@/services/supabase/server` | `src/services/supabase/server.ts` |
| Is `--brand-tan-alpha` defined? | YES — `#bc8e5c26` in `src/styles/globals.css` | `src/styles/globals.css` |
| Does a SearchBar component already exist? | NO — must be created fresh | filesystem check |
| Where should SearchBar live? | `src/components/client/SearchBar.tsx` | `docs/structure.md` |
| Is `--brand-tan` text acceptable on `--brand-cream` background? | NO — flagged as low contrast in coding-guidelines.md | `docs/coding-guidelines.md` |
| What columns to SELECT for songs? | `id, title, artist, original_key` only — exclude `content` | task description |
| Is router.replace or router.push correct for search? | `router.replace` — avoids history pollution per keystroke | Next.js App Router convention |
| Is MEMORY.md present? | NO — treat as empty | filesystem check |
