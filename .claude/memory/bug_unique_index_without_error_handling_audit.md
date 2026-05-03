# BUG-016: UNIQUE INDEX Added Without Auditing Server Action PostgreSQL Error Code 23505 Handling

**Date:** 2026-05-03  
**Feature:** `Song Library (TASK-036)`  
**Category:** Backend / DB  
**Related Files:**
- `src/app/actions/songActions.ts:74–83` — **gap site** (createSong lacks 23505 handling)
- `src/app/actions/setlistActions.ts:803` — **reference pattern** (good 23505 handling)
- `supabase/migrations/20260503000001_songs_title_artist_unique_index.sql` — the constraint

---

## Symptom

TASK-036 added a UNIQUE INDEX on the `songs` table columns `(title, artist)`. After the migration landed, when a user attempts to insert a song with a duplicate (title, artist) pair via the `createSong` Server Action, PostgreSQL rejects the insert with error code `23505` (UNIQUE violation). However, `createSong` in `src/app/actions/songActions.ts` does not explicitly handle error code `23505` and falls through to the generic catch-all message: `"Unable to create song. Please try again."` Instead of the user-facing message they should see: `"A song with this title and artist already exists."` Users are left confused about why their song creation failed.

---

## Root Cause

Server Action error handlers in the codebase were written _before_ the UNIQUE constraint existed. When the migration landed in TASK-036, no automated check linked the new constraint to the action's error handling code. The action was never audited or updated to handle the specific PostgreSQL error code `23505` (UNIQUE violation).

The same gap applies to other PostgreSQL constraint codes:
- `23502` — NOT NULL constraint violation
- `23503` — Foreign key constraint violation
- `23514` — CHECK constraint violation

When new migrations add these constraints to tables, the Server Actions that mutate those tables must be audited for explicit error handlers _at the same time_ — not discovered later by user complaints.

---

## Prevention Rule

**Before merging any migration that adds a constraint** (UNIQUE, NOT NULL, FK, CHECK):

1. Search the codebase for all Server Actions that mutate the affected table:
   - Look for `.from('<table>').insert(` and `.from('<table>').upsert(` 
   - Match the table name in the migration to all actions that reference it

2. For each action found, audit the error handler:
   - If the constraint is UNIQUE, add explicit handling for error code `23505` before the generic catch-all
   - If the constraint is NOT NULL, add explicit handling for error code `23502`
   - If the constraint is FK, add explicit handling for error code `23503`
   - If the constraint is CHECK, add explicit handling for error code `23514`

3. Reference pattern: See `src/app/actions/setlistActions.ts:803` for the canonical pattern:
   ```typescript
   if (error) {
     if (error.code === "23505") {
       return {
         data: null,
         error: "That musician is already assigned to that instrument.",
       };
     }
     // ... other specific codes ...
     return {
       data: null,
       error: "Unable to add musician to setlist. Please try again.",
     };
   }
   ```

4. **Validator checklist:** When `@validator-agent` audits a migration, it should:
   - Check for any UNIQUE, NOT NULL, FK, or CHECK constraints in the migration
   - If found, grep the codebase for `.from('<table>').insert(` and `.from('<table>').upsert(` (substitute actual table name)
   - Confirm each matching Server Action explicitly handles the constraint's error code
   - Flag as a blocker if any action lacks the required handler

---

## Current Status

**Not yet fixed.** `createSong` still uses the generic catch-all for error code `23505`. This is a latent UX regression made visible by TASK-036 but not caused by it — the action was always missing the handler; the constraint simply revealed the gap.
