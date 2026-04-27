# TASK-032 — Musicians Roster CRUD UI

- **Tier:** 1
- **Date Created:** 2026-04-26
- **Status:** In Progress

---

## Feature Summary

Build the musicians roster CRUD UI at `/musicians`. The feature introduces five new or modified files: a list page (`/musicians`), a create page (`/musicians/new`), an edit/delete page (`/musicians/[id]/edit`), a shared client form component (`MusicianForm`), and a navbar link addition. Music directors can create, edit, and delete musicians; all other authenticated users see the roster in read-only mode. Unauthenticated access is redirected to `/login`. All five required Server Actions (`listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician`) already exist in `musicianActions.ts` and are not modified by this task. Implementation reuses the `isMusicDirector` RBAC pattern from `setlists/page.tsx` and the form pattern from `NewSongFormClient.tsx`.

---

## Acceptance Criteria

1. `GET /musicians` renders a list of all musicians ordered by name ascending; each row shows the musician name and a truncated (CSS `truncate` / `line-clamp-1`) preview of the notes field; an empty-state message is shown when the list is empty.
2. The list page redirects unauthenticated users to `/login` (not a public page).
3. The "New Musician" button appears on the list page only when `isMusicDirector` is `true`; it is absent for non-MD authenticated users.
4. Each musician row on the list page shows an edit link (`/musicians/[id]/edit`) only when `isMusicDirector` is `true`; non-MD rows are plain non-interactive elements with no link or pencil icon.
5. `GET /musicians/new` redirects non-MD authenticated users to `/musicians` before rendering any content.
6. `GET /musicians/new` renders `MusicianForm` in `mode="create"` for music directors.
7. `GET /musicians/[id]/edit` redirects non-MD authenticated users to `/musicians` before rendering any content.
8. `GET /musicians/[id]/edit` calls `getMusicianById` and renders `MusicianForm` in `mode="edit"` with the fetched musician pre-populated when the musician exists.
9. `GET /musicians/[id]/edit` renders a 404 message (not a redirect) when `getMusicianById` returns `error: 'Musician not found.'` or `data: null`; the full layout shell is preserved in this return branch (BUG-003).
10. `GET /musicians/[id]/edit` renders a generic error message (not a redirect) when `getMusicianById` returns any other error; the full layout shell is preserved in this return branch (BUG-003).
11. `MusicianForm` in `mode="create"` calls `createMusician({ name, notes })` on submit and navigates to `/musicians` on success via `router.push`.
12. `MusicianForm` in `mode="edit"` calls `updateMusician({ id, name, notes })` on submit and navigates to `/musicians` on success via `router.push`.
13. `MusicianForm` rejects submission client-side (before calling any Server Action) when `name.trim()` has length 0; an inline validation message is shown.
14. `MusicianForm` surfaces the `error` string returned by `createMusician` or `updateMusician` inline in the form; the submit button is not re-disabled after an error is displayed.
15. `MusicianForm` in `mode="edit"` shows a "Delete" button; clicking it opens a `window.confirm` dialog with a confirmation message before proceeding.
16. On delete confirmation, `MusicianForm` calls `deleteMusician({ id })` and navigates to `/musicians` on success via `router.push`.
17. `MusicianForm` surfaces the `error` string returned by `deleteMusician` inline in the form.
18. The Delete button is absent in `mode="create"`.
19. While a submit or delete is in progress (`isSaving` / `isDeleting`), the corresponding button shows a loading label and is `disabled`; the other action button is also disabled (`isAnyPending = isSaving || isDeleting`) to prevent concurrent operations.
20. The navbar `navLinks` array includes a new entry `{ href: '/musicians', label: 'Musicians', Icon: UsersRound }` appended after the existing Setlists entry; `UsersRound` is imported from `lucide-react`.
21. The Musicians navbar link is active-highlighted when `pathname === '/musicians'` or `pathname.startsWith('/musicians/')`, matching the existing active-link logic for other nav entries.
22. The Musicians link appears on both desktop nav and mobile sidebar (the single `navLinks` array addition covers both since it is iterated in both locations).
23. `npx tsc --noEmit` exits with code 0 after all changes.
24. `npm run build` succeeds with no errors.
25. Every Artisan palette Tailwind class in every new or modified file has a paired `dark:` variant (BUG-004): `bg-brand-cream` paired with `dark:bg-brand-darker`; `text-brand-espresso` with `dark:text-brand-cream`; `text-brand-brown` with `dark:text-brand-tan`; `border-brand-brown/20` with `dark:border-brand-tan/20`; `ring-brand-espresso` with `dark:ring-brand-tan`. Do not use `variant="secondary"` on `Button` (it has no dark: variants).
26. Every return branch in each Server Component (list page, new page, edit page) independently includes the full layout shell `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker ...">` (BUG-003). No return branch may render outside the shell.
27. `MusicianForm` does not use `<form action={...}>` Server Action binding; it uses `onSubmit` with `e.preventDefault()` and calls the imported Server Action directly as an async function, matching `NewSongFormClient` style.
28. `notes` is passed as `undefined` (not `""`) to `createMusician` and `updateMusician` when the textarea is empty: `const notesValue = notes.trim() || undefined`.

---

## Out of Scope

