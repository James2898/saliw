# Changelog

All notable changes to the Saliw Music Portal are documented here.

---

## [Unreleased] — 2026-04-15

### Added

- **Backend infrastructure: songs/setlists schema, RLS, and Server Actions** (`TASK-007`)
  - `supabase/migrations/20260415000001_create_songs_table.sql` — `songs` table with uuid PK, `original_key`, `created_by` FK; RLS: authenticated SELECT, music_director INSERT/UPDATE/DELETE via `is_music_director()` helper function
  - `supabase/migrations/20260415000002_create_setlists_table.sql` — `setlists` table with `leader_id`, `is_public`; RLS: authenticated SELECT, leader_id-scoped UPDATE/DELETE
  - `supabase/migrations/20260415000003_create_setlist_songs_table.sql` — `setlist_songs` junction table with `performance_key`, `order_index`; RLS: authenticated SELECT via parent join, leader_id INSERT/UPDATE/DELETE via subquery
  - `src/app/actions/songActions.ts` — `createSong`, `updateSong`, `deleteSong`; chordRegex content validation; consistent `{ data, error }` return shape; no service role key
  - `src/app/actions/setlistActions.ts` — `createSetlist`, `addSongToSetlist`, `reorderSetlist`, `deleteSetlist`; performance_key defaults to song's original_key on add
  - `src/types/supabase.ts` — new file; exports `DbSong`, `DbSetlist`, `DbSetlistSong` matching exact DB column names
  - `src/types/Song.ts` — updated: `id: string` (uuid), `original_key` replaces `key`
  - `src/types/Setlist.ts` — updated: `id: string`, `leader_id` replaces `leader`, `is_public` added, embedded `songs[]` removed

- **Login page UI + Supabase auth** (`TASK-006`)
  - `src/app/(auth)/login/page.tsx` — Server Component; calls `supabase.auth.getUser()` on load and redirects authenticated users to `/` before rendering; no flash of login form for signed-in users
  - `src/components/client/LoginForm.tsx` — Client Component; mode toggle (Password / Magic Link); email+password form calls `signInWithPasswordAction` via `useTransition`; magic link form calls `sendMagicLinkAction` via `useTransition`; inline feedback `<p>` for all error and success states; feedback cleared on field change; no toast library; no direct Supabase calls
  - `src/app/actions/authActions.ts` — `signInWithPasswordAction` (server-side `redirect('/')` on success outside try/catch to preserve `NEXT_REDIRECT`; unified error copy prevents user enumeration) and `sendMagicLinkAction` (returns `{ success: true }`, uses `NEXT_PUBLIC_SITE_URL` for `emailRedirectTo`); both actions use `@supabase/ssr` server client only; no `SUPABASE_SERVICE_ROLE_KEY` reference
  - `src/app/auth/auth-code-error/page.tsx` — Server Component; plain error message for failed PKCE exchanges ("The link may have expired or already been used.") with a link back to `/login`; Artisan palette styling
  - All text WCAG AA compliant: `text-brand-espresso` (~14:1) and `text-brand-brown` (~4.8:1) on cream; `text-brand-tan` on cream never used; input borders `border-brand-brown`; focus rings `ring-brand-brown`
  - No new npm dependencies introduced; `package.json` unchanged

- **Individual Profile Settings page** (`TASK-005`)
  - `profiles` table created in Supabase with columns `id`, `email`, `full_name`, `role`; RLS enabled with `profiles_select_own` (SELECT) and `profiles_update_own` (UPDATE, `auth.uid() = id`) policies; column-level `REVOKE UPDATE (role, email)` applied as defense-in-depth
  - `src/types/Profile.ts` — plain `export type Profile` with four snake_case fields matching the table schema
  - `src/app/actions/profileActions.ts` — `updateProfileAction` Server Action: auth-gated via `supabase.auth.getUser()`, accepts and writes only `{ full_name }`, wrapped in `try/catch`, no `SUPABASE_SERVICE_ROLE_KEY` reference
  - `src/app/dashboard/profile/page.tsx` — Server Component; server-side `redirect('/login')` for unauthenticated access; renders "Profile not found" error state when profile row is missing; passes profile prop to `<EditProfileForm>`
  - `src/components/client/EditProfileForm.tsx` — Client Component; email field rendered `readOnly` and excluded from submission; `role` field absent from DOM; `useTransition` for pending state; inline success/error `<p>` feedback cleared on `onChange`; no toast library used; all colors WCAG AA compliant (`text-brand-brown`, `text-brand-espresso`; `text-brand-tan` never used)
  - Affected files: `supabase/migrations/20260415000000_create_profiles_table.sql`, `src/types/Profile.ts`, `src/app/actions/profileActions.ts`, `src/components/client/EditProfileForm.tsx`, `src/app/dashboard/profile/page.tsx`

