# TASK-034 — Loading Indicators and Save Feedback for Async Buttons

- **Tier:** 1
- **Date Created:** 2026-04-27
- **Status:** Implementation Complete
- **Branch:** `feat/loading-feedback-states` (off `develop`)

---

## Feature Summary

Every button or interactive control that triggers an async operation (Server Action, Supabase mutation, or client-side navigation that incurs a network round-trip) must display a loading indicator while the operation is in-flight and must present a clear success or error message once it completes. Currently several controls in the Saliw portal show no in-flight state and give no post-operation feedback, leaving users unsure whether their action was received. This task standardises the pattern across all affected controls using the conventions already established in SongEditorClient and SetlistPeopleSection as the authoritative reference.

---

## Acceptance Criteria

### Loading State — General Rules

1. When an async operation is in-flight, the triggering button must be `disabled` (HTML attribute) and must display a spinner (Lucide `Loader2` with `animate-spin` class, `aria-hidden="true"`) alongside a verb-based label in the present-progressive tense (e.g. "Saving…", "Deleting…"). The button must not change its layout dimensions when switching between idle and loading states.

2. The `disabled` state must apply the existing `disabled:opacity-50 disabled:cursor-not-allowed` class pairing already defined on the shared `Button` component. No new disabled style is introduced.

3. No skeleton overlay or full-page loading screen is used for these controls. The pattern is always: spinner-inside-button + disabled state, consistent with GoLiveButton, SetlistPanel Save, and CloneSetlistDialog.

4. While a button is in loading state, all other async buttons on the same page that share the same resource must also be disabled (e.g. Save and Delete in MusicianForm both set `isAnyPending`; this dual-lock pattern is already present and must be preserved or extended).

5. Purely client-side actions that have no network round-trip — theme toggle, tab switch (Edit/Preview), "Clean" in SongEditorClient, sidebar open/close, Cancel buttons in dialogs — must NOT receive loading indicators. Navigation links (`<Link href="...">`) must not receive loading indicators except for `NewSongButton`, which already uses a router.push + spinner pattern because it triggers client-side route preparation; that existing pattern is considered correct and is not changed.

### Success Feedback

6. On a successful save that does NOT navigate away, an inline success message is displayed adjacent to the triggering control. The exact text per surface is:
   - **SongEditorClient Save Changes:** "Saved!" (already implemented — criterion confirms and locks in the existing 2-second auto-dismiss)
   - **EditProfileForm Save Changes:** "Profile updated." (already implemented — criterion confirms; must NOT auto-dismiss; the message persists until the user edits the field again)
   - **SetlistBuilderClient Save (create mode):** no inline message required — the router navigates to the new setlist immediately on success
   - **SetlistBuilderClient Save (edit mode):** no inline message required — the router re-mounts the page via `router.push` on success
   - **SetlistPeopleSection Add Musician:** no inline message required — the new entry appears in the lineup list immediately as visual confirmation
   - **SetlistPeopleSection Remove Musician:** no inline message required — the entry disappears from the list immediately as visual confirmation
   - **SetlistPeopleSection Worship Leader select:** no inline message required — the select control reflects the new value immediately as visual confirmation
   - **MusicianForm Save (create mode):** no inline message — router navigates to /musicians on success
   - **MusicianForm Save (edit mode):** no inline message — router navigates to /musicians on success
   - **MusicianForm Delete:** no inline message — router navigates to /musicians on success
   - **NewSongFormClient Create Song:** no inline message — router navigates to /library/[id] on success
   - **CloneSetlistDialog Clone:** no inline message — router navigates to new setlist on success
   - **ForgotPasswordForm Send Reset Link:** replaces the entire form with a static confirmation message "Check your inbox — a password reset link has been sent." (already implemented — criterion confirms; this is permanent, not auto-dismissed)
   - **LoginForm Sign In:** on success the action calls `redirect()` server-side; no inline success message is needed or possible
   - **ResetPasswordForm Set New Password:** on success the action calls `redirect('/login')` server-side; no inline success message is needed

