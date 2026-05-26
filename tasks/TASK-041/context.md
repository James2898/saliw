# Context Bundle — Spacebar Autoscroll Play/Pause

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/hooks/useAutoScroll.ts` | Owns all autoscroll state, rAF loop, and the existing spacebar `keydown` handler at lines 260–295 |
| `src/components/client/AutoScrollToolbar.tsx` | Renders the fixed toolbar; receives the full `UseAutoScrollReturn` as `scroll` prop |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Single owner of the `useAutoScroll()` instance on the setlist page; passes it to toolbar and all song sections |
| `src/components/SongViewer/ChordSheetClient.tsx` | Standalone song viewer that calls `useAutoScroll()` internally when no `injectedAutoScroll` prop is provided |

## Reuse Candidates
- `src/hooks/useAutoScroll.ts` lines 260–295 — A spacebar `keydown` handler already exists inside the hook. It guards `!isActiveRef.current` (only fires when toolbar is active) and guards against INPUT/TEXTAREA/SELECT/contentEditable targets. It correctly calls `cancelRaf` + `setIsScrolling(false)` for pause and `setIsScrolling(true)` + `startRaf()` for resume. **The feature is already implemented.** The task needs to verify whether the "if speed is not set, use default speed" edge case is also covered.
- `DEFAULT_SPEED = 1` at line 10 — Module-level constant; `readStoredSpeed()` falls back to it when localStorage is empty or unavailable. Speed is initialized via lazy `useState(readStoredSpeed)`, so the speed is always at minimum `DEFAULT_SPEED` (never undefined/null) by the time any keydown handler runs.
- `isActiveRef` / `isScrollingRef` at lines 110–113 — Ref-based mirrors of state used inside the `keydown` handler to avoid stale closures in event listener callbacks. Any new keyboard listener must use these refs, not the state values directly.

## Patterns to Follow
- **Keyboard listener in hook (not component):** See `useAutoScroll.ts` lines 260–295 — keyboard listeners are registered in the hook via `window.addEventListener` inside `useEffect`, with proper cleanup via the return function. Other keyboard listeners in this codebase use `document.addEventListener` (modal components), but the autoscroll handler intentionally uses `window` to match the scroll target.
- **Ref-mirror pattern for event listeners:** See `isScrollingRef` and `isActiveRef` — state changes are mirrored to refs so event listener callbacks (which close over refs, not state) always read the current value. Any new listener that needs to read autoscroll state must use `isScrollingRef.current` / `isActiveRef.current`, not `isScrolling` / `isActive`.
- **Input guard pattern:** See lines 267–276 — every keyboard shortcut handler checks `target.tagName` for INPUT/TEXTAREA/SELECT and `target.isContentEditable` before consuming the event. New shortcuts must replicate this guard.
- **BUG-007 compliance — declaration order:** All helpers (`cancelRaf`, `startRaf`, `persistSpeed`) are declared before the `useEffect` that calls them. Any new `useEffect` referencing these callbacks must appear after their declarations.
- **BUG-002 compliance — useCallback deps:** `useCallback` deps reference whole objects, not property paths. The existing spacebar `useEffect` depends on `[cancelRaf, startRaf]` (whole callbacks), which is correct.

## Anti-Patterns Flagged
- `src/hooks/useAutoScroll.ts` line 265: the spacebar handler early-exits with `if (!isActiveRef.current) return` — this means spacebar does **nothing** when autoscroll is inactive. The task description says "if speed is not set, use the default speed" which implies the shortcut may need to also *activate* autoscroll, not just toggle pause/resume within an active session. This is a design ambiguity the requirements engineer must resolve: should spacebar (a) only pause/resume when already active, or (b) also activate autoscroll if inactive? The current implementation is (a). Do not change this without a requirements decision.
- `src/components/SongViewer/ChordSheetClient.tsx` line 141: `const internalAutoScroll = useAutoScroll()` is always called unconditionally (Rules of Hooks compliance per BUG-019 pattern), but the internal rAF never starts because the internal `AutoScrollToolbar` is not rendered when `injectedAutoScroll` is provided. This means on the setlist page there are two `useAutoScroll` instances alive simultaneously — the parent's (active) and each ChordSheetClient's (inert). Both register `window.addEventListener("keydown", handleKeyDown)` listeners. The inert instances' handlers will exit immediately via `if (!isActiveRef.current) return` because their `isActiveRef.current` is always `false`. This is safe but is a registered-but-no-op listener concern. Do not replicate this pattern without noting it.

## MEMORY.md Notes
- **BUG-001** — Never initialize state from localStorage via `useEffect` + `setState`. `useAutoScroll` already uses lazy `useState(readStoredSpeed)` — compliant. No risk for this task.
- **BUG-007** — React Compiler rejects forward references in hooks. Any new helper added to `useAutoScroll.ts` must be declared before the `useEffect` that calls it. Verify declaration order if adding any new callback.
- **BUG-002** — `useCallback` deps must reference whole objects, not property paths. The existing spacebar `useEffect` deps `[cancelRaf, startRaf]` are whole callbacks — correct. Do not change to property-path deps.
- **BUG-019** — Prop-override injection pattern: always call hook unconditionally and prefer prop via `propValue ?? hookValue`. `ChordSheetClient` already follows this pattern for `injectedAutoScroll`. Do not deviate.
- **BUG-014** (N+1 useAutoScroll instances, referenced in `ChordSheetClient` JSDoc lines 63–68) — The fix was to inject a single parent-owned instance. The inert child instances still register keydown listeners (safe because of the `!isActiveRef.current` guard). This task must not break this design by adding activation behavior to the spacebar handler without ensuring only the parent's instance activates.
