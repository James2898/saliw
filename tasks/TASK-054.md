# TASK-054 — P3 TypeScript Modernization, Schema Generics & Domain Safety

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** In Progress
- **Branch:** feat/p3-typescript-modernization-and-schema-generics

---

## Feature Summary

Execute Phase P3 of the architectural modernization plan: TypeScript Modernization, Schema Generics & Domain Safety. This phase introduces a strongly typed `Database` schema interface into `src/types/supabase.ts` and connects it to Supabase browser and server client instantiations, establishes a canonical `SongSummary` domain type in `src/types/Song.ts` to deduplicate scattered local interfaces, tightens musical note domain typing via `NOTES as const` and `MusicalNote` in `src/utils/musicLogic.ts`, aligns `Song.singer` nullability with `DbSong`, prunes unreferenced dead type files (`Singer.ts`, `View.ts`), and ensures clean TypeScript compilation across the entire project.

---

## Acceptance Criteria

1. **AC-1 — Supabase Database Generic Definition**:
   - `src/types/supabase.ts` exports a canonical `Database` interface matching the Supabase JS schema convention (`public: { Tables: { ... }; Views: { ... }; Functions: { ... } }`).
   - Tables defined under `Tables` include `songs`, `setlists`, `setlist_songs`, `musicians`, `setlist_musicians`, and `profiles`.
   - Each table definition provides `Row`, `Insert`, and `Update` types with correct column optionality (e.g. `id` generated/optional on insert) and nullability matching DB conventions.
   - In accordance with MEMORY.md (BUG-018), `timestamptz` columns (such as `setlists.date`) must be typed as `string | null` rather than non-nullable strings.
   - Includes `Views` (`public_musicians`) and `Functions` (`reorder_setlist_songs`, `is_music_director`).

2. **AC-2 — Supabase Client Generic Wiring**:
   - Helper wrappers for Supabase client instantiation (`createBrowserClient` in `src/services/supabase/client.ts` and `createServerClient` in `src/services/supabase/server.ts`) are parameterized with `<Database>` (e.g. `createBrowserClient<Database>(...)`).
   - Consumers querying Supabase tables receive inferred row types for queries, inserts, and updates without requiring manual ad-hoc type casts for standard single-table operations.
   - For complex nested foreign-key joins, any required casts respect the runtime cardinality pattern documented in MEMORY.md (BUG-017).

3. **AC-3 — Domain Type Consolidation (`SongSummary`)**:
   - `src/types/Song.ts` exports `export type SongSummary = Pick<Song, "id" | "title" | "artist" | "original_key">;`.
   - Local song-summary interfaces in `src/components/dashboard/RecentSongs.tsx`, `src/app/library/page.tsx`, `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`, and `src/components/client/AppendSongsModal.tsx` are removed and replaced by imports of the canonical `SongSummary` (with backwards-compatible aliases retained where needed).

4. **AC-4 — Song and DbSong Nullability Alignment**:
   - In `src/types/Song.ts`, `Song.singer` is aligned with `DbSong.singer` to support `string | null` (and optional `undefined`), preventing mismatch errors during conversion between database rows and domain objects.

5. **AC-5 — Strict `NOTES` Typing & Musical Note Domain Safety**:
   - In `src/utils/musicLogic.ts`, `NOTES` is declared with `as const` without the widening `: readonly string[]` annotation:
     ```ts
     export const NOTES = [
       "C",
       "C#",
       "D",
       "D#",
       "E",
       "F",
       "F#",
       "G",
       "G#",
       "A",
       "Bb",
       "B",
     ] as const;
     ```
   - `src/utils/musicLogic.ts` exports `export type MusicalNote = (typeof NOTES)[number];`.
   - All `(NOTES as string[])` or redundant casts in `src/utils/musicLogic.ts`, `src/hooks/useTranspose.ts`, `src/components/client/NewSongFormClient.tsx`, and `src/components/client/SongEditorClient.tsx` are eliminated in favor of typed index operations or `readonly string[]` compatibility.

