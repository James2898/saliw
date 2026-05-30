# Spec — Worship Leader & Lineup Assignment on New Setlist Form

## Feature Summary

The New Setlist creation form at `/setlists/new` currently collects only a name, date, public toggle, and song selections. After `createSetlist` persists the row and returns a real UUID, the user must be redirected to the edit page (`/setlists/{id}/edit`) where `SetlistPeopleSection` is already fully wired with all required props. This task adds worship leader and lineup assignment to the creation flow by changing the post-create redirect target from the view page to the edit page. No new UI components are required: the edit page already renders `SetlistPeopleSection` correctly. A music director who creates a setlist will land immediately on the edit page and can assign people before returning to the view.

## Chosen Approach

**Approach A — Redirect-to-edit after create.**

Justification:
- `SetlistPeopleSection` requires a non-nullable `setlistId` and calls DB-writing Server Actions on every interaction. It cannot render until after `createSetlist` returns a real UUID.
- Approach A satisfies this constraint with a single-character change to the redirect target in `SetlistBuilderClient`'s `handleSave` CREATE branch — from `/setlists/${newId}` to `/setlists/${newId}/edit`.
- The edit page already fetches `listMusicians()` and `getSetlistLineup()` and renders `SetlistPeopleSection` with all required props. No new state, no new prop drilling, no new component logic.
- Approach B (inline post-create state) would require: extending `SetlistBuilderClient` props, adding conditional rendering logic, fetching `listMusicians()` from the new page, and managing a two-phase form state — all of which introduce surface area for BUG-001, BUG-002, BUG-007, and hydration-mismatch risks with no user-facing advantage.
- Lower risk, fewer lines changed, no new failure modes.

## Acceptance Criteria

1. When a music director submits the New Setlist form (all required fields filled), `createSetlist` is called. On success, the browser navigates to `/setlists/{newId}/edit` (the edit page), not to `/setlists/{newId}` (the view page).
2. The edit page at `/setlists/{newId}/edit` renders `SetlistPeopleSection` with the correct `setlistId`, `allMusicians`, `initialWorshipLeaderId` (null for a brand-new setlist), `initialLineup` (empty for a brand-new setlist), and `isMusicDirector` derived from the current session.
3. On the edit page after creation, a music director can assign a worship leader using the existing worship leader selector. The assignment persists to the database via `setSetlistWorshipLeader`.
4. On the edit page after creation, a music director can add musicians to the lineup. Each addition persists to the database via `addSetlistMusician`.
5. On the edit page after creation, a music director can remove musicians from the lineup. Each removal persists to the database via `removeSetlistMusician`.
6. If no musicians exist in the system yet (empty `allMusicians` list), the lineup section renders its existing empty state (as it already does on the edit page for existing setlists) — no crash, no blank white panel.
7. A user who is not a music director (viewer or musician role) who navigates to `/setlists/{newId}/edit` after creation sees the edit page in read-only mode consistent with how the edit page already handles non-directors — `SetlistPeopleSection` is rendered non-interactively or is not rendered, matching the existing edit-page behavior.
8. If the user closes the browser or navigates away after creation but before assigning anyone on the edit page, the setlist row already exists in the database with no worship leader and no lineup. Subsequent visits to `/setlists/{newId}/edit` show the empty people section and the music director can assign at any time. No data loss, no orphan cleanup required.
9. The redirect change must not affect the error path: if `createSetlist` returns an error, the user remains on `/setlists/new` with the existing error message displayed. No redirect occurs on failure.
10. The songs added during creation (via `addSetlistSong` calls after `createSetlist`) must complete before the redirect fires — the redirect happens only after all post-create song additions have resolved, consistent with the existing create flow.
11. All Tailwind color utilities used in any touched component must have paired `dark:` variants (guard against BUG-004/BUG-005).
12. No new `useEffect` + `setState` patterns are introduced for seeding state from props or external storage (guard against BUG-001).
13. `npm run format` is run before the commit is created (guard against Prettier enforcement rule).

## Out of Scope

- Adding worship leader or lineup fields directly to the `/setlists/new` form page itself (inline, before the setlist is saved).
- Modifying `createSetlist` Server Action to accept `worship_leader_id` as a parameter.
- Building a new "creation wizard" or multi-step form flow.
- Changing the edit page layout or the `SetlistPeopleSection` component behavior.
- Adding people assignment to the setlist view page (`/setlists/{id}`).
- Any changes to RLS policies (the existing policies that govern the edit page already apply).
- Any changes to `src/app/setlists/new/page.tsx` (the Server Component); only `SetlistBuilderClient`'s redirect target changes.
- Error recovery or undo for partial lineup state (e.g., if `addSetlistMusician` fails mid-assignment on the edit page — that is the existing edit-page behavior and is unchanged).

## Fallback Behaviors

- If `createSetlist` returns an error: no redirect. The error message is displayed on `/setlists/new` using the existing error-display mechanism. The people section is never shown.
- If `listMusicians()` returns an empty array on the edit page: `SetlistPeopleSection` renders its existing empty state for the lineup (no musicians to add). The worship leader selector still renders (it can be left unassigned). No crash.
- If the edit page is accessed by a non-music-director: `SetlistPeopleSection` is rendered as it already is for non-directors on the existing edit page. This task does not change that behavior.

## Resolved Ambiguities

- **Which redirect target?** → Approach A: redirect to `/setlists/{newId}/edit`. Resolved from: PM constraint analysis (SetlistPeopleSection requires pre-existing DB row; edit page already has full wiring).
- **Does `createSetlist` need a new parameter?** → No. Worship leader and lineup are assigned after creation via separate Server Actions already wired to `SetlistPeopleSection`. `createSetlist` signature is unchanged.
- **What does the user see after closing the page before assigning anyone?** → The setlist exists with no worship leader and no lineup. On return to the edit page, the empty people section is shown and assignment can proceed normally. No special cleanup or warning is needed — this is identical to how an existing setlist with no people assigned behaves today.
- **What if the music director is not on the musicians list?** → The worship leader selector behavior is unchanged from the edit page. This task does not alter that selector's data source or logic.
- **BUG-011 RLS concern** → No new DB write paths are introduced. `setSetlistWorshipLeader`, `addSetlistMusician`, and `removeSetlistMusician` already exist and are already covered by existing RLS on the edit page. No new policy audit is required.

## Open Questions

- **Pending Reconciliation** — Does `SetlistBuilderClient.handleSave` perform the redirect via Next.js `router.push()` or `redirect()` from `next/navigation`? The answer determines whether the change is a string literal replacement or requires a different call. (Suggested resolution source: `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — search for `router.push` or `redirect(` in the CREATE branch of `handleSave`)
- **Pending Reconciliation** — Does the edit page at `src/app/setlists/[id]/edit/page.tsx` perform an auth guard that would send a non-music-director back to the view page or a 404? If so, AC-7 should reference that redirect behavior explicitly. (Suggested resolution source: `src/app/setlists/[id]/edit/page.tsx` — check for role guard near top of component)
- **Pending Reconciliation** — Does `SetlistBuilderClient` await song additions sequentially or in parallel before redirecting? AC-10 assumes they complete before redirect; confirm the implementation matches. (Suggested resolution source: `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — `handleSave` CREATE branch, look for `await` on song add calls)
