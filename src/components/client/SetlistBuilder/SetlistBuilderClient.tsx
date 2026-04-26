'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
import {
  addSongToSetlist,
  removeSongFromSetlist,
  updateSetlistSongOrder,
  updatePerformanceDetails,
  createSetlist,
  updateSetlist,
  cloneSetlist,
} from '@/app/actions/setlistActions'
import Button from '@/components/client/button'
import ErrorBanner from './ErrorBanner'
import SetlistPanel from './SetlistPanel'
import LibraryPanel from './LibraryPanel'
import CloneSetlistDialog from './CloneSetlistDialog'

// ── Shared types (exported so page.tsx can import them) ────────────────────────

export interface SortableSong {
  junctionId: string | null  // null = newly added (not yet persisted)
  songId: string
  title: string
  artist: string
  originalKey: string
  performanceKey: string     // editable, defaults to originalKey on add
  orderIndex: number
}

export interface SongLibraryItem {
  id: string
  title: string
  artist: string
  original_key: string
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SetlistBuilderClientProps {
  setlistId: string | null          // null = create mode
  setlistName: string               // empty string in create mode
  initialSongs: SortableSong[]
  allSongs: SongLibraryItem[]
  libraryError?: string | null
  initialDate?: string              // empty string in create mode
}

// ── Pure helper ────────────────────────────────────────────────────────────────

function computeIsDirty(local: SortableSong[], initial: SortableSong[]): boolean {
  if (local.length !== initial.length) return true
  return local.some((s, i) => {
    const orig = initial[i]
    return s.songId !== orig.songId || s.performanceKey !== orig.performanceKey
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SetlistBuilderClient({
  setlistId,
  setlistName,
  initialSongs,
  allSongs,
  libraryError,
  initialDate,
}: SetlistBuilderClientProps) {
  const router = useRouter()

  // All lazy initialisers — never seeded inside useEffect (MEMORY.md warning)
  const [localSongs, setLocalSongs] = useState<SortableSong[]>(() => initialSongs)
  const [name, setName] = useState(() => setlistName)
  const [date, setDate] = useState(() => initialDate ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [isCloning, setIsCloning] = useState(false)

  // Dirty: compare local vs initial (name, date, songs)
  const isDirty =
    name !== setlistName ||
    date !== (initialDate ?? '') ||
    computeIsDirty(localSongs, initialSongs)

  // Derived values — never stored as separate state
  const addedIds = new Set(localSongs.map((s) => s.songId))

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleAdd(song: SongLibraryItem) {
    setLocalSongs((prev) => [
      ...prev,
      {
        junctionId: null,
        songId: song.id,
        title: song.title,
        artist: song.artist,
        originalKey: song.original_key,
        performanceKey: song.original_key,
        orderIndex: prev.length,
      },
    ])
  }

  function handleRemove(songId: string) {
    setLocalSongs((prev) =>
      prev
        .filter((s) => s.songId !== songId)
        .map((s, i) => ({ ...s, orderIndex: i }))
    )
  }

  function handleKeyChange(songId: string, key: string) {
    setLocalSongs((prev) =>
      prev.map((s) => (s.songId === songId ? { ...s, performanceKey: key } : s))
    )
  }

  function handleReorder(newSongs: SortableSong[]) {
    setLocalSongs(newSongs)
  }

  async function handleSave() {
    if (setlistId === null && !name.trim()) {
      setError('Setlist name is required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      if (setlistId === null) {
        // ── CREATE MODE ────────────────────────────────────────────────────────
        const { data: created, error: createError } = await createSetlist({
          name: name.trim(),
          date: date,
        })
        if (createError || !created) {
          throw new Error(createError ?? 'Failed to create setlist.')
        }
        const newId = created.id

        // Add all songs
        const addedJunctionIds: Record<string, string> = {}
        for (const song of localSongs) {
          const { data, error: addErr } = await addSongToSetlist({
            setlist_id: newId,
            song_id: song.songId,
          })
          if (addErr || !data) throw new Error(addErr ?? 'Failed to add song.')
          addedJunctionIds[song.songId] = data.id
        }

        // Reorder if there are songs
        if (localSongs.length > 0) {
          const updates = localSongs.map((s, i) => ({
            id: addedJunctionIds[s.songId]!,
            order_index: i,
          }))
          const { error: orderErr } = await updateSetlistSongOrder({
            setlist_id: newId,
            updates,
          })
          if (orderErr) throw new Error(orderErr)
        }

        // Update performance keys that differ from original
        for (const song of localSongs) {
          if (song.performanceKey !== song.originalKey) {
            const { error: keyErr } = await updatePerformanceDetails({
              id: addedJunctionIds[song.songId]!,
              setlist_id: newId,
              performance_key: song.performanceKey,
            })
            if (keyErr) throw new Error(keyErr)
          }
        }

        router.push(`/setlists/${newId}`)
      } else {
        // ── EDIT MODE ─────────────────────────────────────────────────────────

        // Update setlist name/date if changed
        if (name !== setlistName || date !== (initialDate ?? '')) {
          const { error: updateErr } = await updateSetlist({
            id: setlistId,
            name: name.trim() || setlistName,
            date: date,
          })
          if (updateErr) throw new Error(updateErr)
        }

        // 1. Determine adds (junctionId === null)
        const toAdd = localSongs.filter((s) => s.junctionId === null)

        // 2. Determine removes (in initial but not in local by songId)
        const localSongIds = new Set(localSongs.map((s) => s.songId))
        const toRemove = initialSongs.filter((s) => !localSongIds.has(s.songId))

        // 3. Determine key changes (junctionId exists, performanceKey changed)
        const toUpdateKey = localSongs.filter((s) => {
          if (!s.junctionId) return false
          const orig = initialSongs.find((o) => o.junctionId === s.junctionId)
          return orig && orig.performanceKey !== s.performanceKey
        })

        // Execute removes
        for (const song of toRemove) {
          const { error: removeErr } = await removeSongFromSetlist({
            id: song.junctionId!,
            setlist_id: setlistId,
          })
          if (removeErr) throw new Error(removeErr)
        }

        // Execute adds — capture returned junction IDs
        const addedJunctionIds: Record<string, string> = {}
        for (const song of toAdd) {
          const { data, error: addErr } = await addSongToSetlist({
            setlist_id: setlistId,
            song_id: song.songId,
          })
          if (addErr || !data) throw new Error(addErr ?? 'Failed to add song.')
          addedJunctionIds[song.songId] = data.id
        }

        // Rebuild junction IDs in local songs for subsequent operations
        const songsWithIds = localSongs.map((s) => ({
          ...s,
          junctionId: s.junctionId ?? addedJunctionIds[s.songId] ?? null,
        }))

        // Execute reorder (full list)
        const validSongs = songsWithIds.filter((s) => s.junctionId !== null)
        if (validSongs.length > 0) {
          const { error: orderErr } = await updateSetlistSongOrder({
            setlist_id: setlistId,
            updates: validSongs.map((s, i) => ({
              id: s.junctionId!,
              order_index: i,
            })),
          })
          if (orderErr) throw new Error(orderErr)
        }

        // Execute key updates
        for (const song of toUpdateKey) {
          const { error: keyErr } = await updatePerformanceDetails({
            id: song.junctionId!,
            setlist_id: setlistId,
            performance_key: song.performanceKey,
          })
          if (keyErr) throw new Error(keyErr)
        }

        // Full navigation to re-mount with fresh server props (avoids stale name/date state)
        router.push(`/setlists/${setlistId}/edit`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClone() {
    if (!setlistId) return
    setIsCloning(true)
    setError(null)
    try {
      const { data, error: cloneError } = await cloneSetlist({ id: setlistId })
      if (cloneError || !data) {
        throw new Error(cloneError ?? 'Failed to clone setlist.')
      }
      setShowCloneDialog(false)
      router.push(`/setlists/${data.id}/edit`)
    } catch (e) {
      setShowCloneDialog(false)
      setError(e instanceof Error ? e.message : 'Unable to clone setlist. Please try again.')
    } finally {
      setIsCloning(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputClass = [
    'w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso',
    'px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream placeholder:text-brand-brown/40 dark:placeholder:text-brand-tan/40',
    'focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1',
  ].join(' ')

  const labelClass =
    'block text-xs font-semibold uppercase tracking-widest text-brand-brown mb-1.5'

  return (
    <div>
      {/* Name + date fields — always shown (create or edit mode) */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label className={labelClass}>Setlist Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunday Morning Service"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso px-4 py-2.5 text-sm text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-2 focus:ring-brand-espresso focus:ring-offset-1"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Clone button — edit mode only */}
      {setlistId !== null && (
        <div className="flex justify-end mb-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCloneDialog(true)}
            disabled={isCloning}
            aria-label="Clone this setlist"
          >
            <Copy size={14} aria-hidden="true" className="mr-1.5" />
            Clone setlist
          </Button>
        </div>
      )}

      {/* Two-column layout — stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        {/* Setlist Panel — left / top */}
        <div>
          <p className="text-sm font-semibold text-brand-brown/60 uppercase tracking-widest mb-4">
            Setlist ({localSongs.length} {localSongs.length === 1 ? 'song' : 'songs'})
          </p>
          <SetlistPanel
            songs={localSongs}
            onReorder={handleReorder}
            onRemove={handleRemove}
            onKeyChange={handleKeyChange}
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
            addingId={null}
            query={query}
            onQueryChange={setQuery}
            libraryError={libraryError}
          />
        </div>
      </div>

      {/* Clone confirmation dialog */}
      <CloneSetlistDialog
        isOpen={showCloneDialog}
        setlistName={name}
        isCloning={isCloning}
        onConfirm={handleClone}
        onCancel={() => setShowCloneDialog(false)}
      />
    </div>
  )
}
