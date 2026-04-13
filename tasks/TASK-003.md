# TASK-003 — Artisan Visual Identity & Base UI Components

- **Tier:** 1
- **Date Created:** 2026-04-13
- **Status:** In Progress

---

## Feature Summary

Implement the Saliw "Artisan" visual identity and base UI component library. This task builds the foundational reusable components — `Button` and `Card` — that all future pages will compose, establishes the dashboard layout shell (cream outer background with a nested main content card), and updates the homepage to use these components instead of inline styles. The Artisan Palette (Cream, Tan, Brown, Espresso) defined in `src/styles/globals.css` is the authoritative colour source. No database mutations are performed in this task.

---

## Acceptance Criteria

1. `src/styles/globals.css` defines the full `@theme` block with all Artisan Palette CSS variables (`--color-brand-cream`, `--color-brand-tan`, `--color-brand-brown`, `--color-brand-espresso`, `--color-brand-darker`) and a `.main-card` CSS class that applies the correct background and border for both light and dark mode. (These were already present before this task and must not be removed or altered.)
2. `src/app/layout.tsx` loads Plus Jakarta Sans and JetBrains Mono via `next/font/google` and applies them to the root `<html>` element. (Already in place; must remain unchanged.)
3. `src/components/client/button.tsx` exists as a Client Component (`'use client'` directive at the top) and exports a `Button` component supporting:
   - Three `variant` values: `primary` (tan background, espresso text), `secondary` (espresso background, cream text), `ghost` (transparent background, brown border and text).
   - Three `size` values: `sm`, `md`, `lg`.
   - WCAG AA contrast compliance — the tan-on-cream combination is not used in any variant.
4. `src/components/server/card.tsx` exists as a Server Component (no `'use client'` directive) and exports a `Card` component with:
   - `rounded-3xl` border radius applied unconditionally.
   - The `.main-card` CSS class applied (from `globals.css`) to handle background and border in light and dark modes.
   - A `padding` prop accepting `none | sm | md | lg` values.
5. `src/app/dashboard/layout.tsx` exists as a Server Component and renders a "nested card" shell: a full-width cream outer `<div>` wrapping a `Card` component constrained to `max-w-5xl` and centred horizontally.
6. `src/app/dashboard/page.tsx` exists as a Server Component and renders a minimal dashboard placeholder with an espresso-coloured heading and a brown-coloured subheading.
7. `src/app/page.tsx` uses Tailwind utility classes (not inline styles) and composes the `Button` and `Card` components to showcase all variants and sizes.
8. Dark mode is implemented via the `.dark` class on the `<html>` element and handled entirely through the semantic tokens in `globals.css` — no per-component dark mode logic is required.
9. No Supabase imports, Server Actions, or database mutations appear in any file changed by this task.
10. `tasks/TASK-003.md` exists (this file).

---

## Out of Scope

- Dark mode toggle UI control (the `.dark` class mechanism is in place; a toggle component is a future task)
- Authentication, RLS policies, or any Supabase interaction
- Navigation bar, sidebar, or any layout chrome beyond the dashboard shell
- Song library, setlist, or chord transposition features
- Any Server Actions or form submissions
- Accessibility beyond WCAG AA colour contrast (focus rings, ARIA roles for full compliance are a future task)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/button.tsx` | Client Component to create — Primary / Secondary / Ghost variants, sm/md/lg sizes |
| `src/components/server/card.tsx` | Server Component to create — `rounded-3xl`, `.main-card` class, padding prop |
| `src/app/dashboard/layout.tsx` | Server Component to create — cream outer shell with nested `Card` at `max-w-5xl` |
| `src/app/dashboard/page.tsx` | Server Component to create — minimal espresso/brown heading placeholder |
| `src/app/page.tsx` | Update — replace inline styles with Tailwind utilities; compose `Button` and `Card` |
| `src/styles/globals.css` | Read-only reference — authoritative source for all CSS variables, `.main-card` class, dark mode tokens |
| `src/app/layout.tsx` | Read-only reference — font loading setup; must not be modified by this task |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Tailwind v4 CSS-first — no config file.** Utility classes like `bg-brand-tan` resolve automatically from `--color-brand-tan` declared in the `@theme` block of `globals.css`. Do not create or modify `tailwind.config.js`.
- **`--brand-tan-alpha` arbitrary value:** Because `--brand-tan-alpha` lacks the `--color-` prefix, it cannot be used as a Tailwind shorthand utility. Reference it via `bg-[var(--brand-tan-alpha)]` (arbitrary value syntax) if needed.
- **Server Component default:** All files in `src/app/` and `src/components/server/` must be Server Components. Do not add `'use client'` to any file in those directories. `Button` in `src/components/client/` is the only file that requires `'use client'`.
- **WCAG AA constraint:** The tan (`#BC8E5C`) on cream (`#FDF8F3`) combination fails WCAG AA contrast. Do not use this pairing. Permitted combinations: espresso on cream, cream on espresso, espresso on tan, cream on brown.
- **Component placement:** Follow the directory split established in TASK-001 — `src/components/server/` for stateless display components, `src/components/client/` for interactive components requiring event handlers or state.
- **Branch:** Work on `feature/TASK-003-artisan-ui` branched from `develop` (not `main`).
- **MEMORY.md:** Does not exist yet — skip reading.

---

## Resolution

> _To be filled by `@fullstack-developer` on completion._

- **Completed:** [date]
- **Branch:** [branch name]
- **Files changed:** [list]
- **Notes:** [anything the reviewer should know]