6. **AC-6 — Dead Code Pruning**:
   - `src/types/Singer.ts` and `src/types/View.ts` are permanently deleted from the repository.
   - No dangling imports or references to `Singer.ts` or `View.ts` remain anywhere in the project.

7. **AC-7 — Zero Diagnostic Errors (Build & Type-Check Gate)**:
   - `npx tsc --noEmit` completes with 0 errors.
   - `npm run lint` and `npm run build` succeed without type-check or Next.js compilation failures.

---

## Out of Scope

- Modifying runtime music transposition logic, musical formulas, or chord regex patterns.
- Changing database schema or authoring new Supabase migrations.
- UI visual redesigns or Artisan theme modifications.
- Refactoring components outside the targeted list (`RecentSongs`, `library/page`, `SetlistBuilderClient`, `AppendSongsModal`, etc.).

---

## Fallback Behaviors

- **Supabase Query Inference Fallback**: Where Supabase PostgREST nested joins fail to infer exact runtime cardinality (per MEMORY.md BUG-017), safe explicit type assertions (`as unknown as ExpectedShape`) are used rather than weakening the base `Database` table definitions.
- **Missing / Null DB Values**: Where database fields return `null` (e.g., `singer`, `date`), components consuming `SongSummary` or `Database["public"]["Tables"]["setlists"]["Row"]` must safely handle nullish values without runtime `TypeError`.

---

## Resolution

- **Completed Date:** 2026-10-17
- **Branch:** feat/p3-typescript-modernization-and-schema-generics
- **Files Changed:**
  - `src/types/supabase.ts` (added Json, DbProfile, Database schema generic with Tables, Views, Functions, Relationships)
  - `src/services/supabase/client.ts` (parameterized `createBrowserClient<Database>`)
  - `src/services/supabase/server.ts` (parameterized `createServerClient<Database>`)
  - `src/types/Song.ts` (exported `SongSummary = Pick<Song, ...>`, aligned `singer?: string | null`)
  - `src/components/dashboard/RecentSongs.tsx` (consolidated `RecentSong` to `SongSummary`)
  - `src/app/library/page.tsx` (consolidated `SongRow` to `SongSummary`)
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` (consolidated `SongLibraryItem` to `SongSummary`)
  - `src/components/client/AppendSongsModal.tsx` (consolidated `ModalSong` to `SongSummary`)
  - `src/utils/musicLogic.ts` (declared `NOTES as const`, exported `type MusicalNote`, eliminated mutable casts)
  - `src/hooks/useTranspose.ts` (eliminated mutable `(NOTES as string[])` cast)
  - `src/components/client/NewSongFormClient.tsx` (eliminated redundant `NOTES as string[]` and `NOTES[0] as string` casts)
  - `src/components/client/SongEditorClient.tsx` (eliminated redundant `(NOTES as string[])` cast)
  - `src/components/SongViewer/ChordSheetClient.tsx` (eliminated redundant `(NOTES as string[])` cast)
  - `src/app/actions/songActions.ts` (used `SongSummary[]` in `getAllSongs` and `Partial<DbSong>` update payload)
  - `src/app/actions/setlistActions.ts` (used `Partial<DbSetlistSong>` and `Partial<DbSetlist>` update payloads)
  - `src/app/actions/musicianActions.ts` (used `Partial<DbMusician>` update payload)
  - `src/app/page.tsx` (applied explicit nested query join cardinality assertion per BUG-017)
  - `src/types/Singer.ts` (deleted dead type file)
  - `src/types/View.ts` (deleted dead type file)
- **Verification Summary:**
  - `npx tsc --noEmit` passed with 0 errors.
  - `npm run lint` passed with 0 errors and 0 warnings.
  - `npm run build` passed with clean static page generation (12/12 routes).

