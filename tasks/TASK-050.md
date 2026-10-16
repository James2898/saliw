# TASK-050 — P0 Immediate Security Hardening

- **Tier:** 1
- **Date Created:** 2026-10-17
- **Status:** Completed

---

## Feature Summary

Implement immediate P0 security hardening measures across authentication, external content embedding, and user authorization:
1. **Auth Callback Open Redirect Guard:** Strictly validate the `next` redirect target parameter in `src/app/auth/callback/route.ts` to ensure it only redirects to relative internal paths, rejecting protocol-relative URLs (`//`), backslash bypasses (`/\`), or embedded userinfo targets (`@`), falling back safely to `/`.
2. **YouTube URL Sanitization & Canonicalization:** Extract YouTube validation and normalization from `YouTubeLinkModal.tsx` into a shared utility `src/utils/youtube.ts`. Enforce server-side validation in `src/app/actions/songActions.ts` so all stored YouTube URLs conform to valid YouTube domains and are normalized to canonical embed format.
3. **Iframe Sandboxing:** Apply restrictive `sandbox="allow-scripts allow-same-origin allow-presentation"` attributes to all YouTube iframes in `SongYouTubeSection.tsx` and `SetlistSongSection.tsx` to prevent iframe escape or top-level navigation.
4. **Profile Role Default & Immutability:** Add a Supabase SQL migration to set the default value of `public.profiles.role` to `'member'` (preventing unassigned or unintended privilege grant) and establish a `BEFORE UPDATE` trigger function on `public.profiles` that raises PostgreSQL error code `42501` (insufficient_privilege) if `role` or `email` columns are altered by unauthorized users.

---

## Acceptance Criteria

1. **AC-1 — Auth Callback Safe Internal Redirect:**
   In `src/app/auth/callback/route.ts`, the `next` query parameter must be strictly validated before use in redirection:
   - Must be a non-empty string.
   - Must start with `/`.
   - Must NOT start with `//` or `/\`.
   - Must NOT contain `@` (preventing `https://example.com@attacker.com` style parser exploits).
   - If invalid or absent, fallback redirect target is `/`.
   - Redirection uses `NextResponse.redirect(new URL(validNextPath, request.url))`.

2. **AC-2 — Server-side YouTube URL Validation & Canonicalization:**
   In `src/app/actions/songActions.ts`:
   - When creating or updating a song with a `youtube_url`:
     - Empty, null, or whitespace-only inputs are permitted and stored as `null`.
     - Non-empty values are validated against permitted YouTube hosts (`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `music.youtube.com`).
     - Must extract the standard 11-character YouTube video ID regex `^[a-zA-Z0-9_-]{11}$`.
     - Valid URLs are normalized to canonical embed format: `https://www.youtube.com/embed/${videoId}` (or `https://www.youtube-nocookie.com/embed/${videoId}`).
     - Invalid YouTube URLs must be rejected by returning `{ data: null, error: "Invalid YouTube URL format" }` per BUG-016 (do not throw unhandled errors).

3. **AC-3 — YouTube Iframe Sandboxing:**
   In both `src/components/client/SongYouTubeSection.tsx` and `src/components/client/SetlistSongSection.tsx`:
   - Every `<iframe>` rendering embedded YouTube video content must include the attribute `sandbox="allow-scripts allow-same-origin allow-presentation"`.
   - `allow-top-navigation` and `allow-forms` must NOT be enabled.

4. **AC-4 — Database Default Role Migration:**
   A new Supabase migration sets the default value of column `role` on `public.profiles` to `'member'`:
   `ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'member';`

5. **AC-5 — Role & Email Immutability Trigger:**
   In the same Supabase migration, create a PostgreSQL trigger function and `BEFORE UPDATE` trigger on `public.profiles`:
   - When `OLD.role IS DISTINCT FROM NEW.role` or `OLD.email IS DISTINCT FROM NEW.email`:
     - Check if the executing session role is authorized (e.g. `auth.jwt() ->> 'role' = 'service_role'` or an explicitly authorized admin).
     - If unauthorized user attempts to change `role` or `email`, raise an exception with SQLSTATE `'42501'` and descriptive message `'Updating profile role or email is unauthorized'`.
   - Trigger must be created with `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS ... CREATE TRIGGER` for idempotency.

---

## Out of Scope

- Changing external video providers (Vimeo, Dailymotion, etc. remain unsupported).
- Creating new admin UI panels for role management.
- Modifying client-side video playback controls beyond iframe sandboxing.
- Re-architecting Supabase auth flows or session handling.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/auth/callback/route.ts` | Auth callback route; implement strict relative URL validation for `next` parameter |
| `src/app/actions/songActions.ts` | Server Actions for song creation/update; validate and normalize `youtube_url` |
| `src/components/client/SongYouTubeSection.tsx` | Song detail YouTube player; add iframe `sandbox` attribute |
| `src/components/client/SetlistSongSection.tsx` | Setlist view YouTube player; add iframe `sandbox` attribute |
| `src/components/client/YouTubeLinkModal.tsx` | Existing client modal containing extraction regex; extract shared logic |
| `src/utils/youtube.ts` | New shared utility for YouTube URL validation, ID extraction, and canonical embed generation |
| `supabase/migrations/20261016000000_p0_security_hardening.sql` | Migration adding default role `'member'` and immutability trigger on `public.profiles` |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing code.
- Read `docs/tech-stack.md` before adding dependencies (no new packages are required).
- Always run `npm run format` (Prettier) and ensure `npm run build` passes cleanly.

### MEMORY.md Prevention Rules (inlined — do not re-read MEMORY.md)

- **BUG-011 (Authorization bypass & RLS security):** Ensure any migration altering `public.profiles` protects privileged columns from public mutation. The `BEFORE UPDATE` trigger must guard against privilege escalation via direct Supabase client updates.
- **BUG-016 (Server Action error handling):** Server Actions must return `{ data: null, error: string }` error objects rather than throwing unhandled exceptions to avoid breaking client-side execution or leaking internal stack traces.
- **BUG-007 (React forward reference rule):** If defining helper functions inside React components or hooks, declare them above any `useEffect` referencing them.
- **BUG-004 (Dark mode pairing):** If modifying any UI error messages or modals, ensure text and background classes include corresponding `dark:` variants.

---

## Amendments (from Context Bundle)

- **AM-1 (Shared YouTube Utility Extraction):** Extract `extractYouTubeVideoId(url: string): string | null` and `getYouTubeEmbedUrl(videoId: string): string` into a single shared utility `src/utils/youtube.ts` imported by both client modal and server actions.
- **AM-2 (Safe Server Action Return Values - BUG-016):** In `songActions.ts`, when `youtube_url` is invalid, return `{ data: null, error: "Invalid YouTube URL format" }` instead of throwing an unhandled Error.
- **AM-3 (Migration Idempotency):** The Supabase migration script must be idempotent, using `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS tr_protect_profiles_role_email ON public.profiles; CREATE TRIGGER ...`.

---

## Resolution

- **Completed:** 2026-10-17
- **Branch:** `fix/TASK-050-p0-security-hardening`
- **Files changed:**
  - `src/app/auth/callback/route.ts`
  - `src/utils/youtube.ts`
  - `src/components/client/YouTubeLinkModal.tsx`
  - `src/app/actions/songActions.ts`
  - `src/components/client/SongYouTubeSection.tsx`
  - `src/components/client/SetlistSongSection.tsx`
  - `src/components/client/NewSongFormClient.tsx`
  - `src/components/client/SongEditorClient.tsx`
  - `supabase/migrations/20261017000000_p0_security_hardening.sql`
  - `tasks/TASK-050.md`
- **Notes:** Implemented strict redirect validation on auth callback (AC-1), shared YouTube normalization utility and server action validation (AC-2), iframe sandboxing for embedded players (AC-3), database migration for default 'member' role and role/email immutability trigger with SQLSTATE 42501 (AC-4 & AC-5). Verified with `npx tsc --noEmit`, Prettier, and `npm run build`.
