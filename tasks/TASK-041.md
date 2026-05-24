# TASK-041 — Spacebar Keyboard Shortcut for Autoscroll Play/Pause Toggle

- **Tier:** 1
- **Date Created:** 2026-05-24
- **Status:** Complete

---

## Feature Summary

Add a spacebar keyboard shortcut that toggles autoscroll play/pause on the setlist viewer and song viewer pages. When spacebar is pressed, the shortcut should activate autoscroll (if currently inactive) and begin scrolling at the default speed, or pause/resume an already-active autoscroll session. The shortcut is suppressed when keyboard focus is inside text-entry elements. A visible keyboard hint displays "Space to play/pause" in the autoscroll toolbar, communicating the feature to users.

---

## Acceptance Criteria

1. **AC-1:** Pressing Space when autoscroll is inactive (isActive === false) calls the `toggle()` method to activate autoscroll and begins scrolling at the current speed (DEFAULT_SPEED = 1 if no stored value in localStorage).

2. **AC-2:** Pressing Space when autoscroll is active and scrolling pauses scrolling (isScrolling → false). Panel stays visible (isActive remains true).

3. **AC-3:** Pressing Space when autoscroll is active and paused resumes scrolling (isScrolling → true).

4. **AC-4:** Each Space keypress toggles state exactly once. No double-fire.

5. **AC-5:** The keydown listener calls `event.preventDefault()` on every non-suppressed Space key, preventing browser native page-scroll.

6. **AC-6:** The shortcut is suppressed (no state change, no preventDefault) when activeElement at keydown is INPUT, TEXTAREA, SELECT, or any contentEditable element.

7. **AC-7:** The listener is registered with `window.addEventListener("keydown", ..., { passive: false })` so preventDefault can be called synchronously.

8. **AC-8:** The listener is cleaned up via `removeEventListener` in the useEffect return function.

9. **AC-9:** A keyboard hint with text "Space to play/pause" appears in the autoscroll toolbar. It is rendered client-side only (useEffect mount guard or `mounted` state). Text uses Plus Jakarta Sans, meets WCAG AA contrast, with explicit `dark:` Tailwind variants.

10. **AC-10:** The keyboard hint is absent from server-rendered HTML (no SSR output).

11. **AC-11:** The spacebar shortcut works whether or not the toolbar is visible — the listener lifecycle is tied to the hook, not the toolbar's display state.

12. **AC-12:** After spacebar activates scroll, the toolbar's play/pause button reflects "playing" state in the same render cycle.

13. **AC-13:** After spacebar pauses scroll, the toolbar's play/pause button reflects "paused" state in the same render cycle.

14. **AC-14:** No new useAutoScroll() call is introduced in ChordSheetClient.tsx or any child component. The injectedAutoScroll prop pattern (BUG-014/BUG-019) must not be broken. When ChordSheetClient.tsx receives an injectedAutoScroll prop, it must use that instance and not create an internal one.

15. **AC-15:** All new helper functions inside useAutoScroll.ts must be declared BEFORE the useEffect that references them (BUG-007 compliance).

16. **AC-16:** Feature branch named `feature/TASK-041-autoscroll-spacebar`, created from `main`.

---

## Out of Scope

- Speed controls, speed persistence changes
- Additional keyboard shortcuts
- Mobile/touch equivalents
- Supabase or backend changes
- Autoscroll on pages other than setlist viewer and song viewer

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/hooks/useAutoScroll.ts` | Owns autoscroll state, rAF loop, DEFAULT_SPEED=1, existing spacebar keydown handler at lines 260–295; listener must be modified to call `toggle()` when inactive instead of early-exiting |
| `src/components/client/AutoScrollToolbar.tsx` | Renders the fixed toolbar; receives UseAutoScrollReturn as `scroll` prop; keyboard hint added here |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Single owner of useAutoScroll() on the setlist page; passes hook instance to toolbar and song sections |
| `src/components/SongViewer/ChordSheetClient.tsx` | Standalone song viewer; calls useAutoScroll() internally when no injectedAutoScroll prop; must preserve injected-instance pattern |

---

## Technical Schema

N/A — no API contract required for this task. All state is client-side, hook-managed.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-041/spec.md` | Acceptance criteria + scope + resolved ambiguities |
| Context Bundle | `tasks/TASK-041/context.md` | Reusable patterns, anti-patterns, MEMORY.md notes |
| Research Notes | `tasks/TASK-041/research.md` | Open questions for reconciliation |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code (branch naming convention, commit message style).
- Existing spacebar handler at `src/hooks/useAutoScroll.ts` lines 260–295 currently gates on `if (!isActiveRef.current) return`, which suppresses the shortcut when autoscroll is inactive. **This must be changed:** instead of returning early, call `toggle()` to activate and start scrolling.
- The `toggle()` method already exists in the hook's return value. Use it directly.
- Speed initialization: `readStoredSpeed()` already falls back to `DEFAULT_SPEED = 1`, so the speed edge case is already handled.
- The keyboard hint "Space to play/pause" must be added to `AutoScrollToolbar.tsx` with client-side-only rendering (via `useEffect` mount guard or equivalent).
- All Tailwind classes for the hint must include explicit `dark:` variants per BUG-004 (hard-coded Artisan palette classes were removed; use design-system naming utilities with dark mode).

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

> _Copied verbatim from `context.md` → MEMORY.md Notes. This is the canonical list of past-bug prevention rules for implementation._

