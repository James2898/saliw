# Spec — Worship Leader & Lineup Assignment on New Setlist Form (Approach B)

## Feature Summary

Add worship leader selection and musician lineup fields directly to the `/setlists/new` creation form. Selections are held in local React state (`pendingWorshipLeaderId`, `pendingLineup`) until Save. On Save, after `createSetlist` returns a real UUID, the worship leader and each lineup entry are written to the DB in sequence before navigating to the view page.

## Chosen Approach

**Approach B — Inline collect-then-flush.**

- A new `SetlistPeopleLocalSection` controlled component holds no Server Action refs; it invokes callback props only.
- Parent `SetlistBuilderClient` owns `pendingWorshipLeaderId` and `pendingLineup` state.
- On Save: `createSetlist` → songs → worship leader (if selected) → lineup entries → `router.push(\`/setlists/${newId}\`)`.
- Post-save navigation targets the view page (unchanged from baseline), NOT the edit page.

## Acceptance Criteria

See `tasks/TASK-046.md` for full criteria list (AC-1 through AC-39).

## Out of Scope

- Modifying `SetlistPeopleSection`
- Modifying the EDIT page
- DB migrations or RLS policy changes
- Inline instrument editing after Add
- Lineup reordering
- Pagination/search in musician dropdown
- Any changes to setlist detail/view pages
