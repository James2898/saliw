# Spec — Individual Profile Settings

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

## Fallback Behaviors

- **Profile row not found (SELECT returns null):** The page renders an error paragraph — "Profile not found. Please contact your administrator." — and does not render the `<EditProfileForm>`. The submit button is therefore never reachable in this state.
- **Server Action returns `{ error: '...' }` (Supabase write failure):** The form displays the inline error message below the submit button. The form fields remain populated with the user's last input so they can retry without re-entering data.
- **Unauthenticated access to `/dashboard/profile`:** Server-side `redirect('/login')` fires before any profile data is fetched or rendered.

---

## Resolved Ambiguities

- **Is `email` editable?** No. Email is owned by Supabase Auth (`auth.users`). Changing it requires Supabase Auth Admin APIs not available via the anon key. Resolved: render as read-only display only.
- **Can `role` be displayed?** The spec says `role` must not be updatable via UI. Displaying it read-only is not prohibited, but there is no stated user need for it. Resolved: omit `role` from the form entirely to minimize attack surface and avoid confusion.
- **What if the `profiles` row does not exist for the authenticated user?** The spec does not define this fallback. Resolved: render a visible error state ("Profile not found. Please contact your administrator.") rather than crashing, since the scope explicitly excludes auto-provisioning profile rows.
- **Should `email` be submitted in the Server Action payload?** No. The email field is read-only display only; submitting it would risk an unnecessary UPDATE attempt against a column protected at the RLS layer. Resolved: `updateProfileAction` accepts only `{ full_name }`.
- **What color tokens are safe for input borders and labels on cream?** `text-brand-tan` on `bg-brand-cream` fails WCAG AA (~2.1:1) per codebase context. Resolved: use `border-brand-brown` and `text-brand-brown` for input borders and labels; `text-brand-espresso` for headings and error text.
- **Which feedback pattern replaces toast?** The codebase has no toast library. The context bundle specifies `useTransition` + `useState`. Resolved: inline `<p>` elements for success and error, cleared on next field edit.
- **Does the UPDATE RLS policy need column-level restriction to block `role` updates?** The Server Action already strips `role` from the payload, but defense in depth requires the RLS UPDATE policy to also restrict columns. Resolved: the UPDATE policy specifies only `full_name` in its allowed column set (`FOR UPDATE USING (...) WITH CHECK (...)` on that column only), so even a manually crafted Supabase call cannot escalate role.
- **Where does the `profiles` row `id` come from in the UPDATE?** It must come from `auth.getUser()` server-side, not from client-supplied form data. Resolved: the Server Action retrieves `user.id` from the verified session.
