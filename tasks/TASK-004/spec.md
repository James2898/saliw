# Spec — Navbar (TASK-004)

## Feature Summary

Build a sticky top navigation bar for the Saliw Music Portal as a Client Component (`src/components/client/navbar.tsx`). The navbar displays the Saliw brand logo (music note icon + "Saliw" text) linking to `/`, navigation links (Dashboard, Library, Setlists with Lucide icons), a light/dark theme toggle, and a login/logout icon button driven by Supabase auth state. It must be inserted into `src/app/layout.tsx` so it appears on every page. The design follows the Artisan palette (cream background, brown tones) and must be dark-mode aware using semantic CSS tokens.

## Acceptance Criteria

1. A new file `src/components/client/navbar.tsx` exists and is marked `'use client'` at the top.
2. The navbar renders a fixed/sticky top bar visible on all routes by being imported in `src/app/layout.tsx`.
3. The left section contains a music note icon in a brown square (`bg-brand-brown`) that links to `/` via Next.js `<Link>`.
4. The "Saliw" text label appears immediately to the right of the icon, bold, and links to `/`.
5. Navigation links are present: "Dashboard" → `/dashboard`, "Library" → `/library`, "Setlists" → `/setlists`.
6. Each navigation link has a relevant Lucide icon: `LayoutDashboard` for Dashboard, `Library` for Library, `List` for Setlists.
7. The active navigation link is visually distinguished — background highlight using `bg-brand-brown/10` and text color `text-brand-brown` (light mode) / `text-brand-tan` (dark mode) — using `usePathname()` from `next/navigation`.
8. A theme toggle button on the far right shows a `Moon` icon in light mode and a `Sun` icon in dark mode.
9. Clicking the theme toggle adds/removes the `dark` class on `document.documentElement` and persists the preference in `localStorage` under the key `"theme"`.
10. On initial load, the navbar reads `localStorage.getItem("theme")` and applies `dark` class if the stored value is `"dark"`.
11. An auth icon button appears on the far right (to the left of or beside the theme toggle): `LogIn` icon when the user is unauthenticated, `LogOut` icon when authenticated.
12. Clicking the `LogIn` icon navigates to `/login` via `router.push('/login')`.
13. Clicking the `LogOut` icon calls `supabase.auth.signOut()` (using `createClient()` from `src/services/supabase/client.ts`) then calls `router.refresh()` to clear server-side session state.
14. Auth state is determined via `supabase.auth.onAuthStateChange` (not a one-shot `getUser` call) to keep the icon reactive.
15. The navbar background uses the semantic token `bg-[var(--brand-background)]` (cream in light mode, `--brand-darker` in dark mode), NOT a hardcoded `bg-brand-cream`.
16. A bottom border `border-b border-brand-brown/20` separates the navbar from page content.
17. All text and icon colors meet WCAG AA contrast ratio on both light and dark backgrounds — specifically, do NOT use `text-brand-tan` on `bg-brand-cream` (low contrast pair flagged in guidelines).
18. The navbar uses `Plus Jakarta Sans` (`font-sans`) for all text labels.
19. The component does not call Supabase or any server function outside of `useEffect` — no direct Supabase calls during SSR.
20. Body top padding is added to `src/app/layout.tsx` (e.g., `pt-16`) so page content is not obscured by the sticky navbar.
21. The new branch is named `feature/TASK-004-navbar` and is branched from `main`.

## Out of Scope

- Mobile hamburger menu or responsive collapsing behavior — navbar shows full horizontal layout only.
- Creating the `/login` page itself — only the nav link target is defined here.
- User avatar or profile dropdown — not in the reference design.
- Notification badges on nav links.
- Breadcrumb navigation.
- Sub-navigation menus.

## Fallback Behaviors

- If `localStorage` is not available (e.g., SSR context), the theme toggle defaults to light mode silently. The `localStorage` access must be guarded inside `useEffect` or with a `typeof window !== 'undefined'` check.
- If Supabase `onAuthStateChange` fires an error or the session is indeterminate, default to showing the `LogIn` icon (unauthenticated state is the safe default).
- If `/login` does not yet exist as a page, the `LogIn` icon still navigates to `/login` — the 404 is acceptable until the login page task is implemented.

## Resolved Ambiguities

- **Theme persistence across reloads** → Use `localStorage` key `"theme"` with values `"dark"` or `"light"`. Read on mount inside `useEffect`. Source: standard Next.js dark mode pattern; no existing implementation found in codebase.
- **Default theme on first visit** → Light mode (cream background). The `html` element already has `background-color: #fdf8f3` set in both `globals.css` and `layout.tsx` body style, confirming light mode as the default.
- **Login click action** → `router.push('/login')` via `useRouter` from `next/navigation`. The `(auth)` route group exists but has no pages yet — `/login` is a future task.
- **Logout click action** → `supabase.auth.signOut()` then `router.refresh()`. The `router.refresh()` is required to invalidate the Next.js server cache so Server Components re-render with the cleared session.
- **Navbar position** → `sticky top-0 z-50` (sticky, not fixed) to preserve normal document flow while keeping navbar visible on scroll.
- **Active link style** → Resolved to `bg-brand-brown/10 text-brand-brown` (light) / `bg-brand-tan/10 text-brand-tan` (dark) background pill, per Artisan palette. No underline — background highlight is consistent with the warm palette aesthetic.
- **`--brand-darker` variable** → Confirmed defined in `src/styles/globals.css` line 9. Safe to reference.
- **Auth route** → `src/app/auth/callback/route.ts` exists (PKCE handler). No login page currently exists. Navbar links to `/login` as a forward declaration.
