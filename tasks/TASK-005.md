# TASK-005 — Individual Profile Settings

- **Tier:** 1
- **Date Created:** 2026-04-15
- **Status:** In Progress

---

## Feature Summary

This task establishes the `profiles` table in Supabase and builds the UI that allows an authenticated Music Director to view and update their own profile (full name only). The `email` field is displayed read-only as it originates from Supabase Auth and must never be mutated through the UI. The `role` field is never exposed or updatable via the UI or Server Action, enforcing that role elevation is exclusively a database-level operation. The profile page lives at `/dashboard/profile`, inherits the existing dashboard Card layout, and uses the Artisan design system throughout.

---

## Acceptance Criteria

### Database

1. A `profiles` table exists in Supabase with columns: `id` (uuid, PK, references `auth.users.id`), `email` (text, unique, not null), `full_name` (text, nullable), `role` (text, not null, default `'music_director'`).
2. An RLS policy named (or functionally equivalent to) `profiles_select_own` allows SELECT only where `auth.uid() = id`.
3. An RLS policy named (or functionally equivalent to) `profiles_update_own` allows UPDATE only where `auth.uid() = id`.
4. The UPDATE policy permits only the `full_name` column — the `role` and `email` columns are not included in the allowed column list of the UPDATE policy, preventing any direct Supabase client UPDATE from changing them.
5. RLS is enabled on the `profiles` table (no default-permit fallthrough).

### TypeScript Types

6. `src/types/Profile.ts` exports a plain `type Profile` with snake_case properties matching the table: `id: string`, `email: string`, `full_name: string | null`, `role: string`.
7. The `Profile` type does not include any properties absent from the database schema.

### Server Action

8. `src/app/actions/profileActions.ts` exports an async `updateProfileAction` Server Action.
9. `updateProfileAction` accepts only `{ full_name: string }` as its mutable input — it never accepts `role`, `id`, or `email` as parameters.
10. Before executing any mutation, `updateProfileAction` calls `supabase.auth.getUser()` using the `@supabase/ssr` server client; if no authenticated session is returned, the action returns `{ error: 'Unauthorized' }` without executing the UPDATE.
11. `updateProfileAction` is wrapped in a `try/catch`; on Supabase error it returns `{ error: '<human-readable message>' }`; on success it returns `{ success: true }`.
12. `updateProfileAction` does not import or reference `SUPABASE_SERVICE_ROLE_KEY` at any point.
13. `updateProfileAction` does not accept or pass `role` in the Supabase `.update()` call payload.

### Page — Server Component

14. `src/app/dashboard/profile/page.tsx` is a Server Component (no `'use client'` directive).
15. On load, the page calls `supabase.auth.getUser()` via the server client; if no user is found it calls `redirect('/login')`.
16. The page fetches the authenticated user's `profiles` row using `.from('profiles').select('id, email, full_name, role').eq('id', user.id).single()`.
17. If the `profiles` row does not exist (e.g. a new user whose profile has not been seeded), the page renders a visible error state — a paragraph with text such as "Profile not found. Please contact your administrator." — rather than crashing or showing an empty form.
18. The page renders the page title "Profile Settings" as an `<h1>` using `text-brand-espresso` (contrast-safe on cream background, ~14:1).
19. The page passes the fetched `profile` data as a prop to `<EditProfileForm>`.

### Form — Client Component

20. `src/components/client/EditProfileForm.tsx` carries the `'use client'` directive.
21. The form renders a read-only `email` field: an `<input>` with `readOnly` (or a plain `<p>`) visually styled with `text-brand-brown` on cream — contrast-safe (~4.8:1). It must never be submitted to the Server Action.
22. The form renders an editable `full_name` `<input>` with a visible `<label>` ("Full Name"). The input border uses `border-brand-brown` (not `border-brand-tan`) and focus ring uses `ring-brand-brown` to pass WCAG AA.
23. The `role` field is never rendered anywhere in the form — not as a visible element, a hidden input, or a data attribute.
24. On submit, the form calls `updateProfileAction({ full_name })` via `useTransition` to track the pending state.
25. While the Server Action is in-flight (`isPending === true`), the submit button renders in a disabled state and displays a loading label (e.g., "Saving…") using the existing `<Button variant="primary">` component with `disabled` prop.
26. On success (`result.success === true`), the form renders an inline success message — a visible `<p>` with text such as "Profile updated." — using `text-brand-brown` (contrast-safe). No toast library is used.
27. On error (`result.error` is defined), the form renders an inline error message — a visible `<p>` with the error string — using `text-brand-espresso` or a safe high-contrast color. No toast library is used.
28. Both the success and error messages disappear (are cleared from state) when the user begins editing the form again (i.e., `onChange` on any field resets feedback state).
29. The form does not call any Supabase client directly. All mutations go through `updateProfileAction`.