7. Success messages must use `text-brand-brown dark:text-brand-tan` for color, matching the existing EditProfileForm pattern. They must NOT use green text unless they carry `aria-live="polite"` and the text is programmatically associated with the control — the only existing green text instance is `SongEditorClient`'s "Saved!" span, which already has `aria-live="polite"` and uses `text-green-700 dark:text-green-400`. This pattern may be reused only for transient (auto-dismissing) success messages. Non-dismissing success messages use `text-brand-brown dark:text-brand-tan`.

8. Auto-dismiss applies only to transient success messages where the user will immediately continue editing (SongEditorClient). The dismiss delay is 2 000 ms. No other surface uses auto-dismiss for success messages.

### Error Feedback

9. On failure, an inline error message must appear adjacent to the triggering control. The triggering button must return to its idle (enabled) state immediately after the error is set, so the user can retry.

10. Error messages must use `role="alert"` so screen readers announce them without requiring focus. This attribute is already present on MusicianForm, NewSongFormClient, SetlistPeopleSection, SongEditorClient, GoLiveButton, and FollowLeaderButton error messages; the pattern must be applied uniformly to any currently missing cases.

11. Error text for network/server failures must follow the pattern already established in Server Actions: user-facing strings such as "Unable to save setlist. Please try again." rather than raw Supabase error codes. The component must display `result.error` verbatim when the Server Action returns a user-facing string, not a generic fallback that hides the action's message.

