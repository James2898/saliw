'use client'

import { useState, useEffect, useRef } from 'react'
import { Music } from 'lucide-react'

interface NavigatorSong {
  junctionId: string
  title: string
}

interface ServiceNavigatorProps {
  songs: NavigatorSong[]
}

/**
 * ServiceNavigator — Sticky setlist song navigator.
 *
 * On desktop (lg+): fixed left sidebar showing all song titles.
 * On mobile (< lg): sticky top bar.
 *
 * Uses IntersectionObserver to highlight the currently visible song section.
 * The observer is disconnected in the cleanup function to prevent memory leaks.
 *
 * No Supabase calls are made from this component.
 */
export default function ServiceNavigator({ songs }: ServiceNavigatorProps) {
  const [activeSongId, setActiveSongId] = useState<string | null>(
    songs.length > 0 ? songs[0].junctionId : null
  )
  const ratiosRef = useRef<Map<string, number>>(new Map())

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

    // Cleanup: disconnect observer on unmount to prevent memory leaks (AC-9)
    return () => {
      observer.disconnect()
    }
  }, [songs])

  const handleScrollToSong = (junctionId: string) => {
    const element = document.getElementById(`song-${junctionId}`)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Shared nav item renderer ─────────────────────────────────────────────
  const renderNavItems = () =>
    songs.map((song) => {
      const isActive = song.junctionId === activeSongId
      return (
        <button
          key={song.junctionId}
          type="button"
          onClick={() => handleScrollToSong(song.junctionId)}
          className={[
            'w-full text-left px-3 py-2 rounded-lg',
            'text-sm font-medium',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-tan focus-visible:ring-offset-1 focus-visible:ring-offset-brand-espresso',
            'truncate',
            isActive
              ? 'bg-brand-tan text-brand-espresso font-semibold'
              : 'text-brand-cream hover:bg-brand-espresso/60',
          ].join(' ')}
          aria-current={isActive ? 'location' : undefined}
          title={song.title}
        >
          {song.title}
        </button>
      )
    })

  return (
    <>
      {/* ── Desktop: fixed left sidebar (lg+) ──────────────────────────────── */}
      <aside
        className={[
          'hidden lg:flex lg:flex-col',
          'fixed inset-y-0 left-0 w-64 z-40',
          'bg-brand-espresso',
          'border-r border-brand-tan/20',
        ].join(' ')}
        aria-label="Setlist song navigator"
      >
        {/* Sidebar header */}
        <div className="px-4 py-5 border-b border-brand-tan/20">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-brand-tan shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-tan">
              Songs
            </span>
          </div>
        </div>

        {/* Song list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Song list">
          {songs.length === 0 ? (
            <p className="text-xs text-brand-cream/50 px-2 py-2">No songs</p>
          ) : (
            <div className="flex flex-col gap-1">
              {renderNavItems()}
            </div>
          )}
        </nav>
      </aside>

      {/* ── Mobile: sticky top bar (< lg) ──────────────────────────────────── */}
      <div
        className={[
          'lg:hidden',
          'sticky top-0 z-40',
          'bg-brand-espresso',
          'border-b border-brand-tan/20',
        ].join(' ')}
        aria-label="Setlist song navigator"
      >
        {songs.length === 0 ? null : (
          <nav
            className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
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
      </div>
    </>
  )
}
