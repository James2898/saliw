'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'

/**
 * Signs in a user with email and password.
 *
 * On success: calls redirect('/') — never returns a value.
 * On error: returns { error: string }.
 *
 * IMPORTANT: redirect() must NOT be inside a try/catch block.
 * Next.js redirect() throws NEXT_REDIRECT internally — catching it without
 * re-throwing silently breaks the redirect and leaves the user on the login page.
 */
export async function signInWithPasswordAction(
  input: { email: string; password: string }
): Promise<{ error: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    // Return the same message for both wrong email and wrong password
    // to prevent user enumeration attacks.
    return { error: 'Invalid email or password. Please try again.' }
  }

  redirect('/')
}

/**
 * Sends a magic link (OTP) to the provided email address.
 *
 * On success: returns { success: true } — the user must click the emailed link.
 * On error: returns { error: string }.
 *
 * The emailRedirectTo points to the existing PKCE callback route handler
 * at /auth/callback, which exchanges the code for a session and redirects to /.
 */
export async function sendMagicLinkAction(
  input: { email: string }
): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      return { error: 'Unable to send sign-in link. Please try again.' }
    }

    return { success: true }
  } catch {
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
