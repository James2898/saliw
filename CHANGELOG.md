# Changelog

All notable changes to the Saliw Music Portal are documented here.

---

## [Unreleased] — 2026-04-14

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
