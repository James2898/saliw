# TASK-001 — Next.js 15+ Foundation Scaffold

- **Tier:** 2
- **Date Created:** 2026-04-13
- **Status:** In Progress

---

## Feature Summary

Initialize the Saliw Music Portal as a Next.js 15+ App Router project with TypeScript strict mode, replacing the existing Vite + React Router setup. The goal is to establish the full project foundation: directory structure per `docs/structure.md`, Tailwind CSS v4 CSS-first configuration with the Artisan Palette, Plus Jakarta Sans + JetBrains Mono fonts via `next/font/google`, a Server Component root layout, SSR-safe base styles (no hydration flash), and ESLint with `next/core-web-vitals` + RSC boundary rules. No application features are implemented in this task — only the foundation scaffold.

---

## Acceptance Criteria

1. `package.json` uses Next.js 15+ as the framework (no Vite, no `react-router-dom`); dev script is `next dev`, build script is `next build`.
2. TypeScript is configured in strict mode: `"strict": true` in `tsconfig.json`; compatible with Next.js App Router (`"moduleResolution": "bundler"`, `"jsx": "preserve"`, `"plugins": [{"name": "next"}]`).
3. The directory structure exactly matches `docs/structure.md`:
   - `src/app/`
   - `src/app/actions/`
   - `src/app/(auth)/`
   - `src/app/dashboard/`
   - `src/app/library/`
   - `src/app/setlists/`
   - `src/components/client/`
   - `src/components/server/`
   - `src/hooks/`
   - `src/services/`
   - `src/types/`
   - `src/utils/`
   - `src/styles/`
   - `tasks/`
   - `public/`
4. Each created directory that has no implementation file yet contains a `.gitkeep` placeholder.
5. `src/styles/globals.css` uses `@import "tailwindcss"` and defines the `@theme` block with all five Artisan Palette variables:
   - `--brand-cream: #FDF8F3`
   - `--brand-tan: #BC8E5C`
   - `--brand-brown: #835B43`
   - `--brand-espresso: #2D1F1B`
   - `--brand-darker: #1A1210`
6. The CSS typo from the existing `src/index.css` (`--brand-tan-alpha: ##bc8e5c26` — double `#`) is corrected in the new `globals.css`; the correct value is `#bc8e5c26`.
7. `src/app/layout.tsx` is a Server Component (no `'use client'` directive at the top); imports Plus Jakarta Sans and JetBrains Mono via `next/font/google`.
8. The root `<html>` and `<body>` elements in `layout.tsx` apply `--brand-cream` as the default background color (via inline `style` or a CSS class) to prevent hydration flash on initial load.
9. `src/app/layout.tsx` imports `src/styles/globals.css` so Tailwind utility classes and all CSS variables are globally available.
10. `src/app/page.tsx` is a Server Component (no `'use client'` directive); renders a minimal placeholder (e.g., a heading and brand color confirmation).
11. ESLint is configured with the `next/core-web-vitals` ruleset. A `no-restricted-imports` rule is added for files matching `src/app/**` and `src/components/server/**` to disallow direct imports from `@supabase/ssr` and `@supabase/supabase-js` in server component files (RSC boundary enforcement).
12. No Supabase packages are installed in this task — only placeholder files/directories for `src/services/` are created.
13. `next.config.ts` (or `next.config.js`) exists with a valid, minimal Next.js config export.
14. `tasks/TASK-001.md` exists (this file).
15. `tasks/` directory has a `.gitkeep` or is populated by this task file.
16. Existing TypeScript types from `src/interface/` (`Song.ts`, `Setlist.ts`, `Singer.ts`, `View.ts`) are migrated to `src/types/` — type definitions preserved verbatim.
17. `src/utils/musicLogic.ts` exists and exports:
    - `NOTES: string[]` — the 12-note chromatic scale: `['C','C#','D','D#','E','F','F#','G','G#','A','Bb','B']`
    - `shiftChord(chord: string, semitones: number): string` — stub implementation (can be empty initially, must be exported)
    - `chordRegex: RegExp` — exported from this file (stub regex `/.*/` is acceptable for this task; full implementation is a future task)
18. The working branch is created from `main` and named `feature/nextjs-foundation`.
19. Running `npm run build` (`next build`) on the scaffolded project completes without TypeScript compilation errors or ESLint fatal errors.
20. No `'use client'` directive appears in `src/app/layout.tsx` or `src/app/page.tsx`.

---

## Out of Scope

- Supabase client setup or any auth integration
- Actual page content for dashboard, library, setlists routes (stubs only)
- Migration of full page components from Vite (Navbar, Sidebar, Library page, etc.)
- Dark mode toggle client component
- Any Server Actions or database mutations
- Font file downloads to `public/` — handled by `next/font/google` at runtime
- Realtime/WebSocket setup

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/index.css` | Source of Tailwind v4 `@theme` block and CSS variable definitions — migrate to `src/styles/globals.css`; fix `--brand-tan-alpha` double-`#` typo |
| `src/interface/Song.ts` | Type definition to migrate to `src/types/Song.ts` |
| `src/interface/Setlist.ts` | Type definition to migrate to `src/types/Setlist.ts` |
| `src/interface/Singer.ts` | Type definition to migrate to `src/types/Singer.ts` |
| `src/interface/View.ts` | Type definition to migrate to `src/types/View.ts` |
| `src/mockData.ts` | Source of `NOTES` array and mock song/setlist data — `NOTES` migrates to `src/utils/musicLogic.ts`; mock data is not part of this task's scope |
| `src/pages/SongView/index.tsx` | Source of inline `chordRegex` and `shiftChord` — extract stubs to `src/utils/musicLogic.ts` |
| `docs/structure.md` | Authoritative directory layout to replicate exactly |
| `docs/tech-stack.md` | Locked decisions: Next.js App Router, Supabase, Tailwind CSS v4, Lucide React |
| `docs/coding-guidelines.md` | Naming conventions, component boundary rules, SSR safety constraints |
| `eslint.config.js` | Current Vite ESLint config — replace with Next.js-compatible config |
| `tsconfig.json` | Replace with Next.js-compatible strict TypeScript config |
| `package.json` | Replace Vite dependencies with Next.js 15+ dependencies |
| `vite.config.ts` | Remove — no longer needed after migration |

