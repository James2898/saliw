import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard']

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }
  // Protect edit/create routes under /library
  if (pathname === '/library/new') return true
  if (/^\/library\/[^/]+\/edit(\/.*)?$/.test(pathname)) return true
  return false
}

export async function middleware(request: NextRequest) {
  // Start with a passthrough response carrying the original request headers.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Step 1: Write updated cookies back to the request object.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Step 2: Recreate the response so it carries the new request headers.
          supabaseResponse = NextResponse.next({ request })
          // Step 3: Set cookies on the final response so the browser receives them.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session token and gates protected routes.
  // IMPORTANT: Do not remove this call — it is required for session persistence.
  // Use getUser() (not getSession()) to validate the JWT against the Supabase server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (Next.js build artifacts)
     * - _next/image (Next.js image optimization)
     * - favicon.ico
     * - Static image/font assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
