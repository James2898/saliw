# Research — Autoscroll Spacebar Play/Pause Shortcut

## Open Questions

- **Pending Reconciliation** — What is the exact name and numeric value of the default autoscroll speed constant in the autoscroll hook? AC-5 and AC-6 depend on this value being non-zero and matching the hook's existing behavior. (suggested resolution source: `src/hooks/useAutoScroll.ts` or equivalent — grep for `DEFAULT_SPEED`, `defaultSpeed`, or the initial value passed to the speed `useState` call)

- **Pending Reconciliation** — Does the song viewer page use the same `useAutoScroll` hook instance as the setlist viewer, or does it have its own independent hook call? This determines whether a single shortcut implementation in the shared hook is sufficient or whether each page requires its own listener registration. (suggested resolution source: `src/app/setlists/[id]/page.tsx`, `src/app/songs/[id]/page.tsx`, and `src/hooks/useAutoScroll.ts` — look for hook call sites)

- **Pending Reconciliation** — Does the existing autoscroll toolbar already expose a stable `toggle` or combined `play`/`pause` callback, or does the shortcut need to read the current `isPlaying` state and call `play()` or `pause()` conditionally? This determines the toggle implementation shape. (suggested resolution source: `src/hooks/useAutoScroll.ts` — inspect return value shape)

- **Pending Reconciliation** — Does the existing navbar Escape keydown handler attach its listener to `document` or `window`? AC-10 requires the new Space listener to align with that pattern. (suggested resolution source: `src/components/client/navbar.tsx` — grep for `addEventListener`)

- **Pending Reconciliation** — Is the autoscroll toolbar rendered as a child of the hook's consumer component, or is it a sibling/portal? This determines where the keyboard hint label must be injected without breaking the existing component hierarchy. (suggested resolution source: setlist viewer page or the component that renders `<AutoScrollToolbar />` or equivalent)
