# TASK-029 — Remove Magic Link Login & Add Forgot Password Flow

- **Tier:** 1
- **Date Created:** 2026-04-25
- **Status:** In Progress

---

## Feature Summary

Remove the Magic Link authentication option from the login page so that only email + password login remains. Introduce a two-page Forgot Password flow: a request page where users submit their email to receive a Supabase password-reset link, and a landing page where users set their new password after clicking that link. All auth mutations are handled via new Server Actions. No new Supabase Auth provider configuration is required — the existing PKCE callback route handles code exchange; only `resetPasswordForEmail` and `updateUser` are called.

---

## Acceptance Criteria

### Magic Link Removal
1. The mode toggle (`Password` / `Magic Link` buttons) is removed from `LoginForm.tsx` (lines 73–97).
2. The `type Mode = 'password' | 'magic-link'` type and `mode` state are removed.
3. All magic-link form JSX (lines 153–194), magic-link state variables (`magicEmail`, `magicFeedback`, `isMagicPending`, `startMagicTransition`), and `handleMagicLinkSubmit` are removed.
4. `sendMagicLinkAction` is deleted from `authActions.ts`.
5. The import of `sendMagicLinkAction` in `LoginForm.tsx` is removed.
6. The email + password form renders directly (no mode condition) as the sole login method.
7. Visiting `/login` shows only the email + password form — no toggle, no magic link option.

### Forgot Password Link on Login Page
8. A "Forgot password?" text link appears below the Submit button inside the existing `LoginForm` card, styled as `text-sm font-sans text-brand-brown dark:text-brand-tan underline hover:opacity-75 transition-opacity duration-200`.
9. The link navigates to `/forgot-password` (Next.js `<Link>` component, not a plain `<a>`).
10. The link is rendered inside `LoginForm.tsx` (Client Component) — no changes to `login/page.tsx` layout.

### Forgot Password Page — `/forgot-password`
11. `src/app/(auth)/forgot-password/page.tsx` is a Server Component that checks for an active session; authenticated users are redirected to `/`.
12. The page uses the same full-screen shell as `login/page.tsx`: `min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4`, with the `Saliw` heading and `Card padding="lg"`.
13. `src/components/client/ForgotPasswordForm.tsx` is a Client Component rendered inside the Card.
14. The form contains: an `Email` label + `type="email"` input (required), and a `Send Reset Link` submit button (`variant="primary" size="md"`).
15. Input and label use the same `inputClass` and `labelClass` tokens already defined in `LoginForm.tsx`.
16. On submit, `sendPasswordResetAction({ email })` is called via `useTransition`.
17. On success (action returns `{ success: true }`): the form is hidden and a success message is displayed — "Check your inbox — a password reset link has been sent." — styled `text-sm font-sans text-brand-brown dark:text-brand-tan`.
18. On error (action returns `{ error: string }`): the error message is rendered below the input styled `text-sm font-sans text-brand-espresso dark:text-brand-cream`; the form remains visible and editable.
19. A "Back to sign in" `<Link href="/login">` link appears below the form (and below the success message when shown), styled `text-sm font-sans text-brand-brown dark:text-brand-tan underline`.
20. While the action is pending, the submit button is disabled and shows "Sending…".
21. Client-side `type="email"` validation prevents submission of a syntactically invalid email before the action is called.

### Reset Password Page — `/reset-password`
22. `src/app/(auth)/reset-password/page.tsx` is a Server Component. It does NOT check for a session — the user lands here directly from the reset email.
23. The page uses the same full-screen shell: `min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4`, with the `Saliw` heading and `Card padding="lg"`.
24. `src/components/client/ResetPasswordForm.tsx` is a Client Component rendered inside the Card.
25. The form contains: a `New Password` label + `type="password"` input (required, `minlength="6"`), a `Confirm Password` label + `type="password"` input (required), and a `Set New Password` submit button (`variant="primary" size="md"`).
26. Before calling the server action, the client validates that both password fields match; if they do not, an inline error "Passwords do not match." is shown and the action is not called.
27. On submit (passwords match), `updatePasswordAction({ password })` is called via `useTransition`.
28. On success (action calls `redirect('/login')` — never returns a value): the user is navigated to `/login`.
29. On error (action returns `{ error: string }`): the error message is rendered below the confirm field styled `text-sm font-sans text-brand-espresso dark:text-brand-cream`; the form remains visible and editable.
30. While the action is pending, the submit button is disabled and shows "Updating…".
31. If the error text contains `"expired or invalid"`: also render a `<Link href="/forgot-password">` with text "Request a new link" below the error so the user is not dead-ended.

### Server Actions
32. `sendPasswordResetAction(input: { email: string }): Promise<{ success: true } | { error: string }>` is added to `authActions.ts`.
33. Inside `sendPasswordResetAction`: `origin` is read from `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`; `supabase.auth.resetPasswordForEmail` is called with `email` and `options.redirectTo = \`${origin}/auth/callback?next=/reset-password\``.
34. Because Supabase returns success even for unregistered emails (to prevent user enumeration), `sendPasswordResetAction` always returns `{ success: true }` unless a genuine network/config error occurs, in which case it returns `{ error: 'Unable to send reset link. Please try again.' }`.
35. `updatePasswordAction(input: { password: string }): Promise<{ error: string }>` is added to `authActions.ts`. On success it calls `redirect('/login')` (never returns). On Supabase error it returns `{ error: 'This reset link has expired or is invalid. Please request a new one.' }`. The `redirect()` call is placed **outside** any try/catch block — consistent with the documented pattern in `authActions.ts`.
36. `sendMagicLinkAction` is deleted from `authActions.ts`.

