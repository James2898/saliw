# Changelog

All notable changes to the Saliw Music Portal are documented here.

---

## [Unreleased] — 2026-04-13

### Added

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
