# Technical Schema — Hybrid Rendering Engine (SongViewer)

## Server Action Contract Table

| UI Action | Server Action / Query | File | RLS Role | Status | Gap Strategy |
|-----------|----------------------|------|----------|--------|--------------|
| Load song chord sheet | Direct Server Component query: `supabase.from('songs').select('id, title, artist, original_key, content').eq('id', id).single()` | `src/app/library/[id]/page.tsx` | `authenticated` (SELECT policy: `auth.role() = 'authenticated'`) | EXISTS | N/A |
| Auth session check | `supabase.auth.getUser()` | `src/app/library/[id]/page.tsx` | N/A — identity verification | EXISTS | Redirect to `/login` if no user |

## Summary

- Total data actions: 2
- EXISTS: 2
- MISSING: 0
- All-MISSING escalation: No
