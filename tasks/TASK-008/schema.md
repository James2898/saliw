# Technical Schema — Strict Auth Wall and Middleware Guard

## Integration Contract Summary

This task involves no Server Actions or data mutation endpoints. All integration points are session verification gates using existing Supabase SSR infrastructure.

## Auth Gate Contract Table

| Gate | Method | File | Infrastructure | Status | Gap Strategy |
|------|--------|------|----------------|--------|--------------|
| Middleware route guard — redirect unauthenticated | `supabase.auth.getUser()` + `NextResponse.redirect` | `src/middleware.ts` | `@supabase/ssr` createServerClient — EXISTS | MISSING (redirect logic absent) | Add redirect block after existing getUser() call |
| Dashboard page auth check | `createClient().auth.getUser()` + `redirect('/login')` | `src/app/dashboard/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING (no auth check at all) | Add createClient import + getUser + redirect |
| Library page auth check | `createClient().auth.getUser()` + `redirect('/login')` | `src/app/library/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING (getUser called but no redirect) | Add redirect('/login') on null user; remove guest fallback |
| Setlists page auth check | `createClient().auth.getUser()` + `redirect('/login')` | `src/app/setlists/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING (getUser called but no redirect) | Add redirect('/login') on null user; remove guest fallback |
| Login page reverse guard | `createClient().auth.getUser()` + `redirect('/')` | `src/app/(auth)/login/page.tsx` | EXISTS | EXISTS — no change needed | N/A |

## RLS Policy Verification

All SELECT policies on protected data tables already enforce `auth.role() = 'authenticated'`. No migration required.

| Table | SELECT Policy | Status |
|-------|--------------|--------|
| `songs` | `auth.role() = 'authenticated'` | EXISTS — correct |
| `setlists` | `auth.role() = 'authenticated'` | EXISTS — correct |
| `setlist_songs` | `auth.role() = 'authenticated'` + parent setlist EXISTS check | EXISTS — correct |
| `profiles` | `auth.uid() = id` (own-row only) | EXISTS — correct |

## Middleware Redirect Logic Detail

```
Current: await supabase.auth.getUser()  →  return supabaseResponse (always)
Required: 
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const protectedPaths = ['/dashboard', '/library', '/setlists']
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
```

The existing `config.matcher` already excludes `_next/static`, `_next/image`, `favicon.ico`, and static asset extensions. The redirect logic above additionally guards against matching `/login` by checking `isProtected` — `/login` is not in `protectedPaths`, so no loop is possible.
