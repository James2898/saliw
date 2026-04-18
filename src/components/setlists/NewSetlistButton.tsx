'use client'

import { Plus } from 'lucide-react'

interface NewSetlistButtonProps {
  isMusicDirector: boolean
}

/**
 * NewSetlistButton — Entry point for creating a new setlist.
 *
 * Renders only when isMusicDirector is true (DOM-absent for non-directors).
 *
 * Desktop: inline button in the setlists page header.
 * Mobile: Floating Action Button (FAB) fixed bottom-right, z-[80].
 *
 * NOTE: The /setlists/new route does not yet exist. Both controls are rendered
 * as disabled with a tooltip hint: "Creating new setlists coming soon."
 * This prevents linking to a 404 until the creation form is built.
 */
export default function NewSetlistButton({ isMusicDirector }: NewSetlistButtonProps) {
  // Not a music director — physically absent from DOM.
  if (!isMusicDirector) return null

  const sharedFocusRing = [
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-brand-espresso',
    'focus-visible:ring-offset-2',
  ].join(' ')

  const hintText = 'Creating new setlists coming soon.'

  return (
    <>
      {/* ── Desktop button — hidden on mobile ─────────────────────────────── */}
      <button
        type="button"
        disabled
        aria-label="Add new setlist (coming soon)"
        title={hintText}
        className={[
          'hidden md:inline-flex items-center gap-2',
          'px-4 py-2 rounded-xl',
          'bg-brand-tan/40 text-brand-espresso/40',
          'text-sm font-semibold font-sans',
          'border border-brand-tan/40',
          'cursor-not-allowed',
          sharedFocusRing,
        ].join(' ')}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        New Setlist
      </button>

      {/* ── Mobile FAB — hidden on desktop, fixed bottom-right ────────────── */}
      <button
        type="button"
        disabled
        aria-label="Add new setlist (coming soon)"
        title={hintText}
        className={[
          'md:hidden',
          'fixed bottom-6 right-6 z-[80]',
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-brand-tan/40 text-brand-espresso/40',
          'shadow-lg',
          'cursor-not-allowed',
          sharedFocusRing,
        ].join(' ')}
      >
        <Plus size={24} strokeWidth={2} aria-hidden="true" />
      </button>

      {/* ── Hint text below desktop button region (visible to screen readers) */}
      <p className="hidden md:block text-xs text-brand-brown/60 mt-1 text-right" aria-live="polite">
        {hintText}
      </p>
    </>
  )
}
