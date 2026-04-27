import type { Metadata } from 'next'
import Link from 'next/link'
import Card from '@/components/server/card'

export const metadata: Metadata = {
  title: 'Sign-in Failed',
}

/**
 * Auth code error page — Server Component.
 *
 * Rendered when the PKCE callback route at /auth/callback fails to exchange
 * the authorization code for a session (expired link, already-used link, etc.).
 */
export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4">
      <div className="w-full max-w-md">
        <Card padding="lg">
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold font-sans text-brand-espresso dark:text-brand-cream">
              Sign-in failed
            </h1>
            <p className="text-sm font-sans text-brand-brown dark:text-brand-tan">
              The link may have expired or already been used. Please try signing
              in again.
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold font-sans text-brand-brown underline hover:text-brand-espresso dark:text-brand-tan dark:hover:text-brand-cream transition-colors duration-200"
            >
              Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </main>
  )
}
