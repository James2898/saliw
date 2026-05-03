# Research — Auto-Scroll for Setlist Viewer and Song Viewer

## Open Questions

- **Scroll target** → Resolved from context: full-page `window` scroll based on App Router full-page layout structure. @codebase-explorer must confirm no inner scroll container overrides this.
- **Smooth vs. step-by-step scroll** → Resolved from context: smooth continuous (`requestAnimationFrame`) is the standard for teleprompter-style reading aids; step mode not requested.
- **Speed range (px/s)** → Resolved from context: 1–10 speed units mapped linearly to 20–200 px/s. Developer may tune exact values during implementation, but range endpoints are fixed.
- **Content shorter than viewport** → Resolved deterministically: toggle disabled + hint text if `scrollHeight <= clientHeight`.
- **Dark mode toolbar** → Resolved from `docs/coding-guidelines.md`: `--brand-espresso` is the dark-mode card color, so toolbar requires no separate `dark:` treatment.
- **BUG-001 (setState in effect)** → Resolved from MEMORY.md BUG-001: localStorage read must use lazy `useState` initializer.
- **BUG-002 (React Compiler useCallback property path)** → Resolved from MEMORY.md BUG-002: deps must reference whole objects.
- **BUG-007 (React Compiler forward reference)** → Resolved from MEMORY.md BUG-007: declare helper functions before hooks that reference them.
- **Pause/resume control placement** → BLOCKING — awaiting user answer. Cannot be resolved from project context.
- **Speed slider visibility (always visible vs. collapsed)** → BLOCKING — awaiting user answer. Cannot be resolved from project context.
- **Toolbar always-visible vs. auto-hide** → BLOCKING — awaiting user answer. Cannot be resolved from project context.
