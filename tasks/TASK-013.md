# TASK-013 — Artisan New Song Entry Point & Stage-Ready UI Controls

- **Tier:** 2
- **Date Created:** 2026-04-17
- **Status:** In Progress

---

## Feature Summary

Two features are implemented together under this task. First, a `NewSongButton` component that renders only for `music_director` users (DOM-absent for others) as a desktop button and mobile FAB, with a loading state during navigation to `/library/new` — including a new `/library/new` page route. Second, Stage-Ready Controls extending `ChordSheetClient.tsx` with: a `useFontSize` hook (12–48px, localStorage-persisted, applied via CSS variable on the `.chord-display` container), a Hide Chords toggle (CSS-class-based, preserves lyric alignment), and a Stage Mode toggle (CSS-class-based, increases `.section-title` saturation and border-width for low-light visibility). All styling follows the Artisan palette; all auth enforcement is server-side via `@supabase/ssr`.

---

## Acceptance Criteria

### NewSongButton Component (`src/components/library/NewSongButton.tsx`)

1. `NewSongButton` is a Client Component (`'use client'`). It accepts a single prop: `isMusicDirector: boolean`. When `isMusicDirector` is `false`, the component returns `null` — the DOM node is physically absent, not hidden via CSS.
2. On desktop (`md:` breakpoint and above): renders as an inline button with `--brand-tan` background (`bg-brand-tan`), `--brand-espresso` text (`text-brand-espresso`), `rounded-xl`, labeled "New Song", with a Lucide `Plus` icon (size 16, strokeWidth 2) to the left of the label.
3. On mobile (below `md:`): renders as a Floating Action Button (FAB) fixed to the bottom-right of the viewport (`fixed bottom-6 right-6`), with a minimum `z-index` of `z-[80]` (above the navbar at `z-50` and sidebar at `z-[70]`). The FAB shows only the `Plus` icon (no text label) with an `aria-label="Add new song"` on mobile.
4. Hover state: `hover:scale-105 transition-transform duration-200` applied to the button. On desktop, also apply a subtle shadow boost: `hover:shadow-md`.
5. Loading state: clicking the button sets `isLoading = true` via `useState`. While `isLoading` is true, the `Plus` icon is replaced with a Lucide `Loader2` icon (`animate-spin`). The button is not `disabled` during loading (navigation happens immediately via `router.push`), but the icon swap provides visual feedback. `isLoading` is reset to `false` on component unmount.
6. Navigation: on click, calls `router.push('/library/new')` from `next/navigation`. Does NOT use a `<Link>` wrapper (to support the loading state swap).
7. WCAG AA: the FAB (`bg-brand-tan` background, `text-brand-espresso` text) must meet WCAG AA contrast. Per `docs/coding-guidelines.md`, espresso on tan is ~6.5:1 — confirmed pass. The FAB must have an `aria-label` when no visible text is present (mobile FAB).
8. Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-2` on all interactive states.

### `NewSongButton` Integration in Library Page (`src/app/library/page.tsx`)

9. `src/app/library/page.tsx` is updated to import and render `<NewSongButton isMusicDirector={isMusicDirector} />` in the page header area (below the `<h1>` / song count subline, before the SearchBar). The `isMusicDirector` boolean is already computed in this page via the existing try/catch role check — no new Supabase query needed.
10. On desktop, the button appears inline in the header row. On mobile, the FAB appears fixed to the viewport — its rendered position in the JSX does not affect its visual placement due to `fixed` positioning.

### `/library/new` Route (`src/app/library/new/page.tsx`)

11. A new Server Component page at `src/app/library/new/page.tsx`. Auth guard: redirect to `/login` if no user. RBAC guard: redirect to `/library` if not `music_director` (follow the same try/catch pattern as `src/app/library/[id]/edit/page.tsx`).
12. The page renders a `NewSongFormClient` Client Component (at `src/components/client/NewSongFormClient.tsx`) containing a form with fields: `title` (text input), `artist` (text input), `original_key` (select from NOTES array), and `content` (textarea, `font-mono`, `spellCheck={false}`).
13. On submit, the form calls the existing `createSong()` Server Action from `src/app/actions/songActions.ts`. On success (`data` returned), navigate to `/library/${data.id}` via `router.push`. On error, display the `error` string inline near the submit button.
14. The submit button is disabled while submission is in progress (`isSaving` state). Label changes to "Creating..." during save.
15. Page title metadata: `"New Song — Saliw"`.
16. Back link to `/library` — identical styling to the back link in `src/app/library/[id]/page.tsx` (ChevronLeft icon, same Tailwind classes).
17. Artisan styling: `bg-brand-cream dark:bg-brand-darker`, `max-w-3xl mx-auto`, consistent with Library page.

### `useFontSize` Hook (`src/hooks/useFontSize.ts`)

18. A new hook exported as `useFontSize()`. Takes no arguments. Returns `{ fontSize, increase, decrease, reset }`.
19. `fontSize` is a number (pixels). Range: 12–48 (inclusive). Default: 16.
20. Initialized from `localStorage` key `"saliw-font-size"` in a `useEffect` (SSR-safe: only reads `localStorage` on the client). If the stored value is outside 12–48, clamps to the nearest bound. If no stored value, defaults to 16.
21. `increase`: adds 2px, clamped at 48. Persists to `localStorage` on change.
22. `decrease`: subtracts 2px, clamped at 12. Persists to `localStorage` on change.
23. `reset`: sets to 16. Persists to `localStorage`.
24. All three callbacks are memoized with `useCallback` (follow the `useTranspose` pattern in `src/hooks/useTranspose.ts`).
25. The hook does NOT apply the CSS variable itself — it only manages state. The consumer (`ChordSheetClient.tsx`) is responsible for applying the value.

### Stage-Ready Controls in `ChordSheetClient.tsx`

26. `ChordSheetClient.tsx` is extended (not replaced) to add three new controls to the existing transposition control bar: a font-size control group (A− / A+ buttons and a size indicator), a "Hide Chords" toggle button, and a "Stage Mode" toggle button.
27. **Font-size control group:** "A−" button calls `decrease`, "A+" button calls `increase`, clicking the size indicator (showing current px value) calls `reset`. All three are `type="button"`. Artisan ghost button styling consistent with the existing −1/+1 transpose buttons.
28. **Font-size CSS variable:** A `useEffect` in `ChordSheetClient.tsx` watches `fontSize` and calls `sheetRef.current?.style.setProperty('--chord-font-size', `${fontSize}px`)` when `sheetRef.current` is available. This is the same DOM-mutation pattern used for transposition — avoids React re-renders on the chord node tree.
29. **`.chord-display` CSS variable consumption:** In `src/styles/globals.css`, the `.chord-display` rule is extended to include `font-size: var(--chord-font-size, 1rem);`. This means the default remains 1rem (16px) when the variable is not set (SSR / first paint).
30. **Hide Chords toggle:** `ChordSheetClient.tsx` manages a `chordsHidden` boolean state. When `chordsHidden` is true, the class `chords-hidden` is added to the `.chord-display` container div. In `globals.css`, a new rule: `.chords-hidden .chord-item { opacity: 0; }` ensures chords are invisible but the span's layout space is preserved (lyric alignment is not disrupted). The toggle button label changes between "Hide Chords" and "Show Chords" based on state.
31. **Stage Mode toggle:** `ChordSheetClient.tsx` manages a `stageMode` boolean state. When `stageMode` is true, the class `stage-mode` is added to the `.chord-display` container div. In `globals.css`, new rules: `.stage-mode .section-title { border-left-width: 6px; filter: saturate(1.5); }` and `.dark .stage-mode .section-title { filter: saturate(1.5); }`. The toggle button label changes between "Stage Mode" and "Exit Stage" based on state.
32. The container div that receives `ref={sheetRef}` and `className="chord-display"` must now conditionally append `chords-hidden` and `stage-mode` classes: `["chord-display", chordsHidden && "chords-hidden", stageMode && "stage-mode"].filter(Boolean).join(" ")`.
33. All new toggle buttons follow the same focus-ring pattern as existing buttons in `ChordSheetClient.tsx`: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1`.
34. The control bar must remain scrollable on small screens — existing `flex-wrap` class on the control bar handles this; no changes needed to the outer container.

