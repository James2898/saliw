# TASK-051 — P1 Immediate Reliability & Performance Optimizations

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** Completed

---

## Feature Summary

Apply critical P1 performance and reliability optimizations across chord processing, realtime setlist synchronization, and chord sheet viewer event handling:
1. Prevent expensive regex chord parsing (`preProcessChords`) from executing on every keystroke or non-chord field change in `SongEditorClient` and `NewSongFormClient` by wrapping the parser invocation in `useMemo` with primitive string dependencies (`currentContent` / `content`).
2. Prevent memory leaks, dangling network requests, and post-unmount state updates in `useSetlistSync.ts` by tracking and clearing all pending debounce timers in `debounceTimersRef` and timeouts during `useEffect` unmount cleanup.
3. Prevent duplicate channel subscriptions and race conditions in `useSetlistSync.ts` by implementing in-flight guards on `toggleFollow` and `toggleLive`.
4. Eliminate N+1 redundant global `window` `keydown` and `resize` event listeners when multiple `ChordSheetClient` instances render (e.g. in multi-song setlist views) by accepting an `{ enabled?: boolean }` option in `useAutoScroll` and `useFontSize`, passing `enabled: !injectedAutoScroll` (or active status) so only the active/standalone viewer attaches global listeners.

---

## Acceptance Criteria

1. `preProcessChords` in `SongEditorClient.tsx` is wrapped in `useMemo` with primitive dependency `[currentContent]` complying with React Compiler rules (BUG-002).
2. Editing non-chord fields (e.g. title, key, tags, singer) in `SongEditorClient.tsx` does not trigger chord regex re-parsing.
3. `preProcessChords` in `NewSongFormClient.tsx` is wrapped in `useMemo` with primitive dependency `[content]` complying with React Compiler rules (BUG-002).
4. Editing non-chord fields in `NewSongFormClient.tsx` does not trigger chord regex re-parsing.
5. All helper functions referenced by `useMemo` or hooks are declared prior to hook calls to prevent React Compiler forward-reference errors (BUG-007).
6. All pending debounce timers in `debounceTimersRef` and any active timeout handles in `useSetlistSync.ts` are tracked and explicitly cancelled/cleared in the `useEffect` unmount cleanup handler (BUG-019).
7. No deferred callbacks, state updates, or server actions execute post-unmount from `useSetlistSync.ts`.
8. `toggleFollow` implements an in-flight guard (returning early if state transition or channel subscription is already in progress) preventing duplicate Supabase realtime channel subscriptions.
9. Rapid repeated clicks on `toggleFollow` while an operation is in flight are safely ignored, and the guard cleanly resets upon resolution or error.
10. Rendering multiple `ChordSheetClient` instances in setlist views does not attach redundant global `window` `keydown` and `resize` event listeners per song card.
11. Only the active song (or standalone viewer) attaches and processes global `window` event listeners for auto-scroll and font size adjustments.
12. Switching active songs or unmounting cleanly detaches window event listeners from the deactivated song.
13. Global keyboard shortcuts and responsive layout handlers continue to operate smoothly for the active song.

---

## Out of Scope

- Rewriting the chord parsing regex engine itself in `src/utils/musicLogic.ts`.
- Altering the Supabase realtime broadcast protocol or channel schema.
- Redesigning the UI layout or styling of `ChordSheetClient`, `SongEditorClient`, or `NewSongFormClient`.
- Full-page refactoring of setlist viewer virtualization.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/SongEditorClient.tsx` | Wrap `preProcessChords(currentContent)` in `useMemo`; ensure primitive dependency `[currentContent]` |
| `src/components/client/NewSongFormClient.tsx` | Wrap `preProcessChords(content)` in `useMemo`; ensure primitive dependency `[content]` |
| `src/hooks/useSetlistSync.ts` | Clear `debounceTimersRef` and active timeouts in `useEffect` unmount cleanup; add in-flight guard for `toggleFollow` and `toggleLive` |
| `src/components/SongViewer/ChordSheetClient.tsx` | Pass `enabled: !injectedAutoScroll` (or active viewer state) to `useAutoScroll` and `useFontSize` to avoid duplicate global listeners |
| `src/hooks/useAutoScroll.ts` | Accept optional `{ enabled?: boolean }` (default `true`); guard `window` `keydown`/`resize` event listener attachment |
| `src/hooks/useFontSize.ts` | Accept optional `{ enabled?: boolean }` (default `true`); guard `window` `resize`/shortcut listener attachment |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Format all modified files with `npm run format` (Prettier) before committing.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-001 (useState lazy initializer):** Any state initialization that reads from browser APIs or derives from props must use `useState(() => initial)` lazy initializers, never `useEffect` + `setState`.
- **BUG-002 (React Compiler useCallback/useMemo deps):** Dependencies must be primitives or whole objects, never property paths (e.g. use `[currentContent]` or `[song]`, never `[song.currentContent]`).
- **BUG-007 (React Compiler forward reference):** In Client Components, declare all helper functions and callbacks before any `useEffect` or `useMemo` blocks that reference them.
- **BUG-019 (Timer cleanup on unmount):** Any `setTimeout` or debounce timer ref in hooks (`useSetlistSync.ts`) must be explicitly cleared in the `useEffect` unmount cleanup return function.
- **BUG-020 (SSR hydration safety):** Do not run client-only window listeners or initialization during SSR or when a component is disabled; guard with `enabled` prop and mount checks.

---

## Amendments (from Context Bundle)

- **AM-1:** `toggleLive` in `src/hooks/useSetlistSync.ts` must also implement an in-flight guard (returning early if `isLiveConnecting` or already transitioning) to prevent concurrent WebSocket connection attempts / channel broadcasts, mirroring the `toggleFollow` guard in AC-8 and AC-9.
- **AM-2:** `useFontSize.ts` must accept `{ enabled?: boolean }` (default `true`) alongside `useAutoScroll.ts`, guarding any global `resize` or keyboard listeners attached by the hook when rendered in secondary `ChordSheetClient` instances.

---

## Resolution

- **Completed:** 2026-10-17
- **Branch:** `perf/TASK-051-p1-reliability-optimizations`
- **Files changed:**
  - `src/components/client/SongEditorClient.tsx`
  - `src/components/client/NewSongFormClient.tsx`
  - `src/hooks/useSetlistSync.ts`
  - `src/hooks/useAutoScroll.ts`
  - `src/hooks/useFontSize.ts`
  - `src/components/SongViewer/ChordSheetClient.tsx`
  - `tasks/TASK-051.md`
- **Notes:** Wrapped `preProcessChords` in `useMemo` with primitive dependency arrays in `SongEditorClient.tsx` and `NewSongFormClient.tsx` (AC-1 through AC-5, BUG-002, BUG-007). In `useSetlistSync.ts`, implemented in-flight guards for `toggleFollow` and `toggleLive`, cleared debounce and status/idle transition timeouts on unmount, and prevented post-unmount deferred callbacks/state updates with `isMountedRef` (AC-6 through AC-9, AM-1, BUG-019). Added `{ enabled?: boolean }` options to `useAutoScroll` and `useFontSize` and guarded global `keydown`/`resize` window event listeners, passing `{ enabled: !injectedAutoScroll }` in `ChordSheetClient.tsx` to eliminate N+1 redundant listeners in setlist multi-song views (AC-10 through AC-13, AM-2). Verified with `npx tsc --noEmit`, Prettier, and `npm run build`.
