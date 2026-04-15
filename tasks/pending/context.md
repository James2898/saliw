# Context Bundle — Navbar Login/Logout Button Label Fix

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/navbar.tsx` | Contains the login and logout buttons with tooltip markup to be removed and replaced with inline labels |
| `src/components/client/button.tsx` | forwardRef Button component — not used by the auth buttons directly, but available as a reuse candidate |
| `src/components/client/logout-modal.tsx` | Logout confirmation modal — keep untouched |
| `docs/coding-guidelines.md` | Artisan Palette color tokens and Tailwind class conventions |

## Reuse Candidates
- `src/components/client/navbar.tsx` lines 179–185 — `iconBtnClass` shared string; the login/logout buttons already use it. The new label text should sit alongside the icon inside the same button, matching the pattern used in the sidebar theme toggle (lines 435–443) which already shows icon + text label inline.
- Sidebar theme toggle button (lines 435–443) — exact pattern to follow for icon + inline text label: `flex items-center gap-3 px-3 text-sm font-semibold font-sans`

## Patterns to Follow
- **Icon + inline label pattern:** See sidebar theme toggle at `src/components/client/navbar.tsx` lines 431–443 — icon rendered first, then a `<span>` with the label text inside the same `<button>`.
- **Artisan text tokens:** `text-brand-espresso dark:text-brand-cream` for label text (matches the existing button colors).
- **Font:** `font-sans font-semibold text-sm` consistent with other nav labels.

## Anti-Patterns Flagged
- `src/components/client/navbar.tsx` lines 259–282 (logout) and 284–307 (login): tooltip implemented via `<div class="relative group">` wrapper + absolutely-positioned `<div role="tooltip">`. This pattern clips at the viewport edge — it is the exact anti-pattern being removed.

## MEMORY.md Notes
- N/A — MEMORY.md does not exist in this project yet.

## Key Implementation Notes
1. **Desktop logout button** (lines 257–282): Remove the `<div class="relative group">` wrapper. Keep the `<button>` with `ref={desktopLogoutRef}`. Remove the tooltip `<div role="tooltip">`. Add `<span>Logout</span>` to the left of `<LogOut>` icon inside the button, and adjust button classes to allow text (remove fixed `w-9 h-9`, change to flex with gap).
2. **Desktop login button** (lines 284–307): Same treatment — remove wrapper + tooltip div. Add `<span>Login</span>` to the left of `<LogIn>` icon inside the button.
3. **Mobile sidebar auth buttons** (lines 446–472): These are icon-only buttons in the sidebar footer and do NOT have tooltips. The task description only mentions the navbar login/logout buttons. Do not modify the sidebar auth buttons unless the task explicitly calls for it — keep them as-is.
4. **Branch:** Create `feature/TASK-010-navbar-login-logout-labels` from `develop`.
