# MEMORY.md — Bug Root Causes & Resolutions

> Maintained by `@debug-memory`. Read by agents when PM includes it in the Context Bundle.
> Agents that read: @codebase-explorer, @requirements-engineer, @fullstack-developer, @release-manager, @validator-agent.
> Only `@debug-memory` writes to this file.

---

## UI State

- **BUG-001** | 2026-04-18 | Feature: `Font Size Persistence`
  - **Root Cause:** `src/hooks/useFontSize.ts` called `setState` synchronously inside `useEffect` to read `localStorage` on mount, causing a guaranteed double-render that Next.js 15 / React 19 strict-mode lint treats as a compile error on Vercel.
  - **Resolution:** Replaced the `useEffect` + `setState` pattern with a `useState` lazy initializer — `useState(readStoredFontSize)` — in `src/hooks/useFontSize.ts`. The initializer runs once at construction time, produces no extra render, and returns `DEFAULT_SIZE` when `window` is undefined (SSR-safe).
  - **Prevention:** Never initialize React state from `localStorage` / `sessionStorage` via `useEffect` + `setState`. Always use a lazy initializer: `useState(() => readValue())`.

---

## Architecture

- **BUG-002** | 2026-04-24 | Feature: `Toggle Confirmation Dialogs (TASK-023)`
  - **Root Cause:** The project runs the **React Compiler** (Next.js 15). `useCallback` dependency arrays in `src/components/client/ServiceNavigator.tsx` referenced object property paths (e.g. `sync.toggleLive`, `sync.isLiveConnecting`). The React Compiler infers the whole parent object (`sync`) as the true dependency, not the individual property, and bails out with a hard compile error: `Compilation Skipped: Existing memoization could not be preserved. The inferred dependency was 'sync', but the source dependencies were [sync.toggleLive].`
  - **Resolution:** Changed all four `useCallback` dep arrays in `src/components/client/ServiceNavigator.tsx` to reference the whole `sync` object instead of its properties: `[sync.toggleLive]` → `[sync]`, `[sync.toggleFollow]` → `[sync]`, `[sync.isLiveConnecting, showGoLiveDialog]` → `[sync, showGoLiveDialog]`, `[sync.isStateChecking, showFollowDialog]` → `[sync, showFollowDialog]`.
  - **Prevention:** In this codebase, **never use object property paths as `useCallback` / `useMemo` deps** (e.g. `[obj.method]`, `[props.value]`). Always depend on the whole object (`[obj]`) or on a destructured primitive variable. The React Compiler rejects property-path deps as ambiguous and will fail the Vercel build.
