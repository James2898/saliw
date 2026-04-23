# TASK-023 — Confirmation Dialogs for Go Live and Follow Leader Toggles

- **Tier:** 1
- **Date Created:** 2026-04-24
- **Status:** In Progress

---

## Feature Summary

Add pre-action confirmation dialogs to both the "Go Live" toggle (visible to Music Directors only) and the "Follow the Leader" toggle (visible to non-director musicians only) on the setlist view page. Each toggle currently fires its Supabase Realtime side-effect immediately on click. The new behavior requires a modal confirmation step before any state change or channel operation occurs. This prevents accidental broadcasts and accidental subscription changes, which are irreversible in-session without a second deliberate action. All dialog state is local to `ServiceNavigator.tsx`; `useSetlistSync.ts` is not modified.

---

## Acceptance Criteria

### Go Live — Enable (OFF → ON)

1. When the director clicks "Go Live" while `sync.isLive === false` and `sync.isLiveConnecting === false`, a confirmation dialog appears before any state or channel change occurs.
2. The dialog title reads: **"Go Live?"**
3. The dialog body reads: **"All musicians will follow your performance key in real-time."**
4. The dialog has two actions: a primary "Go Live" confirm button and a ghost "Cancel" button.
5. Clicking "Go Live" in the dialog dismisses the dialog and calls `toggleLive()` immediately.
6. Clicking "Cancel" in the dialog dismisses the dialog and leaves `sync.isLive` unchanged (still `false`). The toggle button remains in its inactive state.
7. Pressing Escape while the dialog is open triggers Cancel behavior (criterion 6).
8. Pressing Enter while focus is on the confirm button triggers confirm behavior (criterion 5).

### Go Live — Disable (ON → OFF)

9. When the director clicks the "LIVE" button while `sync.isLive === true`, a confirmation dialog appears before the channel is removed.
10. The dialog title reads: **"End Live Session?"**
11. The dialog body reads: **"Musicians following you will lose the live feed and revert to their last known keys."**
12. The dialog has two actions: a primary "End Session" confirm button and a ghost "Cancel" button.
13. Clicking "End Session" dismisses the dialog and calls `toggleLive()` immediately. The Supabase channel is removed per existing `toggleLive` logic.
14. Clicking "Cancel" dismisses the dialog and leaves `sync.isLive` unchanged (still `true`). The "LIVE" pulse animation and `aria-pressed="true"` remain active.
15. Escape and Enter keyboard behaviors follow criteria 7–8 for this dialog.

### Follow the Leader — Enable (OFF → ON)

16. When a musician clicks "Follow Leader" while `sync.isFollowing === false` and `sync.isStateChecking === false`, a confirmation dialog appears before the State Check fetch or channel subscription begins.
17. The dialog title reads: **"Follow the Leader?"**
18. The dialog body reads: **"Your keys will sync to the director's live session. Your current keys will be saved and restored if you stop following."**
19. The dialog has two actions: a primary "Follow" confirm button and a ghost "Cancel" button.
20. Clicking "Follow" dismisses the dialog and calls `toggleFollow()` immediately, which initiates the State Check and channel subscription per existing logic.
21. Clicking "Cancel" dismisses the dialog and leaves `sync.isFollowing` unchanged (still `false`). No network call is made.
22. Escape and Enter keyboard behaviors follow criteria 7–8 for this dialog.

### Follow the Leader — Disable (ON → OFF)

23. When a musician clicks "Follow Leader" while `sync.isFollowing === true`, a confirmation dialog appears before the channel is removed or keys are reverted.
24. The dialog title reads: **"Stop Following?"**
25. The dialog body reads: **"You'll unsubscribe from the live feed. Your keys will revert to the snapshot taken when you started following."**
26. The dialog has two actions: a primary "Stop Following" confirm button and a ghost "Cancel" button.
27. Clicking "Stop Following" dismisses the dialog and calls `toggleFollow()` immediately. The channel is removed and override keys revert to snapshot per existing `toggleFollow` logic.
28. Clicking "Cancel" dismisses the dialog and leaves `sync.isFollowing` unchanged (still `true`). The green sync dot and `aria-pressed="true"` remain active.
29. Escape and Enter keyboard behaviors follow criteria 7–8 for this dialog.

### Interaction Integrity

