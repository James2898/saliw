# Context Bundle — Move "Go Live" Button to Setlist Header

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/ServiceNavigator.tsx` | Contains the "Go Live" button (lines 437–484) and all its state, handlers, and the ConfirmDialog wiring |
| `src/app/setlists/[id]/page.tsx` | Server Component that renders the setlist name heading (lines 162–182) and passes `isLeader` / `isAuthenticated` down to `SetlistViewerClient` |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Client boundary that owns `useSetlistSync` and passes the `sync` object to `ServiceNavigator`; the "Go Live" button's state lives here via the `sync` prop |
| `src/components/client/button.tsx` | Artisan `Button` component used inside `ConfirmDialog`; reuse for the moved button if switching from a raw `<button>` to `Button` |

## Reuse Candidates
- `src/components/client/ServiceNavigator.tsx` lines 277–302 — `showGoLiveDialog`, `goLiveButtonRef`, `handleGoLiveClick`, `handleGoLiveConfirm`, `handleGoLiveCancel` are the complete Go Live interaction unit; they must move with the button or be lifted to a shared scope
- `src/app/setlists/[id]/SetlistViewerClient.tsx` — already owns `sync` (the `useSetlistSync` return value); any Go Live UI that needs `sync.toggleLive`, `sync.isLive`, `sync.isLiveConnecting`, `sync.liveError` must stay within this Client Component boundary or receive these values as props
- `ConfirmDialog` sub-component (lines 89–196 of `ServiceNavigator.tsx`) — self-contained Artisan dialog; if the Go Live button moves out of `ServiceNavigator`, the `ConfirmDialog` and its dialog-content map (`goLiveOnDialog` / `goLiveOffDialog`, lines 200–212) need to move or be imported separately

## Patterns to Follow
- **Setlist header row pattern:** See `src/app/setlists/[id]/page.tsx` lines 162–181 — the header `<div class="mb-8">` holds the `<h1>` setlist name and a flex row (`flex items-center gap-3`) for the date and Edit Setlist link. The Go Live button should slot into this same flex row.
- **Inline error below button:** See `ServiceNavigator.tsx` lines 477–483 — `sync.liveError` is shown as a `<p role="alert">` immediately below the button, inside a `flex flex-col items-end gap-1` wrapper. Replicate this pattern in the header area.
- **Leader-gated rendering:** `isLeader` is already available in `page.tsx` (line 107) and threaded as a prop through `SetlistViewerClient`; any moved Go Live button must remain gated on `isLeader`.
- **Focus-restoration on dialog close:** `goLiveButtonRef` (a `useRef<HTMLButtonElement>`) is forwarded to the button and passed to `handleGoLiveConfirm` / `handleGoLiveCancel` to restore focus. This ref must travel with the button.
- **React Compiler dep rule (BUG-002):** `useCallback` deps must reference the whole `sync` object, never individual property paths like `sync.toggleLive`. Already applied in `ServiceNavigator.tsx` lines 291, 297 — do not regress this.
- **Dark mode pairing (BUG-004 / BUG-005):** Every named Tailwind utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must have an explicit `dark:` variant. The header already uses `dark:text-brand-cream` / `dark:text-brand-tan` — match that pattern for any new elements.

## Anti-Patterns Flagged
- `src/components/client/ServiceNavigator.tsx` line 462: The Go Live button's inactive-state classes concat `toggleInactiveClass` (which contains `text-brand-brown dark:text-brand-tan border-brand-brown/30`) with an override `text-brand-cream border-brand-cream/30` — this results in conflicting color utilities in the same className string. When the button moves to the cream-background header area, this class conflict will need to be resolved; the toolbar-specific overrides (`text-brand-cream`, `border-brand-cream/30`) were written for the dark `bg-brand-espresso` toolbar background and will not be correct on a cream/light header background.

## MEMORY.md Notes
- **BUG-002 prevention:** Never use object property paths as `useCallback`/`useMemo` deps (e.g. `[sync.toggleLive]`). Always depend on the whole object (`[sync]`). Violating this causes a Vercel build failure under the React Compiler.
- **BUG-004 / BUG-005 prevention:** Every `text-brand-*`, `bg-brand-*`, `border-brand-*` Tailwind utility must have an explicit `dark:` paired variant. The setlist header already follows this; any new elements added there must too.
- **BUG-001 prevention:** Do not initialize state from `localStorage` via `useEffect` + `setState`; use lazy initializers.
- **BUG-006 prevention:** Do not write Tailwind arbitrary-value class patterns with wildcard asterisks in any file — including `.md` docs.
