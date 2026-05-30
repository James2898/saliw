# TASK-046 — Add Worship Leader & Musician Lineup to Setlist Creation Form

- **Tier:** 1
- **Date Created:** 2026-05-30
- **Status:** Completed

---

## Feature Summary

Add worship leader selection and musician lineup fields directly to the `/setlists/new` creation form. The user selects a worship leader and adds musicians (with instruments) on the creation form before clicking Save. Nothing writes to the DB until Save. On Save: `createSetlist` runs first → `setSetlistWorshipLeader` is called if a worship leader was selected → `addSetlistMusician` is called for each pending lineup entry. After all writes succeed, navigate to `/setlists/${newId}` (existing view-page redirect).

---

## Acceptance Criteria

### Form Layout & Visibility

1. `/setlists/new` renders worship leader selector and musician lineup section below the public toggle, only when `isMusicDirector === true`.
2. When `isMusicDirector` is false, `SetlistPeopleLocalSection` is not mounted at all.
3. `SetlistPeopleLocalSection` renders only in CREATE mode (`setlistId === null`) when `isMusicDirector === true`.
4. `SetlistPeopleLocalSection` is NOT rendered in EDIT mode — `SetlistPeopleSection` handles EDIT unchanged.
5. Visual style matches `SetlistPeopleSection` — same class constants, Artisan palette, spacing.

### Worship Leader

6. Selector is populated from `allMusicians` passed as prop.
7. Default selection is neutral placeholder representing `worshipLeaderId === null`.
8. Selecting a musician calls `onWorshipLeaderChange(id)` — no DB write.
9. Re-selecting neutral calls `onWorshipLeaderChange(null)` — no DB write.
10. When `allMusicians` is empty, selector renders with only neutral option, not disabled.

### Musician Lineup — Adding

11. Lineup section has musician selector, instrument text input, and Add button.
12. Clicking Add appends `PendingLineupEntry` to lineup via `onLineupChange` — no DB write.
13. If instrument is empty/whitespace after trim, Add is disabled; entry is NOT appended.
14. If no musician selected (neutral), Add is disabled; entry is NOT appended.
15. After successful Add, selector resets to neutral and instrument input clears.
16. When `allMusicians` is empty, Add is disabled.

### Musician Lineup — Removing

17. Each lineup entry shows musician name, instrument, and a remove control.
18. Clicking remove removes that entry by `tempId` via `onLineupChange` — no DB write.
19. Removing a lineup entry does not affect worship leader selection.

### Duplicate Musician

20. Duplicate `musician_id` is ALLOWED (matches existing `SetlistPeopleSection` behavior). No block, no warning.

### Save — Happy Path

21. On Save: `createSetlist` → `setSetlistWorshipLeader` (if leader selected) → `addSetlistMusician` for each entry → `router.push` to view page.
22. Save button disabled + loading indicator during entire save sequence.
23. No worship leader + empty lineup is valid; people steps are skipped; no validation error.
24. Setlist with songs but no people saves correctly.

### Save — Error Paths

25. `createSetlist` fails → stop, no people writes, error shown, no navigation.
26. `createSetlist` succeeds, `setSetlistWorshipLeader` fails → stop, `addSetlistMusician` NOT attempted, error shown, no navigation.
27. `createSetlist` + `setSetlistWorshipLeader` succeed, `addSetlistMusician` fails → error shown, no navigation.
28. Error messages are user-friendly text, not raw Supabase errors.
29. Error check and data-presence check in people flush are two separate explicit conditions (BUG-008 guard).

### Data Integrity

30. `listMusicians()` data mapped to `{ id, name }` only — `notes` is excluded (BUG-011 guard).
31. `pendingWorshipLeaderId` initialized as `useState<string | null>(() => null)`; `pendingLineup` as `useState<PendingLineupEntry[]>(() => [])` (BUG-001 guard).
32. All handlers declared before any hook or JSX that references them (BUG-007 guard).
33. No `useCallback`/`useMemo` deps use object property paths (BUG-002 guard).

### Dark Mode & Styling

34. Every named brand utility has an explicit `dark:` paired variant (BUG-004 guard).
35. No `bg-[var(--brand-card-bg)]` or semi-transparent CSS variable background (BUG-021 guard).

### Empty State

36. Empty `pendingLineup` shows explicit empty state message (e.g., "No musicians added yet").
37. Empty state uses named brand utilities with `dark:` pairs.

### Process

