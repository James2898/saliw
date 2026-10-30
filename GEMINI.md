# GEMINI.md — Antigravity Workspace Guidelines & Memory

This file is automatically loaded for **Google Antigravity** sessions. It defines runtime constraints, tool-specific lessons, and background task management specific to Antigravity pair programming.

---

## 1. Tooling & MCP Guidelines

### Playwright MCP (`playwright_*` vs `browser_*`)
- **Tool Argument Schemas:**
  - **Antigravity `playwright` MCP (`playwright_*` tools):**
    - `playwright_evaluate` uses `{ script: string }`. **Always wrap multi-line logic in an IIFE `(() => { ... })()` or evaluate a direct expression.** A bare arrow function `() => { ... }` is only declared (not executed) and returns `undefined`, unlike Claude Code's `browser_evaluate` which automatically invokes passed function strings.
    - `playwright_click` uses `{ selector: string }`.
    - `playwright_navigate` uses `{ url: string, timeout?: number }` (pass `timeout: 60000` on the first navigation to a freshly started `next dev` server so initial route compilation does not time out at 30s).
  - **Claude Code `@playwright/mcp` (`browser_*` tools):**
    - `browser_click`: uses `{ target: string }` (CSS selector or element ref), **never** `{ selector }`.
    - `browser_evaluate`: uses `{ function: string }` (e.g. `"() => { ... }"`), **never** `{ script }`.
    - `browser_select_option`: uses `{ target: string, values: string[] }`.
- **Function Execution in `playwright_evaluate` (IIFE Required):** Unlike Claude Code's `browser_evaluate` which accepts a bare function expression `() => { ... }`, Antigravity's `playwright_evaluate` executes raw JavaScript statements. To evaluate a multi-line block and return a value, **always wrap in an Immediately Invoked Function Expression (IIFE)**: `(() => { return document.title; })()`. A bare arrow function declares a function without calling it and returns `undefined`.
- **Saliw Modal Dialog Selector:** The app layout mounts a mobile navigation drawer with `role="dialog"`. Never query `document.querySelector('[role="dialog"]')` alone when asserting modals; always scope by `aria-labelledby` (e.g. `[role="dialog"][aria-labelledby="worship-leader-history-modal-title"]`).
- **Pure JavaScript Only:** Always write scripts passed to `playwright_evaluate` / `browser_evaluate` in standard ECMAScript / ES6.
- **Never use TypeScript Syntax:** Do not use `as HTMLElement`, `as HTMLInputElement`, interface declarations, or type annotations in evaluated strings. The browser's native JavaScript engine will throw `SyntaxError: Unexpected identifier 'as'`.
- **Safe Element Casts:** Use standard DOM existence checks or plain property lookups:
  ```javascript
  // Bad (throws SyntaxError)
  (document.querySelector('input') as HTMLInputElement).value;

  // Good
  const input = document.querySelector('input');
  if (input) { const val = input.value; }
  ```

### React Compiler & Immutability Rules
- **No Direct Window Mutation (`react-hooks/immutability`):** Never assign directly to global properties like `window.location.hash = '#...'` inside event callbacks or component renders. Direct mutation triggers a fatal React Compiler error. Use `window.history.pushState(null, "", `#${anchorId}`)` or `element.scrollIntoView({ behavior: "smooth" })` instead.

### Saliw Artisan Design System Palette Rules
- **No Generic Green/Blue Alert Colors:** Badges, category pills, and tag chips must never use generic Tailwind colors (`emerald`, `sky`, `blue`, `green`). All UI indicators must adhere strictly to Saliw's Artisan palette:
  - High Emphasis / Primary: `brand-espresso` / `brand-cream`
  - Medium / Subtle: `brand-brown` / `brand-tan`
  - Neutral / Card backgrounds: `brand-cream` / `brand-darker`

### zsh Globs
- **zsh globs:** quote glob arguments (`--include='*.ts'`). Unquoted, zsh aborts with `no matches found`.

### Windows & PowerShell Script Execution
- **Inline Script Execution:** When executing simple one-liner scripts in Windows shell, prefer `node -e "..."` over `powershell -Command "..."`. In PowerShell command strings, unescaped `$` variable identifiers are evaluated prematurely by string interpolation and will trigger syntax errors like `Missing expression after unary operator`.
- **Avoid Multi-line `node -e` with Quotes in PowerShell:** Windows PowerShell 5.1 strips `""` inside `node -e '...'` when passing arguments to native binaries (causing `SyntaxError: Invalid or unexpected token`). For any multi-line script or regex replacement, write a temporary `.mjs` script to the conversation's `scratch/` directory via `write_file` and run `node "<scratchDir>/script.mjs"`.
- **CRLF Files & `edit_file`:** Existing tracked files checked out with CRLF (`\r\n`) on Windows can fail multi-line `edit_file` matches when tool arguments normalize newlines to LF (`\n`). Prefer single-line `Target` strings in `edit_file` on CRLF files, or perform multi-line replacements via a `scratch/*.mjs` script that matches `\r?\n`.

---

## 2. Dev Server & Build Management

