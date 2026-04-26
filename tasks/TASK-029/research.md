# Research — Remove Magic Link Login & Add Forgot Password Flow

## Open Questions
- None.

## Resolved from Context

- **Does `reset-password/page.tsx` need a session guard?** → Resolved from context: `auth/callback/route.ts` calls `exchangeCodeForSession` before issuing the `?next=/reset-password` redirect, which means a valid session is established before the user reaches the reset page. No session check is needed on page load, but `updatePasswordAction` will fail naturally if called without a valid session (expired or missing), and the error is surfaced to the user.

- **Does `sendPasswordResetAction` need to distinguish registered vs unregistered emails?** → Resolved from context: Supabase returns HTTP 200 for both cases to prevent user enumeration; the action always returns `{ success: true }` on non-network success. Pattern mirrors `signInWithPasswordAction`'s intentional same-message error for wrong email vs wrong password.

- **Should there be a minimum password length on `ResetPasswordForm`?** → Resolved from context: Supabase's default minimum is 6 characters. `minlength="6"` is added to the input for client-side parity. No server-side enforcement is added beyond what Supabase already applies.

- **`(auth)` route group layout?** → Resolved from context: `src/app/(auth)/` has no `layout.tsx` (only a `.gitkeep`). Each new page must include its own full shell (BUG-003). Consistent with `login/page.tsx` which self-contains its shell.
