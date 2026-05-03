"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signInWithPasswordAction } from "@/app/actions/authActions";
import Button from "@/components/client/button";

const inputClass =
  "font-sans text-brand-espresso bg-transparent border border-brand-brown rounded-xl px-3 py-2 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 " +
  "dark:text-brand-cream dark:border-brand-tan";

const labelClass =
  "text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream";

/**
 * LoginForm — Client Component.
 *
 * Renders the email + password login form.
 * All mutations go through Server Actions — this component never calls Supabase directly.
 */
export default function LoginForm() {
  // --- Password form state ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordPending, startPasswordTransition] = useTransition();

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    startPasswordTransition(async () => {
      const result = await signInWithPasswordAction({ email, password });
      // result is only defined when the action returns { error: string }.
      // On success, the action calls redirect() which never returns a value.
      if (result && "error" in result) {
        setPasswordError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Email + Password form */}
      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setPasswordError(null);
            }}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            required
            className={inputClass}
          />
        </div>

        {passwordError && (
          <p
            role="alert"
            className="text-sm font-sans text-red-700 dark:text-red-400"
          >
            {passwordError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPasswordPending}
          aria-label={isPasswordPending ? "Signing in" : "Sign in"}
        >
          {isPasswordPending ? (
            <>
              <Loader2
                size={16}
                className="animate-spin mr-2"
                aria-hidden="true"
              />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <Link
          href="/forgot-password"
          className="text-sm font-sans text-brand-brown dark:text-brand-tan underline hover:opacity-75 transition-opacity duration-200 text-center"
        >
          Forgot password?
        </Link>
      </form>
    </div>
  );
}