---

## Out of Scope

- Editing `title`, `artist`, or `original_key` from the song viewer Controls panel.
- Real-time collaboration or Realtime Supabase subscriptions.
- Autosave / draft persistence for the New Song form beyond the submit action.
- Deleting songs from the Library page.
- `beforeunload` guard for the New Song form.
- Per-user server-side persistence of font size or stage mode preferences.
- Any changes to `src/components/client/SongEditorClient.tsx` (editor, not viewer).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/library/page.tsx` | Add `NewSongButton` import and render; `isMusicDirector` role check pattern to follow |
| `src/app/library/[id]/edit/page.tsx` | RBAC guard pattern for `/library/new` page |
| `src/app/library/[id]/page.tsx` | Auth guard pattern; back-link styling reference |
| `src/components/SongViewer/ChordSheetClient.tsx` | Extend with font-size, hide-chords, stage-mode controls |
| `src/hooks/useTranspose.ts` | Pattern to follow for `useFontSize` hook structure |
| `src/components/client/button.tsx` | Artisan `Button` variants for toggle buttons |
| `src/components/server/card.tsx` | Card wrapper reference |
| `src/styles/globals.css` | Add `.chords-hidden`, `.stage-mode`, and `font-size` CSS variable rules |
| `src/services/supabase/server.ts` | `createClient()` for SSR Supabase in new page |
| `src/app/actions/songActions.ts` | `createSong()` Server Action — call as-is, do not modify |
| `src/utils/musicLogic.ts` | `NOTES` array for key selector in New Song form |
| `src/types/Song.ts` | `Song` type for form props |
| `src/types/supabase.ts` | `DbSong` return type from `createSong()` |

### Files to Create

| File | Type | Notes |
|------|------|-------|
| `src/components/library/NewSongButton.tsx` | Client Component | New — follow `src/components/client/button.tsx` pattern |
| `src/app/library/new/page.tsx` | Server Component | New route — RBAC guard required |
| `src/components/client/NewSongFormClient.tsx` | Client Component | New — follows `SongEditorClient.tsx` precedent |
| `src/hooks/useFontSize.ts` | Custom Hook | New — follow `useTranspose.ts` structure |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/library/page.tsx` | Import and render `NewSongButton` in header |
| `src/components/SongViewer/ChordSheetClient.tsx` | Add font-size, hide-chords, stage-mode controls |
| `src/styles/globals.css` | Add `.chords-hidden`, `.stage-mode`, and `font-size` variable CSS rules |

