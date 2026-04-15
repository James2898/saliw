# Context Bundle — Navbar UI Enhancements (Tooltip, Auth Greeting, Logout Modal)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/components/client/navbar.tsx` | The sole navbar component — contains login/logout button, auth state via `onAuthStateChange`, and the `handleAuthAction` function to intercept |
| `src/components/client/button.tsx` | Reusable `Button` component with Artisan variant/size system — usable inside modal confirm/cancel actions |
| `src/styles/globals.css` | Artisan Palette CSS variables (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`), dark mode strategy, global transition rules |
| `src/app/layout.tsx` | Root layout — Navbar is rendered here; no server-side user data is passed down to it |
| `src/services/supabase/client.ts` | `createClient()` browser Supabase client — already used by navbar for `onAuthStateChange` |
| `src/app/actions/profileActions.ts` | Shows the `profiles` table shape and `full_name` field — confirms user full name lives in `profiles.full_name` |
| `src/types/Profile.ts` | `Profile` type: `{ id, email, full_name: string | null, role }` — full name can be null |
| `src/app/actions/authActions.ts` | Server Action patterns for auth — shows `signOut` is not a Server Action; sign-out is done client-side via `supabase.auth.signOut()` |

## Reuse Candidates

- `src/components/client/button.tsx` — Use `Button` component (variants: `primary`, `secondary`, `ghost`) for modal "Confirm" and "Cancel" buttons. Sizes: `sm | md | lg`.
- `src/components/client/navbar.tsx` — The `iconBtnClass` constant holds the shared icon button styles. The `handleAuthAction` function is the sign-out entry point — add modal gate here (set state → open modal → only call sign-out if confirmed). The existing `isOpen` / `isDark` / `user` state pattern (local `useState`) should be followed for the new `showLogoutModal` state.
- `src/styles/globals.css` — The `--brand-*` CSS variables are the single source of truth for palette colors. The `transition-property` global rule must be respected — no `transition-all` overrides.

## Patterns to Follow

- **Client Component state management:** See `navbar.tsx` lines 31–33 — all interactive state is `useState` within the single `Navbar` component. Add `showLogoutModal` and `showTooltip` as additional `useState` booleans in the same pattern.
- **Artisan icon button style:** See `iconBtnClass` in `navbar.tsx` lines 137–143. All interactive icon buttons (login, logout, theme toggle) use this shared class string. The tooltip and modal must match this visual language.
- **Supabase auth subscription:** The navbar uses `supabase.auth.onAuthStateChange` to keep `user` state current (lines 60–72). The `user` object from this hook exposes `user.user_metadata` where `full_name` may live — but based on `profileActions.ts`, the authoritative `full_name` is in the `profiles` table, not `user_metadata`. This is a key ambiguity for requirements engineer to resolve (see Anti-Patterns below).
- **Modal/dialog pattern:** No existing modal component exists — one must be created as a new Client Component at `src/components/client/logout-modal.tsx` (or inlined in the navbar). Follow the mobile sidebar pattern (backdrop overlay + panel, `role="dialog"`, `aria-modal="true"`) for accessibility.
- **Tooltip pattern:** No existing tooltip component — use CSS-only or a lightweight `useState`-gated `div` approach. Lucide icons use `aria-hidden="true"` throughout — tooltip must add accessible text via `aria-label` or `aria-describedby`.

## Anti-Patterns Flagged

- `src/components/client/navbar.tsx` line 61: `createClient()` is called inside a `useEffect` on every mount rather than being memoized. This is an existing pattern — do not replicate for new Supabase calls; do not refactor it in this task (out of scope).
- No `profiles` table fetch is currently done in the navbar — `user.user_metadata?.full_name` may be populated on some auth providers but is not guaranteed for email/password or magic link sign-ins. Fetching from the `profiles` table is required for a reliable display name. The requirements engineer must decide: (a) fetch `profiles` row in an additional Supabase query inside the navbar's auth state effect, or (b) accept `user_metadata.full_name` with a fallback.

## MEMORY.md Notes

- N/A — MEMORY.md does not exist in this project yet.
