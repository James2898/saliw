# Context Bundle — Navbar Auth State Synchronization

## Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/components/client/navbar.tsx` | Main Client Component responsible for rendering navigation links, user greeting, login/logout actions, and mobile drawer. Currently only checks auth on mount via `onAuthStateChange`, leaving state stale after Server Action redirects. |
| `src/app/actions/authActions.ts` | Server Action module defining `signInWithPasswordAction`, which calls `supabase.auth.signInWithPassword` on the server and issues `redirect('/')`. Must remain unchanged. |
| `src/components/client/LoginForm.tsx` | Client form invoking `signInWithPasswordAction` via `useTransition`. Must remain unchanged. |
| `src/middleware.ts` | Edge/server auth middleware using `@supabase/ssr` `createServerClient`. Authoritative validator that updates cookies and enforces protected routes. |
| `src/services/supabase/client.ts` | Factory exporting browser Supabase client (`createClient()`), used in client components to call `supabase.auth.getSession()` and query `profiles`. |
| `src/types/Profile.ts` | TypeScript interface defining profile shape (`id`, `email`, `full_name`, `role`). |
| `src/components/client/logout-modal.tsx` | Accessible modal dialog triggered from `Navbar` for sign-out confirmation. |
| `src/app/page.tsx` | Root page Server Component that reads `supabase.auth.getUser()` server-side and switches between marketing view and authenticated dashboard. |

## Reuse Candidates
- `createClient()` from `src/services/supabase/client.ts`: Already imported in `navbar.tsx`; provides client access to `supabase.auth.getSession()` for 0ms local cookie session reads and `.from("profiles")` queries.
- `usePathname()` from `next/navigation`: Already imported and called in `navbar.tsx`; can be added to session re-validation effects to trigger sync on route changes (such as `/login` -> `/`).
- `user.user_metadata?.full_name`: Standard property on `User` object to optimistically populate the greeting immediately upon detecting an active session before the authoritative `profiles` table query completes.
- Browser `document.addEventListener("visibilitychange", ...)`: Standard platform API to re-sync session state whenever the browser tab becomes active (`document.visibilityState === "visible"`).

## Patterns to Follow
- **Optimistic State with Background Authoritative Verification**: When an active session is detected, immediately set `user` and set `fullName` from `user.user_metadata?.full_name ?? null`, then asynchronously query `supabase.from("profiles").select("full_name").eq("id", user.id).single()` to update `fullName` authoritatively without UI flicker.
- **Route-Aware Effect Synchronization**: Use `useEffect` with `pathname` in the dependency array to invoke session verification whenever navigation occurs. Ensure state is only updated if the user identity or session status actually changed to prevent redundant re-renders.
- **Multi-Tab Visibility Synchronization**: Register a `visibilitychange` event listener on `document` within a `useEffect` hook, checking `document.visibilityState === "visible"` and refreshing local auth state, with complete cleanup on unmount.
- **Strict Declaration Order for React Compiler**: Declare all helper functions (such as `syncSession` or `fetchProfile`) before any `useEffect` or hook calls that reference them to satisfy the React Compiler's strict declaration order rules (preventing BUG-007).
- **Graceful Greeting Fallback**: Retain the fallback expression `Hi, ${fullName?.trim() || "there"}!` to handle nullish, empty, or whitespace-only profile names gracefully.

## Anti-Patterns Flagged
- `src/components/client/navbar.tsx` lines 39-42: `const [isDark, setIsDark] = useState(() => typeof window !== "undefined" && localStorage.getItem("theme") === "dark");` — violates SSR hydration best practices (BUG-001 & BUG-020). Do not use window checks or local storage in state initializers for auth state.
- `src/components/client/navbar.tsx` lines 68-99: Auth state synchronization is restricted to an initial `useEffect` with an empty dependency array (`[]`) listening only to `onAuthStateChange`. Because Server Actions set cookies via server HTTP responses followed by Next.js soft navigation, client `onAuthStateChange` does not fire after login redirects without an explicit `getSession()` check.
- **Global AuthProvider wrapper anti-pattern**: Wrapping `src/app/layout.tsx` in a React Context `AuthProvider` is explicitly out-of-scope and violates Next.js RSC principles and project lean change rules. Keep `Navbar` self-contained.
- **Client-side `getUser()` in route effects**: Avoid calling `supabase.auth.getUser()` on every route transition in client components, as it performs an external HTTP roundtrip to Supabase. Use `supabase.auth.getSession()` for instant cookie reading in client UI while letting `middleware.ts` handle authoritative server-side JWT verification.

## MEMORY.md Notes
- **BUG-007 (Navbar Sidebar / React Compiler)**: The React Compiler strictly forbids forward references. Always declare helper functions before any `useEffect` or hook that references them.
- **BUG-001 (Storage in useEffect / double render)**: Never initialize React state from external storage inside `useEffect` with `setState`.
- **BUG-020 (Mount guard SSR hydration mismatch)**: Never use `useState(() => typeof window !== "undefined")` or similar window checks as mount guards in `"use client"` components.
- **BUG-002 (React Compiler dependency arrays)**: Never use object property paths (e.g. `[obj.method]`) in hook dependency arrays. Use whole objects or destructured primitives.
- **BUG-022 (Next.js build cache corruption)**: Never run `next build` while `next dev` is actively running in the same workspace.
- **BUG-024 (Supabase Modern Keys)**: Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). Legacy JWT keys are disabled and return 401.
- **BUG-025 (Git Worktree Dev Server)**: In git worktrees with symlinked `node_modules`, do not pass `--turbopack`. Use standard `npx next dev -p <port>`.