'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateProfileAction } from '@/app/actions/profileActions'
import Button from '@/components/client/button'
import type { Profile } from '@/types/Profile'

interface EditProfileFormProps {
  profile: Profile
}

export default function EditProfileForm({ profile }: EditProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFullName(e.target.value)
    setFeedback(null)
    setFeedbackType(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfileAction({ full_name: fullName })
      if ('success' in result) {
        setFeedback('Profile updated.')
        setFeedbackType('success')
      } else {
        setFeedback(result.error)
        setFeedbackType('error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">

      {/* Email — read-only display, never submitted */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream">
          Email
        </label>
        <input
          type="email"
          value={profile.email}
          readOnly
          className="font-sans text-brand-brown dark:text-brand-tan bg-transparent border border-brand-brown/40 rounded-xl px-3 py-2 cursor-not-allowed opacity-70"
        />
      </div>

      {/* Full Name — editable */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="full_name"
          className="text-sm font-semibold font-sans text-brand-espresso dark:text-brand-cream"
        >
          Full Name
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={handleChange}
          className="font-sans text-brand-espresso dark:text-brand-cream bg-transparent border border-brand-brown rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
        />
      </div>

      {/* Inline feedback */}
      {feedback && feedbackType === 'success' && (
        <p
          aria-live="polite"
          className="text-sm font-sans text-brand-brown dark:text-brand-tan"
        >
          {feedback}
        </p>
      )}
      {feedback && feedbackType === 'error' && (
        <p
          role="alert"
          className="text-sm font-sans text-red-700 dark:text-red-400"
        >
          {feedback}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={isPending}
        aria-label={isPending ? 'Saving changes' : 'Save changes'}
      >
        {isPending ? (
          <>
            <Loader2
              size={16}
              className="animate-spin mr-2"
              aria-hidden="true"
            />
            Saving&hellip;
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  )
}