30. If either toggle button is clicked while a confirmation dialog for that toggle is already open, the second click is ignored — no second dialog opens. Only one dialog per toggle may be open at a time.
31. The two toggles are independent: opening a Go Live dialog does not affect the Follow Leader dialog state, and vice versa (they cannot both be open simultaneously only because they are rendered for different user roles; no cross-toggle guard is required).
32. While a confirmation dialog is open, the underlying toggle button must not change its visual state (no premature `aria-pressed` flip, no connecting spinner).
33. The toggle buttons remain in their pre-click visual and `aria-pressed` state for the entire duration the dialog is open.

### Accessibility

34. Each dialog renders with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the dialog title element.
35. When a dialog opens, focus moves to the Cancel button (matching the existing `LogoutModal` pattern).
36. When a dialog closes (confirm or cancel), focus returns to the toggle button that triggered it.
37. Tab key cycles only within the two dialog buttons while the dialog is open (focus trap).
38. Shift+Tab also cycles within the focus trap.
39. Backdrop click (clicking outside the dialog panel) triggers Cancel behavior.

### Visual / Artisan Styling

40. The dialog visual treatment matches `logout-modal.tsx` exactly: `bg-[var(--brand-background)]`, `border border-brand-brown/20`, `rounded-2xl`, `p-6`, `shadow-lg`, `z-[90]` panel over `z-[80]` backdrop.
41. The confirm button uses `variant="primary"`. The cancel button uses `variant="ghost"`. Both use `size="sm"`. This matches the Button component usage in `logout-modal.tsx`.
42. On viewport widths below `sm` (< 640 px), the dialog panel width is `min(90vw, 24rem)` — same constraint as `LogoutModal`.
43. Dark mode token usage mirrors `logout-modal.tsx` (title: `text-brand-espresso dark:text-brand-cream`, body: `text-brand-brown dark:text-brand-tan`).

### Disabled-State Guard

44. If a toggle button is in a transitional disabled state (`sync.isLiveConnecting === true` or `sync.isStateChecking === true`), clicking it does not open a dialog — the button remains `disabled` per current behavior and no dialog is rendered.

---

## Out of Scope

