'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import Button from '@/components/client/button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoLiveSyncProps {
  isLive: boolean
  isLiveConnecting: boolean
  liveError: string | null
  toggleLive: () => void
}

interface GoLiveButtonProps {
  sync: GoLiveSyncProps
  isLeader: boolean
}

// ── Dialog CSS constants (matching ServiceNavigator / logout-modal.tsx) ───────

const dialogPanelClass = [
  'fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'w-[min(90vw,24rem)]',
  'bg-[var(--brand-background)] border border-brand-brown/20 rounded-2xl',
  'p-6 flex flex-col gap-4 shadow-lg',
].join(' ')

const dialogTitleClass =
  'font-sans font-bold text-base text-brand-espresso dark:text-brand-cream'

const dialogBodyClass =
  'font-sans text-sm text-brand-brown dark:text-brand-tan'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1'

// ── ConfirmDialog sub-component ───────────────────────────────────────────────

interface ConfirmDialogProps {
  isOpen: boolean
  titleId: string
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ConfirmDialog — Artisan-styled generic confirmation dialog.
 * Matches the pattern in ServiceNavigator.tsx and logout-modal.tsx exactly.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby pointing to titleId
 * - Focus moves to Cancel button on open; returns to trigger on close.
 * - Escape key dismisses without confirming.
 * - Tab / Shift+Tab cycle only between the two action buttons (focus trap).
 * - Backdrop click triggers cancel.
 */
function ConfirmDialog({
  isOpen,
  titleId,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Move focus to Cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus()
    }
  }, [isOpen])

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key === 'Tab') {
        const focusables = [cancelRef.current, confirmRef.current].filter(
          Boolean
        ) as HTMLElement[]
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-brand-espresso/40 dark:bg-brand-espresso/60"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={dialogPanelClass}
      >
        <h2 id={titleId} className={dialogTitleClass}>
          {title}
        </h2>
        <p className={dialogBodyClass}>{body}</p>
        <div className="flex items-center justify-end gap-3 mt-1">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Dialog content map ────────────────────────────────────────────────────────

const goLiveOnDialog = {
  titleId: 'go-live-dialog-title',
  title: 'Go Live?',
  body: 'All musicians will follow your performance key in real-time.',
  confirmLabel: 'Go Live',
}

const goLiveOffDialog = {
  titleId: 'go-live-dialog-title',
  title: 'End Live Session?',
  body: 'Musicians following you will lose the live feed and revert to their last known keys.',
  confirmLabel: 'End Session',
}

// ── GoLiveButton ──────────────────────────────────────────────────────────────

/**
 * GoLiveButton — Renders the Go Live toggle button for music directors.
 *
 * Styled for the light cream header background (BUG-004: explicit dark: variants
 * on every Tailwind utility).
 *
 * Only renders when isLeader === true.
 *
 * BUG-002: useCallback deps reference the whole `sync` object, not property paths.
 */
export default function GoLiveButton({ sync, isLeader }: GoLiveButtonProps) {
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false)
  const goLiveButtonRef = useRef<HTMLButtonElement>(null)

  const handleGoLiveClick = useCallback(() => {
    if (sync.isLiveConnecting) return
    if (showGoLiveDialog) return
    setShowGoLiveDialog(true)
  }, [sync, showGoLiveDialog])

  const handleGoLiveConfirm = useCallback(() => {
    setShowGoLiveDialog(false)
    sync.toggleLive()
    goLiveButtonRef.current?.focus()
  }, [sync])

  const handleGoLiveCancel = useCallback(() => {
    setShowGoLiveDialog(false)
    goLiveButtonRef.current?.focus()
  }, [])

  if (!isLeader) return null

  const dialogContent = sync.isLive ? goLiveOffDialog : goLiveOnDialog

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          ref={goLiveButtonRef}
          type="button"
          onClick={handleGoLiveClick}
          disabled={sync.isLiveConnecting}
          aria-pressed={sync.isLive ? 'true' : 'false'}
          aria-label={
            sync.isLive
              ? 'Stop live session'
              : sync.isLiveConnecting
              ? 'Starting live session…'
              : 'Go Live'
          }
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            'text-xs font-semibold',
            'border',
            'transition-colors duration-200',
            focusRing,
            sync.isLiveConnecting
              ? 'text-brand-espresso/40 dark:text-brand-cream/40 border-brand-espresso/20 dark:border-brand-cream/20 cursor-not-allowed'
              : sync.isLive
              ? 'bg-brand-espresso text-brand-cream dark:bg-brand-cream dark:text-brand-espresso border-transparent animate-pulse'
              : 'bg-brand-espresso/10 text-brand-espresso border-brand-espresso/30 hover:bg-brand-espresso/20 dark:bg-brand-cream/10 dark:text-brand-cream dark:border-brand-cream/30 dark:hover:bg-brand-cream/20',
          ].join(' ')}
        >
          {sync.isLiveConnecting ? (
            <>
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Starting…
            </>
          ) : sync.isLive ? (
            'LIVE'
          ) : (
            'Go Live'
          )}
        </button>

        {/* AC-5: inline error message on connection failure */}
        {sync.liveError && (
          <p role="alert" className="text-xs text-red-500 dark:text-red-400">
            {sync.liveError}
          </p>
        )}
      </div>

      {/* Go Live Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showGoLiveDialog}
        titleId={dialogContent.titleId}
        title={dialogContent.title}
        body={dialogContent.body}
        confirmLabel={dialogContent.confirmLabel}
        onConfirm={handleGoLiveConfirm}
        onCancel={handleGoLiveCancel}
      />
    </>
  )
}
