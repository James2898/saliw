'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, Loader2 } from 'lucide-react'
import Button from '@/components/client/button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavigatorSong {
  junctionId: string
  title: string
}

/**
 * Sync object passed from the parent SetlistViewerClient via useSetlistSync.
 * Only stable refs should be passed here to avoid destabilising the IntersectionObserver (RF-3).
 */
interface ServiceNavigatorSync {
  isLive: boolean
  isLiveConnecting: boolean
  liveError: string | null
  toggleLive: () => void
  isFollowing: boolean
  isStateChecking: boolean
  followError: string | null
  followSyncStatus: 'synced' | 'lost' | 'idle'
  toggleFollow: () => void
  onActiveSongChange: (junctionId: string) => void
}

interface ServiceNavigatorProps {
  songs: NavigatorSong[]
  isLeader: boolean
  setlistId: string
  isAuthenticated: boolean
  sync: ServiceNavigatorSync
}

// ── Module-level stable class strings ─────────────────────────────────────────

const toggleActiveClass =
  'bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan'

const toggleInactiveClass =
  'text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1'

// ── Dialog CSS constants (matching logout-modal.tsx Artisan pattern) ──────────

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
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby pointing to titleId
 * - Focus moves to Cancel button on open; returns to trigger on close (managed by parent).
 * - Escape key dismisses without confirming.
 * - Tab / Shift+Tab cycle only between the two action buttons (focus trap).
 * - Backdrop click triggers cancel.
 *
 * Matches the pattern in logout-modal.tsx exactly.
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

      // Focus trap — cycle between Cancel and Confirm buttons
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
        className="fixed inset-0 z-[80] bg-brand-espresso/40"
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
        {/* Title */}
        <h2 id={titleId} className={dialogTitleClass}>
          {title}
        </h2>

        {/* Body */}
        <p className={dialogBodyClass}>{body}</p>

        {/* Actions */}
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

/**
 * ServiceNavigator — Sticky top navbar for setlist song navigation.
 *
 * Always renders as a full-width sticky top bar on all screen sizes.
 * Song titles are displayed horizontally in a scrollable row.
 *
 * Uses IntersectionObserver to highlight the currently visible song section.
 * The observer is disconnected in the cleanup function to prevent memory leaks.
 *
 * Now also renders:
 * - "Go Live" control (Director only — isLeader === true)
 * - "Follow Leader" control (authenticated non-leader only)
 *
 * No server-side data fetching is added here (RF-6).
 *
 * RF-3: sync.onActiveSongChange is stored in a ref to prevent the
 * IntersectionObserver from reconnecting on every render.
 *
 * TASK-023: Both toggles are guarded by local confirmation dialogs.
 * toggleLive() and toggleFollow() are called only after the user confirms.
 * Dialog state: showGoLiveDialog, showFollowDialog.
 * useSetlistSync.ts is not modified.
 */
