'use client'

import { useState, useTransition } from 'react'
import {
  signInWithPasswordAction,
  sendMagicLinkAction,
} from '@/app/actions/authActions'
import Button from '@/components/client/button'

type Mode = 'password' | 'magic-link'

const inputClass =
  'font-sans text-brand-espresso bg-transparent border border-brand-brown rounded-xl px-3 py-2 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 ' +
  'dark:text-brand-cream dark:border-brand-tan'

const labelClass = 'text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream'

/**
 * LoginForm — Client Component.
 *
 * Renders a mode toggle (Password / Magic Link) and the corresponding form.
 * All mutations go through Server Actions — this component never calls Supabase directly.
 */
export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('password')

  // --- Password form state ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isPasswordPending, startPasswordTransition] = useTransition()

  // --- Magic link form state ---
  const [magicEmail, setMagicEmail] = useState('')
  const [magicFeedback, setMagicFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isMagicPending, startMagicTransition] = useTransition()

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    startPasswordTransition(async () => {
      const result = await signInWithPasswordAction({ email, password })
      // result is only defined when the action returns { error: string }.
      // On success, the action calls redirect() which never returns a value.
      if (result && 'error' in result) {
        setPasswordError(result.error)
      }
    })
  }

  function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMagicFeedback(null)
    startMagicTransition(async () => {
      const result = await sendMagicLinkAction({ email: magicEmail })
      if ('success' in result) {
        setMagicFeedback({
          type: 'success',
          message: 'Check your email — a sign-in link has been sent.',
        })
      } else {
        setMagicFeedback({ type: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 text-sm font-semibold font-sans py-2 rounded-xl border transition-colors duration-200 ${
            mode === 'password'
              ? 'bg-brand-tan text-brand-espresso border-brand-tan'
              : 'bg-transparent text-brand-brown border-brand-brown'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic-link')}
          className={`flex-1 text-sm font-semibold font-sans py-2 rounded-xl border transition-colors duration-200 ${
            mode === 'magic-link'
              ? 'bg-brand-tan text-brand-espresso border-brand-tan'
              : 'bg-transparent text-brand-brown border-brand-brown'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Email + Password form */}
      {mode === 'password' && (
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
                setEmail(e.target.value)
                setPasswordError(null)
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
                setPassword(e.target.value)
                setPasswordError(null)
              }}
              required
              className={inputClass}
            />
          </div>

          {passwordError && (
            <p className="text-sm font-sans text-brand-espresso dark:text-brand-cream">
              {passwordError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPasswordPending}
          >
            {isPasswordPending ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      )}

      {/* Magic Link form */}
      {mode === 'magic-link' && (
        <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="magic-email" className={labelClass}>
              Email
            </label>
            <input
              id="magic-email"
              type="email"
              value={magicEmail}
              onChange={(e) => {
                setMagicEmail(e.target.value)
                setMagicFeedback(null)
              }}
              required
              className={inputClass}
            />
          </div>

          {magicFeedback && (
            <p
              className={`text-sm font-sans ${
                magicFeedback.type === 'success'
                  ? 'text-brand-brown'
                  : 'text-brand-espresso dark:text-brand-cream'
              }`}
            >
              {magicFeedback.message}
            </p>
          )}

          <Button
            type="submit"
            variant="ghost"
            size="md"
            disabled={isMagicPending}
          >
            {isMagicPending ? 'Sending…' : 'Send Magic Link'}
          </Button>
        </form>
      )}
    </div>
  )
}
