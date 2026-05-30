# TASK-046 — Worship Leader & Lineup Assignment on New Setlist Form

- **Tier:** 1
- **Date Created:** 2026-05-30
- **Status:** In Progress

---

## Feature Summary

The New Setlist creation form at `/setlists/new` currently collects only a name, date, public toggle, and song selections. After `createSetlist` persists the row and returns a real UUID, the user must be redirected to the edit page (`/setlists/{id}/edit`) where `SetlistPeopleSection` is already fully wired with all required props. This task adds worship leader and lineup assignment to the creation flow by changing the post-create redirect target from the view page to the edit page. No new UI components are required: the edit page already renders `SetlistPeopleSection` correctly. A music director who creates a setlist will land immediately on the edit page and can assign people before returning to the view.

---

## Acceptance Criteria

1. When a music director submits the New Setlist form (all required fields filled), `createSetlist` is called. On success, the browser navigates to `/setlists/{newId}/edit` (the edit page), not to `/setlists/{newId}` (the view page).
2. The edit page at `/setlists/{newId}/edit` renders `SetlistPeopleSection` with the correct `setlistId`, `allMusicians`, `initialWorshipLeaderId` (null for a brand-new setlist), `initialLineup` (empty for a brand-new setlist), and `isMusicDirector` derived from the current session.
3. On the edit page after creation, a music director can assign a worship leader using the existing worship leader selector. The assignment persists to the database via `setSetlistWorshipLeader`.
4. On the edit page after creation, a music director can add musicians to the lineup. Each addition persists to the database via `addSetlistMusician`.
5. On the edit page after creation, a music director can remove musicians from the lineup. Each removal persists to the database via `removeSetlistMusician`.
6. If no musicians exist in the system yet (empty `allMusicians` list), the lineup section renders its existing empty state (as it already does on the edit page for existing setlists) — no crash, no blank white panel.
7. A non-music-director who creates a setlist is redirected to `/setlists/{newId}/edit` by the browser, but the edit page's existing role guard (line 61–62 of edit/page.tsx) immediately redirects them to `/setlists/{newId}` (view). They never see the edit form.
8. If the user closes the browser or navigates away after creation but before assigning anyone on the edit page, the setlist row already exists in the database with no worship leader and no lineup. Subsequent visits to `/setlists/{newId}/edit` show the empty people section and the music director can assign at any time. No data loss, no orphan cleanup required.
9. If `createSetlist` returns an error, the user remains on `/setlists/new` with the existing error message displayed. No redirect occurs on failure (existing behavior — `throw new Error(...)` at line 152 prevents reaching line 192).
10. The songs added during creation (via `addSetlistSong` calls after `createSetlist`) must complete before the redirect fires — the redirect happens only after all post-create song additions have resolved, consistent with the existing create flow.
11. All Tailwind color utilities used in any touched component must have paired `dark:` variants (guard against BUG-004).
12. No new `useEffect` + `setState` patterns are introduced for seeding state from props (guard against BUG-001).
13. `npm run format` is run before the commit is created.

---

## Out of Scope

- Adding worship leader or lineup fields directly to the `/setlists/new` form page itself (inline, before the setlist is saved).
- Modifying `createSetlist` Server Action to accept `worship_leader_id` as a parameter.
- Building a new "creation wizard" or multi-step form flow.
- Changing the edit page layout or the `SetlistPeopleSection` component behavior.
- Adding people assignment to the setlist view page (`/setlists/{id}`).
- Any changes to RLS policies.
- Any changes to `src/app/setlists/new/page.tsx` (the Server Component).
- Error recovery or undo for partial lineup state.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Line 192: change redirect from `/setlists/${newId}` to `/setlists/${newId}/edit` |
| `src/app/setlists/[id]/edit/page.tsx` | Server Component that already renders `SetlistPeopleSection` and enforces music_director role guard; no changes |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Already fully wired with all required props and Server Actions; no changes |
| `src/app/actions/setlistActions.ts` | Provides `createSetlist`, `setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`; no changes |

---

## Technical Schema

N/A — no API contract required for this task. The feature reuses existing Server Actions and the already-wired edit page.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-046/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-046/context.md` | Reusable components + patterns (from section navigator feature) |
| Research Notes | `tasks/TASK-046/research.md` | Open questions + resolutions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### Change Location

**File:** `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`
**Line:** 192
**Current code:** `router.push(\`/setlists/${newId}\`);`
**New code:** `router.push(\`/setlists/${newId}/edit\`);`

This is the only code change required. The redirect happens after the `for` loop at lines 158–190 completes (sequential song additions), so AC-10 is satisfied by existing behavior.

### Resolved Open Questions

All three pending reconciliation questions from `spec.md` have been resolved:

1. **Redirect mechanism** → `SetlistBuilderClient.handleSave` at line 192 uses `router.push()` from Next.js. The change is a direct string substitution.
2. **Non-music-director redirect** → The edit page at `src/app/setlists/[id]/edit/page.tsx` performs a role check at lines 49–59 and redirects non-music-directors to `/setlists/{id}` at line 62. AC-7 is satisfied by this existing behavior.
3. **Song addition sequencing** → The `for` loop at lines 158–190 awaits each song addition sequentially before reaching the redirect at line 192. AC-10 is satisfied by existing behavior.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001** (useState in useEffect): No new `useEffect` + `setState` patterns introduced. Change is a static string literal replacement only.
- **BUG-004** (dark mode Tailwind utilities): No new Tailwind color classes added. Redirect string change does not touch any UI styling.
- **BUG-007** (React Compiler forward reference): No new function declarations or useEffect hooks added.

No other MEMORY.md entries from context.md apply to this task (the section navigator anti-patterns and BUG-013/015 are for a different feature scope).

---

## Resolution

- **Completed:** 2026-05-30
- **Branch:** feature/TASK-046-new-setlist-people-assignment
- **Base branch:** main (worktree at main tip `909329f`, which is ahead of develop via merged PRs through TASK-045)
- **Files changed:**
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — changed `router.push` at line 192 from `/setlists/${newId}` to `/setlists/${newId}/edit`
  - `tasks/TASK-046.md` — filled Resolution section
  - `tasks/TASK-046/` — planning artifacts committed alongside task file
- **Notes:** Single redirect string substitution only. No new components, hooks, state, Supabase calls, or Server Actions introduced. Prettier confirmed no reformatting needed (file already formatted). TypeScript check passed with zero errors. AC-7 (non-music-director redirect) and AC-10 (song addition sequencing) are satisfied by pre-existing code in the edit page and the for-loop respectively.
