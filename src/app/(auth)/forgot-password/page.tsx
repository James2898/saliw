import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'
import ForgotPasswordForm from '@/components/client/ForgotPasswordForm'
import Card from '@/components/server/card'

/**
 * Forgot Password page — Server Component.
 *
 * Checks for an existing session; authenticated users are redirected to /
 * immediately to prevent them from accessing the reset request form.
 * No layout.tsx exists in the (auth) route group — each page owns its shell.
 */
export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-darker px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold font-sans text-brand-espresso dark:text-brand-cream mb-8 text-center">
          Saliw
        </h1>
        <Card padding="lg">
          <ForgotPasswordForm />
        </Card>
      </div>
    </main>
  )
}