---

## [Unreleased] — 2026-04-14

### Added

- **Mobile hamburger menu + sidebar drawer** (`TASK-004`)
  - Added `isOpen` state with `openSidebar` / `closeSidebar` helpers to the existing `Navbar` component
  - Desktop layout (md+) is pixel-unchanged; all existing desktop nav links, theme toggle, and auth button remain inside `hidden md:flex` wrappers
  - Mobile (<md): hamburger button (`Menu` icon from lucide-react) shown via `md:hidden`; has `aria-label="Open navigation menu"` and `aria-expanded={isOpen}`
  - Left-side drawer (`<aside role="dialog" aria-modal="true">`) slides in with CSS `translate-x` transition (300ms ease-in-out); slides out when closed
  - Drawer contains: Saliw brand header with X close button, all 3 nav links (Dashboard/Library/Setlists) with active state, theme toggle with label text, auth (sign-in/sign-out) button
  - Clicking any nav link inside drawer closes it via `onClick={closeSidebar}`
  - Semi-transparent backdrop (`bg-brand-espresso/40`) with `onClick={closeSidebar}` — clicking outside drawer closes it
  - Escape key closes drawer; event listener attached on open and cleaned up on close
  - `document.body.style.overflow = "hidden"` applied while drawer is open to prevent scroll-through; restored on close
  - Focus management: focus moves to X close button on open; returns to hamburger button on close
  - Drawer background: `bg-[var(--brand-background)]` — cream in light mode, `--brand-darker` in dark mode; text uses `text-brand-espresso dark:text-brand-cream` throughout
  - New Lucide icons added to imports: `Menu`, `X`
  - No new package dependencies; no changes to `globals.css` or any file other than `src/components/client/navbar.tsx`
  - Affected files: `src/components/client/navbar.tsx`

### Fixed

- **Dark mode activating from OS preference instead of explicit user toggle** (`TASK-004`)
  - Added `@variant dark (&:where(.dark, .dark *));` to `src/styles/globals.css` to override Tailwind v4's default dark-mode strategy from `prefers-color-scheme` media query to class-based toggling; `dark:` utility variants now only activate when `.dark` is present on an ancestor, not when the OS is in dark mode
  - Affected files: `src/styles/globals.css`

- **Navbar text invisible on cream background** (`TASK-004`)
  - Added `text-brand-espresso dark:text-brand-cream` to `<nav>` container so nav children inherit an explicit color value independently of Tailwind utility cascade timing
  - Removed `color` from the global `*{transition-property}` rule in `src/styles/globals.css`; the unlayered `*` rule had higher cascade precedence than `@layer utilities`, causing text color to transition from its inherited/initial value on every page load — rendering nav text invisible against the cream background during the 300ms transition window
  - Affected files: `src/components/client/navbar.tsx`, `src/styles/globals.css`

### Added

