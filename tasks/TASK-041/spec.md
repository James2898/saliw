# Spec — Autoscroll Spacebar Play/Pause Shortcut

## Feature Summary
Add a spacebar keyboard shortcut that toggles autoscroll play/pause on the setlist viewer and song viewer pages. When autoscroll is mounted and active on those pages, pressing Space will toggle between playing and paused states. The shortcut must be suppressed when keyboard focus is inside any text-entry element. If the user has not yet set a speed, autoscroll starts at a predefined default speed. A visible keyboard hint communicates the shortcut's availability to the user.

## Acceptance Criteria

1. Pressing the Space key while the autoscroll hook is mounted (on the setlist viewer or song viewer page) toggles the autoscroll state: if currently paused, it starts scrolling; if currently scrolling, it pauses. Each Space keypress inverts the current play/pause state exactly once.

2. The Space keydown listener is attached only when the autoscroll hook is mounted and the page is one of the two applicable views (setlist viewer, song viewer). It must be removed (via cleanup) when the component unmounts.

3. The Space key shortcut must be suppressed — with no scroll state change — when the active `document.activeElement` at the time of the keydown event is an `<input>`, `<textarea>`, or any element with `contenteditable="true"` or `contenteditable=""`. The check must cover all three element types.

4. The Space key shortcut must call `event.preventDefault()` only when the shortcut is not suppressed (i.e., focus is not in a text-entry element). This prevents the browser's native page-scroll-by-space behavior from firing alongside the autoscroll toggle.

5. When autoscroll is toggled ON via the spacebar and the user has not previously set a speed (speed state is at its initial/unset value), autoscroll begins at the application's defined default speed. The default speed value must match the constant already used by the autoscroll hook/toolbar — `@codebase-explorer` to confirm the exact value and constant name.

6. Pressing Space when autoscroll is toggled ON via the spacebar must produce visible motion. No silent no-op is acceptable when the speed is at the default value.

7. A keyboard hint communicating the Space shortcut is rendered inside or adjacent to the autoscroll toolbar while the toolbar is visible. The hint text must read exactly: `Space to play/pause`. The hint uses the Artisan typography system (Plus Jakarta Sans) and must meet WCAG AA contrast on both light and dark Artisan Palette backgrounds.

8. The keyboard hint is rendered only on the client — it must not be included in the server-rendered HTML. It may be implemented via a `'use client'` boundary, a dynamic import with `ssr: false`, or a `useEffect`-driven mount flag, consistent with BUG-001 prevention (no `useEffect` + `setState` for a stored value; a plain mount flag that does not touch `localStorage` is acceptable).

9. The `keydown` event listener must be registered with `{ passive: false }` so that `preventDefault()` can be called synchronously. Passive listeners cannot cancel events.

10. The `keydown` event listener must be registered on `document` (not `window`) to match the existing keyboard handler pattern in this codebase — `@codebase-explorer` to confirm which target (`document` vs `window`) the existing navbar Escape handler uses, and align with that pattern.

11. No `document` or `window` access occurs at module load time or during server render. All DOM access must be gated inside `useEffect`, a `typeof window !== 'undefined'` guard, or equivalent SSR-safe boundary, consistent with BUG-001 prevention.

12. When the autoscroll toolbar is hidden (e.g., the user has dismissed it or it is not yet visible), the Space shortcut must still function if the hook is mounted. The shortcut is tied to the hook's lifecycle, not the toolbar's visibility.

13. After the spacebar toggles autoscroll to the playing state, the play/pause button in the autoscroll toolbar must update its visual state (icon and/or label) to reflect "playing" within the same render cycle. No stale UI is acceptable.

14. After the spacebar toggles autoscroll to the paused state, the autoscroll toolbar's play/pause button must reflect "paused" within the same render cycle.

15. The feature applies to exactly two pages: the setlist viewer and the song viewer. It must NOT be active on any other page (library, dashboard, login, etc.).

16. The branch for this feature must be created from `main` (not `develop`), named `feature/TASK-NNN-autoscroll-spacebar` (task number to be filled in by `@task-logger`), consistent with `docs/coding-guidelines.md` branching convention.

## Out of Scope
- Changing any existing autoscroll speed controls, speed step values, or speed persistence behavior.
- Adding any other keyboard shortcuts (e.g., arrow keys for speed adjustment).
- Modifying the autoscroll toolbar layout beyond adding the keyboard hint label.
- Any backend / Supabase changes.
- Mobile or touch-device gesture equivalents for the spacebar shortcut.
- Autoscroll on pages other than setlist viewer and song viewer.

## Fallback Behaviors
- No backend dependency exists for this feature. All state is client-side. No fallback for a missing API is required.
- If the autoscroll hook is not mounted on a given page, the Space key listener is never registered and the native browser behavior (page scroll) is fully preserved.

## Resolved Ambiguities
- **Which pages?** The user's request did not specify a page scope. The PM's context states "setlist and song viewer pages." Resolved to: both the setlist viewer page and the song viewer page. No other pages. Source: PM feature context.
- **Base branch:** User explicitly stated "use main as the base of the branch to be created." Resolved to: branch from `main`. Source: verbatim user request.
- **Default speed when unset:** User stated "speed if not set is default." Resolved to: use the existing default speed constant already defined in the autoscroll hook. Exact constant name/value is a Pending Reconciliation item for `@codebase-explorer` to confirm.
- **`event.preventDefault()` scope:** Space is the browser's native page-scroll key. `preventDefault()` must fire when the shortcut is active to prevent double-scroll. Suppressed when focus is in a text-entry element so typing a space in a form is unaffected. Resolved from standard browser keyboard event semantics and BUG-013 precedent (pointer events must not silently swallow behavior).
- **`{ passive: false }` requirement:** `preventDefault()` on a passive listener is a no-op and would leave the browser scroll active. Resolved from browser API constraint.
- **React Compiler hook ordering (BUG-007):** Any helper functions used inside `useEffect` for the keydown handler must be declared above the `useEffect` call. Resolved from MEMORY.md BUG-007.
- **No inline arrow wrappers on memoized callbacks (BUG-017 / BUG-019):** If the toggle callback is memoized, it must not be wrapped in an inline arrow inside the event listener setup. Reference it directly or via a stable ref. Resolved from MEMORY.md BUG-017.
- **Dark mode hint text (BUG-004 / BUG-005):** The keyboard hint text must have an explicit `dark:` variant on both text color and any background, consistent with the Artisan named-utility dark mode rule. Resolved from MEMORY.md BUG-004 and BUG-005.
- **`useState` lazy initializer rule (BUG-001):** A client-mount flag for the hint (if used) must not call `setState` inside `useEffect`. Use a `useState(false)` + `useEffect(() => setMounted(true), [])` pattern, which does NOT read from localStorage and is therefore not subject to the BUG-001 warning. Resolved from MEMORY.md BUG-001 (the prohibition is on reading storage in useEffect+setState, not on mount flags).
