# Spec — Confirmation Dialogs for Go Live and Follow Leader Toggles

## Feature Summary

Add pre-action confirmation dialogs to both the "Go Live" toggle (visible to Music Directors only) and the "Follow the Leader" toggle (visible to non-director musicians only) on the setlist view page. Each toggle currently fires its Supabase Realtime side-effect immediately on click. The new behavior requires a modal confirmation step before any state change or channel operation occurs. This prevents accidental broadcasts and accidental subscription changes, which are irreversible in-session without a second deliberate action.

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

## Out of Scope

- Changing the underlying `toggleLive()` or `toggleFollow()` logic in `useSetlistSync.ts` — the hook is called as-is after confirmation.
- Adding any cooldown, debounce, or double-toggle prevention beyond the "one dialog open at a time" guard (criterion 30).
- Persisting dialog preferences (e.g., "don't ask again").
- Building a new generic `ConfirmDialog` component — the implementation should reuse or copy the `LogoutModal` pattern, either by extracting a shared component or by creating role-specific modal components.
- Any changes to how `liveError` or `followError` messages are displayed after a confirmed action fails.
- Any change to toggle button placement, sizing, or existing Artisan styling outside the dialog itself.
- Notification or feedback to musicians when the director ends the live session (existing `followSyncStatus === 'lost'` handling covers this).

## Fallback Behaviors

- Both toggles depend on `sync.toggleLive` and `sync.toggleFollow` being available as stable function refs passed via the `sync` prop. These always exist — no MISSING API scenario applies. No disabled fallback is needed.
- If a dialog is opened and the user's role changes mid-session (edge case: page reload required to change role), the component unmounts and remounts, naturally cleaning up any open dialog state.

## Resolved Ambiguities

- Dialog timing → Dialog appears BEFORE the toggle flips. `toggleLive()` / `toggleFollow()` are not called until the user confirms. Source: user answer Q1.
- Cancel behavior → Cancel keeps the toggle in its prior state with no visual change. Source: user answer Q2.
- Go Live ON copy → "All musicians will follow your performance key in real-time." Source: user-approved direction Q3.
- Go Live OFF copy → "Musicians following you will lose the live feed and revert to their last known keys." Source: user-approved direction Q4 (proposed from what the action does: `removeChannel` drops the broadcast source).
- Follow Leader ON copy → "Your keys will sync to the director's live session. Your current keys will be saved and restored if you stop following." Source: proposed from `toggleFollow` ON logic (state check snapshot + subscribe).
- Follow Leader OFF copy → "You'll unsubscribe from the live feed. Your keys will revert to the snapshot taken when you started following." Source: proposed from `toggleFollow` OFF logic (`removeChannel` + `setOverrideKeys(stateCheckSnapshot)`).
- Effect timing → Realtime change takes effect immediately on confirm. Source: user answer Q5.
- Role/visibility → Go Live is director-only (`isLeader === true`); Follow Leader is non-director only (`isLeader === false`). The two dialogs are never visible to the same user simultaneously. Source: user answer Q6.
- Realtime on disable → Go Live OFF removes director's channel; Follow Leader OFF unsubscribes the musician and reverts keys to snapshot. Both are immediate on confirm. Source: user answer Q7.
- `ConfirmDialog.tsx` does not exist — the existing pattern is `logout-modal.tsx` at `src/components/client/logout-modal.tsx`. This is the Artisan-styled modal reference for styling and accessibility implementation. Source: codebase inspection.
- Duplicate-click while dialog open → Resolved as "ignore the second click / allow only one dialog open per toggle at a time." Proposed default, no user answer required given standard modal guard practice.
- Enter key behavior → Enter confirms when focus is on the confirm button (native button behavior). No special Enter-to-confirm-from-anywhere behavior is added, to avoid conflicting with other keyboard interactions in the setlist view. Proposed default.
