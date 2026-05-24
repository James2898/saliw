# Context Bundle — Add Songs FAB + Modal on Setlist Viewer

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `/Users/adish/projects/saliw/src/app/setlists/[id]/SetlistViewerClient.tsx` | Host component where the new FAB must be rendered alongside `<AutoScrollToolbar>`; owns `isLeader`, `setlistId`, and `autoScroll` state |
| `/Users/adish/projects/saliw/src/app/setlists/[id]/page.tsx` | Server Component that resolves `isLeader` from profile role and passes it as prop to `SetlistViewerClient`; must pass `setlistId` to the new FAB |
| `/Users/adish/projects/saliw/src/components/client/AutoScrollToolbar.tsx` | Existing FAB — exact CSS classes, z-index, fixed-bottom-right positioning, and Artisan CSS-variable color tokens to mirror for the new left-side FAB |
| `/Users/adish/projects/saliw/src/app/actions/songActions.ts` | Contains `getAllSongs()` — fetch all songs for the modal list; no auth required (public RLS) |
| `/Users/adish/projects/saliw/src/app/actions/setlistActions.ts` | Contains `addSongToSetlist()` — single-song append with auto-computed `order_index` and `performance_key`; no bulk-append action exists yet |
| `/Users/adish/projects/saliw/src/components/client/logout-modal.tsx` | Reusable scrollable modal pattern: backdrop, `role="dialog"`, `aria-modal`, focus-on-open, Escape key + focus trap, `z-[80]`/`z-[90]` z-stack |
| `/Users/adish/projects/saliw/src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` | Second modal reference; shares the same dialog panel CSS shape — confirms the pattern |
| `/Users/adish/projects/saliw/src/components/client/SetlistBuilder/LibraryPanel.tsx` | Song list row UI pattern with checkbox-equivalent "Add" button, search input, `title`/`artist`/`original_key` layout — reuse the row structure for the modal song list |
| `/Users/adish/projects/saliw/src/components/client/button.tsx` | Shared `Button` component — `variant="primary"` for Save, `variant="ghost"` for Cancel; `forwardRef`-ready |
| `/Users/adish/projects/saliw/src/styles/globals.css` | All Artisan CSS variables (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`, `--brand-tan-alpha`) and semantic tokens (`--brand-background`, `--brand-card-bg`) |
| `/Users/adish/projects/saliw/src/types/supabase.ts` | `DbSetlistSong` type — junction table shape: `id`, `setlist_id`, `song_id`, `order_index`, `performance_key` |
| `/Users/adish/projects/saliw/supabase/migrations/20260415000003_create_setlist_songs_table.sql` | `setlist_songs` RLS policies — INSERT requires `setlists.leader_id = auth.uid()` |
| `/Users/adish/projects/saliw/src/hooks/useAutoScroll.ts` | `UseAutoScrollReturn` type exported here; pattern for BUG-001 compliance and BUG-007 declaration ordering |

## Reuse Candidates

- `/Users/adish/projects/saliw/src/components/client/logout-modal.tsx` — Modal shell is directly reusable: backdrop (`fixed inset-0 z-[80] bg-brand-espresso/40`), dialog panel (`fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,24rem)] bg-[var(--brand-background)] border border-brand-brown/20 rounded-2xl p-6`), focus-on-open `useEffect`, Escape + Tab focus-trap. The new modal needs a taller panel and an internal scrollable list — extend by replacing the fixed `w-[min(90vw,24rem)]` with something like `w-[min(90vw,32rem)] max-h-[80vh] overflow-y-auto`.

- `/Users/adish/projects/saliw/src/components/client/SetlistBuilder/CloneSetlistDialog.tsx` — Second confirmation of the modal shell pattern; same backdrop + panel classes. CloneSetlistDialog is simpler (2 buttons only); for the new modal the scrollable list slots between title and footer action row.

- `/Users/adish/projects/saliw/src/components/client/SetlistBuilder/LibraryPanel.tsx` — The song row structure (`flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10` with title + artist + key badge) is directly adaptable for the modal's song list. Replace the "Add" button with a checkbox on the left.

- `/Users/adish/projects/saliw/src/components/client/button.tsx` — Use `<Button variant="primary" size="sm">Save</Button>` and `<Button variant="ghost" size="sm">Cancel</Button>` for the modal footer. Already `forwardRef`-compatible for focus management.

- `getAllSongs()` in `/Users/adish/projects/saliw/src/app/actions/songActions.ts` — Returns `{ id, title, artist, original_key }[]` ordered by title. No auth required. Directly usable to populate the modal list. The FAB component should call this action when the modal opens (not on FAB mount) to avoid unnecessary fetches.

- `addSongToSetlist()` in `/Users/adish/projects/saliw/src/app/actions/setlistActions.ts` — Single-song append; computes `order_index` server-side as `MAX(order_index) + 1`. No bulk variant exists. The Save handler must loop over checked song IDs and call this action sequentially (or in parallel with `Promise.all`, but note it computes `MAX(order_index)` at call time — parallel calls may race on the same `MAX`, potentially producing duplicate `order_index` values). Sequential calls are safer.

- `/Users/adish/projects/saliw/src/components/client/AutoScrollToolbar.tsx` — The CSS constant pattern (`module-level const` strings joined with `.join(" ")`) and the Artisan color tokens (`bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`, `border border-[var(--brand-tan)]/30`, `rounded-2xl shadow-lg`) are the exact tokens to replicate for the new FAB.

## Patterns to Follow

- **Fixed FAB positioning:** See `AutoScrollToolbar.tsx` line 18–22 — `"fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans"`. The new FAB should mirror this with `fixed bottom-6 left-6 z-50` (left-aligned, same bottom offset, same z-level). No desktop-only Tailwind guard (`lg:block hidden`) is currently applied to the existing FAB — the task specifies desktop-only, so add `hidden lg:flex` to the new FAB container.

- **isLeader guard for FAB visibility:** See `SetlistViewerClient.tsx` lines 108–117 — the Edit Setlist link and the Go Live button are conditionally rendered with `{isLeader && ...}`. The new FAB must follow the same pattern: `{isLeader && <AddSongsFab ... />}`.

- **Artisan CSS-variable color tokens:** All color references in `AutoScrollToolbar.tsx` use CSS arbitrary values (`bg-[var(--brand-espresso)]`, `text-[var(--brand-cream)]`) rather than named Tailwind utilities, so they auto-switch in dark mode without needing `dark:` pairs. Apply the same approach for the new FAB and modal so dark mode works without extra `dark:` variants on every class.

- **Modal z-index stacking:** `logout-modal.tsx` uses `z-[80]` for backdrop and `z-[90]` for dialog panel. The existing FAB is `z-50`. New modal must use the same `z-[80]`/`z-[90]` stack so it sits above both FABs.

- **Focus management in modal:** See `logout-modal.tsx` lines 40–83 — `useEffect` moves focus to Cancel button on open; second `useEffect` handles Escape dismiss and Tab focus-trap cycling between all interactive elements. The new modal's focus trap must include all checkboxes and both footer buttons.

- **React Compiler declaration order (BUG-007):** All helper functions and callbacks must be declared **before** any `useEffect` that references them. This applies to the new FAB component's open/close handlers and any callbacks passed to the modal.

- **No property-path useCallback deps (BUG-002):** If the new FAB or modal receive a prop object, the `useCallback` deps must reference the whole prop object, not individual property paths.

- **Server Action error handling:** See `addSongToSetlist()` — returns `{ data, error }`. The Save handler must check `error` on each call and surface a user-visible message (never silently swallow). Pattern: `role="alert"` inline error below the action row (see `logout-modal.tsx` lines 157–165).

- **No direct Supabase calls in Client Components:** `getAllSongs()` and `addSongToSetlist()` are Server Actions. The modal must import and call them as Server Actions — not use a Supabase browser client directly.

- **Module-level CSS class constants:** See `AutoScrollToolbar.tsx` lines 18–83 — all class strings declared as `const` at module level to avoid per-render string allocations. Follow the same pattern in the new FAB and modal components.

## Anti-Patterns Flagged

- `AutoScrollToolbar.tsx` has **no desktop-only guard** (no `hidden lg:flex` or equivalent). The existing auto-scroll FAB renders on mobile too. The task specifies the new FAB is desktop-only; do not replicate the absence of a responsive guard — explicitly add `hidden lg:flex` to the new FAB's container.

- `addSongToSetlist()` at `setlistActions.ts` lines 141–148 computes `order_index` with a `MAX(order_index) + 1` query at call time. Calling it in parallel with `Promise.all` for multiple songs will race: each concurrent call reads the same `MAX` and inserts the same `order_index`, creating duplicate ordering values. Do not replicate parallel calls — use sequential awaits when appending multiple songs.

- `LibraryPanel.tsx` line 65 — `text-brand-brown/60` named utility with no `dark:` variant on the "Song Library" label. This is a dark-mode anti-pattern per BUG-005 prevention rule. Do not replicate unguarded named Tailwind utilities in the new modal's text elements; prefer CSS-variable arbitrary values or always add `dark:` pairs.

## MEMORY.md Notes

- **BUG-001 (useState from localStorage):** Never seed React state from `localStorage`/`sessionStorage` via `useEffect + setState`. Use a lazy `useState` initializer. Applies if the new FAB or modal ever persists state locally.

- **BUG-002 (useCallback property-path deps):** Never use object property paths as `useCallback`/`useMemo` deps (e.g. `[props.onClose]` if `props` is an object). Depend on the whole object or destructured primitives. Relevant if the new FAB component has memoized callbacks.

- **BUG-007 (React Compiler forward reference):** Declare all helper functions and callbacks **above** the `useEffect` that calls them in any Client Component. Hard build error on Vercel if forward-referenced.

- **BUG-004 / BUG-005 (Dark mode — named Tailwind utilities):** Named utilities (`text-brand-espresso`, `bg-brand-cream`, etc.) do not auto-switch in dark mode. Any new component that uses named utilities must include explicit `dark:` pairs. Prefer `bg-[var(--brand-espresso)]`-style arbitrary values for elements that must auto-switch.

- **BUG-014 (N+1 hook instances):** Do not instantiate `useAutoScroll` inside the new FAB — `SetlistViewerClient` already owns the single `autoScroll` instance and passes it via props. The same singleton pattern must apply to any new hook state introduced by the FAB (e.g., modal open/closed state must live in `SetlistViewerClient` or the FAB itself, not duplicated).

- **BUG-016 (module-level constant shadows dynamic variable):** If the new component defines a constant (e.g. `const PAGE_SIZE`) at module level, ensure it does not shadow a same-named parameter or derived value elsewhere in the same scope.

- **General (Prettier format):** Run `npm run format` before every commit — see `docs/coding-guidelines.md`. Agents must not skip this step.
