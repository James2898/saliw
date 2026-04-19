'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRealtimeClient } from '@/services/supabase/client'
import { getSetlistWithSongs, updatePerformanceDetails } from '@/app/actions/setlistActions'
import { REALTIME_EVENTS } from '@/utils/realtimeEvents'
import type { SongChangePayload, KeyChangePayload } from '@/utils/realtimeEvents'

// ── Types ────────────────────────────────────────────────────────────────────

interface UseSetlistSyncParams {
  setlistId: string
  isLeader: boolean
  songs: Array<{ junctionId: string; performanceKey: string }>
}

export interface UseSetlistSyncReturn {
  // Director state
  isLive: boolean
  isLiveConnecting: boolean
  liveError: string | null
  toggleLive: () => void

  // Follower state
  isFollowing: boolean
  isStateChecking: boolean
  followError: string | null
  followSyncStatus: 'synced' | 'lost' | 'idle'
  toggleFollow: () => void

  // Shared / outgoing
  overrideKeys: Map<string, string>
  broadcastSongChange: (junctionId: string) => void
  broadcastKeyChange: (junctionId: string, performanceKey: string) => void
  onActiveSongChange: (junctionId: string) => void
}

// ── Per-song sync status types for SetlistSongSection ────────────────────────

export type SongSyncStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface SongSyncState {
  status: SongSyncStatus
  errorMessage: string | null
}

export type SongSyncMap = Map<string, SongSyncState>

// ── Extended return including per-song sync status ───────────────────────────

export interface UseSetlistSyncFullReturn extends UseSetlistSyncReturn {
  songSyncStates: SongSyncMap
  notifyKeyChange: (junctionId: string, key: string) => void
}

// ── Debounce interval (fixed at 400ms per spec) ───────────────────────────────

const DEBOUNCE_MS = 400

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useSetlistSync — Manages Go Live (Director) and Follow Leader (Follower)
 * realtime collaboration state for a setlist viewer.
 *
 * Instantiated once in the SetlistViewerClient wrapper component.
 * All realtime subscription state lives here; components receive only stable refs.
 *
 * RF-1: Per-junctionId monotonic sequence counter prevents stale KEY_CHANGE
 *        broadcasts when rapid taps cross debounce-window boundaries.
 * RF-5: latestKeyRef tracks the most recent key per junctionId so the debounced
 *        callback doesn't read from a stale closure.
 *
 * All async-seeded state (overrideKeys, stateCheckSnapshot) is initialised with
 * an empty Map() — never synchronously from the songs prop — to avoid the
 * setState-in-render Vercel build error documented in MEMORY.md (useFontSize bug).
 */
