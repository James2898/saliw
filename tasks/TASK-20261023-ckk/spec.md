<Spec — Library Tag Filter Optimistic UI & Skeleton Loading State>
## Feature Summary
On the Song Library page (`/library`), changing tag filters (or letter filters, search queries, page numbers, and page size) triggers a server-side URL navigation that previously left the UI looking frozen until the server responded. This feature introduces shared client-side navigation transition state across the Library page so that clicking any tag chip (or letter chip) immediately displays an optimistic active selection state, uses `router.replace` instead of `router.push` in `TagFilterBar` to avoid polluting browser history, and immediately replaces the song list rows with a 10-row animated skeleton loading state (`animate-pulse` with dark-mode-safe Artisan classes matching `src/app/library/loading.tsx`) whenever any Library filter or pagination transition is pending. Shared filter components (`AlphabetFilter`, `SearchBar`, `PaginationControls`, `PageSizeSelect`) remain backward-compatible when rendered outside `/library` (such as on `/setlists`).

## Acceptance Criteria
1. **Immediate Optimistic Tag Chip Feedback (`TagFilterBar`):** Clicking a tag chip (or the "All" chip) in `TagFilterBar` immediately updates the visual active/selected state (`aria-pressed="true"` and active Artisan chip classes with explicit `dark:` variants) to the clicked tag before the server navigation completes.
2. **History-Clean Tag Navigation (`TagFilterBar`):** `TagFilterBar` uses `router.replace` (`{ scroll: false }`) instead of `router.push` when updating URL search parameters (`?tag=...`, `page=1`), matching `AlphabetFilter` and `SearchBar` so rapid tag switching does not pollute browser history.
3. **Immediate Optimistic Letter Chip Feedback (`AlphabetFilter`):** Clicking a letter chip (or "All") in `AlphabetFilter` immediately updates the visual active/selected state (`aria-pressed="true"` and active Artisan chip classes) to the clicked letter while the transition is pending.
4. **Song List Skeleton Replacement on Filter/Pagination Transition:** While a URL navigation transition triggered by `TagFilterBar`, `AlphabetFilter`, `SearchBar`, `PaginationControls`, or `PageSizeSelect` on `/library` is pending, the song list area (or empty-state card if transitioning away from an empty result) is immediately replaced by a 10-row animated skeleton list (`animate-pulse`, `aria-busy="true"`, `aria-label="Loading songs"`) matching the row skeleton layout and dark-mode-safe Artisan styling in `src/app/library/loading.tsx`.
5. **Transition Completion Restoration:** Once the server navigation transition completes and new props (`songs`, `activeTag`, `activeLetter`, `page`, etc.) arrive from the Server Component, the skeleton list is replaced by the updated song list (or empty-state message) and optimistic chip states reconcile cleanly with the URL-derived props.
6. **Backward Compatibility on Non-Library Pages:** `AlphabetFilter`, `SearchBar`, `PaginationControls`, and `PageSizeSelect` continue to work without error when rendered standalone on other routes (e.g. `/setlists`) where a Library-specific transition provider/wrapper may not be present (falling back gracefully to an internal `useTransition` or optional context).
7. **React Compiler & SSR Safety (MEMORY.md Compliance):**
   - No synchronous `setState` inside `useEffect` that triggers `react-hooks/set-state-in-effect` build errors (`BUG-001` — use React 19 `useOptimistic` inside `startTransition` or render-phase derivation).
   - Declare all helper functions above any hooks (`useEffect`, `useCallback`, `useMemo`) that reference them (`BUG-007`).
   - Do not use object property paths (e.g., `router.replace` or `context.startTransition`) in `useCallback`/`useMemo` dependency arrays; depend on the whole object or destructured primitives (`BUG-002`).
   - Hoist static constant arrays (such as the 10-item skeleton placeholder index array) to module scope (`BUG-019`).
   - Every `text-brand-...`, `bg-brand-...`, and `border-brand-...` utility in the skeleton rows and filter chips includes its explicit `dark:` counterpart (`BUG-005`).

## Out of Scope
- Changing server-side Supabase query logic or database indexes for song filtering.
- Adding skeleton replacement to the `/setlists` list body (unless shared controls only trigger their own internal transition).
- Modifying the top-level page header, "Add Song" button, or filter bar containers into skeletons during filter transitions (only the song list rows are replaced with skeletons so users can keep clicking filters).
- Multi-tag selection (filtering remains single-tag or "All").

## Fallback Behaviors
- No new backend endpoints are introduced. If a shared filter component (`AlphabetFilter`, `SearchBar`, `PaginationControls`, `PageSizeSelect`) is rendered outside the Library transition context, it falls back to its own local `useTransition()` hook so navigation continues to function normally.

## Resolved Ambiguities
- **Tag Chip Selection Feedback & History Behavior** → Settled in Design Grill Q1.1: Clicking a tag in `TagFilterBar` immediately highlights the clicked tag chip optimistically before the server responds, and uses `router.replace` instead of `router.push`.
- **Song List Loading Presentation** → Settled in Design Grill Q1.2: Option A (Skeleton replace) — Immediately replace the song list rows with 10 animated skeleton cards matching `src/app/library/loading.tsx` while the transition is pending.
- **Scope Across Library Controls** → Settled in Design Grill Q1.3: Extend the shared transition loading state across all Library filter/pagination controls (`TagFilterBar`, `AlphabetFilter`, `SearchBar`, `PaginationControls`, `PageSizeSelect`) while keeping shared controls backward-compatible on other pages like `/setlists`.
</Spec — Library Tag Filter Optimistic UI & Skeleton Loading State>
