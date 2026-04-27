'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import Button from '@/components/client/button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FollowLeaderSyncProps {
  isFollowing: boolean
  isStateChecking: boolean
  followError: string | null
  followSyncStatus: 'synced' | 'lost' | 'idle'
  toggleFollow: () => void
}

interface FollowLeaderButtonProps {
  sync: FollowLeaderSyncProps
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
 * Matches the pattern in ServiceNavigator.tsx / GoLiveButton.tsx / logout-modal.tsx exactly.
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

const followOnDialog = {
  titleId: 'follow-dialog-title',
  title: 'Follow the Leader?',
  body: "Your keys will sync to the director's live session. Your current keys will be saved and restored if you stop following.",
  confirmLabel: 'Follow',
}

const followOffDialog = {
  titleId: 'follow-dialog-title',
  title: 'Stop Following?',
  body: "You'll unsubscribe from the live feed. Your keys will revert to the snapshot taken when you started following.",
  confirmLabel: 'Stop Following',
}

// ── FollowLeaderButton ────────────────────────────────────────────────────────

/**
 * FollowLeaderButton — Renders the Follow Leader toggle button for non-leader viewers.
 *
 * Styled for the light cream header background (BUG-004/005: explicit dark: variants
 * on every Tailwind utility). Mirrors GoLiveButton's palette for visual consistency.
 *
 * Only renders when isLeader === false (inverse gate — viewers only).
 *
 * BUG-002: useCallback deps reference the whole `sync` object, not property paths.
 */
export default function FollowLeaderButton({ sync, isLeader }: FollowLeaderButtonProps) {
  const [showFollowDialog, setShowFollowDialog] = useState(false)
  const followButtonRef = useRef<HTMLButtonElement>(null)

  const handleFollowClick = useCallback(() => {
    if (sync.isStateChecking) return
    if (showFollowDialog) return
    setShowFollowDialog(true)
  }, [sync, showFollowDialog])

  const handleFollowConfirm = useCallback(() => {
    setShowFollowDialog(false)
    sync.toggleFollow()
    followButtonRef.current?.focus()
  }, [sync])

  const handleFollowCancel = useCallback(() => {
    setShowFollowDialog(false)
    followButtonRef.current?.focus()
  }, [])

  if (isLeader) return null

  const dialogContent = sync.isFollowing ? followOffDialog : followOnDialog

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          ref={followButtonRef}
          type="button"
          onClick={handleFollowClick}
          disabled={sync.isStateChecking}
          aria-pressed={sync.isFollowing ? 'true' : 'false'}
          aria-label={
            sync.isFollowing
              ? 'Stop following leader'
              : sync.isStateChecking
              ? 'Syncing with leader…'
              : 'Follow Leader'
          }
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            'text-xs font-semibold',
            'border',
            'transition-colors duration-200',
            focusRing,
            sync.isStateChecking
              ? 'text-brand-brown/60 dark:text-brand-tan/60 border-brand-brown/20 dark:border-brand-tan/20 cursor-not-allowed'
              : sync.isFollowing
              ? 'bg-red-600 text-white border-red-600 dark:bg-red-600 dark:text-white dark:border-red-600 animate-pulse'
              : 'text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
          ].join(' ')}
        >
          {sync.isStateChecking ? (
            <>
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Syncing…
            </>
          ) : (
            <>
              {sync.isFollowing ? 'Following' : 'Follow Leader'}
              {/* AC-24: green synced dot when active */}
              {sync.isFollowing && sync.followSyncStatus === 'synced' && (
                <span
                  className="w-2 h-2 rounded-full bg-green-500 shrink-0"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </button>

        {/* AC-25 / F-6: State Check failure hint */}
        {sync.followError && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {sync.followError}
          </p>
        )}

        {/* F-7: connection lost indicator */}
        {sync.isFollowing && sync.followSyncStatus === 'lost' && (
          <p className="text-xs text-brand-brown dark:text-brand-tan">
            Lost connection.
          </p>
        )}
      </div>

      {/* Follow Leader Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showFollowDialog}
        titleId={dialogContent.titleId}
        title={dialogContent.title}
        body={dialogContent.body}
        confirmLabel={dialogContent.confirmLabel}
        onConfirm={handleFollowConfirm}
        onCancel={handleFollowCancel}
      />
    </>
  )
}
