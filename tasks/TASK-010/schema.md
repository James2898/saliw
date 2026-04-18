# Technical Schema — Song Library Base View with Search

## Server Action / Supabase Query Contract Table

| UI Action | Query Type | Supabase Table | Status | Gap Strategy |
|-----------|-----------|----------------|--------|--------------|
| Fetch songs list (unfiltered) | Direct SELECT in `page.tsx` | `songs` | EXISTS | N/A |
| Fetch songs list (filtered by search) | Direct SELECT + ilike in `page.tsx` | `songs` | EXISTS | N/A |
| Fetch user role for RBAC | Direct SELECT in `page.tsx` | `profiles` | EXISTS | Default `isMusicDirector = false` on error |
| Navigate to song viewer | `<Link href="/library/[id]">` | N/A — navigation only | EXISTS (link only) | N/A |
| Navigate to song editor | `<Link href="/library/[id]/edit">` | N/A — navigation only | EXISTS (link only; gated by `isMusicDirector`) | Not rendered for non-directors |

## Summary

- Total data actions: 3
- EXISTS: 3
- MISSING: 0
- All-MISSING escalation: No
