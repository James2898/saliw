'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { updatePasswordAction } from '@/app/actions/authActions'
import Button from '@/components/client/button'

const inputClass =
  'font-sans text-brand-espresso bg-transparent border border-brand-brown rounded-xl px-3 py-2 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 ' +
  'dark:text-brand-cream dark:border-brand-tan'

const labelClass = 'text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream'

/**
 * ResetPasswordForm — Client Component.
 *
 * Renders the new-password form after a user clicks a reset link. On success,
 * updatePasswordAction calls redirect('/login') — the user is navigated away.
 * All auth mutations go through Server Actions — this component never calls
 * Supabase directly.
 */
export default function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const result = await updatePasswordAction({ password })
      // updatePasswordAction calls redirect('/login') on success — it never
      // returns a value in the success case. We only reach this code on error.
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-password" className={labelClass}>
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            required
            minLength={6}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-password" className={labelClass}>
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setError(null)
            }}
            required
            className={inputClass}
          />
        </div>

        {error && (
          <div role="alert" className="flex flex-col gap-2">
            <p className="text-sm font-sans text-red-700 dark:text-red-400">
              {error}
            </p>
            {error.includes('expired or invalid') && (
              <Link
                href="/forgot-password"
                className="text-sm font-sans text-brand-brown dark:text-brand-tan underline"
              >
                Request a new link
              </Link>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          aria-label={isPending ? 'Updating password' : 'Set new password'}
        >
          {isPending ? (
            <>
              <Loader2
                size={16}
                className="animate-spin mr-2"
                aria-hidden="true"
              />
              Updating…
            </>
          ) : (
            'Set New Password'
          )}
        </Button>
      </form>
    </div>
  )
}