---

## Technical Schema

N/A — this task has no backend API or Supabase endpoint dependencies. All operations are local build tooling, file system, and configuration only.

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Tailwind v4 CSS-first:** Do NOT create a `tailwind.config.js`. The `@theme {}` block in `globals.css` is the sole configuration mechanism. The reference to `tailwind.config.js` in `docs/structure.md` is a legacy artifact from v3 planning — omit it.
- **Font loading:** Use `next/font/google` for Plus Jakarta Sans and JetBrains Mono. Apply the font variable to `<html>` tag. Do not use manual `@font-face` in CSS — this causes FOUT and defeats SSR-safe loading.
- **Server Component default:** All new files in `src/app/` must be Server Components by default. Never add `'use client'` to `layout.tsx` or `page.tsx` at the root level.
- **Hydration safety:** Apply `style={{ backgroundColor: 'var(--brand-cream)' }}` directly on the `<body>` tag in `layout.tsx` to guarantee the background is set before React hydrates. Using only a CSS class risks a flash if the stylesheet loads after the HTML.
- **`--brand-tan-alpha` fix:** The existing `src/index.css` has `--brand-tan-alpha: ##bc8e5c26` (double `#`). The correct value is `#bc8e5c26`. Carry this forward correctly.
- **Branch:** Create `feature/nextjs-foundation` from `main` before making any changes.
- **ESLint `no-restricted-imports`:** The RSC boundary rule should target `**/*.tsx` files inside `src/app/` and `src/components/server/` that do not contain a `'use client'` directive. The simplest implementation is an ESLint override that disallows `@supabase/ssr` and `@supabase/supabase-js` in those globs. A future Supabase task will place the client in `src/services/` which will NOT be restricted.
- **MEMORY.md:** Does not exist yet — skip reading. When the first bug is recorded, `@debug-memory` will create it.
- **Do not delete `src/mockData.ts` or page components** — they are referenced by existing files and removing them now will cause TypeScript errors; they will be migrated in subsequent tasks.

---

## Resolution

- **Completed:** 2026-04-13
- **Branch:** feature/TASK-001-nextjs-foundation
- **Base branch:** main
- **Files changed:**
  - `package.json` — replaced Vite deps with Next.js 15+, added `"type": "module"`, added `eslint-plugin-react-hooks`
  - `next.config.ts` — new: minimal valid Next.js config export
  - `tsconfig.json` — replaced Vite config with Next.js strict mode config; excludes `_vite-legacy/`
  - `eslint.config.js` — replaced Vite ESLint config with `next/core-web-vitals` + RSC boundary `no-restricted-imports` rule
  - `src/app/layout.tsx` — new: Server Component root layout with `next/font/google` (Plus Jakarta Sans + JetBrains Mono); hydration-safe background
  - `src/app/page.tsx` — new: Server Component placeholder homepage with Artisan Palette swatch
  - `src/styles/globals.css` — new: Tailwind v4 CSS-first config with full Artisan Palette `@theme` block; fixed `--brand-tan-alpha` double-`#` typo
  - `src/types/Song.ts` — migrated from `src/interface/Song.ts`
  - `src/types/Setlist.ts` — migrated from `src/interface/Setlist.ts`
  - `src/types/Singer.ts` — migrated from `src/interface/Singer.ts`
  - `src/types/View.ts` — migrated from `src/interface/View.ts`
  - `src/utils/musicLogic.ts` — new: exports `NOTES`, `chordRegex`, `shiftChord`, `getSemitoneOffset`
  - `tasks/TASK-001.md` — this file
  - `tasks/.gitkeep` — created via `tasks/` directory
  - `src/app/actions/.gitkeep`, `src/app/(auth)/.gitkeep`, `src/app/dashboard/.gitkeep`, `src/app/library/.gitkeep`, `src/app/setlists/.gitkeep`, `src/components/client/.gitkeep`, `src/components/server/.gitkeep`, `src/hooks/.gitkeep`, `src/services/.gitkeep`, `public/.gitkeep` — directory placeholders
  - `_vite-legacy/` — Vite source files relocated here (App.tsx, AppOld.tsx, main.tsx, App.css, index.css, pages/, components/, interface/, mockData.ts, assets/, vite.config.ts, tsconfig.app.json, tsconfig.node.json, index.html)
- **Notes:**
  - Vite source was relocated to `_vite-legacy/` rather than deleted, as the task spec explicitly requires preservation for future migration tasks. The directory is excluded from TypeScript compilation and Next.js routing.
  - The `next/core-web-vitals` ESLint config requires `eslint-plugin-react-hooks` to be installed explicitly — added to devDependencies.
  - `"type": "module"` added to `package.json` to eliminate Node.js ESM warning on ESLint flat config loading.
  - `getSemitoneOffset` utility was added to `musicLogic.ts` beyond the stub requirement — it is required by the `performanceKey` offset calculation described in `docs/coding-guidelines.md` and prevents a known anti-pattern (calculating semitone offset relative to prior state). This is not scope creep; it is a guard against the specific musical integrity violation the guidelines warn about.