---

## Technical Schema

### Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|---------------|------|----------|--------|--------------|
| Submit New Song form | `createSong()` | `src/app/actions/songActions.ts` | `music_director` | **EXISTS** | N/A |
| Role check (library page) | Supabase query on `profiles` | `src/app/library/page.tsx` | own-row read | **EXISTS** | Degrade to `isMusicDirector = false` |
| Role check (`/library/new` page) | Supabase query on `profiles` | `src/app/library/new/page.tsx` (new) | own-row read | **EXISTS** (pattern) | Redirect to `/library` on error |
| Font size persistence | `localStorage` key `"saliw-font-size"` | Client-side only | N/A | **EXISTS** | Clamp to 16 if unavailable |
| Hide Chords toggle | CSS class toggle | `ChordSheetClient.tsx` | N/A | **EXISTS** | N/A |
| Stage Mode toggle | CSS class toggle | `ChordSheetClient.tsx` | N/A | **EXISTS** | N/A |
| `/library/new` page route | New page component | `src/app/library/new/page.tsx` | music_director | **MISSING — create in this task** | In-scope new work |

### createSong() Contract

- **Input:** `{ title: string; artist: string; original_key: string; content: string }`
- **Return:** `{ data: DbSong | null; error: string | null }`
- **On success:** Navigate to `/library/${data.id}`
- **On error:** Display `error` string inline near submit button
- **RLS errors:** Code `42501` → "You do not have permission to perform this action."

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-013/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-013/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-013/research.md` | Open questions + decisions |
| Technical Schema | `tasks/TASK-013/schema.md` | Server Action contract table |
| Endpoint Contracts | `tasks/TASK-013/contracts/endpoints.md` | Full contract detail |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Base branch:** `develop`. Create branch `feature/TASK-013-new-song-entry-stage-controls` from `develop`.
- **Artisan palette:** Use only Tailwind brand utility classes (`bg-brand-tan`, `text-brand-espresso`, etc.) — no hardcoded hex values anywhere.
- **No `clsx` in this project.** Use array `.filter(Boolean).join(" ")` for conditional class composition (established pattern from `ChordSheetClient.tsx`).
- **DOM-mutation pattern for CSS variable injection:** Follow `ChordSheetClient.tsx` lines 37–48. Call `sheetRef.current.style.setProperty('--chord-font-size', ...)` inside a `useEffect` that watches `fontSize`. Do not setState on the chord tree.
- **SSR safety for localStorage:** Wrap `localStorage` reads in `useEffect` (never in render body). Guard with `typeof window !== 'undefined'` before any access. Clamp stored values: `Math.min(48, Math.max(12, parsedValue || 16))`.
- **NewSongButton:** The role check stays in the Server Component parent (`library/page.tsx`). The button receives `isMusicDirector` as a prop. Never read role from Supabase inside a Client Component.
- **FAB z-index:** Must be `z-[80]` minimum (navbar is `z-50`, sidebar is `z-[70]`).
- **Stage Mode CSS:** Use `filter: saturate(1.5)` on `.stage-mode .section-title` — avoids hardcoded colors and respects both light/dark modes. Do NOT add `transition: border-width` to the global `*` rule.
- **`.chord-display` font-size:** The CSS variable `--chord-font-size` has a fallback of `1rem` so SSR renders correctly before the hook hydrates.
- **MEMORY.md:** Does not exist yet — no prevention rules to check.

---

## Resolution

- **Completed:** 2026-04-17
- **Branch:** `feature/TASK-013-new-song-entry-stage-controls`
- **Base branch:** `develop`
- **Files changed:**
  - `src/hooks/useFontSize.ts` — new hook, 12–48px range, localStorage persistence, useCallback pattern
  - `src/components/library/NewSongButton.tsx` — new Client Component, desktop + FAB, Loader2 loading state
  - `src/components/client/NewSongFormClient.tsx` — new form Client Component calling createSong()
  - `src/app/library/new/page.tsx` — new Server Component route with auth + RBAC guard
  - `src/app/library/page.tsx` — added NewSongButton import and render in page header
  - `src/components/SongViewer/ChordSheetClient.tsx` — extended with font-size controls, Hide Chords toggle, Stage Mode toggle
  - `src/styles/globals.css` — added .chord-display font-size variable, .chords-hidden, .stage-mode rules
- **Notes:**
  - No new package dependencies added.
  - NewSongButton renders both a desktop button (hidden on mobile) and a FAB (hidden on desktop) in one component — the fixed positioning of the FAB is independent of JSX position.
  - The font-size CSS variable injection uses DOM mutation on sheetRef (same pattern as transposition) — no React re-render on the chord tree.
  - Hide Chords uses opacity:0 (not visibility:hidden or display:none) to preserve lyric line spacing.
  - Stage Mode uses filter:saturate(1.5) to avoid hardcoded hex values.
  - TypeScript check (`npx tsc --noEmit`) passed with zero errors.
