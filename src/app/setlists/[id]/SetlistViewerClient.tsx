'use client'

import ServiceNavigator from '@/components/client/ServiceNavigator'
import SetlistSongSection from '@/components/client/SetlistSongSection'
import { useSetlistSync } from '@/hooks/useSetlistSync'
import type { ProcessedLine } from '@/utils/musicLogic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSong {
  junctionId: string
  setlistId: string
  title: string
  artist: string
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
}: SetlistViewerClientProps) {
  // Prepare the songs array expected by useSetlistSync
  const syncSongs = songs.map((s) => ({
    junctionId: s.junctionId,
    performanceKey: s.performanceKey,
  }))

  const sync = useSetlistSync({
    setlistId,
    isLeader,
    songs: syncSongs,
  })

  return (
    <>
      {/* ── Service Navigator ──────────────────────────────────────────────── */}
      <ServiceNavigator
        songs={navigatorSongs}
        isLeader={isLeader}
        setlistId={setlistId}
        isAuthenticated={isAuthenticated}
        sync={{
          isLive: sync.isLive,
          isLiveConnecting: sync.isLiveConnecting,
          liveError: sync.liveError,
          toggleLive: sync.toggleLive,
          isFollowing: sync.isFollowing,
          isStateChecking: sync.isStateChecking,
          followError: sync.followError,
          followSyncStatus: sync.followSyncStatus,
          toggleFollow: sync.toggleFollow,
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
              processedLines={song.processedLines}
              performanceKey={song.performanceKey}
              isLeader={isLeader}
              overrideKey={overrideKey}
              onKeyChangeLive={isLeader && sync.isLive ? sync.notifyKeyChange : undefined}
              liveSyncState={liveSyncState}
            />
          )
        })}
      </div>
    </>
  )
}