export default function ServiceNavigator({
  songs,
  isLeader,
  isAuthenticated,
  sync,
}: ServiceNavigatorProps) {
  const [activeSongId, setActiveSongId] = useState<string | null>(
    songs.length > 0 ? songs[0].junctionId : null
  )
  const ratiosRef = useRef<Map<string, number>>(new Map())

  // RF-3: store onActiveSongChange in a ref so the IntersectionObserver callback
  // always calls the latest version without reconnecting the observer on re-renders.
  const onActiveSongChangeRef = useRef(sync.onActiveSongChange)
  // RF-3: stable ref for isLive to avoid reconnecting the observer on every render
  const isLiveRef = useRef(sync.isLive)

  // Update refs inside effects only (never during render — per React ref rules)
  useEffect(() => {
    onActiveSongChangeRef.current = sync.onActiveSongChange
  })
  useEffect(() => {
    isLiveRef.current = sync.isLive
  })

  // ── TASK-023: Confirmation dialog state ───────────────────────────────────
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false)
  const [showFollowDialog, setShowFollowDialog] = useState(false)

  // Refs to restore focus to the trigger button after dialog closes
  const goLiveButtonRef = useRef<HTMLButtonElement>(null)
  const followButtonRef = useRef<HTMLButtonElement>(null)

  // ── TASK-023: Go Live toggle guard ────────────────────────────────────────
  const handleGoLiveClick = useCallback(() => {
    // If already connecting (disabled state), do nothing — button is disabled anyway
    if (sync.isLiveConnecting) return
    // If dialog is already open, ignore second click (criterion 30)
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
    // Restore focus to the toggle button
    goLiveButtonRef.current?.focus()
  }, [])

  // ── TASK-023: Follow Leader toggle guard ──────────────────────────────────
  const handleFollowClick = useCallback(() => {
    // If already checking state (disabled state), do nothing — button is disabled anyway
    if (sync.isStateChecking) return
    // If dialog is already open, ignore second click (criterion 30)
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
    // Restore focus to the toggle button
    followButtonRef.current?.focus()
  }, [])

  // ── Dialog content (direction-aware) ──────────────────────────────────────
  const goLiveDialogContent = sync.isLive ? goLiveOffDialog : goLiveOnDialog
  const followDialogContent = sync.isFollowing ? followOffDialog : followOnDialog

  useEffect(() => {
    if (songs.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Update the ratio map for each observed entry
        entries.forEach((entry) => {
          const sectionId = entry.target.id // e.g. "song-<junctionId>"
          const junctionId = sectionId.replace(/^song-/, '')
          ratiosRef.current.set(junctionId, entry.intersectionRatio)
        })

        // Find the junctionId with the highest intersection ratio.
        // On tie, prefer the one that appears earlier in the songs array (lower order_index).
        let winningId: string | null = null
        let winningRatio = -1

        for (const song of songs) {
          const ratio = ratiosRef.current.get(song.junctionId) ?? 0
          if (ratio > winningRatio) {
            winningRatio = ratio
            winningId = song.junctionId
          }
        }

        if (winningId !== null && winningRatio > 0) {
          setActiveSongId(winningId)

          // AC-7: broadcast SONG_CHANGE when Go Live is active
          // Read isLive from ref to avoid reconnecting the observer on every render (RF-3)
          if (isLiveRef.current) {
            onActiveSongChangeRef.current(winningId)
          }
        }
      },
      {
        // Track visibility with fine-grained thresholds for smooth highlighting
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    )

    // Observe all matching section elements
    const sections = document.querySelectorAll<HTMLElement>('section[id^="song-"]')
    sections.forEach((section) => observer.observe(section))

    // Cleanup: disconnect observer on unmount to prevent memory leaks
    return () => {
      observer.disconnect()
    }
  }, [songs])

  const handleScrollToSong = (junctionId: string) => {
    const element = document.getElementById(`song-${junctionId}`)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <div
        className={[
          'sticky top-16 z-40 w-full',
          'bg-brand-espresso',
          'border-b border-brand-tan/20',
        ].join(' ')}
        aria-label="Setlist song navigator"
      >
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          {/* Label icon */}
          <Music size={14} className="text-brand-tan shrink-0" aria-hidden="true" />

          {/* Horizontally scrollable song list */}
          {songs.length === 0 ? (
            <span className="text-xs text-brand-cream/50">No songs</span>
          ) : (
            <nav
              className="flex items-center gap-1 overflow-x-auto"
              aria-label="Song list"
            >
              {songs.map((song) => {
                const isActive = song.junctionId === activeSongId
                return (
                  <button
                    key={song.junctionId}
                    type="button"
                    onClick={() => handleScrollToSong(song.junctionId)}
                    className={[
                      'shrink-0 px-3 py-1.5 rounded-lg',
                      'text-xs font-medium whitespace-nowrap',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tan focus-visible:ring-offset-1 focus-visible:ring-offset-brand-espresso',
                      isActive
                        ? 'bg-brand-tan text-brand-espresso font-semibold'
                        : 'text-brand-cream hover:bg-brand-espresso/60',
                    ].join(' ')}
                    aria-current={isActive ? 'location' : undefined}
                  >
                    {song.title}
                  </button>
                )
              })}
            </nav>
          )}

          {/* ── Spacer ─────────────────────────────────────────────────────── */}
          <div className="ml-auto flex items-center gap-2 shrink-0">

            {/* ── Go Live button — Director only (AC-1) ──────────────────────── */}
            {isLeader && (
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
                      ? 'text-brand-cream/60 border-brand-cream/20 cursor-not-allowed'
                      : sync.isLive
                      ? 'bg-red-600 text-white border-red-600 animate-pulse'
                      : [toggleInactiveClass, 'text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10 dark:text-brand-cream dark:border-brand-cream/30'].join(' '),
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
                  <p role="alert" className="text-xs text-red-500">
                    {sync.liveError}
                  </p>
                )}
              </div>
            )}

            {/* ── Follow Leader button — all non-leader viewers (AC-19) ── */}
            {!isLeader && (
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
                      ? 'text-brand-cream/60 border-brand-cream/20 cursor-not-allowed'
                      : sync.isFollowing
                      ? [toggleActiveClass].join(' ')
                      : 'text-brand-cream border-brand-cream/30 hover:bg-brand-cream/10',
                  ].join(' ')}
                >
                  {sync.isStateChecking ? (
                    <>
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      Follow Leader
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
                  <p role="alert" className="text-xs text-red-500">
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
            )}
          </div>
        </div>
      </div>

      {/* ── TASK-023: Go Live Confirmation Dialog ───────────────────────────── */}
      {isLeader && (
        <ConfirmDialog
          isOpen={showGoLiveDialog}
          titleId={goLiveDialogContent.titleId}
          title={goLiveDialogContent.title}
          body={goLiveDialogContent.body}
          confirmLabel={goLiveDialogContent.confirmLabel}
          onConfirm={handleGoLiveConfirm}
          onCancel={handleGoLiveCancel}
        />
      )}

      {/* ── TASK-023: Follow Leader Confirmation Dialog ─────────────────────── */}
      {!isLeader && (
        <ConfirmDialog
          isOpen={showFollowDialog}
          titleId={followDialogContent.titleId}
          title={followDialogContent.title}
          body={followDialogContent.body}
          confirmLabel={followDialogContent.confirmLabel}
          onConfirm={handleFollowConfirm}
          onCancel={handleFollowCancel}
        />
      )}
    </>
  )
}