### Styling & Artisan Compliance

30. All text rendered on the cream background (`bg-brand-cream`) uses `text-brand-espresso` (~14:1) or `text-brand-brown` (~4.8:1). `text-brand-tan` on cream is never used (fails WCAG AA at ~2.1:1).
31. Input fields use `font-sans` (Plus Jakarta Sans) consistent with other dashboard UI.
32. The page does not introduce any new external npm libraries beyond what is already installed.

### Auth & Security

33. Navigating to `/dashboard/profile` while unauthenticated results in a server-side `redirect('/login')` — the profile data is never exposed to unauthenticated requests.
34. The Server Action cannot be used to change another user's profile: the `id` used in the UPDATE is always derived from `auth.getUser()` on the server, never from client-supplied input.

---

## Out of Scope

- Signup or onboarding flow (no new user registration UI).
- Avatar / photo upload.
- Password change or email change UI.
- Role management or role assignment UI of any kind.
- Admin view of other users' profiles.
- Automatic profile row creation on new user signup (trigger/function in Supabase) — profile rows are assumed to be pre-seeded for existing Music Directors.
- Email field editability.
- Any form of toast notification library integration.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/services/supabase/server.ts` | `createClient()` — the only client to use for server-side auth checks and mutations |
| `src/app/dashboard/layout.tsx` | Wraps all `/dashboard/*` routes in `bg-brand-cream` + `<Card padding="lg">` — do not re-apply these wrappers in the profile page |
| `src/components/client/button.tsx` | `<Button variant="primary" disabled>` — use for the submit button; `disabled` state already applies `opacity-50 cursor-not-allowed` |
| `docs/coding-guidelines.md` | Artisan color tokens, contrast rules, Server Action patterns, naming conventions |
| `src/types/Song.ts` | Reference for the plain `export type` + snake_case pattern to follow in `Profile.ts` |
| `src/app/actions/` | Destination directory for `profileActions.ts` — currently empty (only `.gitkeep`) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/Profile.ts` | TypeScript type matching the `profiles` table |
| `src/app/actions/profileActions.ts` | `updateProfileAction` Server Action |
| `src/app/dashboard/profile/page.tsx` | Profile Settings page — Server Component |
| `src/components/client/EditProfileForm.tsx` | Editable profile form — Client Component |

---

## Technical Schema

N/A — no API contract required for this task.

---

## SQL Migration

Run the following in the Supabase SQL editor (or include as a migration file). This is fully copy-pasteable.

```sql
-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id        uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email     text        NOT NULL UNIQUE,
  full_name text,
  role      text        NOT NULL DEFAULT 'music_director'
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: each user can read only their own row
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: each user can update only their own row
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level defense in depth:
-- Prevent role and email from being updated even via a direct Supabase call.
-- Grant UPDATE only on full_name to the authenticated role.
REVOKE UPDATE (role, email) ON public.profiles FROM authenticated;
-- If REVOKE granularity is not supported in your Supabase tier, use the alternative below.
-- Alternative (grant-only pattern):
--   REVOKE ALL ON public.profiles FROM authenticated;
--   GRANT SELECT ON public.profiles TO authenticated;
--   GRANT UPDATE (full_name) ON public.profiles TO authenticated;
```

> Note: If `REVOKE UPDATE (role, email)` is not available in your Supabase plan, use the grant-only alternative pattern shown in the comment block. Either approach achieves the same result: only `full_name` is writable by the `authenticated` role.

---

## TypeScript Types

**File:** `src/types/Profile.ts`

```typescript
export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
}
```

Follow the same plain `export type` + snake_case pattern used in `src/types/Song.ts`, `src/types/Singer.ts`, and `src/types/Setlist.ts`.

---

## Server Action Logic

**File:** `src/app/actions/profileActions.ts`

Security rules — enforce all of these:
- Import `createClient` from `src/services/supabase/server.ts` only. Never import the browser client.
- Never reference or import `SUPABASE_SERVICE_ROLE_KEY`.
- Call `supabase.auth.getUser()` first. If `user` is null, return `{ error: 'Unauthorized' }` immediately — do not reach the UPDATE call.
- Derive `user.id` from the verified session. Never accept `id` as a parameter from the caller.
- Accept only `{ full_name: string }` as the mutable payload. Never accept `role`, `id`, or `email`.
- Pass only `{ full_name }` to `.update()`. Never include `role` or `email` in the update payload.
- Wrap the entire mutation in `try/catch`. On Supabase error, return `{ error: 'Unable to update profile. Please try again.' }` (or the Supabase error message if it is safe to surface). On success, return `{ success: true }`.

```typescript
'use server'

import { createClient } from '@/services/supabase/server'

export async function updateProfileAction(
  input: { full_name: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.full_name })
      .eq('id', user.id)

    if (error) {
      return { error: 'Unable to update profile. Please try again.' }
    }

    return { success: true }
  } catch {
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
```

---

## Page Component Structure

**File:** `src/app/dashboard/profile/page.tsx`

- No `'use client'` directive — this is a Server Component.
- The dashboard layout (`src/app/dashboard/layout.tsx`) already applies `bg-brand-cream` and `<Card padding="lg">`. Do not add another Card or background wrapper inside this page.
- Auth gate: `supabase.auth.getUser()` → if no user → `redirect('/login')`.
- Data fetch: `.from('profiles').select('id, email, full_name, role').eq('id', user.id).single()`.
- If fetch returns no data or an error, render an error paragraph — do not render `<EditProfileForm>`.
- Pass the fetched `profile` as a prop to `<EditProfileForm profile={profile} />`.

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'
import EditProfileForm from '@/components/client/EditProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold font-sans text-brand-espresso">
        Profile Settings
      </h1>
      {!profile ? (
        <p className="text-brand-espresso">
          Profile not found. Please contact your administrator.
        </p>
      ) : (
        <EditProfileForm profile={profile} />
      )}
    </div>
  )
}
```

---

## Form Component Structure

**File:** `src/components/client/EditProfileForm.tsx`

Requirements:
- Must carry `'use client'` directive at the top.
- Import `updateProfileAction` from `@/app/actions/profileActions`.
- Import `Button` from `@/components/client/button`.
- Import `Profile` type from `@/types/Profile`.
- Use `useTransition` for `isPending` tracking during the Server Action call.
- Use `useState` for `fullName` (controlled input), `feedback` (success/error message), and `feedbackType` ('success' | 'error' | null).
- `onChange` on the `full_name` input must clear feedback state.
- The `email` field must be rendered read-only and must NOT be included in the form submission.
- The `role` field must not appear anywhere — not as a visible field, hidden input, or data attribute.
- On submit: call `updateProfileAction({ full_name: fullName })` inside `startTransition`.
- Display feedback inline — a `<p>` element — using `text-brand-brown` for success and `text-brand-espresso` for error.
- Submit button: `<Button variant="primary" disabled={isPending}>` with label switching between `"Save Changes"` and `"Saving…"`.

Contrast-safe styling for inputs on cream background:
- Label: `text-brand-espresso` or `text-brand-brown`
- Input border: `border-brand-brown` (NOT `border-brand-tan`)
- Input focus ring: `focus-visible:ring-brand-brown`
- Input font: `font-sans`
- Read-only email: `text-brand-brown bg-transparent` (or similar muted styling that is still AA-compliant)

```typescript
'use client'

import { useState, useTransition } from 'react'
import { updateProfileAction } from '@/app/actions/profileActions'
import Button from '@/components/client/button'
import type { Profile } from '@/types/Profile'

interface EditProfileFormProps {
  profile: Profile
}

export default function EditProfileForm({ profile }: EditProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFullName(e.target.value)
    setFeedback(null)
    setFeedbackType(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfileAction({ full_name: fullName })
      if ('success' in result) {
        setFeedback('Profile updated.')
        setFeedbackType('success')
      } else {
        setFeedback(result.error)
        setFeedbackType('error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">

      {/* Email — read-only display, never submitted */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold font-sans text-brand-espresso">
          Email
        </label>
        <input
          type="email"
          value={profile.email}
          readOnly
          className="font-sans text-brand-brown bg-transparent border border-brand-brown/40 rounded-xl px-3 py-2 cursor-not-allowed opacity-70"
        />
      </div>

      {/* Full Name — editable */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="full_name"
          className="text-sm font-semibold font-sans text-brand-espresso"
        >
          Full Name
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={handleChange}
          className="font-sans text-brand-espresso bg-transparent border border-brand-brown rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
        />
      </div>

      {/* Inline feedback */}
      {feedback && feedbackType === 'success' && (
        <p className="text-sm font-sans text-brand-brown">{feedback}</p>
      )}
      {feedback && feedbackType === 'error' && (
        <p className="text-sm font-sans text-brand-espresso">{feedback}</p>
      )}

      <Button type="submit" variant="primary" size="md" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
```

---

## Fallback Behaviors

| Scenario | Behavior |
|----------|----------|
| Profile row not found (SELECT returns null) | Page renders `<p>Profile not found. Please contact your administrator.</p>` — `<EditProfileForm>` is never rendered. |
| Server Action returns `{ error: '...' }` | Form displays the inline error `<p>` below the submit button. Form fields remain populated so the user can retry without re-entering data. |
| Unauthenticated access to `/dashboard/profile` | Server-side `redirect('/login')` fires before any profile data is fetched or rendered. |

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-005/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-005/research.md` | Codebase findings + open questions (none outstanding) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory (if present in the project).
- The branch name for this task is: `feature/TASK-005-profile-settings`. Create it from the latest `main`.
- The `'use server'` directive must be the very first line of `profileActions.ts` (before imports).
- The `'use client'` directive must be the very first line of `EditProfileForm.tsx` (before imports).
- `profileActions.ts` is the first real file in `src/app/actions/` — the directory already exists with a `.gitkeep` only.
- Never use `text-brand-tan` on `bg-brand-cream` — this pair fails WCAG AA (~2.1:1). Use `text-brand-brown` (~4.8:1) or `text-brand-espresso` (~14:1) only.
- The dashboard layout already applies `bg-brand-cream` and `<Card padding="lg">`. Do not add a second Card or background wrapper inside the profile page.
- No new npm packages are permitted for this task. All required primitives (`useTransition`, `useState`) are already available from React.
- The SQL migration must be applied in Supabase before running the app. The `REVOKE UPDATE (role, email)` column restriction is defense-in-depth: it blocks role escalation even if someone calls the Supabase client directly, independent of the Server Action payload guard.
- Icons, if any are added to the page, must come from `lucide-react` — the locked icon library per `docs/tech-stack.md`.

---

## Verification Checklist

Before marking this task complete, verify each item manually:

- [ ] `profiles` table exists with all four columns (`id`, `email`, `full_name`, `role`) and correct types/constraints.
- [ ] RLS is enabled on `profiles` (confirmed in Supabase dashboard — Authentication > Policies).
- [ ] `profiles_select_own` policy exists and enforces `auth.uid() = id`.
- [ ] `profiles_update_own` policy exists and enforces `auth.uid() = id`.
- [ ] Column-level restriction (`REVOKE UPDATE (role, email)`) is applied — test by attempting a direct `.update({ role: 'admin' })` via Supabase client and confirming it fails.
- [ ] `src/types/Profile.ts` — plain `export type`, four snake_case fields only.
- [ ] `src/app/actions/profileActions.ts` — `'use server'` is the first line; no `SUPABASE_SERVICE_ROLE_KEY` reference; only `{ full_name }` in `.update()` payload; `try/catch` present.
- [ ] `src/app/dashboard/profile/page.tsx` — no `'use client'` directive; `redirect('/login')` fires for unauthenticated users; "Profile not found" error state renders when data is null.
- [ ] `src/components/client/EditProfileForm.tsx` — `'use client'` is the first line; `role` field is absent from the DOM; email field is `readOnly`; `onChange` clears feedback state.
- [ ] Submit button shows "Saving…" and is `disabled` while the Server Action is in-flight.
- [ ] Success message ("Profile updated.") renders inline after a successful save; no toast library used.
- [ ] Error message renders inline after a failed save; no toast library used.
- [ ] No `text-brand-tan` used as text color anywhere on the profile page.
- [ ] Navigating to `/dashboard/profile` in a logged-out browser session redirects to `/login` (not a blank page or error).
- [ ] No new npm packages added (`package.json` unchanged).

---

## Resolution

- **Completed:** 2026-04-15
- **Branch:** feature/TASK-005-profile-settings
- **Base branch:** main
- **Files changed:**
  - `supabase/migrations/20260415000000_create_profiles_table.sql` — profiles table DDL, RLS policies (select_own + update_own), and REVOKE UPDATE on role/email columns
  - `src/types/Profile.ts` — plain export type with four snake_case fields (id, email, full_name, role)
  - `src/app/actions/profileActions.ts` — updateProfileAction Server Action: auth-gated via getUser(), updates only full_name, wrapped in try/catch
  - `src/components/client/EditProfileForm.tsx` — Client Component with useTransition + useState feedback; role field absent; email readOnly and excluded from submission; onChange clears feedback
  - `src/app/dashboard/profile/page.tsx` — Server Component; redirects to /login when unauthenticated; renders error paragraph when profile row is missing
- **Notes:** Build passes with zero TypeScript errors (`npm run build` confirmed). The SQL migration must be applied manually in the Supabase SQL editor before the page is usable. The `REVOKE UPDATE (role, email)` instruction is defense-in-depth on top of the Server Action payload guard — if the Supabase plan does not support column-level REVOKE, the grant-only alternative in the migration comment achieves the same result.
