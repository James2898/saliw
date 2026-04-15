# Research — Individual Profile Settings

## Open Questions

- None.

---

## Codebase Findings Relevant to Implementation

### Auth Pattern
- Server-side auth gate: `supabase.auth.getUser()` via `createClient()` from `src/services/supabase/server.ts`, then `redirect('/login')` if null. Pattern confirmed in `docs/coding-guidelines.md` and consistent with existing dashboard pages.
- Browser client (`src/services/supabase/client.ts`) uses anon key only — must not be used for server-side auth checks.

### Server Action Pattern
- `src/app/actions/` directory exists but is empty (only `.gitkeep`). `profileActions.ts` will be the first real action file in this directory.
- All server actions must use `try/catch` per `docs/coding-guidelines.md`. No unhandled Promise rejections allowed.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in any server action or client-accessible code.

### Type Convention
- Existing types (`src/types/Song.ts`, `src/types/Singer.ts`, `src/types/Setlist.ts`) use plain `export type`, snake_case properties. `Profile.ts` must follow the same pattern.

### Component Boundaries
- `src/app/dashboard/profile/page.tsx` — Server Component, no `'use client'`.
- `src/components/client/EditProfileForm.tsx` — Client Component, requires `'use client'` directive.
- Dashboard layout (`src/app/dashboard/layout.tsx`) wraps all `/dashboard/*` children in `bg-brand-cream` + `<Card padding="lg">` automatically. The profile page does not need to re-apply these wrappers.

### Button Component
- `src/components/client/button.tsx` — accepts `variant="primary|secondary|ghost"`, `size="sm|md|lg"`, and standard HTML button props including `disabled`. The `disabled` state applies `opacity-50 cursor-not-allowed` automatically.

### Feedback Pattern
- No toast library in the project. Use `useTransition` (for `isPending` during Server Action call) + `useState` for success/error string. Inline `<p>` elements rendered conditionally.

### Contrast-Safe Color Pairs (on `bg-brand-cream`)
- `text-brand-espresso` — ~14:1 — WCAG AAA. Use for headings, error messages.
- `text-brand-brown` — ~4.8:1 — WCAG AA. Use for labels, secondary text, read-only fields, success messages.
- `text-brand-tan` on cream — ~2.1:1 — WCAG FAIL. Must not be used for any text.
- `border-brand-brown` — safe for input borders.
- Focus ring: `focus-visible:ring-brand-brown` — consistent with existing `<Button>` and navbar patterns.

### Card Component
- `src/components/server/card.tsx` — `<Card padding="lg" className="...">` renders a rounded border container. Already applied by dashboard layout; do not double-wrap.

### Icons
- Lucide React is the locked icon library (`docs/tech-stack.md`). Use for any icons added to the profile page.

### Typography
- `font-sans` maps to Plus Jakarta Sans (`--font-plus-jakarta-sans`) loaded in `src/app/layout.tsx`.
- `font-mono` maps to JetBrains Mono — not appropriate for form UI.

### RLS Column Restriction (Defense in Depth)
- The Supabase UPDATE policy for `profiles` should restrict updatable columns to `full_name` only. This is a SQL-level control independent of what the Server Action sends, preventing role escalation via direct Supabase calls.
- SQL pattern: `CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);` combined with a column-level grant: `REVOKE UPDATE (role, email) ON profiles FROM authenticated;` — or alternatively, grant UPDATE on specific columns only.
