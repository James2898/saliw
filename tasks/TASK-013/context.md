# Context Bundle — Artisan New Song Entry Point & Stage-Ready UI Controls

## Relevant Files

| File | Why It's Relevant |
|------|-----------------|
| `src/app/library/page.tsx` | Authoritative pattern for `music_director` role check (try/catch on profiles query, `isMusicDirector` flag) — NewSongButton must follow this exact guard |
| `src/app/library/[id]/edit/page.tsx` | Pattern for RBAC guard + redirect; `SongEditorClient` composition model |
| `src/app/library/[id]/page.tsx` | Pattern for auth guard, `ChordSheetClient` usage, Card composition |
| `src/components/SongViewer/ChordSheetClient.tsx` | Existing Controls section lives here; font/visibility toggles must extend this component |
| `src/hooks/useTranspose.ts` | Reuse pattern for custom hooks — `useFontSize` must follow this structure (state + useCallback pattern) |
| `src/components/client/button.tsx` | `Button` component with Artisan variants (`primary`/`secondary`/`ghost`) — reuse for toggle buttons in Controls |
| `src/components/server/card.tsx` | Card wrapper used throughout; FAB does not use it but viewer controls panel might |
| `src/styles/globals.css` | Defines `--brand-tan`, `--brand-espresso`, `--brand-darker`, `.chord-display`, `.section-title`, `.chord-item` — Stage Mode must extend `.section-title` here |
| `src/services/supabase/server.ts` | `createClient()` for SSR Supabase — `NewSongButton` parent page uses this for role check |
| `src/app/actions/songActions.ts` | `createSong()` exists with `music_director` RLS enforcement — no new action needed for entry point |
| `src/types/supabase.ts` | DB type definitions |
| `docs/coding-guidelines.md` | Artisan palette, naming conventions, WCAG AA rules, hydration safety rules |

## Reuse Candidates

- `src/app/library/page.tsx` lines 39–52 — the `isMusicDirector` try/catch pattern must be replicated in whichever Server Component renders `NewSongButton`. The button itself receives `isMusicDirector` as a prop and conditionally renders (returning `null` for non-directors) so the DOM node is physically absent.
- `src/hooks/useTranspose.ts` — `useFontSize` hook should follow the exact same structure: `useState` + `useCallback` for increment/decrement/reset, exported return type interface.
- `src/components/client/button.tsx` — `Button` variant `ghost` is the right base for the Controls toggle buttons (Hide Chords, Stage Mode). Its `primary` variant matches the FAB aesthetic (`bg-brand-tan text-brand-espresso`).
- `src/styles/globals.css` `.section-title` block — Stage Mode must add a CSS modifier class (e.g., `.stage-mode .section-title`) directly in this file to increase saturation and border-width.
- `src/components/SongViewer/ChordSheetClient.tsx` — the `sheetRef` and DOM-mutation pattern is already established for transposition; the same `sheetRef` container ref should be reused for font-size CSS variable injection (`sheetRef.current.style.setProperty('--chord-font-size', ...)`).

## Patterns to Follow

- **Server-side role check:** See `src/app/library/page.tsx` lines 39–52 — query `profiles` table inside try/catch, default to `false` on error, pass boolean prop to child component.
- **DOM-absent conditional rendering:** See `src/app/library/page.tsx` line 145 — `{isMusicDirector && (...)}` pattern ensures the element is physically absent from the DOM for non-directors, not just hidden via CSS.
- **DOM-mutation for performance-critical updates:** See `src/components/SongViewer/ChordSheetClient.tsx` lines 37–48 — `useEffect` mutates `.chord-item` spans directly. Font-size CSS variable injection must use the same pattern (mutate `sheetRef.current.style.setProperty` inside `useEffect`).
- **localStorage persistence:** See `src/components/client/navbar.tsx` lines 47–55 and 131–138 — initialise from `localStorage` in `useEffect` (client-only guard), persist on change. `useFontSize` must follow this exact pattern with key `"saliw-font-size"`.
- **CSS class toggle for chord visibility:** The `.chord-item` class is defined globally; a `.chords-hidden .chord-item { opacity: 0; }` rule in `globals.css` preserves layout while hiding chords (visibility collapse would not preserve spacing, `display:none` would collapse spans).
- **Lucide icon usage:** See `src/app/library/page.tsx` (Pencil), `src/components/client/navbar.tsx` (various) — import named icons from `lucide-react`, use `size` + `strokeWidth` props, add `aria-hidden="true"`.
- **Artisan button hover + scale:** The `button.tsx` base class includes `transition-colors`. `scale-105` on hover must be added via Tailwind's `hover:scale-105` utility; the `button.tsx` `baseClasses` string does not include it, so it must be passed via `className` prop.
- **FAB z-index:** The navbar uses `z-50`; the sidebar uses `z-[70]`. The FAB must use at minimum `z-[80]` to render above all existing overlays.

## Anti-Patterns Flagged

- `src/components/client/navbar.tsx` line 18: imports `createClient` from `@/services/supabase/client` for auth state subscription — this is correct for Realtime/client-side use. Do NOT replicate this for the role check in `NewSongButton`; role checks must use `@/services/supabase/server` in a Server Component parent.
- `src/components/SongViewer/ChordSheetClient.tsx` line 155: `className="chord-display"` applied directly on the div — font-size CSS variable must be injected on this same div via `sheetRef`, not on a wrapper, to avoid breaking `white-space: pre-wrap` inheritance.
- `src/styles/globals.css` line 69: the global `*` transition block covers `background-color` and `border-color`. Stage Mode border-width change must NOT use `transition: border-width` on `*` — it must use a targeted Tailwind class or scoped CSS rule to avoid polluting the global transition.

## MEMORY.md Notes

- N/A (MEMORY.md does not exist yet in this project)