export function useSetlistSync({
  setlistId,
  songs,
}: UseSetlistSyncParams): UseSetlistSyncFullReturn {
  // Supabase browser client — module-level singleton via getRealtimeClient().
  // Survives React Strict Mode remounts (double-mount in dev) because the instance
  // is created once for the entire page lifetime, not per component mount.
  // This fixes the D-2 "Starting…" spinner getting stuck when Strict Mode's unmount
  // cleanup removed the channel before SUBSCRIBED could fire.
  const supabase = getRealtimeClient()

  // ── Channel ref ──────────────────────────────────────────────────────────
  // Single ref holds the Supabase channel instance — no re-creation on re-renders (AC-35)
  const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)

  // ── RF-1: Monotonic sequence counter per junctionId ──────────────────────
  // Ensures that if two debounce windows overlap (rapid tapping), a stale
  // Server Action response cannot broadcast a superseded key.
  const sequenceRef = useRef<Map<string, number>>(new Map())

  // ── RF-5: Latest key per junctionId — stale closure guard ────────────────
  // Written by notifyKeyChange on every displayKey change in SetlistSongSection.
  // Read by the debounced callback (never from the closure captured at schedule-time).
  const latestKeyRef = useRef<Map<string, string>>(new Map())

  // ── Debounce timer handles per junctionId ─────────────────────────────────
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── RF-3: Ref mirror of validJunctionIds — prevents stale closure in channel handlers ──
  const validJunctionIdsRef = useRef<Set<string>>(new Set())

  // ── Director state ────────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false)
  const [isLiveConnecting, setIsLiveConnecting] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  // ── Follower state ────────────────────────────────────────────────────────
  const [isFollowing, setIsFollowing] = useState(false)
  const [isStateChecking, setIsStateChecking] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)
  const [followSyncStatus, setFollowSyncStatus] = useState<'synced' | 'lost' | 'idle'>('idle')

  // State Check snapshot — revert target when Follow Leader is disabled.
  // Initialized empty (never from songs prop synchronously) per MEMORY.md guidance.
  const [stateCheckSnapshot, setStateCheckSnapshot] = useState<Map<string, string>>(new Map())

  // Override keys propagated to each SetlistSongSection / ChordSheetClient.
  // Initialized empty — populated only on incoming KEY_CHANGE broadcasts (AC-Amendment).
  const [overrideKeys, setOverrideKeys] = useState<Map<string, string>>(new Map())

  // ── Per-song live sync status (D-4 / D-5 / D-6) ──────────────────────────
  const [songSyncStates, setSongSyncStates] = useState<SongSyncMap>(new Map())

  // ── Build stable set of valid junctionIds for silent-skip guards ──────────
  // useMemo ensures this is only re-computed when the songs array reference changes.
  const validJunctionIds = useMemo(
    () => new Set(songs.map((s) => s.junctionId)),
    [songs],
  )

  // ── Helper: update per-song sync state ───────────────────────────────────
  const setSongSyncState = useCallback((junctionId: string, state: SongSyncState) => {
    setSongSyncStates((prev) => new Map(prev).set(junctionId, state))
  }, [])

  // ── Director: broadcast KEY_CHANGE (called after SA success) ─────────────

  const broadcastKeyChange = useCallback(
    (junctionId: string, performanceKey: string) => {
      if (!channelRef.current) return
      channelRef.current
        .send({
          type: 'broadcast',
          event: REALTIME_EVENTS.KEY_CHANGE,
          payload: { junctionId, performanceKey } satisfies KeyChangePayload,
        })
        .catch((err: unknown) => {
          console.error('[useSetlistSync] KEY_CHANGE broadcast failed', err)
        })
    },
    [],
  )

  // ── Director: broadcast SONG_CHANGE ──────────────────────────────────────

  const broadcastSongChange = useCallback(
    (junctionId: string) => {
      if (!channelRef.current) return
      channelRef.current
        .send({
          type: 'broadcast',
          event: REALTIME_EVENTS.SONG_CHANGE,
          payload: { junctionId } satisfies SongChangePayload,
        })
        .catch((err: unknown) => {
          console.error('[useSetlistSync] SONG_CHANGE broadcast failed', err)
        })
    },
    [],
  )

  // ── Director: Go Live toggle ──────────────────────────────────────────────

  const toggleLive = useCallback(() => {
    if (isLive) {
      // Deactivate — remove channel and return to D-1
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsLive(false)
      setLiveError(null)
    } else {
      // Activate — transition to D-2 (connecting)
      setLiveError(null)
      setIsLiveConnecting(true)

      const channel = supabase.channel(`setlist_sync:${setlistId}`, {
        config: { broadcast: { self: false } },
      })

      channelRef.current = channel

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLiveConnecting(false)
          setIsLive(true)
        } else if (status === 'CHANNEL_ERROR') {
          setIsLiveConnecting(false)
          setIsLive(false)
          setLiveError('Unable to start live session. Please try again.')
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
          }
        } else if (status === 'CLOSED') {
          setIsLive(false)
        }
      })
    }
  }, [isLive, setlistId])

  // ── Director: active song change → SONG_CHANGE broadcast ─────────────────

  const onActiveSongChange = useCallback(
    (junctionId: string) => {
      if (!isLive || !channelRef.current) return
      channelRef.current
        .send({
          type: 'broadcast',
          event: REALTIME_EVENTS.SONG_CHANGE,
          payload: { junctionId } satisfies SongChangePayload,
        })
        .catch((err: unknown) => {
          console.error('[useSetlistSync] SONG_CHANGE (active song) broadcast failed', err)
        })
    },
    [isLive],
  )

  // ── Director: notify key change — called by SetlistSongSection on every displayKey change ──

  const notifyKeyChange = useCallback(
    (junctionId: string, key: string) => {
      if (!isLive) return

      // RF-5: always write latest key to ref so the debounced callback reads it correctly
      latestKeyRef.current.set(junctionId, key)

      // D-4: transition to "Saving…" immediately
      setSongSyncState(junctionId, { status: 'saving', errorMessage: null })

      // Per-junctionId debounce — cancel any existing timer for this song (AC-12)
      const existingTimer = debounceTimersRef.current.get(junctionId)
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer)
      }

      // RF-1: increment the sequence counter for this junctionId
      const currentSeq = (sequenceRef.current.get(junctionId) ?? 0) + 1
      sequenceRef.current.set(junctionId, currentSeq)
      const capturedSeq = currentSeq

      const timer = setTimeout(async () => {
        debounceTimersRef.current.delete(junctionId)

        // RF-5: read key from ref, not from the closure captured at schedule-time (AC-14)
        const keyToSave = latestKeyRef.current.get(junctionId)
        if (keyToSave === undefined) return

        const { error } = await updatePerformanceDetails({
          id: junctionId,
          setlist_id: setlistId,
          performance_key: keyToSave,
        })

        // RF-1: only proceed if this sequence is still the latest for this song
        const latestSeq = sequenceRef.current.get(junctionId) ?? 0
        if (capturedSeq < latestSeq) {
          // A newer debounce window has already resolved — discard this stale response
          return
        }

        if (error) {
          // D-6: per-song error; broadcast is suppressed (AC-16)
          let userMessage = 'Unable to update performance details. Please try again.'
          if (error.includes('permission')) {
            userMessage = 'You do not have permission to modify this setlist.'
          } else if (error.includes('not found')) {
            userMessage = 'Setlist song entry not found.'
          }
          setSongSyncState(junctionId, { status: 'error', errorMessage: userMessage })
          return
        }

        // D-5: success — broadcast KEY_CHANGE then transition to synced state (AC-15)
        broadcastKeyChange(junctionId, keyToSave)

        setSongSyncState(junctionId, { status: 'saved', errorMessage: null })
        setTimeout(() => {
          setSongSyncState(junctionId, { status: 'idle', errorMessage: null })
        }, 2000)
      }, DEBOUNCE_MS)

      debounceTimersRef.current.set(junctionId, timer)
    },
    [isLive, setlistId, setSongSyncState, broadcastKeyChange],
  )

  // ── Follower: Follow Leader toggle ────────────────────────────────────────

  const toggleFollow = useCallback(() => {
    if (isFollowing) {
      // Disable Follow Leader — remove channel, revert keys to snapshot (AC-26)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsFollowing(false)
      setFollowSyncStatus('idle')
      setFollowError(null)

      // Revert each song's override key to the snapshot value (or empty if snapshot empty) (AC-26)
      setOverrideKeys(stateCheckSnapshot.size === 0 ? new Map() : new Map(stateCheckSnapshot))
    } else {
      // Enable Follow Leader — F-2: State Check
      setIsStateChecking(true)
      setFollowError(null)

      ;(async () => {
        try {
          const { data, error } = await getSetlistWithSongs({ setlist_id: setlistId })

          if (error) {
            setFollowError('Unable to sync current state.')
          } else if (data) {
            // Populate snapshot from fetched performance_key values (AC-22)
            const newSnapshot = new Map<string, string>()
            for (const row of data) {
              newSnapshot.set(row.id, row.performance_key)
            }
            setStateCheckSnapshot(newSnapshot)

            // Apply snapshot keys immediately as override keys
            setOverrideKeys(new Map(newSnapshot))
          }
          // data === null (empty setlist) treated as valid empty snapshot; no error shown (AC-22)
        } catch {
          setFollowError('Unable to sync current state.')
        }

        setIsStateChecking(false)

        // Subscribe to incoming broadcasts regardless of State Check outcome (AC-23)
        const channel = supabase.channel(`setlist_sync:${setlistId}`, {
          config: { broadcast: { self: false } },
        })

        channelRef.current = channel

        // Handle SONG_CHANGE — scroll to song element (AC-28)
        channel.on(
          'broadcast',
          { event: REALTIME_EVENTS.SONG_CHANGE },
          (payload: { payload: SongChangePayload }) => {
            const { junctionId } = payload.payload
            // Silent skip if junctionId not in rendered set (AC-31)
            if (!validJunctionIdsRef.current.has(junctionId)) return
            document
              .getElementById(`song-${junctionId}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          },
        )

        // Handle KEY_CHANGE — update overrideKeys map (AC-29)
        channel.on(
          'broadcast',
          { event: REALTIME_EVENTS.KEY_CHANGE },
          (payload: { payload: KeyChangePayload }) => {
            const { junctionId, performanceKey } = payload.payload
            // Silent skip if junctionId not in rendered set (AC-31)
            if (!validJunctionIdsRef.current.has(junctionId)) return
            setOverrideKeys((prev) => new Map(prev).set(junctionId, performanceKey))
          },
        )

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsFollowing(true)
            setFollowSyncStatus('synced')
          } else if (status === 'CLOSED') {
            setFollowSyncStatus('lost')
          } else if (status === 'CHANNEL_ERROR') {
            setFollowSyncStatus('lost')
          }
        })
      })()
    }
  }, [isFollowing, setlistId, stateCheckSnapshot])

  // ── Keep validJunctionIdsRef in sync with validJunctionIds (RF-3) ───────────
  useEffect(() => {
    validJunctionIdsRef.current = validJunctionIds
  }, [validJunctionIds])

  // ── Unmount cleanup — remove any active channel on component teardown (AC-9) ──
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  return {
    // Director
    isLive,
    isLiveConnecting,
    liveError,
    toggleLive,

    // Follower
    isFollowing,
    isStateChecking,
    followError,
    followSyncStatus,
    toggleFollow,

    // Shared
    overrideKeys,
    broadcastSongChange,
    broadcastKeyChange,
    onActiveSongChange,

    // Per-song live sync status
    songSyncStates,
    notifyKeyChange,
  }
}