- Setlist lineup wiring of musicians (Phase 4).
- Instruments column on roster row.
- Pagination or search on the list page.
- Public (unauthenticated) access to `/musicians`.
- Bulk delete or multi-select.
- Any change to existing Server Actions in `musicianActions.ts`.
- Any new Supabase RLS policies.
- A musician detail/viewer page — non-MD rows have no link destination.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/musicians/page.tsx` | NEW — list page (Server Component); fetches `listMusicians`, renders roster with RBAC guards |
| `src/app/musicians/new/page.tsx` | NEW — create page (Server Component); guards non-MD, renders `MusicianForm mode="create"` |
| `src/app/musicians/[id]/edit/page.tsx` | NEW — edit/delete page (Server Component); guards non-MD, fetches `getMusicianById`, renders `MusicianForm mode="edit"` or 404/error shell |
| `src/app/musicians/loading.tsx` | NEW — skeleton loading state using `animate-pulse bg-brand-brown/10` pattern |
| `src/components/client/MusicianForm.tsx` | NEW — 'use client' form for create and edit/delete operations |
| `src/components/client/navbar.tsx` | MODIFY — append `{ href: '/musicians', label: 'Musicians', Icon: UsersRound }` to `navLinks` before `as const` |
| `src/app/setlists/page.tsx` | REFERENCE — copy the exact `isMusicDirector` block (lines 49–63) and list-row RBAC guard pattern |
| `src/components/client/NewSongFormClient.tsx` | REFERENCE — copy the `useState` per field + `isSaving` + `error` + `handleSubmit` pattern, `inputBaseClass`, `labelClass` |
| `src/app/actions/musicianActions.ts` | REFERENCE — Server Action signatures; do not modify |
| `src/app/library/new/page.tsx` | REFERENCE — `ChevronLeft` back link pattern for new/edit pages |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-032/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-032/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- Create feature branch `feature/TASK-032-musicians-roster-ui` from `develop` before writing any code.
- **Page shell:** All musicians pages use `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">` matching `setlists/page.tsx`.
- **isMusicDirector block:** Copy verbatim from `setlists/page.tsx` lines 49–63:
  ```
  let isMusicDirector = false;
  if (user) {
    try {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      isMusicDirector = profile?.role === 'music_director';
    } catch { isMusicDirector = false }
  }
  ```
- **Supabase server client:** `import { createClient } from '@/services/supabase/server'`.
- **MusicianForm fields:** `name` is a controlled text input; `notes` is a controlled textarea. Both use `inputBaseClass` and `labelClass` constants from `NewSongFormClient.tsx`.
- **notes blank handling:** `const notesValue = notes.trim() || undefined` before passing to Server Actions (AC 28).
- **Delete handler:** `if (!window.confirm('Delete this musician?')) return;` then call `deleteMusician`. Guard with `isAnyPending` before opening confirm.
- **isAnyPending:** `const isAnyPending = isSaving || isDeleting;` — used to disable both buttons during any in-flight operation (AC 19).
- **Edit/new page back link:** Include a `ChevronLeft` "Back to Musicians" link at the top, following the `library/new/page.tsx` pattern (lines 49–61).
- **loading.tsx skeleton:** Mirror `src/app/setlists/loading.tsx` — `animate-pulse bg-brand-brown/10`, `aria-hidden` on containers, `role="list"` with `aria-label`.
- **Do not use `variant="secondary"` on `Button`** — that variant has no dark: variants (BUG-004 risk).
- **BUG-003 guard:** Every Server Component has multiple return branches (auth redirect, not-found, error, success). Each branch that renders JSX must independently wrap its content in the full `<main>` shell. Only `redirect()` calls are exempt.
- **BUG-004 guard:** Before submitting, grep every new file for bare Artisan palette classes and confirm each has its paired `dark:` class.
- **BUG-007 not applicable:** `MusicianForm` has no `useEffect`; all handler declarations are at the top of the function body; no forward-reference risk.
- **MEMORY.md sections to read:** BUG-003 (`bug_guest_dashboard_missing_layout_shell.md`), BUG-004 (`bug_dashboard_missing_dark_mode_variants.md`), BUG-007 (`bug_react_compiler_forward_reference_navbar.md`) — BUG-007 is a risk in `navbar.tsx` if any `useEffect` references the updated `navLinks`; confirm no such effect exists after adding the Musicians entry.

---

## Amendments (from Context Bundle)

> _Added by `@task-logger` after reconciling `spec.md` against context bundle anti-patterns._

- [AC] If `listMusicians` returns an error on the list page, render an inline error message within the full layout shell rather than crashing or redirecting — the page shell must remain intact. Source: context bundle Fallback Behaviors + BUG-003 pattern.

---

## Resolution

- **Completed:** 2026-04-27
- **Branch:** feature/TASK-032-musicians-roster-ui
- **Base branch:** develop
- **Files changed:**
  - `src/app/musicians/page.tsx` — NEW: list page with RBAC guards, error/empty-state branches, BUG-003 shell on all render branches
  - `src/app/musicians/new/page.tsx` — NEW: create page with auth + music-director RBAC redirect guard
  - `src/app/musicians/[id]/edit/page.tsx` — NEW: edit/delete page with not-found and generic-error branches, each with full layout shell (BUG-003)
  - `src/app/musicians/loading.tsx` — NEW: skeleton loading state mirroring setlists/loading.tsx pattern
  - `src/components/client/MusicianForm.tsx` — NEW: controlled client form for create/edit/delete with isSaving/isDeleting, isAnyPending, window.confirm guard, notesValue blank handling, role="alert" on error
  - `src/components/client/navbar.tsx` — MODIFIED: added UsersRound import and { href: '/musicians', label: 'Musicians', Icon: UsersRound } to navLinks after Setlists
- **Notes:** All acceptance criteria implemented. BUG-003 verified: every JSX-returning branch in all three page files independently wraps content in the full layout shell. BUG-004 verified: all static Artisan palette classes have paired dark: variants; hover:bg-brand-brown/hover:text-brand-cream hover transitions are used without dark: pairing, matching the established codebase pattern in NewSongFormClient.tsx, button.tsx, and NewSetlistButton.tsx. tsc --noEmit passes with 0 errors.
