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
 * ServiceNavigator — Sticky top navbar for setlist song navigation.
 *
 * Always renders as a full-width sticky top bar on all screen sizes.
 * Song titles are displayed horizontally in a scrollable row.
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
        'sticky top-0 z-50 w-full',
        'bg-brand-espresso',
        'border-b border-brand-tan/20',
      ].join(' ')}
      aria-label="Setlist song navigator"
    >
      <div className="flex items-center gap-2 px-4 py-2">
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
      </div>
    </div>
  )
}
