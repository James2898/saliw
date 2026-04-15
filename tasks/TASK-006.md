# TASK-006 — Login Page UI + Supabase Auth

- **Tier:** 2
- **Date Created:** 2026-04-15
- **Status:** In Progress

---

## Feature Summary

Build the Saliw login page at `/login` inside the `(auth)` route group. Supports two auth methods:
1. **Email + Password** — `supabase.auth.signInWithPassword()`, resolves server-side, redirects to `/` on success.
2. **Magic Link / OTP** — `supabase.auth.signInWithOtp()`, sends an email; user clicks the link which hits the existing PKCE callback route and redirects to `/`.

A Server Component wrapper checks if the user is already authenticated and redirects to `/` if so. A Client Component renders the interactive form with a mode toggle. A simple auth error page is created at `/auth/auth-code-error` for failed PKCE exchanges.

---

## Acceptance Criteria

### Route & File Structure

1. `src/app/(auth)/login/page.tsx` exists as a Server Component (no `'use client'` directive).
2. `src/app/auth/auth-code-error/page.tsx` exists as a simple Server Component displaying a plain error message.
3. `src/app/actions/authActions.ts` exports `signInWithPasswordAction` and `sendMagicLinkAction` as Server Actions.

### Already-Authenticated Redirect (Server Component)

4. On load, `LoginPage` calls `supabase.auth.getUser()` via the SSR server client; if a valid user session is found, it calls `redirect('/')` before rendering the form.
5. This check is performed in the Server Component — not client-side — so no flash of the login form is visible to authenticated users.

### Login Form — Email + Password

6. The form renders an email `<input>` with a visible `<label>` ("Email").
7. The form renders a password `<input type="password">` with a visible `<label>` ("Password").
8. On submit via the "Sign In" button, `signInWithPasswordAction({ email, password })` is called.
9. On success, the Server Action performs a server-side `redirect('/')`.
10. On error, the form renders an inline error `<p>` using a contrast-safe color. No toast library.
11. The "Sign In" button is disabled and shows "Signing in…" while the action is in-flight (`isPending === true`).

### Login Form — Magic Link

12. A secondary mode (toggled via a tab UI) allows the user to enter their email and request a magic link.
13. On submit, `sendMagicLinkAction({ email })` is called.
14. On success (OTP email sent), the form shows an inline confirmation: "Check your email — a sign-in link has been sent."
15. On error, the form shows an inline error message with contrast-safe styling.
16. The "Send Magic Link" button is disabled and shows "Sending…" while in-flight.

### Auth Error Page

17. Navigating to `/auth/auth-code-error` renders a plain page with: "Sign-in failed. The link may have expired or already been used. Please try signing in again." and a link back to `/login`.
18. The error page uses Artisan palette styling but does not require a complex layout.

### Artisan Palette & WCAG Compliance

19. Page background uses `bg-brand-cream` (light) / `dark:bg-brand-darker` (dark).
20. All body text uses `text-brand-espresso` (~14:1 on cream) or `text-brand-brown` (~4.8:1 on cream). `text-brand-tan` on cream is NEVER used (fails WCAG AA at ~2.1:1).
21. Input borders use `border-brand-brown` (not `border-brand-tan`).
22. Input focus rings use `ring-brand-brown`.
23. The "Sign In" button uses `<Button variant="primary">` from `src/components/client/button.tsx`.
24. The "Send Magic Link" button uses `<Button variant="ghost">` from `src/components/client/button.tsx`.
25. The login card uses `<Card padding="lg">` from `src/components/server/card.tsx`.

### Security

26. Neither Server Action references or imports `SUPABASE_SERVICE_ROLE_KEY`.
27. Both Server Actions use `createClient()` from `src/services/supabase/server.ts` only — never the browser client.
28. `signInWithPasswordAction` calls `redirect('/')` OUTSIDE any try/catch block (Next.js `redirect()` throws `NEXT_REDIRECT` internally — catching it without re-throwing silently breaks the redirect).
29. No auth tokens, session data, or user PII are returned to the Client Component from either action.

### No New Dependencies

30. No new npm packages are introduced. All primitives (`useTransition`, `useState`) are from React.

---

## Interaction States

### Email + Password

| State | Trigger | UI |
|---|---|---|
| Idle | Page load | Form enabled, fields empty |
| Submitting | "Sign In" clicked | Button disabled, label "Signing in…" |
| Success | No error from action | Server-side redirect to `/` |
| Error — invalid credentials | Supabase returns error | Inline `<p>`: "Invalid email or password. Please try again." |
| Error — server failure | Unexpected exception | Inline `<p>`: "An unexpected error occurred. Please try again." |
| Reset | User edits any field | Error feedback cleared |

### Magic Link

| State | Trigger | UI |
|---|---|---|
| Idle | Mode selected | Email field enabled |
| Submitting | Button clicked | Button disabled, label "Sending…" |
| Success | OTP sent | Inline `<p>`: "Check your email — a sign-in link has been sent." |
| Error | Supabase/network error | Inline `<p>`: "Unable to send sign-in link. Please try again." |
| Reset | User edits email | Feedback cleared |