### Dark Mode — BUG-004 prevention
37. Every new Artisan palette Tailwind color class (`bg-brand-*`, `text-brand-*`, `border-brand-*`) in both new pages and both new components includes a paired `dark:` variant at time of authoring.
38. Page wrapper background uses `bg-brand-cream dark:bg-brand-darker` — identical to `login/page.tsx`.

### Layout Shell — BUG-003 prevention
39. `forgot-password/page.tsx` and `reset-password/page.tsx` each include their full layout shell independently. No shared `layout.tsx` exists in the `(auth)` route group — do not create one.

---

## Out of Scope

- Adding a `layout.tsx` to the `(auth)` route group.
- Any changes to `src/app/auth/callback/route.ts` — it already handles the `?next=` redirect correctly.
- OAuth / social login providers.
- Email template customization in the Supabase Dashboard.
- Password strength meter or complexity rules beyond `minlength="6"` (matching Supabase's default minimum).
- Frontend rate-limiting of the reset form (Supabase handles server-side rate limiting).
- Any changes to `login/page.tsx` other than what `LoginForm.tsx` internally renders.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/LoginForm.tsx` | Remove magic link code; add "Forgot password?" link below submit button |
| `src/app/actions/authActions.ts` | Delete `sendMagicLinkAction`; add `sendPasswordResetAction` and `updatePasswordAction` |
| `src/app/(auth)/forgot-password/page.tsx` | New — Forgot Password page (Server Component, full shell, session-redirects authenticated users) |
| `src/app/(auth)/reset-password/page.tsx` | New — Reset Password page (Server Component, full shell, no session check) |
| `src/components/client/ForgotPasswordForm.tsx` | New — Client Component form for requesting password reset email |
| `src/components/client/ResetPasswordForm.tsx` | New — Client Component form for setting new password after reset |
| `src/app/(auth)/login/page.tsx` | Reference only — layout shell pattern to replicate in new pages |
| `src/app/auth/callback/route.ts` | Reference only — already handles `?next=` redirect; no changes needed |
| `src/services/supabase/server.ts` | Reference only — import path for `createClient` in Server Components and Server Actions |
| `src/components/client/button.tsx` | Reference only — `Button` component with `variant` and `size` props |
| `src/components/server/card.tsx` | Reference only — `Card` component with `padding` prop |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-029/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-029/research.md` | Open questions + resolved decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- The `(auth)` route group has **no `layout.tsx`** (only a `.gitkeep` exists). Each page must be a self-contained standalone shell — see `login/page.tsx` for the exact pattern. Failing to include the shell is BUG-003.
- `redirect()` in `updatePasswordAction` **must be outside any try/catch block**. Next.js implements `redirect()` by throwing a `NEXT_REDIRECT` error internally; if this throw is caught by a try/catch, it is swallowed and treated as an action error instead of navigating the user. See existing `authActions.ts` comments for the documented pattern.
- Supabase returns HTTP 200 for `resetPasswordForEmail` even when the email is not registered. Always return `{ success: true }` on non-error to prevent user enumeration attacks.
- `auth/callback/route.ts` calls `exchangeCodeForSession` before issuing the `?next=/reset-password` redirect, meaning a valid session is established before the user reaches the reset page. `updatePasswordAction` will therefore have an active session available — no special session handling is needed on the reset page itself.
- The `NEXT_PUBLIC_SITE_URL` environment variable is used for the `redirectTo` URL in `sendPasswordResetAction`. Fall back to `http://localhost:3000` if unset, consistent with the existing `sendMagicLinkAction` pattern.
- Read `MEMORY.md` sections **BUG-003** and **BUG-004** before implementing the page shells and any Artisan palette classes.

---

## Amendments (from Context Bundle)

> _No `context.md` artifact was produced for this task. No amendments were needed._

---

## Resolution

- **Completed:** 2026-04-25
- **Branch:** develop
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/LoginForm.tsx` — removed mode toggle, all magic-link state/JSX/handlers; added "Forgot password?" `<Link>` below submit button
  - `src/app/actions/authActions.ts` — deleted `sendMagicLinkAction`; added `sendPasswordResetAction` (returns `{ success: true }` for both registered and unregistered emails) and `updatePasswordAction` (redirect outside try/catch)
  - `src/app/(auth)/forgot-password/page.tsx` — new Server Component with full layout shell; redirects authenticated users to `/`
  - `src/app/(auth)/reset-password/page.tsx` — new Server Component with full layout shell; no session check (PKCE callback handles session before user arrives)
  - `src/components/client/ForgotPasswordForm.tsx` — new Client Component; success replaces form with confirmation message; "Back to sign in" link always visible
  - `src/components/client/ResetPasswordForm.tsx` — new Client Component; client-side password-match validation before calling action; "Request a new link" anchor shown when error contains "expired or invalid"
- **Notes:**
  - `redirect('/login')` in `updatePasswordAction` is at the function top level — no try/catch wraps it. Confirmed per BUG pattern in docs.
  - All new Artisan palette classes include paired `dark:` variants (BUG-004).
  - Both new pages self-contain their full layout shell — no shared `layout.tsx` created (BUG-003).
  - `sendPasswordResetAction` always returns `{ success: true }` on non-error to prevent user enumeration attacks, consistent with Supabase's own HTTP 200 behavior for unregistered emails.