### Next.js Dev Server vs `next build` Cache Guard
- **The Problem:** Next.js outputs both dev server artifacts and production build bundles to `.next/`. Running `next build` while an active `npx next dev` process is running corrupts Webpack's runtime chunk cache (`Cannot find module './vendor-chunks/@supabase.js'`).
- **Required Workflow:**
  1. If running `npm run build` or `npx next build` to verify types/compilation, **stop the active dev server daemon task first**.
  2. If a build was executed while the dev server was running, purge the corrupted cache:
     ```bash
     rm -rf .next
     ```
  3. Start a fresh dev server (`node node_modules/next/dist/bin/next dev -p 3001` on Windows PowerShell where `npx.ps1` is blocked by ExecutionPolicy, or `npx.cmd next dev -p 3001`).

---

## 3. Worktree & Git Discipline

- **Worktree Branch Renaming After `@task-logger`:** When working in a pre-created git worktree whose branch does not yet reflect the formal task ID (e.g. `fix_navbar_auth_state`), rename the local branch immediately after `@task-logger` mints the task ID using `git branch -m <type>/<TASK-ID>-<slug>` before invoking `@fullstack-developer` or `@release-manager`.

- **Worktree Awareness:** Antigravity often works in dedicated git worktrees (e.g. under `~/.gemini/antigravity/worktrees/`). Ensure commands and dev servers execute inside the active worktree root.
- **Untracked Directories:** Keep test plans, verification traces, and Playwright screenshots in `.qa/` or `.playwright-mcp/` (both gitignored).
- **Domain Memory:** For general codebase bugs (SSR hydration, Supabase `timestamptz`, React Compiler rules), refer to and update [`MEMORY.md`](./MEMORY.md).
- **Fresh worktree setup & test commands:** A new worktree has no `node_modules` or `.env.local`. Before running `npm run test:unit` (note: there is no `npm test` script), `npm run lint`, `npx tsc --noEmit`, or `next dev`, link them from the primary repository root (do not `npm install`):
  - POSIX (macOS / Linux):
    ```bash
    MAIN_REPO="$(git rev-parse --git-common-dir)/.."
    ln -sf "$MAIN_REPO/node_modules" node_modules
    ln -sf "$MAIN_REPO/.env.local" .env.local
    ```
  - Windows (PowerShell — uses directory junction + file copy so elevation is not required, and invokes `node` binaries directly to avoid `npx.ps1` ExecutionPolicy blocks):
    ```powershell
    $mainRepo = Resolve-Path ((git rev-parse --git-common-dir) + "/..")
    # Clean non-junction stub directory if left behind by previous tools:
    if (Test-Path "node_modules" -and -not (Get-Item "node_modules").LinkType) { Remove-Item -Recurse -Force "node_modules" }
    if (-not (Test-Path "node_modules")) { cmd /c mklink /J node_modules "$mainRepo\node_modules" }
    if (-not (Test-Path ".env.local")) { Copy-Item "$mainRepo\.env.local" .env.local }
    # Run checks without npx.ps1:
    node node_modules/typescript/bin/tsc --noEmit
    node node_modules/eslint/bin/eslint.js src/
    node node_modules/vitest/vitest.mjs run src/
    # Cleanup before git status / commit:
    if (Test-Path "node_modules") { cmd /c rmdir node_modules }
    if (Test-Path ".env.local") { Remove-Item .env.local -Force }
    ```
  Start the dev server with `node node_modules/next/dist/bin/next dev -p <port>` on Windows (or `./node_modules/.bin/next dev -p <port>` on POSIX; no `--turbopack`, see MEMORY.md) and use a port other than the main checkout's. Remove the temporary links (`rm -f node_modules .env.local` on POSIX, or `cmd /c rmdir node_modules` and `Remove-Item .env.local -Force` on Windows) before `git status` / committing so untracked links are never staged.
- **Merging PRs from a worktree:** Do not pass `--delete-branch` to `gh pr merge` when `main` is checked out in the primary worktree (`gh` attempts `git checkout main` locally and fails with `fatal: 'main' is already used by worktree`). Instead run:
  ```bash
  MAIN_REPO="$(git rev-parse --git-common-dir)/.."
  gh pr merge <n> --merge
  git push origin --delete <head-branch>
  # If primary repo is on main, pull; otherwise fast-forward the local main ref without switching branches:
  CURRENT_BRANCH=$(git -C "$MAIN_REPO" branch --show-current)
  if [ "$CURRENT_BRANCH" = "main" ]; then
      git -C "$MAIN_REPO" pull --ff-only origin main
  else
      git -C "$MAIN_REPO" fetch origin main:main
  fi
  ```

---

## 4. Worktree Environment & Tooling Guidelines

- **Table Formatting Guard:** Never use literal pipes `||` inside markdown table cells (even inside backticks). Escape them as `\|\|` or use prose/concatenation functions (e.g. `CONCAT()`) to prevent broken table rendering.
- **Node & Environment in Worktrees:** Worktrees do not automatically contain `.env.local` or `node_modules`. When running one-off node/tsx scripts in a worktree, point to the primary project root dynamically:
  ```bash
  MAIN_REPO="$(git rev-parse --git-common-dir)/.."
  NODE_PATH="$MAIN_REPO/node_modules" node --env-file="$MAIN_REPO/.env.local" -e '...'
  ```
- **Supabase Migrations:** Always use the eager/lazy Supabase MCP tool (`call_mcp_tool` with `apply_migration` or `execute_sql`) rather than attempting interactive `npx supabase` shell prompts.
