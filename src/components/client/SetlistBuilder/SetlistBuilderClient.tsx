'use client'

import { useState, useTransition } from 'react'
import {
  addSongToSetlist,
  removeSongFromSetlist,
  updateSetlistSongOrder,
} from '@/app/actions/setlistActions'
import ErrorBanner from './ErrorBanner'
import SetlistPanel from './SetlistPanel'
import LibraryPanel from './LibraryPanel'

// ── Shared types (exported so page.tsx can import them) ────────────────────────

export interface SortableSong {
  junctionId: string       // setlist_songs.id — used as DnD id and for reorder updates
  songId: string
  title: string
  artist: string
  originalKey: string      // display only, never edited here
  orderIndex: number       // current local position
}

export interface SongLibraryItem {
  id: string
  title: string
  artist: string
  original_key: string
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SetlistBuilderClientProps {
  setlistId: string
  setlistName: string
  initialSongs: SortableSong[]
  allSongs: SongLibraryItem[]
  libraryError?: string | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SetlistBuilderClient({
  setlistId,
  setlistName,
  initialSongs,
  allSongs,
  libraryError,
}: SetlistBuilderClientProps) {
  // All lazy initialisers — never seeded inside useEffect (MEMORY.md warning)
  const [songs, setSongs] = useState<SortableSong[]>(() => initialSongs)
  const [lastPersistedOrder, setLastPersistedOrder] = useState<string[]>(
    () => initialSongs.map((s) => s.junctionId)
  )
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [query, setQuery] = useState('')

  const [, startTransition] = useTransition()

  // Derived values — never stored as separate state
  const isDirty = songs.map((s) => s.junctionId).join(',') !== lastPersistedOrder.join(',')
  const addedIds = new Set(songs.map((s) => s.songId))

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleAdd(song: SongLibraryItem) {
    startTransition(async () => {
      setAddingId(song.id)
      const { data, error: actionError } = await addSongToSetlist({
        setlist_id: setlistId,
        song_id: song.id,
      })
      if (actionError || !data) {
        setError(actionError ?? 'Failed to add song.')
      } else {
        const newSong: SortableSong = {
          junctionId: data.id,
          songId: data.song_id,
          title: song.title,
          artist: song.artist,
          originalKey: song.original_key,
          orderIndex: songs.length,
        }
        setSongs((prev) => [...prev, newSong])
        setLastPersistedOrder((prev) => [...prev, data.id])
      }
      setAddingId(null)
    })
  }

  function handleRemove(junctionId: string) {
    startTransition(async () => {
      setRemovingId(junctionId)
      const { error: actionError } = await removeSongFromSetlist({
        id: junctionId,
        setlist_id: setlistId,
      })
      if (actionError) {
        setError(actionError)
      } else {
        setSongs((prev) =>
          prev
            .filter((s) => s.junctionId !== junctionId)
            .map((s, i) => ({ ...s, orderIndex: i }))
        )
        setLastPersistedOrder((prev) => prev.filter((id) => id !== junctionId))
      }
      setRemovingId(null)
    })
  }

  function handleReorder(newSongs: SortableSong[]) {
    setSongs(newSongs)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const { error: actionError } = await updateSetlistSongOrder({
        setlist_id: setlistId,
        updates: songs.map((s, i) => ({ id: s.junctionId, order_index: i })),
      })
      if (actionError) throw new Error(actionError)
      setLastPersistedOrder(songs.map((s) => s.junctionId))
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to save order. Please try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page title */}
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-6">
        {setlistName}
      </h1>

      {/* Error banner */}
      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Two-column layout — stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        {/* Setlist Panel — left / top */}
        <div>
          <p className="text-sm font-semibold text-brand-brown/60 uppercase tracking-widest mb-4">
            Setlist ({songs.length} {songs.length === 1 ? 'song' : 'songs'})
          </p>
          <SetlistPanel
            songs={songs}
            onReorder={handleReorder}
            onRemove={handleRemove}
            removingId={removingId}
            isDirty={isDirty}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>

        {/* Library Panel — right / bottom */}
        <div>
          <LibraryPanel
            songs={allSongs}
            addedIds={addedIds}
            onAdd={handleAdd}
            addingId={addingId}
            query={query}
            onQueryChange={setQuery}
            libraryError={libraryError}
          />
        </div>
      </div>
    </div>
  )
}