- Changing the underlying `toggleLive()` or `toggleFollow()` logic in `useSetlistSync.ts` — the hook is called as-is after confirmation.
- Adding any cooldown, debounce, or double-toggle prevention beyond the "one dialog open at a time" guard (criterion 30).
- Persisting dialog preferences (e.g., "don't ask again").
- Building a new generic `ConfirmDialog` component — the implementation should reuse or copy the `LogoutModal` pattern, either by extracting a shared component or by creating role-specific modal components.
- Any changes to how `liveError` or `followError` messages are displayed after a confirmed action fails.
- Any change to toggle button placement, sizing, or existing Artisan styling outside the dialog itself.
- Notification or feedback to musicians when the director ends the live session (existing `followSyncStatus === 'lost'` handling covers this).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/ServiceNavigator.tsx` | Contains both toggle buttons (lines 198–307); all dialog state and intercepted `onClick` handlers go here. |
| `src/hooks/useSetlistSync.ts` | Provides `sync.toggleLive`, `sync.toggleFollow`, and all state flags used to guard dialog open conditions. Read-only for this task — do not modify. |
| `src/components/client/logout-modal.tsx` | Artisan dialog reference: exact CSS classes, accessibility pattern (focus trap, Escape, backdrop click), and Button usage to replicate for the new dialogs. |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Confirmation Copy Reference

| Toggle | Direction | Title | Body | Confirm Label |
|--------|-----------|-------|------|---------------|
| Go Live | OFF → ON | "Go Live?" | "All musicians will follow your performance key in real-time." | "Go Live" |
| Go Live | ON → OFF | "End Live Session?" | "Musicians following you will lose the live feed and revert to their last known keys." | "End Session" |
| Follow Leader | OFF → ON | "Follow the Leader?" | "Your keys will sync to the director's live session. Your current keys will be saved and restored if you stop following." | "Follow" |
| Follow Leader | ON → OFF | "Stop Following?" | "You'll unsubscribe from the live feed. Your keys will revert to the snapshot taken when you started following." | "Stop Following" |

---

## Interaction Flow

**Go Live Toggle**
1. Director clicks "Go Live" or "LIVE" button.
2. Component checks `sync.isLiveConnecting === false` — guard passes (button is not disabled).
3. Sets local state `showGoLiveDialog: true`. `toggleLive()` is NOT called yet.
4. Dialog renders. Focus moves to the "Cancel" button.
5a. Confirm path: calls `toggleLive()`, sets `showGoLiveDialog: false`, focus returns to the Go Live toggle button.
5b. Cancel/Escape/backdrop path: sets `showGoLiveDialog: false`, no state change, focus returns to the Go Live toggle button.

**Follow the Leader Toggle**
1. Musician clicks "Follow Leader" button.
2. Component checks `sync.isStateChecking === false` — guard passes (button is not disabled).
3. Sets local state `showFollowDialog: true`. `toggleFollow()` is NOT called yet.
4. Dialog renders. Focus moves to the "Cancel" button.
5a. Confirm path: calls `toggleFollow()`, sets `showFollowDialog: false`, focus returns to the Follow Leader toggle button.
5b. Cancel/Escape/backdrop path: sets `showFollowDialog: false`, no state change, focus returns to the Follow Leader toggle button.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-023/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-023/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Do not modify `useSetlistSync.ts`** — the hook's `toggleLive()` and `toggleFollow()` are called unchanged after user confirmation.
- Add two local boolean state values to `ServiceNavigator.tsx`: one for each dialog (`showGoLiveDialog`, `showFollowDialog`). These are the only new state additions.
- The Go Live toggle's `onClick` handler must be replaced with a guard function that checks `sync.isLiveConnecting` then sets `showGoLiveDialog: true` instead of calling `toggleLive()` directly. The dialog's confirm handler calls `toggleLive()`.
- The Follow Leader toggle's `onClick` handler must be replaced with a guard function that checks `sync.isStateChecking` then sets `showFollowDialog: true` instead of calling `toggleFollow()` directly. The dialog's confirm handler calls `toggleFollow()`.
- Use `useRef` to hold a reference to each toggle button so focus can be restored on dialog close — follow the `logout-modal.tsx` pattern.
- Dialog markup follows `logout-modal.tsx` exactly. Replicate its CSS classes, ARIA attributes, focus-trap logic, Escape handler, and backdrop `onClick`. Do not deviate from the established Artisan pattern.
- The dialog title element `id` must be unique per dialog (e.g., `go-live-dialog-title`, `follow-dialog-title`) to satisfy `aria-labelledby`.
- `aria-pressed` on each toggle button must reflect the current `sync.isLive` / `sync.isFollowing` value at all times — it must NOT flip prematurely while the dialog is open.
- While a dialog is open, the toggle button that opened it should not visually change state (no connecting spinner, no active class).

---

## Amendments (from Context Bundle)

> _No `context.md` was present for this task. No anti-pattern reconciliation was required._

---

## Resolution

- **Completed:** 2026-04-24
- **Branch:** `feature/TASK-023-toggle-confirmation`
- **Base branch:** `develop`
- **Files changed:**
  - `src/components/client/ServiceNavigator.tsx` — Added `ConfirmDialog` sub-component (replicating the `logout-modal.tsx` Artisan pattern exactly), two local boolean state values (`showGoLiveDialog`, `showFollowDialog`), `useRef` refs for focus restoration (`goLiveButtonRef`, `followButtonRef`), guard handler functions (`handleGoLiveClick`, `handleGoLiveConfirm`, `handleGoLiveCancel`, `handleFollowClick`, `handleFollowConfirm`, `handleFollowCancel`), direction-aware dialog content map, and dialog render inside a `<>` fragment wrapping the existing nav bar. `useSetlistSync.ts` was not touched.
- **Notes:**
  - The component now returns a React fragment (`<>`) instead of a bare `<div>` so the dialogs can render outside the sticky nav DOM node while remaining co-located in the component. This is a structural-only change — it does not affect the nav's `sticky` positioning or z-index.
  - `aria-pressed` on both toggle buttons continues to reflect `sync.isLive` / `sync.isFollowing` directly — it never flips prematurely while a dialog is open (criteria 32–33).
  - The `ConfirmDialog` sub-component is file-local (not exported). Per the task's Out-of-Scope note, no generic shared `ConfirmDialog` was extracted to a separate file.
  - The `Button` component import was added (`@/components/client/button`) to match `logout-modal.tsx` usage — no new package dependency was introduced.