---

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/app/actions/authActions.ts` | Server Actions | `signInWithPasswordAction` + `sendMagicLinkAction` |
| `src/app/(auth)/login/page.tsx` | Server Component | Session check + redirect; renders `<LoginForm>` inside `<Card>` |
| `src/components/client/LoginForm.tsx` | Client Component | Mode toggle, password form, magic link form, inline feedback |
| `src/app/auth/auth-code-error/page.tsx` | Server Component | PKCE error message + link back to `/login` |

## Files NOT Modified

| File | Reason |
|------|--------|
| `src/app/auth/callback/route.ts` | Already complete — no changes needed |
| `src/app/(auth)/callback/route.ts` | Already complete — no changes needed |
| `src/middleware.ts` | Auth gating is NOT done here — session refresh only |
| `src/services/supabase/server.ts` | No changes needed |
| `src/services/supabase/client.ts` | No changes needed |

---

## Integration Contract

### Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|---|---|---|---|---|---|
| Sign in with password | `signInWithPasswordAction()` | `src/app/actions/authActions.ts` | public (Supabase Auth) | EXISTS | N/A |
| Send magic link | `sendMagicLinkAction()` | `src/app/actions/authActions.ts` | public (Supabase Auth) | EXISTS | N/A |
| PKCE code exchange | `GET /auth/callback` route handler | `src/app/auth/callback/route.ts` | public | EXISTS | N/A |

All three use Supabase Auth methods in the already-installed `@supabase/ssr` package. No new Supabase table or RLS policy is needed for the login page.

### signInWithPasswordAction — EXISTS

- **Method:** `supabase.auth.signInWithPassword({ email, password })`
- **Input:** `{ email: string; password: string }`
- **Return:** `{ error: string }` on failure | calls `redirect('/')` on success (never returns a value)
- **RLS:** None — Supabase Auth layer, not a database table
- **Error copy:** "Invalid email or password. Please try again." (same for wrong email AND wrong password — prevents user enumeration)

### sendMagicLinkAction — EXISTS

- **Method:** `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
- **Input:** `{ email: string }`
- **Return:** `{ success: true }` | `{ error: string }`
- **RLS:** None — Supabase Auth layer
- **`emailRedirectTo`:** `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`
- **Note:** `NEXT_PUBLIC_SITE_URL` is confirmed set in `.env.local` and Vercel.

---

## Implementation Notes

1. Branch: `feature/TASK-006-login-page` from latest `main`.
2. `'use server'` must be the very first line of `authActions.ts` (before imports).
3. `'use client'` must be the very first line of `LoginForm.tsx` (before imports).
4. `redirect('/')` in `signInWithPasswordAction` must NOT be inside a try/catch block — Next.js `redirect()` throws `NEXT_REDIRECT` internally; catching without re-throwing silently breaks the redirect.
5. `sendMagicLinkAction` returns `{ success: true }` — it does NOT redirect. The user must click the emailed link.
6. Never use `text-brand-tan` as text color on cream backgrounds — contrast ratio ~2.1:1 fails WCAG AA.
7. Input borders: `border-brand-brown`. Focus ring: `ring-brand-brown`.
8. The login Card must be centered on the page using `min-h-screen flex items-center justify-center`.
9. No new npm packages permitted — `package.json` must be unchanged.
10. `NEXT_PUBLIC_SITE_URL` is already set in `.env.local` — confirmed by user.

---

## Error Message Copy

| Condition | User-facing text |
|---|---|
| Invalid email/password | "Invalid email or password. Please try again." |
| User not found | "Invalid email or password. Please try again." (same — no enumeration) |
| Magic link send failure | "Unable to send sign-in link. Please try again." |
| Unexpected server error | "An unexpected error occurred. Please try again." |
| PKCE exchange failure | "Sign-in failed. The link may have expired or already been used. Please try signing in again." |

---

## Verification Checklist

- [ ] `src/app/(auth)/login/page.tsx` — Server Component, no `'use client'`; session check + redirect
- [ ] `src/components/client/LoginForm.tsx` — `'use client'` first line; no Supabase imports
- [ ] `src/app/actions/authActions.ts` — `'use server'` first line; no service role key reference
- [ ] `src/app/auth/auth-code-error/page.tsx` — Server Component; error message + `/login` link
- [ ] `LoginPage` redirects to `/` if user is already authenticated
- [ ] `signInWithPasswordAction` — `redirect('/')` is outside any try/catch
- [ ] `sendMagicLinkAction` — returns `{ success: true }`, does NOT redirect
- [ ] Both actions import from `src/services/supabase/server.ts` only
- [ ] No `text-brand-tan` used as text on light/cream backgrounds
- [ ] All inputs use `border-brand-brown` and `ring-brand-brown`
- [ ] `<Button variant="primary">` for Sign In; `<Button variant="ghost">` for Send Magic Link
- [ ] `<Card padding="lg">` wraps the login form
- [ ] Sign In button shows "Signing in…" and is disabled while pending
- [ ] Send Magic Link button shows "Sending…" and is disabled while pending
- [ ] Password error clears on field change
- [ ] Magic link feedback clears on email field change
- [ ] `NEXT_PUBLIC_SITE_URL` used in `sendMagicLinkAction` for `emailRedirectTo`
- [ ] `package.json` unchanged — no new dependencies
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
