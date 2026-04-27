import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/client/ResetPasswordForm'
import Card from '@/components/server/card'

export const metadata: Metadata = {
  title: 'Reset Password',
}

/**
 * Reset Password page — Server Component.
 *
 * Does NOT check for an active session — the user lands here directly from the
 * password-reset email link. The PKCE callback at /auth/callback has already
 * exchanged the code for a session by the time the user reaches this page.
 * No layout.tsx exists in the (auth) route group — each page owns its shell.
 */
export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold font-sans text-brand-espresso dark:text-brand-cream mb-8 text-center">
          Saliw
        </h1>
        <Card padding="lg">
          <ResetPasswordForm />
        </Card>
      </div>
    </main>
  )
}
