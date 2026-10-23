# Context Bundle — Song Library Filter & Pagination Transition Loading State

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/app/library/page.tsx` | Song Library Server Component; renders `SearchBar`, `PageSizeSelect`, `TagFilterBar`, `AlphabetFilter`, song list / empty state, and `PaginationControls`. Needs a shared client transition boundary so pending filter/pagination navigations replace the song list with the skeleton. |
| `src/app/library/loading.tsx` | Route-level loading skeleton; lines 34–55 define the 10-row song list skeleton markup (`animate-pulse bg-brand-brown/10`) that should be reused for in-page filter transitions (Option A). |
| `src/components/SongTags/TagFilterBar.tsx` | Client Component for tag filtering (`All`, `Joyful`, `Solemn`, `Hymn`); currently derives `isActive` solely from the server `activeTag` prop and calls `router.push` without optimistic selection or shared transition state. |
| `src/components/client/AlphabetFilter.tsx` | Client Component for A–Z first-letter filtering; calls `router.replace(buildUrl(...))` and is shared between `/library` and `/setlists`. |
| `src/components/client/SearchBar.tsx` | Client Component for search form submission and clear (`X`) button; calls `router.replace(buildSearchUrl(...))` and is shared between `/library` and `/setlists`. |
| `src/components/client/PaginationControls.tsx` | Client Component for first/prev/next/last page buttons; calls `router.replace(buildUrl(...))` and is shared between `/library` and `/setlists`. |
| `src/components/client/PageSizeSelect.tsx` | Client Component for items-per-page `<select>`; calls `router.replace(buildUrl(...))` and is shared between `/library` and `/setlists`. |
| `src/app/setlists/page.tsx` | Secondary consumer of `SearchBar`, `AlphabetFilter`, `PaginationControls`, and `PageSizeSelect`; any prop or context additions to those four components must remain backward-compatible when rendered on `/setlists`. |
| `src/types/Song.ts` | Defines `SongTag`, `STANDARD_SONG_TAGS`, and `SongSummary` used by `TagFilterBar` and `LibraryPage`. |

## Reuse Candidates

- `src/app/library/loading.tsx` (lines 34–55) — The `<ul className="flex flex-col gap-2" role="list" aria-label="Loading songs">` 10-row skeleton block matches the exact card dimensions of song rows in `src/app/library/page.tsx`. Extract into a reusable component (e.g. `SongListSkeleton`) or shared markup so both `loading.tsx` and the client transition wrapper render identical skeleton rows without duplication.
- `src/components/SongTags/TagFilterBar.tsx`, `src/components/client/AlphabetFilter.tsx`, `src/components/client/SearchBar.tsx`, `src/components/client/PaginationControls.tsx`, `src/components/client/PageSizeSelect.tsx` — Each already has a pure module-scoped `buildUrl` / `buildSearchUrl` helper that preserves all live query parameters (`q`, `letter`, `tag`, `pageSize`, `page`). Reuse these URL builders and route their navigation calls through a shared React `useTransition` navigation helper (or context) so triggering any control sets `isPending = true` across the library view.
- React 19 `useOptimistic` / `useTransition` (built into React 19 / Next.js 15) — Use `useOptimistic` (or transition-scoped optimistic state) in `TagFilterBar` (and optionally `AlphabetFilter`) to immediately reflect the clicked filter pill before the server round-trip completes, automatically reconciling with the server prop without `useEffect` + `setState` (which would violate `BUG-001`).

## Patterns to Follow

- **Shared Client Transition Context / Wrapper for Server Component Lists:** Because `src/app/library/page.tsx` is an async Server Component and the filter bars are separate Client Components from the song list, wrap the library interactive region in a lightweight Client Component provider (e.g., `LibraryFilterTransitionProvider` or `LibraryClientShell`) that owns `const [isPending, startTransition] = useTransition()`. Expose a navigation trigger (or transition wrapper) via React Context so `TagFilterBar`, `AlphabetFilter`, `SearchBar`, `PaginationControls`, and `PageSizeSelect` wrap their `router.replace` / `router.push` calls inside `startTransition`, while a client slot wrapper around the server-rendered song list swaps `children` for the song row skeleton (`Option A`) whenever `isPending` is true.
- **Backward Compatibility with `/setlists`:** `SearchBar`, `AlphabetFilter`, `PaginationControls`, and `PageSizeSelect` are also mounted in `src/app/setlists/page.tsx`. If they consume a filter transition context hook, provide a safe default fallback (e.g., calling `useTransition` locally or falling back to direct `router.replace` when outside the provider) so `/setlists` continues to work without requiring changes or crashing.
- **SSR-Safe Optimistic State Without `useEffect` + `setState`:** See `MEMORY.md` BUG-001. Do not use `useEffect(() => setOptimisticTag(activeTag), [activeTag])` to sync optimistic state when server props update — Next.js 15 / React 19's `react-hooks/set-state-in-effect` ESLint rule rejects synchronous `setState` inside `useEffect` at build time. Use React 19's `useOptimistic(activeTag, (_current, nextTag: string | null) => nextTag)` inside `startTransition`, or derive optimistic state cleanly without an effect.
- **Declaration Order Before Hooks:** See `MEMORY.md` BUG-007. Always declare `buildUrl` and any helper functions above `useCallback`, `useMemo`, or `useEffect` hooks.
- **Whole-Object or Destructured Primitive Dependencies in `useCallback`:** See `MEMORY.md` BUG-002. Never pass property paths like `[router.replace]` or `[transitionContext.navigate]` in `useCallback` dependency arrays; destructure functions at the top of the component or pass the whole object `[router]`.
- **Module-Scoped Static Option Arrays:** See `MEMORY.md` BUG-019. Keep `TAG_OPTIONS`, `chips`, and `PAGE_SIZE_OPTIONS` hoisted at module scope.
- **Explicit Dark Mode Variants:** See `MEMORY.md` BUG-005. Every `text-brand-*`, `bg-brand-*`, and `border-brand-*` class in skeleton rows or active/pending filter controls must have an explicit `dark:` pair.

## Anti-Patterns Flagged

- `src/components/SongTags/TagFilterBar.tsx` line 49: Calls `router.push(buildUrl(...))` whereas `AlphabetFilter.tsx` (line 98), `SearchBar.tsx` (line 65), `PaginationControls.tsx` (line 64), and `PageSizeSelect.tsx` (line 56) all use `router.replace(...)` to avoid stacking browser history entries on every filter toggle. Prefer `router.replace` for consistency unless history entries are explicitly required.
- `src/components/client/PaginationControls.tsx` line 89: `<span className="px-3 py-1.5 text-sm font-semibold text-brand-brown select-none" aria-live="polite">` lacks a `dark:text-brand-tan` (or `dark:text-brand-cream`) class, violating `MEMORY.md` BUG-005.
- `src/app/library/loading.tsx` lines 29–31: Only renders a skeleton for the search bar and omits skeleton placeholders for `TagFilterBar` and `AlphabetFilter`, though during in-page transitions (`Option A`) only the song list region is replaced with skeleton rows while the real filter bars remain mounted and interactive.

## MEMORY.md Notes

- **BUG-001 (UI State — Synchronous `setState` in `useEffect`):** Never call `setState` synchronously inside `useEffect` (e.g., to reset optimistic state when `activeTag` or URL params change). Next.js 15 / React 19 strict lint (`react-hooks/set-state-in-effect`) fails the build. Use `useOptimistic` inside `startTransition` or render-phase state derivation instead.
- **BUG-020 (UI State — SSR Hydration Mismatch):** Never use `useState(() => typeof window !== "undefined")` as a mount guard in `"use client"` components. If a mount guard is ever needed, use `useState(false)` + `useEffect(() => setMounted(true), [])`.
- **BUG-005 (UI State — Dark Mode Utility Pairing):** Every named Artisan utility (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`, `border-brand-brown`, etc.) must have an explicit `dark:` counterpart (`dark:text-brand-cream`, `dark:text-brand-tan`, `dark:bg-brand-espresso`, etc.).
- **BUG-007 (Architecture — React Compiler Declaration Order):** Declare all helper functions (`buildUrl`, etc.) textually before any hook (`useCallback`, `useEffect`, `useMemo`) that references them. Forward references fail the React Compiler build.
- **BUG-002 (Architecture — React Compiler Dependency Arrays):** Never use object property paths (e.g. `[router.replace]`, `[ctx.navigate]`) in `useCallback` or `useMemo` dependency arrays. Depend on the whole object (`[router]`) or destructure the function before the hook.
- **BUG-019 (Architecture — Inline Reference Allocation & Unconditional Hooks):** Hoist static option arrays (`TAG_OPTIONS`, `chips`, `PAGE_SIZE_OPTIONS`) to module scope so references remain stable across renders. Always call hooks unconditionally at the top level of components.
- **BUG-006 (Architecture — Tailwind v4 Wildcard Scanning):** Never write wildcard arbitrary-value class patterns with an asterisk in code comments or markdown files under the project root.
- **BUG-022 & BUG-025 (Dev Server & Worktree):** Never run `next build` while `next dev` is running in the same worktree (corrupts `.next/`). When starting the dev server in a git worktree with symlinked `node_modules`, run `npx next dev -p <port>` without `--turbopack`.
