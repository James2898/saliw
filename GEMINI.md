# GEMINI.md — Antigravity Workspace Guidelines & Memory

This file is automatically loaded for **Google Antigravity** sessions. It defines runtime constraints, tool-specific lessons, and background task management specific to Antigravity pair programming.

---

## 1. Tooling & MCP Guidelines

### Playwright MCP (`browser_evaluate`)
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
