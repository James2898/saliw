'use client'

import { useState, useEffect, useRef } from 'react'
import { Music, Loader2 } from 'lucide-react'

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
                type="button"
                onClick={sync.toggleLive}
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
                type="button"
                onClick={sync.toggleFollow}
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
  )
}
