# Spec — Musicians Roster CRUD UI

## Feature Summary

Build the musicians roster CRUD UI at `/musicians`. The feature consists of five files: a list page (`/musicians`), a create page (`/musicians/new`), an edit/delete page (`/musicians/[id]/edit`), a shared client form component (`MusicianForm`), and a navbar link addition. Music directors can create, edit, and delete musicians via the form; all other authenticated users see the roster in read-only mode. Non-authenticated access is out of scope — the list page requires auth (redirect to `/login`). All Server Actions (`listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician`) already exist and are not modified by this task.

## Acceptance Criteria

1. `GET /musicians` renders a list of all musicians ordered by name ascending; each row shows the musician name and a truncated preview of the notes field (empty-state message when the list is empty).
2. The list page redirects unauthenticated users to `/login` (not a public page).
3. The "New Musician" button appears on the list page only when `isMusicDirector` is `true`; it is absent for non-MD authenticated users.
4. Each musician row on the list page shows an edit link (`/musicians/[id]/edit`) only when `isMusicDirector` is `true`; it is absent for non-MD authenticated users.
5. `GET /musicians/new` redirects non-MD authenticated users to `/musicians` before rendering any content.
6. `GET /musicians/new` renders `MusicianForm` in `mode="create"` for music directors.
7. `GET /musicians/[id]/edit` redirects non-MD authenticated users to `/musicians` before rendering any content.
8. `GET /musicians/[id]/edit` calls `getMusicianById` and renders `MusicianForm` in `mode="edit"` with the fetched musician pre-populated when the musician exists.
9. `GET /musicians/[id]/edit` renders a 404 message (not a redirect) when `getMusicianById` returns `error: 'Musician not found.'` or `data: null`; the full layout shell is preserved in this return branch (BUG-003).
10. `GET /musicians/[id]/edit` renders a generic error message (not a redirect) when `getMusicianById` returns any other error; the full layout shell is preserved in this return branch (BUG-003).
11. `MusicianForm` in `mode="create"` calls `createMusician({ name, notes })` on submit and navigates to `/musicians` on success via `router.push`.
12. `MusicianForm` in `mode="edit"` calls `updateMusician({ id, name, notes })` on submit and navigates to `/musicians` on success via `router.push`.
13. `MusicianForm` rejects submission (client-side, before calling any Server Action) when `name.trim()` has length 0; an inline validation message is shown.
14. `MusicianForm` surfaces the `error` string returned by `createMusician` or `updateMusician` inline in the form; the submit button is not re-disabled after an error.
15. `MusicianForm` in `mode="edit"` shows a "Delete" button; clicking it opens a `window.confirm` dialog with a confirmation message before proceeding.
16. On delete confirmation, `MusicianForm` calls `deleteMusician({ id })` and navigates to `/musicians` on success via `router.push`.
17. `MusicianForm` surfaces the `error` string returned by `deleteMusician` inline in the form.
18. The Delete button is absent in `mode="create"`.
19. While a submit or delete is in progress (`isSaving` / `isDeleting`), the corresponding button shows a loading label and is `disabled`; the other action button is also disabled to prevent concurrent operations.
20. The navbar `navLinks` array includes a new entry `{ href: '/musicians', label: 'Musicians', Icon: UsersRound }` appended after the existing Setlists entry; `UsersRound` is imported from `lucide-react`.
21. The Musicians navbar link is active-highlighted when `pathname === '/musicians'` or `pathname.startsWith('/musicians/')`, matching the existing active-link logic.
22. The Musicians link appears on both desktop nav and mobile sidebar (since `navLinks` is iterated in both locations, the single array addition covers both).
23. `npx tsc --noEmit` exits with code 0 after all changes.
24. `npm run build` succeeds with no errors.
25. Every Artisan palette Tailwind class in every new or modified file has a paired `dark:` variant (BUG-004): `bg-brand-cream` is paired with `dark:bg-brand-darker` or `dark:bg-brand-espresso`; `text-brand-espresso` with `dark:text-brand-cream`; `text-brand-brown` with `dark:text-brand-tan`; `border-brand-brown/20` with `dark:border-brand-tan/20` etc.
26. Every return branch in each Server Component (list page, new page, edit page) independently includes the full layout shell `<main className="min-h-screen bg-brand-cream dark:bg-brand-darker ...">` (BUG-003).
27. `MusicianForm` does not use a `<form action={...}>` Server Action binding; it uses `onSubmit` with `e.preventDefault()` and calls the imported Server Action directly as an async function, matching `NewSongFormClient` style.
28. `notes` is passed as `undefined` (not `""`) to `createMusician` and `updateMusician` when the textarea is empty, since `DbMusician.notes` is `string | null` and the Server Actions accept `notes?: string`.

