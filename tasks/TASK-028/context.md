# Context Bundle — Remove Magic Link / Add Forgot Password

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/LoginForm.tsx` | Renders both the mode toggle (Password / Magic Link) and both login forms — primary file to edit |
| `src/app/actions/authActions.ts` | Contains `signInWithPasswordAction` (keep) and `sendMagicLinkAction` (remove); new `sendPasswordResetAction` goes here |
| `src/app/(auth)/login/page.tsx` | Login page Server Component; renders `LoginForm` inside `Card`; route group is `(auth)` |
| `src/app/auth/callback/route.ts` | PKCE callback at `/auth/callback`; already calls `exchangeCodeForSession` — password recovery emails also route here with `type=recovery` |
| `src/app/auth/auth-code-error/page.tsx` | Error fallback page; layout reference for new reset-error states |
| `src/services/supabase/server.ts` | Server-side Supabase client (`createClient`) used in all Server Actions |
| `src/services/supabase/client.ts` | Browser Supabase client; exposes `getRealtimeClient` singleton — NOT used in auth actions |
| `src/components/client/button.tsx` | Artisan `Button` component (variants: `primary`, `secondary`, `ghost`) — reuse in Forgot Password UI |
| `src/components/server/card.tsx` | Artisan `Card` component with `padding` prop — reuse for new reset pages |

## Reuse Candidates
- `src/components/client/button.tsx` — Use `variant="primary"` for the send-reset-email submit, and `variant="ghost"` or a plain `<Link>` for the back-to-login control; the `disabled` + `opacity-50` state is already built in
- `src/components/server/card.tsx` — Use `Card padding="lg"` as the outer container for new `/(auth)/forgot-password/page.tsx` and `/(auth)/reset-password/page.tsx`, matching the login page layout exactly
- `src/app/(auth)/login/page.tsx` — Reuse the full page shell (`min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4`) for all new auth pages; note the `(auth)` route group has no `layout.tsx` (only `.gitkeep`), so each page must include this shell independently
- `sendMagicLinkAction` pattern in `src/app/actions/authActions.ts` lines 44–66 — the try/catch + `{ success: true } | { error: string }` return shape is the established pattern for email-dispatching Server Actions; the new `sendPasswordResetAction` must follow this exact shape
- `inputClass` / `labelClass` string constants in `LoginForm.tsx` lines 12–17 — copy verbatim into any new form component for visual consistency

## Patterns to Follow
- **Server Action shape (email dispatch):** See `sendMagicLinkAction` in `src/app/actions/authActions.ts` lines 44–66 — returns `{ success: true } | { error: string }`, wraps body in try/catch, uses `createClient` from `@/services/supabase/server`
- **Redirect outside try/catch:** See `signInWithPasswordAction` lines 16–33 — `redirect()` must never be inside a try/catch block because Next.js throws `NEXT_REDIRECT` internally; catching it silently breaks navigation
- **Client form feedback state:** See `LoginForm.tsx` lines 35–39 — feedback uses `{ type: 'success' | 'error', message: string } | null`; replicate this shape in `ForgotPasswordForm`
- **useTransition for Server Actions:** See `LoginForm.tsx` lines 40, 55–69 — all async Server Action calls go through `startTransition`; replicate in any new client form
- **Dark mode class pairing:** See `inputClass` line 12 and `labelClass` line 17 in `LoginForm.tsx` — every Artisan class has an explicit `dark:` pair; required per BUG-004

## Anti-Patterns Flagged
- `src/components/client/LoginForm.tsx` lines 74–97: The mode toggle uses raw `<button>` elements with manually composed Tailwind strings instead of the shared `Button` component — do not replicate this in new controls; use `Button` for any new interactive elements

## MEMORY.md Notes
- **BUG-004 (Dashboard missing dark mode):** Every Artisan palette Tailwind class (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must have an explicit `dark:` pair — Tailwind named utilities bypass CSS variable switching. The new forgot-password and reset-password pages must follow this. The `inputClass` and `labelClass` constants in `LoginForm.tsx` are the correct reference.
- **BUG-003 (Missing layout shell):** The `(auth)` route group has no `layout.tsx` — each page must independently include the full page shell. Do not assume a wrapper is provided.
- **BUG-001 (setState in useEffect):** Use lazy `useState` initializer if initial state is computed; do not call `setState` synchronously inside `useEffect`.
- **BUG-002 (React Compiler useCallback deps):** `useCallback` dependency arrays must reference whole objects, not property paths.
