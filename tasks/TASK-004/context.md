# Context Bundle — Navbar (TASK-004)

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `src/components/client/button.tsx` | Reusable Client Component with Artisan variant/size system — pattern to follow for the navbar's interactive icon buttons |
| `src/components/server/card.tsx` | Server Component using `main-card` CSS class and Artisan border — shows how server/client boundary is structured |
| `src/styles/globals.css` | Defines all brand CSS variables (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`), dark mode tokens, and transition rules |
| `src/services/supabase/client.ts` | `createBrowserClient` from `@supabase/ssr` — the correct client for auth state in Client Components |
| `src/services/supabase/server.ts` | `createServerClient` — not used by navbar directly, but shows the pattern; navbar must use the browser client |
| `src/app/layout.tsx` | Root layout — navbar must be inserted here to appear on all pages; currently has no navbar |
| `src/app/dashboard/layout.tsx` | Shows existing page layout pattern: `min-h-screen bg-brand-cream` with `max-w-5xl mx-auto` |
| `src/app/page.tsx` | Home page — imports from `@/components/server/card` and `@/components/client/button`; shows Tailwind usage pattern |
| `src/middleware.ts` | Supabase middleware that refreshes session on every request — confirms session is available server-side |
| `docs/coding-guidelines.md` | Defines Artisan palette hex values, dark mode rules, typography (`Plus Jakarta Sans`), and WCAG contrast constraints |

## Reuse Candidates

- `src/components/client/button.tsx` — The ghost variant (`bg-transparent text-brand-brown border border-brand-brown hover:bg-[var(--brand-tan-alpha)]`) is directly usable for the nav icon buttons. Extend or wrap it for icon-only usage.
- `src/services/supabase/client.ts` — `createClient()` from this module is the correct import for reading `supabase.auth.getUser()` in the navbar Client Component.
- `src/styles/globals.css` — `--brand-background`, `--brand-card-bg`, `--brand-text` semantic tokens should be used so navbar automatically respects dark mode without extra class conditionals.
- Lucide React (`lucide-react` v0.525.0 already installed) — use `LayoutDashboard`, `Library`, `List`, `Music`, `Moon`, `Sun`, `LogIn`, `LogOut` icons.

## Patterns to Follow

- **Client Component with `'use client'`:** See `src/components/client/button.tsx` — all interactive UI lives in `src/components/client/`. Navbar file should be `src/components/client/navbar.tsx`.
- **Artisan class usage:** See `src/app/page.tsx` — use `bg-brand-cream`, `text-brand-espresso`, `text-brand-brown` Tailwind utility classes (not raw hex). These are registered via `@theme` in `globals.css`.
- **Dark mode:** See `src/styles/globals.css` `.dark` block — dark mode is a CSS class toggle on `<html>`, not a media query. The theme toggle must add/remove the `dark` class on `document.documentElement`.
- **Active link detection:** Use Next.js `usePathname()` hook from `next/navigation` to compare against the current path and apply active styles.
- **Supabase auth in Client Component:** Use `createClient()` from `src/services/supabase/client.ts` and call `supabase.auth.getUser()` inside a `useEffect` + `useState`, or subscribe to `supabase.auth.onAuthStateChange`.
- **Layout insertion:** Navbar must be added to `src/app/layout.tsx` above `{children}` in the `<body>`. The layout is currently a Server Component — navbar is a Client Component, which is fine (Server Components can render Client Components as children).

## Anti-Patterns Flagged

- `src/app/dashboard/layout.tsx` line 6: Uses `bg-brand-cream` hardcoded instead of `bg-[var(--brand-background)]` semantic token — this means the dashboard layout will not respond to dark mode. Do not replicate this pattern in the navbar.
- `src/app/page.tsx` line 6: Same issue — `bg-brand-cream` is hardcoded, ignoring dark mode semantic token. Navbar must use `bg-[var(--brand-background)]` or Tailwind's `bg-brand-cream dark:bg-brand-darker` pattern to be dark-mode aware.

## MEMORY.md Notes

- N/A (MEMORY.md does not exist yet in this project)