## Out of Scope

- Setlist edit/viewer wiring of musicians — Phase 4.
- Instruments column on roster row.
- Pagination or search on the list page.
- Public (unauthenticated) access to `/musicians`.
- Bulk delete or multi-select.
- Any change to existing Server Actions in `musicianActions.ts`.
- Any new Supabase RLS policies.

## Fallback Behaviors

- All Server Actions already exist; there are no MISSING endpoints. No disabled-control fallbacks are required for this task.
- If `listMusicians` returns an error, the list page renders an inline error message (not a crash) in place of the musician list; the page shell remains intact.
- If `getMusicianById` returns an error in the edit page, the page renders an inline message within the full layout shell (not a redirect), distinguishing not-found vs. other errors (see criteria 9 and 10).
- If `deleteMusician` returns an error, the error is surfaced inline in the form; the user is not redirected.

## Resolved Ambiguities

- **Is `/musicians` authenticated-only or public?** → Authenticated-only. The list page redirects unauthenticated users to `/login`. Source: task spec ("everyone else views" implies authenticated; no-auth public access not mentioned, and all other feature pages redirect unauthenticated users to `/login`).
- **What does the non-MD list row look like without an edit link?** → A plain non-interactive row (or a read-only card) showing name and notes preview; no pencil icon or edit link. Source: task spec ("each row links to /musicians/[id]/edit (MD) or is read-only (non-MD)").
- **Should non-MD list rows be Links or plain divs?** → Plain `<div>` or `<li>` elements without link wrapping, since non-MDs have no edit destination and there is no detail view page in scope. Source: task spec (no detail/viewer page is listed; only edit route exists).
- **What notes preview length?** → A single-line truncated preview using CSS `truncate` / `line-clamp-1`, mirroring the setlists page truncation pattern. Source: task spec ("notes preview") + setlists page pattern.
- **Should the edit page also show a "Back" link?** → Yes, following the `library/new/page.tsx` pattern which includes a `ChevronLeft` back link. Source: existing `library/new/page.tsx` pattern (lines 49-61).
- **`navLinks` is typed `as const` — does adding an entry require any type change?** → No. Appending a new object literal `{ href: '/musicians', label: 'Musicians', Icon: UsersRound }` to the array before `as const` is sufficient; TypeScript widens the tuple automatically. Source: `navbar.tsx` line 23-27.
- **BUG-007 (React Compiler forward reference) — applies here?** → MusicianForm declares all event handlers as named functions. All handler declarations must appear above any `useEffect` that references them. Since `MusicianForm` has no `useEffect`, the risk does not apply. Source: MEMORY.md BUG-007.
- **What is the next task number?** → TASK-032. The highest existing task directory is TASK-031. Source: `ls tasks/` output.
- **Should `notes` be passed as empty string or omitted when blank?** → Omit (`undefined`) when the textarea value trims to `""`. The Server Action signature is `notes?: string` and `DbMusician.notes` is `string | null`; passing `undefined` lets the server default to `null` on insert and omit the field on update. Source: `musicianActions.ts` lines 72-73, 114-115.