38. `npm run format` run before commit.
39. Branch `feature/TASK-046-new-setlist-people-assignment` — developer must undo the prior incorrect redirect-to-edit commit (line 192 must stay as `router.push(\`/setlists/${newId}\`)`) before implementing this task.

---

## Out of Scope

- Modifying `SetlistPeopleSection`
- Modifying the EDIT page
- DB migrations or RLS policy changes
- Inline instrument editing after Add
- Lineup reordering
- Pagination/search in musician dropdown
- Any changes to setlist detail/view pages

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/new/page.tsx` | Add `listMusicians()` fetch; pass `allMusicians` and `isMusicDirector` to `SetlistBuilderClient` |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Accept `allMusicians` and `isMusicDirector` props; add `pendingWorshipLeaderId` and `pendingLineup` state; flush in CREATE branch of `handleSave`; render `SetlistPeopleLocalSection` |
| `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` | NEW — controlled component for CREATE mode; callback props only, no Server Actions |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | UI reference only — no changes |
| `src/app/setlists/[id]/edit/page.tsx` | Reference for Promise.all pattern — no changes |
| `src/app/actions/setlistActions.ts` | `setSetlistWorshipLeader` (line 760) and `addSetlistMusician` (line 777) — EXISTS, no changes |
| `src/app/actions/musicianActions.ts` | `listMusicians()` returns `{ data: DbMusician[] \| null; error: string \| null }` — no changes |
| `src/types/Musician.ts` | `Musician = { id: string; name: string; notes: string \| null }` — reference only |

---

## Technical Schema

N/A — no new API contract required for this task. Reuses existing `setSetlistWorshipLeader` and `addSetlistMusician` Server Actions.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|---------|
| Feature Specification | `tasks/TASK-046/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-046/context.md` | Reusable components + patterns |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001:** Lazy `useState` initializers — `useState<string | null>(() => null)` and `useState<PendingLineupEntry[]>(() => [])` — do NOT use direct values in the parameter.
- **BUG-002:** No property-path hook dependencies — do NOT use `deps: [obj.property]` in `useCallback` or `useMemo`; depend on the whole object if the property can change.
- **BUG-004:** All named brand utilities require explicit `dark:` pairs — utilities like `bg-brand-cream`, `text-brand-brown` must have `dark:bg-brand-espresso`, etc.
- **BUG-007:** Function declarations before hooks — all callback functions must be declared before any `useState`, `useEffect`, or JSX that references them to prevent React Compiler forward-reference errors.
- **BUG-008:** Separate error and data-presence checks — never use a compound guard like `if (wlError || !data)`; use two sequential explicit conditions: `if (wlError) { ... }` then `if (!data) { ... }`.
- **BUG-011:** Exclude `notes` from public musician lists — `listMusicians()` returns `notes` field but it is sensitive (created_by metadata); map to `{ id, name }` only when passing to the client.
- **BUG-021:** No CSS variable arbitrary backgrounds — do NOT use `bg-[var(--brand-card-bg)]` or similar; use named Tailwind brand utilities; if a var is needed, verify it is full-opacity and document separately.

---

## Resolved Open Questions

1. **Duplicate musician guard** → Do NOT add a duplicate-musician block. Allow same musician multiple times. (Source: existing `SetlistPeopleSection` behavior — no duplicate guard present)
2. **Error state** → Single `error: string | null` state slot in `SetlistBuilderClient`, rendered via `<ErrorBanner>`. Both AC-26 and AC-27 use this single slot. (Source: user decision)
3. **`isMusicDirector` in SetlistBuilderClient** → Add as new prop `isMusicDirector: boolean`. Derive server-side in `new/page.tsx` via auth + profile role check (same pattern as `edit/page.tsx` lines 42–62). Pass into `SetlistBuilderClient`. In EDIT mode, `isMusicDirector` already handled by `SetlistPeopleSection`. (Source: user decision + codebase pattern)
4. **`listMusicians()` return** → `{ data: DbMusician[] | null; error: string | null }`. In `new/page.tsx`, map `data ?? []` to `Musician[]` using only `{ id, name }` — exclude `notes` (BUG-011 guard). (Source: user decision + security)
5. **Server Actions** → Both `setSetlistWorshipLeader` and `addSetlistMusician` fully implemented. EXISTS. (Source: codebase verification)
6. **Post-save navigation** → `router.push(\`/setlists/${newId}\`)` — view page. Unchanged. (Source: user decision)

---

## PendingLineupEntry Type Definition

Define in `SetlistBuilderClient.tsx` or a shared types file:

```typescript
type PendingLineupEntry = {
  tempId: string;           // crypto.randomUUID() or Date.now().toString() — React key only
  musician_id: string;      // ID from allMusicians
  instrument: string;       // User-entered instrument name
  name: string;             // Musician display name, from allMusicians lookup
}
```

---

## handleSave CREATE Branch Flush Order

After existing song add/reorder/key steps, before `router.push`:

```typescript
// After song steps, before router.push:
if (pendingWorshipLeaderId !== null) {
  const { error: wlError } = await setSetlistWorshipLeader({ 
    setlist_id: newId, 
    worship_leader_id: pendingWorshipLeaderId 
  });
  if (wlError) { 
    throw new Error("Setlist created, but worship leader could not be saved."); 
  }
}
for (const entry of pendingLineup) {
  const { error: musicianError } = await addSetlistMusician({ 
    setlist_id: newId, 
    musician_id: entry.musician_id, 
    instrument: entry.instrument 
  });
  if (musicianError) { 
    throw new Error("Setlist created, but one or more musicians could not be saved."); 
  }
}
// then: router.push(`/setlists/${newId}`)
```

**Critical:** Error check and data-presence check must be separate (BUG-008 guard). Here only error checks are needed since returned data is not used.

---

## Branch Cleanup Notice

The current `feature/TASK-046-new-setlist-people-assignment` branch has a prior incorrect commit (redirect-to-edit approach). The developer **must revert that change** before implementing this task. Specifically:

- `SetlistBuilderClient.tsx` line 192 must remain `router.push(\`/setlists/${newId}\`)` (the view page redirect — unchanged from main).
- The prior redirect-to-edit logic must be completely removed.

---

## Resolution

- **Completed:** 2026-05-30
- **Branch:** feature/TASK-046-new-setlist-people-assignment
- **Base branch:** develop
- **Files changed:**
  - `src/app/setlists/new/page.tsx` — Added `listMusicians()` to parallel fetch via `Promise.all`; derived `isMusicDirector` server-side (pattern from edit/page.tsx); mapped musicians to `{ id, name }` only (BUG-011); passed `allMusicians` and `isMusicDirector` as new props to `SetlistBuilderClient`
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — Added `MusicianOption` and updated `SetlistBuilderClientProps` with `allMusicians?` and `isMusicDirector?`; added `pendingWorshipLeaderId` and `pendingLineup` state with lazy initializers (BUG-001); added `handlePendingWorshipLeaderChange` and `handlePendingLineupChange` handlers before `handleSave` (BUG-007); added worship leader + lineup flush in CREATE branch of `handleSave` with separate error checks (BUG-008); rendered `SetlistPeopleLocalSection` below public toggle in CREATE+MD mode only; imported `setSetlistWorshipLeader` and `addSetlistMusician`; line 192 stays as `router.push(\`/setlists/${newId}\`)` (view redirect — NOT /edit, reverting the prior bad commit)
  - `src/components/client/SetlistBuilder/SetlistPeopleLocalSection.tsx` — NEW controlled component; mirrors `SetlistPeopleSection` UI (class constants with dark: pairs, BUG-004); worship leader select + lineup list with remove + add-musician row; zero Server Action imports; all handlers declared before JSX (BUG-007); lazy useState for add-row inputs (BUG-001); no bg-[var(--brand-card-bg)] (BUG-021); empty lineup shows "No musicians added yet" message
  - `tasks/TASK-046.md` — This file (Resolution section filled)
- **Notes:**
  - The prior incorrect commit (08afeca) on `feature/TASK-046-new-setlist-people-assignment` changed line 192 to `/setlists/${newId}/edit`. This implementation was done on the worktree branch (`worktree-agent-a098345f675964af8`) which starts at 909329f (pre-bad-commit), so line 192 is correctly `router.push(\`/setlists/${newId}\`)` — the bad redirect is not present.
  - The worktree branch commit supersedes the bad commit. The feature branch should be rebased/reset to incorporate this commit rather than cherry-picking on top of 08afeca.
  - `SetlistPeopleLocalSection` also accepts `isMusicDirector` as a prop and returns null early if false, providing a double guard (outer conditional in `SetlistBuilderClient` + inner guard in the component).
  - TypeScript compiled clean (`npx tsc --noEmit` — no errors). Prettier ran (`npm run format`).
