# Spec — Remove Magic Link Login & Add Forgot Password Flow

## Feature Summary

Remove the Magic Link authentication option from the login page so that only email + password login remains. Introduce a two-page Forgot Password flow: a request page where users submit their email to receive a Supabase password-reset link, and a landing page where users set their new password after clicking that link. All auth mutations are handled via new Server Actions. No new Supabase Auth provider configuration is required — the existing PKCE callback route handles code exchange; only `resetPasswordForEmail` and `updateUser` are called.

## Acceptance Criteria

### Magic Link Removal
1. The mode toggle (`Password` / `Magic Link` buttons) is removed from `LoginForm.tsx`.
2. The `type Mode = 'password' | 'magic-link'` type and `mode` state are removed.
3. All magic-link form JSX (lines 153–194), magic-link state variables (`magicEmail`, `magicFeedback`, `isMagicPending`, `startMagicTransition`), and `handleMagicLinkSubmit` are removed.
4. `sendMagicLinkAction` is removed from `authActions.ts`.
5. The import of `sendMagicLinkAction` in `LoginForm.tsx` is removed.
6. The email + password form renders directly (no mode condition) as the sole login method.
7. Visiting `/login` shows only the email + password form — no toggle, no magic link option.

### Forgot Password Link on Login Page
8. A "Forgot password?" text link appears below the Submit button inside the existing `LoginForm` card, styled as `text-sm font-sans text-brand-brown dark:text-brand-tan underline` with hover opacity change.
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
22. `src/app/(auth)/reset-password/page.tsx` is a Server Component. It does NOT check for a session — the user lands here directly from the reset email and has no session yet.
23. The page uses the same full-screen shell: `min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4`, with the `Saliw` heading and `Card padding="lg"`.
24. `src/components/client/ResetPasswordForm.tsx` is a Client Component rendered inside the Card.
25. The form contains: a `New Password` label + `type="password"` input (required, minlength 6), a `Confirm Password` label + `type="password"` input (required), and a `Set New Password` submit button (`variant="primary" size="md"`).
26. Before calling the server action, the client validates that both password fields match; if they do not, an inline error "Passwords do not match." is shown and the action is not called.
27. On submit (passwords match), `updatePasswordAction({ password })` is called via `useTransition`.
28. On success (action calls `redirect('/login')` — never returns a value): the user is navigated to `/login`.
29. On error (action returns `{ error: string }`): the error message is rendered below the confirm field styled `text-sm font-sans text-brand-espresso dark:text-brand-cream`; the form remains visible and editable.
30. While the action is pending, the submit button is disabled and shows "Updating…".
31. If the reset token is expired or invalid, Supabase's `updateUser` call returns an error; `updatePasswordAction` returns `{ error: 'This reset link has expired or is invalid. Please request a new one.' }`, and the Reset Password page renders that error with a visible "Request a new link" `<Link href="/forgot-password">` anchor below it.

### Server Actions
32. `sendPasswordResetAction(input: { email: string }): Promise<{ success: true } | { error: string }>` is added to `authActions.ts`.
33. Inside `sendPasswordResetAction`: `origin` is read from `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`; `supabase.auth.resetPasswordForEmail` is called with `email` and `options.redirectTo = \`${origin}/auth/callback?next=/reset-password\``.
34. Because Supabase returns success even for unregistered emails (to prevent user enumeration), `sendPasswordResetAction` always returns `{ success: true }` unless a genuine network/config error occurs, in which case it returns `{ error: 'Unable to send reset link. Please try again.' }`.
35. `updatePasswordAction(input: { password: string }): Promise<{ error: string }>` is added to `authActions.ts`. On success it calls `redirect('/login')` (never returns). On Supabase error it returns `{ error: 'This reset link has expired or is invalid. Please request a new one.' }`. The `redirect()` call is outside any try/catch block.
36. `sendMagicLinkAction` is deleted from `authActions.ts`.

### Dark Mode & Styling (BUG-004 prevention)
37. Every new Artisan palette Tailwind color class (`bg-brand-*`, `text-brand-*`, `border-brand-*`) in both new pages and both new components includes a paired `dark:` variant at time of authoring.
38. Page wrapper background uses `bg-brand-cream dark:bg-brand-darker` — identical to `login/page.tsx`.

### Layout Shell (BUG-003 prevention)
39. `forgot-password/page.tsx` and `reset-password/page.tsx` each include their full layout shell independently (no shared `layout.tsx` exists in the `(auth)` group).

## Out of Scope
- Adding a `layout.tsx` to the `(auth)` route group.
- Any changes to `src/app/auth/callback/route.ts` — it already handles the `?next=` redirect correctly.
- OAuth / social login providers.
- Email template customization in Supabase Dashboard.
- Password strength meter or complexity rules beyond minlength 6 (matching Supabase's default minimum).
- Rate-limiting the reset form on the frontend (Supabase handles server-side rate limiting).
- Any changes to `login/page.tsx` other than what `LoginForm.tsx` internally renders.

## Fallback Behaviors
- `sendPasswordResetAction`: If `NEXT_PUBLIC_SITE_URL` is not set, falls back to `http://localhost:3000` for the `redirectTo` URL — consistent with existing `sendMagicLinkAction` pattern.
- `updatePasswordAction` expired/invalid token: Returns a specific error string; `ResetPasswordForm` renders the error and shows a "Request a new link" link to `/forgot-password` so the user is not dead-ended.
- No "MISSING" backend endpoints — both new actions use the standard Supabase JS client already configured in the project.

## Resolved Ambiguities
- "Forgot password link placement" — inside `LoginForm.tsx` below the submit button, not in `login/page.tsx`, keeping the page a pure layout shell consistent with current pattern. Source: existing `login/page.tsx` structure.
- "Should sendPasswordResetAction expose whether the email is registered?" — No. Supabase's `resetPasswordForEmail` returns success regardless of whether the email exists; the action mirrors this behavior to prevent user enumeration. Source: Supabase Auth documentation and existing `signInWithPasswordAction` pattern (same email for wrong email vs wrong password).
- "Where does redirect() live in updatePasswordAction?" — Outside any try/catch, consistent with the documented pattern in `authActions.ts` comments: "redirect() must NOT be inside a try/catch block." Source: `authActions.ts` lines 8–15.
- "Does reset-password/page.tsx need a session check?" — No. The user arrives directly from the reset email without a session. The `auth/callback` route exchanges the code and sets a short-lived session before redirecting to `/reset-password`, so `updateUser` will have an active session by the time the form is submitted. Source: `auth/callback/route.ts` — `exchangeCodeForSession` runs before the `?next=` redirect.
- "Which task number?" — TASK-029 (next available after TASK-028). Source: `tasks/` directory listing.
