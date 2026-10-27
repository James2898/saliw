# GEMINI.md — Antigravity Workspace Guidelines & Memory

This file is automatically loaded for **Google Antigravity** sessions. It defines runtime constraints, tool-specific lessons, and background task management specific to Antigravity pair programming.

---

## 1. Tooling & MCP Guidelines

### Playwright MCP (`browser_evaluate`, `browser_click`)
- **Tool Argument Schemas:**
  - `browser_click`: uses `{ target: string }` (CSS selector or element ref), **never** `{ selector }`.
  - `browser_evaluate`: uses `{ function: string }` (e.g. `"() => { ... }"`), **never** `{ script }`.
  - `browser_select_option`: uses `{ target: string, values: string[] }`.
- **Pure JavaScript Only:** Always write scripts passed to `browser_evaluate` in standard ECMAScript / ES6.
- **Never use TypeScript Syntax:** Do not use `as HTMLElement`, `as HTMLInputElement`, interface declarations, or type annotations in evaluated strings. The browser's native JavaScript engine will throw `SyntaxError: Unexpected identifier 'as'`.
- **Safe Element Casts:** Use standard DOM existence checks or plain property lookups:
  ```javascript
  // Bad (throws SyntaxError)
  (document.querySelector('input') as HTMLInputElement).value;

  // Good
  const input = document.querySelector('input');
  if (input) { const val = input.value; }
  ```

### zsh Globs
- **zsh globs:** quote glob arguments (`--include='*.ts'`). Unquoted, zsh aborts with `no matches found`.

### Windows & PowerShell Script Execution
- **Inline Script Execution:** When executing multi-line or ad-hoc data calculation scripts in Windows shell, prefer `node -e "..."` over `powershell -Command "..."`. In PowerShell command strings, unescaped `$` variable identifiers are evaluated prematurely by string interpolation and will trigger syntax errors like `Missing expression after unary operator`.

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
  3. Start a fresh dev server (`npx next dev -p 3001`).

---

## 3. Worktree & Git Discipline

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
  - Windows (PowerShell):
    ```powershell
    $mainRepo = Resolve-Path ((git rev-parse --git-common-dir) + "/..")
    New-Item -ItemType SymbolicLink -Path node_modules -Target "$mainRepo/node_modules"
    New-Item -ItemType SymbolicLink -Path .env.local -Target "$mainRepo/.env.local"
    ```
  Start the dev server with `./node_modules/.bin/next dev -p <port>` (no `--turbopack`, see MEMORY.md) and use a port other than the main checkout's. Remove the temporary symlinks (`rm -f node_modules .env.local` or `Remove-Item node_modules, .env.local`) before `git status` / committing so untracked symlinks are never staged.
- **Merging PRs from a worktree:** Do not pass `--delete-branch` to `gh pr merge` when `main` is checked out in the primary worktree (`gh` attempts `git checkout main` locally and fails with `fatal: 'main' is already used by worktree`). Instead run:
  ```bash
  MAIN_REPO="$(git rev-parse --git-common-dir)/.."
  gh pr merge <n> --merge
  git push origin --delete <head-branch>
  git -C "$MAIN_REPO" pull --ff-only origin main
  ```
- **PR Assignee:** When creating pull requests via `gh pr create`, always assign to the personal GitHub account (`--assignee "@me"`).

---

## 4. Worktree Environment & Tooling Guidelines

- **Table Formatting Guard:** Never use literal pipes `||` inside markdown table cells (even inside backticks). Escape them as `\|\|` or use prose/concatenation functions (e.g. `CONCAT()`) to prevent broken table rendering.
- **Node & Environment in Worktrees:** Worktrees do not automatically contain `.env.local` or `node_modules`. When running one-off node/tsx scripts in a worktree, point to the primary project root dynamically:
  ```bash
  MAIN_REPO="$(git rev-parse --git-common-dir)/.."
  NODE_PATH="$MAIN_REPO/node_modules" node --env-file="$MAIN_REPO/.env.local" -e '...'
  ```
- **Supabase Migrations:** Always use the eager/lazy Supabase MCP tool (`call_mcp_tool` with `apply_migration` or `execute_sql`) rather than attempting interactive `npx supabase` shell prompts.

---

## 5. Tutoring & Pairing Guardrail

- **No Unsolicited Modifications:** When in tutoring/pairing mode, NEVER modify, edit, or patch application code files unless explicitly asked by the user.
- **Minimal Code Guidance:** Do NOT write out full JSX, component implementations, or solution files for the user to copy or retype. Provide only TypeScript contracts, behavior checklists, and file:line citations to sibling components. The user authors the code.
- **Error Log Handling:** When the user shares an error log or test failure:
  1. Do NOT modify the code files.
  2. Explain the root cause clearly from first principles.
  3. Provide diagnostic tips and line citations so the user can implement the fix themselves.
  4. Wait for the user's action or explicit request.
