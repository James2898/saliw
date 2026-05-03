"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";

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
export async function signInWithPasswordAction(input: {
  email: string;
  password: string;
}): Promise<{ error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    // Return the same message for both wrong email and wrong password
    // to prevent user enumeration attacks.
    return { error: "Invalid email or password. Please try again." };
  }

  redirect("/");
}

/**
 * Sends a password reset email to the provided address.
 *
 * On success: returns { success: true } — even if the email is not registered
 * (Supabase returns HTTP 200 for unregistered emails; we mirror that to prevent
 * user enumeration attacks).
 * On genuine network/config error: returns { error: string }.
 *
 * The redirectTo points to the existing PKCE callback route at /auth/callback,
 * which exchanges the code for a session and redirects to /reset-password.
 */
export async function sendPasswordResetAction(input: {
  email: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: "Unable to send reset link. Please try again." };
    }

    return { success: true };
  } catch {
    return { error: "Unable to send reset link. Please try again." };
  }
}

/**
 * Updates the authenticated user's password after a reset flow.
 *
 * On success: calls redirect('/login') — never returns a value.
 * On error: returns { error: string }.
 *
 * IMPORTANT: redirect() must NOT be inside a try/catch block.
 * Next.js redirect() throws NEXT_REDIRECT internally — catching it without
 * re-throwing silently breaks the redirect.
 */
export async function updatePasswordAction(input: {
  password: string;
}): Promise<{ error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (error) {
    return {
      error:
        "This reset link has expired or is invalid. Please request a new one.",
    };
  }

  redirect("/login");
}
