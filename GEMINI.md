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
- **Fresh worktree setup & test commands:** A new worktree has no `node_modules` or `.env.local`. Before running `npm run test:unit` (note: there is no `npm test` script), `npm run lint`, `npx tsc --noEmit`, or `next dev`, link them from the main checkout (do not `npm install`):
  ```bash
  ln -sf /Users/adish/projects/saliw/node_modules node_modules
  ln -sf /Users/adish/projects/saliw/.env.local .env.local
  ```
  Start the dev server with `./node_modules/.bin/next dev -p <port>` (no `--turbopack`, see MEMORY.md) and use a port other than the main checkout's. Remove the temporary symlinks (`rm -f node_modules .env.local`) before `git status` / committing so untracked symlinks are never staged.
- **Merging PRs from a worktree:** Do not pass `--delete-branch` to `gh pr merge` when `main` is checked out in `/Users/adish/projects/saliw` (`gh` attempts `git checkout main` locally and fails with `fatal: 'main' is already used by worktree`). Instead run:
  ```bash
  gh pr merge <n> --merge
  git push origin --delete <head-branch>
  git -C /Users/adish/projects/saliw pull --ff-only origin main
  ```

---

## 4. Worktree Environment & Tooling Guidelines

- **Table Formatting Guard:** Never use literal pipes `||` inside markdown table cells (even inside backticks). Escape them as `\|\|` or use prose/concatenation functions (e.g. `CONCAT()`) to prevent broken table rendering.
- **Node & Environment in Worktrees:** Worktrees do not automatically contain `.env.local` or `node_modules`. When running one-off node/tsx scripts in a worktree, point to the primary project root:
  ```bash
  NODE_PATH=/Users/adish/projects/saliw/node_modules node --env-file=/Users/adish/projects/saliw/.env.local -e '...'
  ```
- **Supabase Migrations:** Always use the eager/lazy Supabase MCP tool (`call_mcp_tool` with `apply_migration` or `execute_sql`) rather than attempting interactive `npx supabase` shell prompts.
