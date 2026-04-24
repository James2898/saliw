'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

interface NewSetlistButtonProps {
  isMusicDirector: boolean
}

/**
 * NewSetlistButton — Entry point for creating a new setlist.
 *
 * Renders only when isMusicDirector is true (DOM-absent for non-directors).
 *
 * Desktop: inline link styled as a button in the setlists page header.
 * Mobile: Floating Action Button (FAB) fixed bottom-right, z-[80].
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

  return (
    <>
      {/* ── Desktop button — hidden on mobile ─────────────────────────────── */}
      <Link
        href="/setlists/new"
        aria-label="Create new setlist"
        className={[
          'hidden md:inline-flex items-center gap-2',
          'px-4 py-2 rounded-xl',
          'bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso',
          'text-sm font-semibold font-sans',
          'border border-brand-tan dark:border-brand-tan',
          'hover:bg-brand-brown hover:text-brand-cream hover:border-brand-brown',
          'transition-colors duration-200',
          sharedFocusRing,
        ].join(' ')}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        New Setlist
      </Link>

      {/* ── Mobile FAB — hidden on desktop, fixed bottom-right ────────────── */}
      <Link
        href="/setlists/new"
        aria-label="Create new setlist"
        className={[
          'md:hidden',
          'fixed bottom-6 right-6 z-[80]',
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso',
          'shadow-lg',
          'hover:bg-brand-brown hover:text-brand-cream',
          'transition-colors duration-200',
          sharedFocusRing,
        ].join(' ')}
      >
        <Plus size={24} strokeWidth={2} aria-hidden="true" />
      </Link>
    </>
  )
}
