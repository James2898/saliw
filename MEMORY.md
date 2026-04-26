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

- **BUG-005** | 2026-04-24 | Feature: `Song Library Dark Mode`
  - **Root Cause:** `src/app/library/page.tsx` used hard-coded Artisan named utilities (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`) with no `dark:` variants on song row text, key badge, page heading, count line, and edit icon. The row container background used a CSS variable (`bg-[var(--brand-tan-alpha)]`) that auto-switches, but Tailwind named utilities do not respond to the `.dark` class automatically — they require explicit `dark:` pairing — so text became near-invisible against the switched background.
  - **Resolution:** Added explicit `dark:` variants throughout `src/app/library/page.tsx`: song title (`dark:text-brand-cream`), artist name (`dark:text-brand-tan`), key badge background/text/border (`dark:bg-brand-espresso` + matching text/border), page heading (`dark:text-brand-cream`), count line (`dark:text-brand-tan`), edit icon (`dark:text-brand-tan` + matching hover).
  - **Prevention:** Whenever a component background switches via a CSS variable (e.g. `bg-[var(--brand-tan-alpha)]`) but text/border/icon uses a named Tailwind utility (`text-brand-espresso`, `bg-brand-cream`), the text will silently break in dark mode. Always audit and add explicit `dark:` pairs for every named utility whenever a mixed auto-switch/named-utility pattern is used. This is a recurring Artisan pattern — every `text-brand-*`, `bg-brand-*`, and `border-brand-*` class must have a corresponding `dark:` variant.

---

## Architecture

- **BUG-007** | 2026-04-25 | Feature: `Navbar Sidebar`
  - **Root Cause:** The React Compiler enforces strict declaration order — `closeSidebar` and `openSidebar` were declared after the `useEffect` that called `closeSidebar()` inside its Escape key handler. JavaScript hoisting permits this at runtime, but the React Compiler rejects forward references at build time with "Cannot access variable before it is declared."
  - **Resolution:** Moved `openSidebar` and `closeSidebar` function declarations above the `useEffect` block that references them in `src/components/client/navbar.tsx`. No logic changed — declaration order only.
  - **Prevention:** In any React Client Component using the React Compiler, always declare helper functions before the hook (`useEffect`, `useCallback`, `useMemo`) that references them. Do not rely on JavaScript hoisting — the React Compiler treats forward references as hard build errors.

- **BUG-002** | 2026-04-24 | Feature: `Toggle Confirmation Dialogs (TASK-023)`
  - **Root Cause:** The project runs the **React Compiler** (Next.js 15). `useCallback` dependency arrays in `src/components/client/ServiceNavigator.tsx` referenced object property paths (e.g. `sync.toggleLive`, `sync.isLiveConnecting`). The React Compiler infers the whole parent object (`sync`) as the true dependency, not the individual property, and bails out with a hard compile error: `Compilation Skipped: Existing memoization could not be preserved. The inferred dependency was 'sync', but the source dependencies were [sync.toggleLive].`
  - **Resolution:** Changed all four `useCallback` dep arrays in `src/components/client/ServiceNavigator.tsx` to reference the whole `sync` object instead of its properties: `[sync.toggleLive]` → `[sync]`, `[sync.toggleFollow]` → `[sync]`, `[sync.isLiveConnecting, showGoLiveDialog]` → `[sync, showGoLiveDialog]`, `[sync.isStateChecking, showFollowDialog]` → `[sync, showFollowDialog]`.
  - **Prevention:** In this codebase, **never use object property paths as `useCallback` / `useMemo` deps** (e.g. `[obj.method]`, `[props.value]`). Always depend on the whole object (`[obj]`) or on a destructured primitive variable. The React Compiler rejects property-path deps as ambiguous and will fail the Vercel build.

- **BUG-006** | 2026-04-24 | Feature: `Song Library Dark Mode`
  - **Root Cause:** `MEMORY.md` sits at the project root and Tailwind v4 auto-scans all files under the project root for class names. A prevention note contained a wildcard arbitrary-value class pattern (bg + bracket + var + --brand- + asterisk); Tailwind parsed it as a real utility and emitted invalid CSS. Turbopack aborted the build with: `Parsing CSS source code failed — Unexpected token Delim('*')`.
  - **Resolution:** Replaced all wildcard class pattern strings with concrete specific examples (e.g. `bg-[var(--brand-tan-alpha)]`) so Tailwind no longer generates invalid classes from documentation text.
  - **Prevention:** Never write Tailwind arbitrary-value class patterns with a wildcard asterisk as literal strings in any file at or below the project root — including `.md` docs and inline code comments. Tailwind v4 will treat them as real classes and attempt to emit CSS. Use a concrete specific value or describe the pattern in prose.
