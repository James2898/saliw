'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import ServiceNavigator from '@/components/client/ServiceNavigator'
import SetlistSongSection from '@/components/client/SetlistSongSection'
import GoLiveButton from '@/components/client/GoLiveButton'
import FollowLeaderButton from '@/components/client/FollowLeaderButton'
import { useSetlistSync } from '@/hooks/useSetlistSync'
import type { ProcessedLine } from '@/utils/musicLogic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSong {
  junctionId: string
  setlistId: string
  title: string
  artist: string
  originalKey: string
  processedLines: ProcessedLine[]
  performanceKey: string
}

interface NavigatorSong {
  junctionId: string
  title: string
}

interface SetlistViewerClientProps {
  songs: ClientSong[]
  navigatorSongs: NavigatorSong[]
  setlistId: string
  isLeader: boolean
  isAuthenticated: boolean
  setlistName: string
  formattedDate: string | null
}

/**
 * SetlistViewerClient — Client wrapper that instantiates useSetlistSync and
 * wires all realtime props down to ServiceNavigator and SetlistSongSection.
 *
 * This wrapper exists so the Server Component (page.tsx) can remain async
 * while all realtime state lives in a Client Component boundary.
 *
 * RF-3: useSetlistSync is instantiated here (not inside ServiceNavigator) so
 * state changes don't destabilise the IntersectionObserver.
 * RF-6: setlistId and isLeader are passed as props from the Server Component.
 */
export default function SetlistViewerClient({
  songs,
  navigatorSongs,
  setlistId,
  isLeader,
  isAuthenticated,
  setlistName,
  formattedDate,
}: SetlistViewerClientProps) {
  // Prepare the songs array expected by useSetlistSync.
  // Wrapped in useMemo so syncSongs keeps a stable reference between renders,
  // preventing validJunctionIds inside useSetlistSync from recomputing unnecessarily.
  const syncSongs = useMemo(
    () => songs.map((s) => ({ junctionId: s.junctionId, performanceKey: s.performanceKey })),
    [songs],
  )

  const sync = useSetlistSync({
    setlistId,
    isLeader,
    songs: syncSongs,
  })

  const [globalChordsHidden, setGlobalChordsHidden] = useState(false)
  const toggleGlobalChords = useCallback(() => setGlobalChordsHidden((prev) => !prev), [])

  return (
    <>
      {/* ── Setlist header (name + date + Go Live/Follow Leader + Hide Chords) ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-1">
          {setlistName}
        </h1>
        <div className="flex items-center gap-3">
          {formattedDate && (
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
              {formattedDate}
            </p>
          )}
          {isLeader && (
            <Link
              href={`/setlists/${setlistId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-brown/30 dark:border-brand-tan/30 text-brand-brown dark:text-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2"
            >
              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
              Edit Setlist
            </Link>
          )}
          <GoLiveButton
            sync={{
              isLive: sync.isLive,
              isLiveConnecting: sync.isLiveConnecting,
              liveError: sync.liveError,
              toggleLive: sync.toggleLive,
            }}
            isLeader={isLeader}
          />
          <FollowLeaderButton
            sync={{
              isFollowing: sync.isFollowing,
              isStateChecking: sync.isStateChecking,
              followError: sync.followError,
              followSyncStatus: sync.followSyncStatus,
              toggleFollow: sync.toggleFollow,
            }}
            isLeader={isLeader}
          />
          <button
            type="button"
            onClick={toggleGlobalChords}
            aria-pressed={globalChordsHidden}
            aria-label={globalChordsHidden ? 'Show chords for all songs' : 'Hide chords for all songs'}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-semibold',
              'border transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2',
              globalChordsHidden
                ? 'bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan'
                : 'text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10',
            ].join(' ')}
          >
            {globalChordsHidden ? 'Show Chords' : 'Hide Chords'}
          </button>
        </div>
      </div>

      {/* ── Service Navigator ──────────────────────────────────────────────── */}
      <ServiceNavigator
        songs={navigatorSongs}
        isLeader={isLeader}
        setlistId={setlistId}
        isAuthenticated={isAuthenticated}
        sync={{
          isLive: sync.isLive,
          onActiveSongChange: sync.onActiveSongChange,
        }}
      />

      {/* ── Song sections ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-10">
        {songs.map((song) => {
          const overrideKey = sync.overrideKeys.get(song.junctionId)
          const liveSyncState = sync.songSyncStates.get(song.junctionId)

          return (
            <SetlistSongSection
              key={song.junctionId}
              junctionId={song.junctionId}
              setlistId={song.setlistId}
              title={song.title}
              artist={song.artist}
              originalKey={song.originalKey}
              processedLines={song.processedLines}
              performanceKey={song.performanceKey}
              isLeader={isLeader}
              overrideKey={overrideKey}
              onKeyChangeLive={isLeader && sync.isLive ? sync.notifyKeyChange : undefined}
              liveSyncState={liveSyncState}
              externalChordsHidden={globalChordsHidden}
            />
          )
        })}
      </div>
    </>
  )
}
