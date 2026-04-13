# Tech Stack — Saliw Music Portal

> **Read when:** choosing libraries, frameworks, or packages. All decisions here are locked unless explicitly changed by the user.

## Decisions

| Layer      | Decision                      | Status |
| ---------- | ----------------------------- | ------ |
| Frontend   | Next.js (App Router)          | Locked |
| Backend    | Supabase (BaaS)               | Locked |
| Database   | PostgreSQL                    | Locked |
| Styling    | Tailwind CSS v4               | Locked |
| HTTP layer | Supabase SSR (Server Actions) | Locked |
| Realtime   | Supabase Broadcast (Client)   | Locked |
| Icons      | Lucide React                  | Locked |
| Deployment | Vercel                        | Locked |

## Multi-Page Architecture

- **Rendering:** Server Components by default for chord sheets to ensure fast initial load and SEO.
- **Data Fetching:** Handled via Server Actions and `@supabase/ssr` package.
- **Musical Logic:** Transposition logic (Regex/Math) is shared between Server (initial render) and Client (live adjustments).

## Authentication & Authorization

- **Auth:** Supabase Auth (GoTrue).
- **RBAC:** Managed via a `profiles` table with a `role` field.
- **Access Flow:** \* `guest/member`: Read-only access to songs and setlists.
  - `music_director`: Authenticated access for all mutations.

## Vercel Deployment Notes

- Optimized for Vercel's edge network.
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are managed in the Vercel Dashboard.
