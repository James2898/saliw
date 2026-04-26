'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { sendPasswordResetAction } from '@/app/actions/authActions'
import Button from '@/components/client/button'

const inputClass =
  'font-sans text-brand-espresso bg-transparent border border-brand-brown rounded-xl px-3 py-2 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 ' +
  'dark:text-brand-cream dark:border-brand-tan'

const labelClass = 'text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream'

/**
 * ForgotPasswordForm — Client Component.
 *
 * Renders the password-reset request form. On success, replaces the form with
 * a confirmation message. All auth mutations go through Server Actions — this
 * component never calls Supabase directly.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await sendPasswordResetAction({ email })
      if ('success' in result) {
        setSucceeded(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {!succeeded && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="reset-email" className={labelClass}>
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              required
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm font-sans text-brand-espresso dark:text-brand-cream">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending}
          >
            {isPending ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      {succeeded && (
        <p className="text-sm font-sans text-brand-brown dark:text-brand-tan">
          Check your inbox — a password reset link has been sent.
        </p>
      )}

      <Link
        href="/login"
        className="text-sm font-sans text-brand-brown dark:text-brand-tan underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}