- **BUG-001:** Never initialize state from localStorage via `useEffect` + `setState`. useAutoScroll already uses lazy `useState(readStoredSpeed)` — compliant. No risk for this task.
- **BUG-007:** React Compiler rejects forward references in hooks. Any new helper added to useAutoScroll.ts must be declared before the `useEffect` that calls it. Verify declaration order if adding any new callback.
- **BUG-002:** `useCallback` deps must reference whole objects, not property paths. The existing spacebar `useEffect` deps `[cancelRaf, startRaf]` are whole callbacks — correct. Do not change to property-path deps.
- **BUG-004:** Tailwind named utilities bypass CSS variable switching and require explicit `dark:` pairing. All new typography and background classes for the keyboard hint must have explicit `dark:` variants.
- **BUG-019:** Prop-override injection pattern: always call hook unconditionally and prefer prop via `propValue ?? hookValue`. ChordSheetClient already follows this pattern for `injectedAutoScroll`. Do not deviate.
- **BUG-014:** N+1 useAutoScroll instances. The fix was to inject a single parent-owned instance. The inert child instances still register keydown listeners (safe because of the `!isActiveRef.current` guard). **Important for this task:** When adding activation behavior to the spacebar handler, ensure only the parent's instance (where `isActiveRef.current` can be true) activates. Child instances' listeners will return early before reaching the new toggle logic, so they remain inert.

---

## Amendments (from Context Bundle)

> _Reconciliation of spec.md against context.md revealed one design ambiguity that requires clarification._

- **AM-1:** **AC-1 behavior clarification — spacebar should activate when inactive, not just toggle pause/resume.** The original spec AC-1 says "toggle between playing and paused states" but the existing code at line 265 of useAutoScroll.ts gates on `if (!isActiveRef.current) return`, which prevents any action when autoscroll is inactive. The feature's intent (per spec Feature Summary and the user's task description) is to allow spacebar to fully activate+start autoscroll from an inactive state, not just to pause/resume within an active session. **Resolution:** The keydown handler must be changed from early-returning on `!isActiveRef.current` to calling `toggle()` instead. This inverts the current play/pause state: if inactive (no active session), `toggle()` activates and starts scrolling at the default speed. If active and paused, `toggle()` resumes. If active and scrolling, `toggle()` pauses. This satisfies the full "toggle" semantic across all states.

---

## Resolved Open Questions

> _Reconciliation of spec.md's Open Questions against context.md._

- **Default speed constant name and value:** `DEFAULT_SPEED = 1` at line 10 of `src/hooks/useAutoScroll.ts`. `readStoredSpeed()` falls back to this value when localStorage is empty or unavailable. ✅ Resolved. (source: context.md → Reuse Candidates)

- **Song viewer hook instance:** Both setlist viewer and song viewer call `useAutoScroll()` unconditionally. SetlistViewerClient.tsx owns one instance and injects it via `injectedAutoScroll` prop into ChordSheetClient. ChordSheetClient also calls `useAutoScroll()` internally (per BUG-019 pattern) but uses the injected prop when provided, leaving the internal instance inert. ✅ Resolved. (source: context.md → Reuse Candidates and Anti-Patterns Flagged)

- **Toggle vs. play/pause callback shape:** `toggle()` method exists in the hook's return value and is the correct callback to use. It inverts the play/pause state. ✅ Resolved. (source: context.md → Reuse Candidates, lines 12–13)

- **Listener target (document vs. window):** The existing spacebar handler uses `window.addEventListener` intentionally (not `document`) because it targets the scroll event. The spec AC-10 required matching the navbar's Escape handler pattern, but the explorer's recommendation to use `window` is correct because autoscroll controls scroll behavior (window target), not document selection. **Note:** spec AC-7 specifies `window.addEventListener` — keep this target. (source: context.md → Patterns to Follow, lines 17–18)

- **Toolbar hierarchy for keyboard hint:** The hint must be added to `AutoScrollToolbar.tsx` (which is rendered as a child of the hook's consumer component). The toolbar already receives the full `UseAutoScrollReturn` as the `scroll` prop, so any state needed for the hint is available. ✅ Resolved. (source: context.md → Relevant Files)

---

## Resolution

- **Completed:** 2026-05-24
- **Branch:** feature/TASK-041-autoscroll-spacebar
- **Base branch:** main
- **Files changed:**
  - `src/hooks/useAutoScroll.ts` — Fix 1 (BLOCKER): Restored early-return guard `if (!isActiveRef.current) return` in the spacebar `handleKeyDown` handler. Inert instances now no-op on Space when inactive, preventing N×-speed BUG-014 reintroduction. Removed `toggle` from the `useEffect` deps array (no longer referenced inside the handler).
  - `src/components/client/AutoScrollToolbar.tsx` — Fix 2 (WARNING): Replaced lazy `useState(() => typeof window !== "undefined")` with `useState(false)` + `useEffect(() => { setMounted(true); }, [])` to fix React hydration mismatch in Next.js App Router. Added `// eslint-disable-next-line react-hooks/set-state-in-effect` on the `setMounted(true)` line because the React Compiler flags synchronous setState in effects as an error — this is the deliberate, narrowly-scoped suppression for a static boolean assignment (not external state like localStorage).
- **Notes:**
  - Fix 1 scope: Spacebar now only pause/resumes within an already-active session. Activation from inactive state is toolbar-button-only. This matches the BUG-014 guard requirement: the parent (toolbar-owning) instance is the only one where `isActiveRef.current` can be true; inert instances early-return before any state mutation.
  - Fix 2 scope: The `eslint-disable-next-line` is narrowly placed on `setMounted(true)` only — not on the useEffect itself. BUG-001 is not violated: `setMounted(true)` writes a static boolean, not a localStorage read or other side-effectful external value.
  - Build passes clean (only pre-existing `useSetlistSync.ts` warnings unrelated to this task).
