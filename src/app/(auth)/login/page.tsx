import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import LoginForm from "@/components/client/LoginForm";
import Card from "@/components/server/card";

export const metadata: Metadata = {
  title: "Sign In",
};

/**
 * Login page — Server Component.
 *
 * Checks for an existing session before rendering. Authenticated users are
 * redirected to / immediately, preventing any flash of the login form.
 * Auth gating for protected routes is handled in those pages, not here.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold font-sans text-brand-espresso dark:text-brand-cream mb-8 text-center">
          Saliw
        </h1>
        <Card padding="lg">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
