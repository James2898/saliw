# TASK-004 — Navbar

- **Tier:** 1
- **Date Created:** 2026-04-14
- **Status:** In Progress

---

## Feature Summary

Build a sticky top navigation bar for the Saliw Music Portal as a Client Component (`src/components/client/navbar.tsx`). The navbar displays the Saliw brand logo (music note icon + "Saliw" text) linking to `/`, navigation links (Dashboard, Library, Setlists with Lucide icons), a light/dark theme toggle, and a login/logout icon button driven by Supabase auth state. It must be inserted into `src/app/layout.tsx` so it appears on every page. The design follows the Artisan palette (cream background, brown tones) and must be dark-mode aware using semantic CSS tokens.

---

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
11. An auth icon button appears on the far right (beside the theme toggle): `LogIn` icon when the user is unauthenticated, `LogOut` icon when authenticated.
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

---

## Out of Scope

- Mobile hamburger menu or responsive collapsing behavior — navbar shows full horizontal layout only.
- Creating the `/login` page itself — only the nav link target is defined here.
- User avatar or profile dropdown — not in the reference design.
- Notification badges on nav links.
- Breadcrumb navigation.
- Sub-navigation menus.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/button.tsx` | Reuse ghost variant for icon buttons; follow the `'use client'` + Artisan class pattern |
| `src/components/server/card.tsx` | Reference for server/client boundary pattern |
| `src/styles/globals.css` | All brand CSS variables and dark mode semantic tokens (`--brand-background`, `.dark` block) |
| `src/services/supabase/client.ts` | `createClient()` — the correct browser Supabase client for auth state in Client Components |
| `src/app/layout.tsx` | Root layout — import and render `<Navbar />` above `{children}` here; add `pt-16` to body |
| `src/app/dashboard/layout.tsx` | Reference for existing page layout; NOTE: hardcodes `bg-brand-cream` — do NOT replicate |
| `src/middleware.ts` | Confirms session refresh pattern; do not modify |
| `docs/coding-guidelines.md` | Artisan palette hex values, WCAG contrast rules, dark mode rules |
| `docs/tech-stack.md` | Confirms Lucide React is locked as the icon library |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-004/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-004/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-004/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- Branch from `main` (not `develop`). Name the branch `feature/TASK-004-navbar`.
- Place the navbar component at `src/components/client/navbar.tsx` (Client Component, per `docs/structure.md` — interactive UI goes in `src/components/client/`).
- Use `lucide-react` for all icons (already installed, v0.525.0). Specifically: `Music`, `LayoutDashboard`, `Library`, `List`, `Moon`, `Sun`, `LogIn`, `LogOut`.
- Use `usePathname()` from `next/navigation` for active link detection.
- Use `useRouter()` from `next/navigation` for programmatic navigation (login/logout).
- Dark mode toggle: add/remove `dark` class on `document.documentElement`. Persist in `localStorage` key `"theme"`. Guard all `localStorage` access inside `useEffect` or `typeof window !== 'undefined'` check to avoid SSR errors.
- Auth state: subscribe via `supabase.auth.onAuthStateChange` inside `useEffect`; return the unsubscribe function for cleanup.
- Do NOT use `text-brand-tan` on a `bg-brand-cream` background (flagged as low-contrast in `docs/coding-guidelines.md`).
- Use `bg-[var(--brand-background)]` for navbar background (NOT `bg-brand-cream`) so it respects dark mode.
- After inserting `<Navbar />` into `src/app/layout.tsx`, add `pt-16` (or appropriate padding) to the `<body>` or a wrapping `<main>` element so sticky navbar does not overlap page content.
- MEMORY.md does not yet exist — no past bug patterns to reference.

---

## Resolution

> _To be filled by `@fullstack-developer` on completion._

- **Completed:** [date]
- **Branch:** [branch name]
- **Files changed:** [list]
- **Notes:** [anything the reviewer should know]
