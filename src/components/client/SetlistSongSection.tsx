'use client'

import { memo, useState, useCallback, useTransition } from 'react'
import { RefreshCw, Check, Loader2 } from 'lucide-react'
import type { ProcessedLine } from '@/utils/musicLogic'
import { updatePerformanceDetails } from '@/app/actions/setlistActions'
import ChordSheetClient from '@/components/SongViewer/ChordSheetClient'
import type { SongSyncState } from '@/hooks/useSetlistSync'

interface SetlistSongSectionProps {
  junctionId: string
  setlistId: string
  title: string
  artist: string
  processedLines: ProcessedLine[]
  originalKey: string
  performanceKey: string
  isLeader: boolean
  /** NEW — Key override from Follow Leader mode. Passed to ChordSheetClient as externalKey. */
  overrideKey?: string
  /** NEW — Callback for every key change for debounced Go Live persist. */
  onKeyChangeLive?: (junctionId: string, key: string) => void
  /** NEW — Per-song live sync status from useSetlistSync (D-4/D-5/D-6). */
  liveSyncState?: SongSyncState
}

// Wrap ChordSheetClient in React.memo to prevent re-renders triggered
// by IntersectionObserver state changes in the navigator (AC-11).
const MemoChordSheetClient = memo(ChordSheetClient)

/**
 * SetlistSongSection — Per-song wrapper with transpose state access and Sync button.
 *
 * Renders a named section element used as an IntersectionObserver target.
 * The Sync button is only shown to the authenticated setlist leader.
 *
 * No Supabase calls are made from this component — all DB interactions
 * go through the `updatePerformanceDetails` Server Action.
 */
function SetlistSongSection({
  junctionId,
  setlistId,
  title,
  artist,
  processedLines,
  originalKey,
  performanceKey,
  isLeader,
  overrideKey,
  onKeyChangeLive,
  liveSyncState,
}: SetlistSongSectionProps) {
  // Track the current display key as reported by ChordSheetClient via onKeyChange
  const [currentKey, setCurrentKey] = useState<string>(performanceKey)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleKeyChange = useCallback((key: string) => {
    setCurrentKey(key)
  }, [])

  const handleKeyChangeLive = useCallback(
    (key: string) => {
      onKeyChangeLive?.(junctionId, key)
    },
    [onKeyChangeLive, junctionId],
  )

  const handleSync = () => {
    setSyncError(null)
    setSyncSuccess(false)

    startTransition(async () => {
      const { error } = await updatePerformanceDetails({
        id: junctionId,
        setlist_id: setlistId,
        performance_key: currentKey,
      })

      if (error) {
        setSyncError(error)
      } else {
        setSyncSuccess(true)
        // Revert sync icon after 2 seconds
        setTimeout(() => {
          setSyncSuccess(false)
        }, 2000)
      }
    })
  }

  return (
    <section
      id={`song-${junctionId}`}
      className="scroll-mt-16 lg:scroll-mt-0"
      aria-label={title}
    >
      {/* ── Song header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-0.5">
            {title}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
            {artist}
          </p>
        </div>

        {/* ── Sync button — leader only (AC-12) ──────────────────────────────── */}
        {isLeader && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* ── Per-song Go Live sync status (D-4 / D-5 / D-6) ───────────── */}
            {liveSyncState && liveSyncState.status !== 'idle' && (
              <div className="inline-flex items-center gap-1 text-xs" aria-live="polite">
                {liveSyncState.status === 'saving' && (
                  <>
                    <Loader2 size={12} className="animate-spin text-brand-brown dark:text-brand-tan" aria-hidden="true" />
                    <span className="text-brand-brown dark:text-brand-tan">Saving…</span>
                  </>
                )}
                {liveSyncState.status === 'saved' && (
                  <>
                    <Check size={12} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                    <span className="text-green-600 dark:text-green-400">Synced</span>
                  </>
                )}
                {liveSyncState.status === 'error' && (
                  <span role="alert" className="text-xs text-red-500 max-w-[200px] text-right">
                    {liveSyncState.errorMessage}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSync}
              disabled={isPending}
              aria-label={syncSuccess ? 'Key synced' : 'Sync current key to setlist'}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-semibold',
                'border',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1',
                isPending
                  ? 'text-brand-brown/50 dark:text-brand-tan/50 border-brand-brown/20 dark:border-brand-tan/20 cursor-not-allowed'
                  : syncSuccess
                  ? 'text-green-700 dark:text-green-400 border-green-500/30 bg-green-50 dark:bg-green-900/20'
                  : 'text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
              ].join(' ')}
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  Syncing…
                </>
              ) : syncSuccess ? (
                <>
                  <Check size={13} aria-hidden="true" />
                  Synced
                </>
              ) : (
                <>
                  <RefreshCw size={13} aria-hidden="true" />
                  Sync to Setlist
                </>
              )}
            </button>

            {/* ── Inline error state (AC-15) ────────────────────────────────── */}
            {syncError && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-400 max-w-[200px] text-right"
              >
                {syncError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Chord sheet — Client island ─────────────────────────────────────── */}
      {/*
        MemoChordSheetClient wraps ChordSheetClient in React.memo so that
        IntersectionObserver state changes in the navigator do not cause
        re-renders of the chord sheet (AC-11).

        originalKey is the song's stored key so transposition math stays correct.
        initialKey is the setlist's performanceKey so the sheet opens at that key on load.

        onKeyChange lifts the current displayKey back to this component
        so the Sync button can capture it without breaking ChordSheetClient's
        internal encapsulation of useTranspose.
      */}
      <MemoChordSheetClient
        processedLines={processedLines}
        originalKey={originalKey}
        initialKey={performanceKey}
        onKeyChange={isLeader ? handleKeyChange : undefined}
        externalKey={overrideKey}
        onKeyChangeLive={onKeyChangeLive ? handleKeyChangeLive : undefined}
      />
    </section>
  )
}

export default SetlistSongSection