12. Error messages must use `text-red-700 dark:text-red-400` — the pattern already in MusicianForm and NewSongFormClient. GoLiveButton and FollowLeaderButton use `text-red-500 dark:text-red-400`; these are considered inconsistent and should be updated to `text-red-700 dark:text-red-400` to match the dominant pattern and to satisfy WCAG AA contrast on cream/light backgrounds. (`red-700` at #b91c1c on cream #FDF8F3 passes AA; `red-500` at #ef4444 does not.)

13. Error messages must clear when the user subsequently edits any relevant input field in the same form. This is already implemented in MusicianForm, NewSongFormClient, LoginForm, ForgotPasswordForm, and ResetPasswordForm; the pattern must not be broken by this task.

### Navbar Sign-out (handleLogoutConfirm)

14. The Logout confirmation button inside LogoutModal calls `supabase.auth.signOut()` directly in the Navbar. If `signOut` returns an error, the current code only `console.error`s it and returns silently. A visible error must be displayed to the user. Since the LogoutModal has no error prop, this requires either: (a) adding an `error` prop to LogoutModal and wiring it from Navbar state, or (b) displaying the error inline below the modal's action row. The chosen approach must not break the existing focus-return and dialog accessibility pattern. The error text for sign-out failure must be: "Sign out failed. Please try again."

15. The Logout button in LogoutModal (the "Sign out" Button) must display a spinner and be disabled while `signOut` is awaiting. This requires a new `isSigningOut` prop on LogoutModal (or equivalent) passed from Navbar.

### NewSetlistButton

16. `NewSetlistButton` is a `<Link href="/setlists/new">` with no async operation — it is a standard Next.js navigation link. It must NOT receive a loading indicator. This is correct by definition; the criterion locks in the decision and ensures no spinner is added to this component.

### PaginationControls

17. `PaginationControls` calls `router.replace(...)` — a purely client-side navigation action with no Server Action or Supabase call. It must NOT receive loading indicators. The criterion locks in this decision.

### Accessibility

18. Every button that transitions to a loading state must update its `aria-label` to reflect the in-progress action using present-progressive tense (e.g. `aria-label="Saving changes"` while saving). This is already done in GoLiveButton and FollowLeaderButton. It must be applied uniformly: for buttons that have an `aria-label`, it must change during loading; for buttons whose accessible name comes from their visible text content, the visible label change (e.g. "Saving…") is sufficient — no separate `aria-label` is required.

19. Inline error messages that appear dynamically must have `role="alert"` (already required by criterion 10). No `aria-live` region beyond what `role="alert"` provides is required for error messages.

20. Transient success messages that appear dynamically in the DOM must have `aria-live="polite"` to be announced without interrupting the user. The existing `SongEditorClient` "Saved!" span already does this correctly. New success message spans, if added, must carry `aria-live="polite"`.

21. While a button is `disabled`, it must still be focusable by keyboard for screen reader navigation. The shared `Button` component and its `disabled:opacity-50 disabled:cursor-not-allowed` styling do not add `tabIndex="-1"`; this must not be changed.

### Artisan Palette Constraints

22. Spinner color must match the button's current foreground text color, achieved by inheriting `currentColor` through Lucide's default stroke behavior. No explicit spinner color class is added; `Loader2` with `animate-spin` and `aria-hidden="true"` is the sole spinner element.

23. No new color class is introduced for success or error states beyond: `text-brand-brown dark:text-brand-tan` (non-dismissing success), `text-green-700 dark:text-green-400` (transient success with `aria-live`), `text-red-700 dark:text-red-400` (errors). The GoLiveButton and FollowLeaderButton inline error color (`text-red-500 dark:text-red-400`) must be updated to `text-red-700 dark:text-red-400`.

24. BUG-004 applies: every Tailwind class that affects color, background, or border must include an explicit `dark:` variant. No Tailwind utility class that affects visual appearance may appear without its `dark:` counterpart.

---

## Out of Scope

- Toast/snackbar component. The project uses inline feedback exclusively; no global notification system is introduced in this task.
- Top-of-page banner feedback. Not used by any existing component; not introduced here.
- Skeleton loading placeholders for page-level data fetching (handled by Next.js `loading.tsx` files already present).
- Optimistic UI updates (pre-emptively changing data before server confirms) — the project does not use optimistic updates for most mutations; this task does not introduce them.
- Loading indicators for `PaginationControls`, `NewSetlistButton`, nav links in the Navbar, and the "Clean" button in SongEditorClient.
- Automated test coverage (unit or E2E tests) — not part of this task.
- Any change to Server Action error messages — they are already user-facing strings and are displayed verbatim.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/LoginForm.tsx` | Update error handling and clear errors on input change; confirm login redirect pattern (no inline success needed) |
| `src/components/client/ForgotPasswordForm.tsx` | Confirm form replacement pattern with static "Check your inbox" message; ensure it persists (no auto-dismiss) |
| `src/components/client/ResetPasswordForm.tsx` | Update error handling; confirm redirect('/login') pattern on success (no inline success needed) |
| `src/components/client/EditProfileForm.tsx` | Confirm "Profile updated." message persists on save; ensure error clearing on field edit |
| `src/components/client/MusicianForm.tsx` | Add loading states to Save and Delete buttons; confirm dual-lock (`isAnyPending`) pattern; update error color to `text-red-700 dark:text-red-400` if needed; confirm navigation on success (no inline message) |
| `src/components/client/NewSongFormClient.tsx` | Add loading state to Create Song button; confirm error color is `text-red-700 dark:text-red-400`; confirm navigation on success (no inline message) |
| `src/components/client/SongEditorClient.tsx` | Confirm loading spinner on Save Changes button; confirm "Saved!" success message with `aria-live="polite"` and 2-second auto-dismiss; confirm error message uses `role="alert"` |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | Add loading states to Save button (both create and edit modes); confirm navigation on success (no inline message required) |
| `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` | Confirm loading spinner on Clone button; confirm navigation on success (no inline message) |
| `src/components/client/SetlistBuilder/SetlistPanel.tsx` | Confirm Save button has loading spinner; confirm error message uses `role="alert"` |
| `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` | Confirm Add/Remove musician and Worship Leader select all have appropriate async feedback; entries disappear/appear as visual confirmation (no inline message) |
| `src/components/client/GoLiveButton.tsx` | Update inline error color from `text-red-500 dark:text-red-400` to `text-red-700 dark:text-red-400` (criterion 12) |
| `src/components/client/FollowLeaderButton.tsx` | Update inline error color from `text-red-500 dark:text-red-400` to `text-red-700 dark:text-red-400` (criterion 12) |
| `src/components/client/navbar.tsx` | Add `isSigningOut` state; pass to LogoutModal; wire error state for sign-out failure feedback |
| `src/components/client/logout-modal.tsx` | Add `isSigningOut` prop; display loading spinner on "Sign out" button while signing out; add error prop and display inline error below action row if sign-out fails |
| `src/components/client/button.tsx` | Reference only — confirm `disabled:opacity-50 disabled:cursor-not-allowed` classes exist; no changes needed |

---

## Technical Schema

N/A — no API contract required for this task. All Server Actions already return `{ error: string }` on failure. No new endpoints or mutations are introduced.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-034/spec.md` | Acceptance criteria + scope (already finalized at `tasks/pending/spec.md`) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (if present in this project).
- Read `docs/tech-stack.md` before choosing any library or package (if present in this project).
- Read `docs/structure.md` before creating any new file or directory (if present in this project).

### MEMORY.md Constraints

This task must respect the following bugs and patterns recorded in MEMORY.md:

- **BUG-002 (useCallback property-path deps):** If new `useCallback` hooks are introduced to manage loading state transitions, do not depend on object property paths (e.g., `dep: button.state.isLoading`). Instead, depend on the whole object or use inline callbacks. See `/Users/adish/projects/saliw/.claude/projects/-Users-adish-projects-saliw/memory/bug_react_compiler_usecallback_property_path_dep.md`.

- **BUG-004 (dark mode variants):** Criterion 24 already enforces this: every Tailwind utility that affects color, background, or border must include an explicit `dark:` variant. When adding color classes (`text-brand-brown`, `text-red-700`, `text-green-700`, etc.), always pair with `dark:text-*`. See `/Users/adish/projects/saliw/.claude/projects/-Users-adish-projects-saliw/memory/bug_dashboard_missing_dark_mode_variants.md`.

### Key Implementation Patterns

- **Spinner pattern:** Use Lucide's `Loader2` with `animate-spin` and `aria-hidden="true"`. Let `currentColor` inheritance handle color.
- **Loading state management:** Use local React state (`useState`) to track `isLoading` per button. Avoid property-path deps in any callback hooks.
- **Error clearing:** Implement `useEffect` or inline handlers that clear error state when the user edits a relevant input field (criterion 13).
- **Aria-label updates:** For buttons with explicit `aria-label`, update the label during loading (criterion 18). For buttons whose label is their visible text, the visible text change is sufficient.
- **Async operations:** All Server Actions already return `{ error: string }`. Display the error verbatim if present; otherwise fallback to "An unexpected error occurred. Please try again."

---

## Resolution

- **Completed:** 2026-04-27
- **Branch:** `feat/loading-feedback-states` (off `develop`)
- **Base branch:** `develop`
- **Files changed:**
  - `src/components/client/LoginForm.tsx` — Added Loader2 spinner inside Sign In button; added `aria-label` switch during loading; updated error to `role="alert"` + `text-red-700 dark:text-red-400`.
  - `src/components/client/ForgotPasswordForm.tsx` — Added Loader2 spinner inside Send Reset Link button; updated error to `role="alert"` + red-700; success message confirmed (no auto-dismiss).
  - `src/components/client/ResetPasswordForm.tsx` — Added Loader2 spinner inside Set New Password button; updated error to `role="alert"` + red-700.
  - `src/components/client/EditProfileForm.tsx` — Added Loader2 spinner inside Save Changes button; success message keeps `text-brand-brown dark:text-brand-tan` and now carries `aria-live="polite"`; error switched to `role="alert"` + red-700.
  - `src/components/client/MusicianForm.tsx` — Added Loader2 spinner inside Save and Delete buttons; added `aria-label` switch during loading. Dual-lock (`isAnyPending`) preserved.
  - `src/components/client/NewSongFormClient.tsx` — Added Loader2 spinner inside Create Song button; normalized "Creating…" ellipsis; added error-clearing on title/artist/singer/key inputs (was only on content). aria-label updated during loading.
  - `src/components/client/SongEditorClient.tsx` — Added Loader2 spinner inside Save Changes button; aria-label switches between "Save changes" and "Saving changes".
  - `src/components/client/SetlistBuilder/SetlistPanel.tsx` — Replaced bespoke `<span>` spinner on Save with Lucide Loader2; added aria-label switch.
  - `src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` — Replaced bespoke `<span>` spinner on Clone setlist with Lucide Loader2; added aria-label switch.
  - `src/components/client/SetlistBuilder/SetlistPeopleSection.tsx` — Added Loader2 spinner adjacent to disabled Worship Leader select while saving; added Loader2 spinners inside Add and Remove buttons; updated all three inline error colors from `text-red-600 dark:text-red-400` to `text-red-700 dark:text-red-400`; aria-labels updated during loading.
  - `src/components/client/SetlistBuilder/ErrorBanner.tsx` — Updated banner message text from `text-brand-brown` to `text-red-700 dark:text-red-400`; paired the dismiss button hover/text colors with explicit `dark:` variants. Modified to enforce uniform error color (AC 12); not in original Relevant Files but is the rendering surface for the SetlistBuilder save error.
  - `src/components/client/GoLiveButton.tsx` — Inline error color updated from `text-red-500 dark:text-red-400` to `text-red-700 dark:text-red-400` (AC 12).
  - `src/components/client/FollowLeaderButton.tsx` — Inline error color updated from `text-red-500 dark:text-red-400` to `text-red-700 dark:text-red-400` (AC 12).
  - `src/components/client/logout-modal.tsx` — Added optional `isSigningOut` and `error` props. Loader2 spinner replaces "Sign out" label while signing out; both action buttons disabled during sign-out. Inline `role="alert"` error renders below the action row using `text-red-700 dark:text-red-400`.
  - `src/components/client/navbar.tsx` — Added `isSigningOut` and `signOutError` state. `handleLogoutConfirm` now sets loading + error state, surfaces "Sign out failed. Please try again." on failure, and only closes the modal on success. `handleLogoutCancel` is a no-op while signing out (preserves dialog accessibility). `openLogoutModal` clears any prior error.
- **Notes:**
  - One file outside the spec's Relevant Files was touched: `SetlistBuilder/ErrorBanner.tsx`. AC 12 requires uniform `text-red-700 dark:text-red-400` for error messages; the SetlistBuilder save error renders through this banner, so the color was unified there. Reviewer should confirm this is acceptable; it could be reverted with no behavioral impact other than restoring the prior brown text.
  - All pre-existing inline `<span>` spinners (CloneSetlistDialog, SetlistPanel) were replaced with Lucide `Loader2 + animate-spin` to match the canonical convention in AC 1 and to keep `currentColor` inheritance consistent with GoLiveButton/FollowLeaderButton.
  - The Worship Leader `<select>` is not a button; AC 1's "spinner-inside-button" pattern does not apply. The implemented pattern is: keep the existing `disabled={wlLoading}` and render a small Loader2 adjacent to the select while the action is in flight. No success message — the select reflects the new value as visual confirmation per AC 6.
  - LogoutModal Escape and backdrop clicks are now ignored while `isSigningOut` is true (Navbar's `handleLogoutCancel` early-returns). This preserves the existing focus-return pattern and avoids losing the in-flight error if the network call is still resolving.
  - `npm run build` passes locally with no new warnings or errors. Three pre-existing `react-hooks/exhaustive-deps` warnings in `useSetlistSync.ts` are unchanged.
  - No new package dependencies were introduced; `lucide-react` was already a direct dependency used elsewhere in the project.