- **Sticky top navigation bar with Artisan aesthetic** (`TASK-004`)
  - New Client Component `src/components/client/navbar.tsx` — sticky top nav for all pages
  - Brand logo: music note icon (`lucide-react` `Music`) in brown square linking to `/`, with bold "Saliw" label
  - Navigation links with Lucide icons: Dashboard (`LayoutDashboard`) → `/dashboard`, Library (`Library`) → `/library`, Setlists (`List`) → `/setlists`
  - Active link highlighted with `bg-brand-brown/10 text-brand-brown` (light) / `bg-brand-tan/10 text-brand-tan` (dark) using `usePathname()`
  - Light/dark theme toggle (Moon/Sun icons) persisting preference to `localStorage` key `"theme"` via `document.documentElement.classList`
  - Auth icon button: `LogIn` when unauthenticated (navigates to `/login`), `LogOut` when authenticated (calls `supabase.auth.signOut()` + `router.refresh()`); state driven by `supabase.auth.onAuthStateChange`
  - Background uses semantic token `bg-[var(--brand-background)]` (cream ↔ dark) — dark-mode aware
  - Inserted into `src/app/layout.tsx` so navbar appears on every route
  - Affected files: `src/components/client/navbar.tsx`, `src/app/layout.tsx`

---

## [Unreleased] — 2026-04-13

### Added

- **Artisan Visual Identity & Base UI Components** (`TASK-003`)
  - `Button` Client Component with `primary` / `secondary` / `ghost` variants and `sm` / `md` / `lg` sizes; WCAG AA compliant (tan-on-cream combination excluded)
  - `Card` Server Component with `rounded-3xl`, `.main-card` CSS class, and `none | sm | md | lg` padding prop
  - Dashboard layout shell: full-width cream outer `<div>` wrapping `Card` at `max-w-5xl`, centred horizontally
  - Dashboard placeholder page with espresso heading and brown subheading
  - Homepage updated to use Tailwind utilities (no inline styles) and showcase all `Button` and `Card` variants
  - Dark mode handled via `.dark` class and semantic tokens in `globals.css` — no per-component dark mode logic required
  - Affected files: `src/components/client/button.tsx`, `src/components/server/card.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/page.tsx`

### Fixed

- **PostCSS plugin missing for Tailwind v4** (`TASK-003`)
  - Added `postcss.config.mjs` with `@tailwindcss/postcss` plugin so Tailwind v4 brand-color utilities compile correctly
  - Added `@tailwindcss/postcss ^4.2.2` to `devDependencies`
  - Affected files: `postcss.config.mjs`, `package.json`, `package-lock.json`

- **Next.js 15+ App Router foundation scaffold** (`TASK-001`)
  - Replaced Vite + React Router with Next.js 15.5 App Router and TypeScript strict mode
  - Tailwind CSS v4 CSS-first configuration with Artisan Palette `@theme` block in `src/styles/globals.css`
    - `--brand-cream: #FDF8F3`, `--brand-tan: #BC8E5C`, `--brand-brown: #835B43`, `--brand-espresso: #2D1F1B`, `--brand-darker: #1A1210`
    - Fixed `--brand-tan-alpha` double-`#` typo from original Vite CSS
  - Server Component root layout (`src/app/layout.tsx`) with `next/font/google` — Plus Jakarta Sans (UI) + JetBrains Mono (chords)
  - Hydration-safe base styles: inline `backgroundColor: "#fdf8f3"` on `<body>` prevents cream background flash before stylesheet loads
  - ESLint configured with `next/core-web-vitals` + RSC boundary `no-restricted-imports` rule for `@supabase/ssr` and `@supabase/supabase-js` in server component files
  - Directory structure per `docs/structure.md`: `src/app/`, `src/app/actions/`, `src/app/(auth)/`, `src/app/dashboard/`, `src/app/library/`, `src/app/setlists/`, `src/components/client/`, `src/components/server/`, `src/hooks/`, `src/services/`, `src/types/`, `src/utils/`, `src/styles/`, `tasks/`, `public/`
  - TypeScript types migrated from `src/interface/` to `src/types/` (`Song`, `Setlist`, `Singer`, `View`)
  - `src/utils/musicLogic.ts` — exports `NOTES`, `chordRegex`, `shiftChord`, `getSemitoneOffset`; establishes shared musical logic boundary per coding guidelines
  - Vite legacy source preserved in `_vite-legacy/` for future migration tasks
  - Affected files: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `src/types/Song.ts`, `src/types/Setlist.ts`, `src/types/Singer.ts`, `src/types/View.ts`, `src/utils/musicLogic.ts`, `tasks/TASK-001.md`, directory scaffolding
