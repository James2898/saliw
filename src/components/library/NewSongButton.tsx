'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'

interface NewSongButtonProps {
  isMusicDirector: boolean
}

/**
 * NewSongButton — Entry point for creating a new song.
 *
 * Renders only when isMusicDirector is true (DOM-absent for non-directors).
 *
 * Desktop: inline button in the library page header.
 * Mobile: Floating Action Button (FAB) fixed bottom-right, z-[80].
 *
 * Loading state: Loader2 (animate-spin) replaces the Plus icon on click
 * while router.push fires. isLoading resets on unmount.
 */
export default function NewSongButton({ isMusicDirector }: NewSongButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Reset loading state on unmount (navigation may unmount this component).
  useEffect(() => {
    return () => {
      setIsLoading(false)
    }
  }, [])

  // Not a music director — physically absent from DOM.
  if (!isMusicDirector) return null

  function handleClick() {
    setIsLoading(true)
    router.push('/library/new')
  }

  const Icon = isLoading ? Loader2 : Plus

  const sharedFocusRing = [
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-brand-espresso',
    'focus-visible:ring-offset-2',
  ].join(' ')

  return (
    <>
      {/* ── Desktop button — hidden on mobile ─────────────────────────────── */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Add new song"
        className={[
          'hidden md:inline-flex items-center gap-2',
          'px-4 py-2 rounded-xl',
          'bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso',
          'text-sm font-semibold font-sans',
          'border border-brand-tan dark:border-brand-tan',
          'hover:scale-105 hover:shadow-md',
          'transition-transform duration-200',
          sharedFocusRing,
        ].join(' ')}
      >
        <Icon
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={isLoading ? 'animate-spin' : ''}
        />
        New Song
      </button>

      {/* ── Mobile FAB — hidden on desktop, fixed bottom-right ────────────── */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Add new song"
        className={[
          'md:hidden',
          'fixed bottom-6 right-6 z-[80]',
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso',
          'shadow-lg',
          'hover:scale-105 hover:shadow-xl',
          'transition-transform duration-200',
          sharedFocusRing,
        ].join(' ')}
      >
        <Icon
          size={24}
          strokeWidth={2}
          aria-hidden="true"
          className={isLoading ? 'animate-spin' : ''}
        />
      </button>
    </>
  )
}
