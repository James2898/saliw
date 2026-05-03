import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

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
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
