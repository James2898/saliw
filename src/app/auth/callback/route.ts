import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

/**
 * Validates the `next` redirect parameter to ensure it is a safe, internal relative path.
 * Protects against open redirect attacks (e.g., protocol-relative URLs, backslash bypasses,
 * or userinfo '@' parser exploits).
 */
function getSafeRedirectPath(next: string | null, origin: string): string {
  if (!next || typeof next !== "string") {
    return "/";
  }

  // Must start with '/' and NOT '//' or '/\'
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return "/";
  }

  // Must NOT contain '@' (prevents userinfo URL parser confusion)
  if (next.includes("@")) {
    return "/";
  }

  try {
    const resolved = new URL(next, origin);
    if (resolved.origin !== origin || !resolved.pathname.startsWith("/")) {
      return "/";
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}

/**
 * PKCE auth callback handler.
 *
 * Called by Supabase after email magic link confirmation or OAuth sign-in.
 *
 * Query params:
 * - code: One-time PKCE authorization code from Supabase
 * - next: Optional redirect path after successful auth (defaults to '/')
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const validNextPath = getSafeRedirectPath(next, origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(validNextPath, origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", origin));
}
