'use client'

import type { SongLibraryItem } from './SetlistBuilderClient'

interface LibraryPanelProps {
  songs: SongLibraryItem[]
  addedIds: Set<string>
  onAdd: (song: SongLibraryItem) => void
  addingId: string | null
  query: string
  onQueryChange: (q: string) => void
  libraryError?: string | null
}

export default function LibraryPanel({
  songs,
  addedIds,
  onAdd,
  addingId,
  query,
  onQueryChange,
  libraryError,
}: LibraryPanelProps) {
  // ── Library fetch error ────────────────────────────────────────────────────
  if (libraryError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-brand-brown/60 uppercase tracking-widest">
          Song Library
        </p>
        <p className="text-brand-brown text-sm">
          Unable to load song library. Please try again.
        </p>
      </div>
    )
  }

  // ── Library is empty ───────────────────────────────────────────────────────
  if (songs.length === 0 && !query) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-brand-brown/60 uppercase tracking-widest">
          Song Library
        </p>
        <p className="text-brand-brown text-sm">No songs in the library yet.</p>
      </div>
    )
  }

  // ── Client-side filtered list ──────────────────────────────────────────────
  const lowerQuery = query.toLowerCase()
  const filtered =
    query.trim() === ''
      ? songs
      : songs.filter(
          (s) =>
            s.title.toLowerCase().includes(lowerQuery) ||
            s.artist.toLowerCase().includes(lowerQuery)
        )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-brand-brown/60 uppercase tracking-widest">
        Song Library
      </p>

      {/* Search input */}
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search by title or artist…"
        aria-label="Search song library"
        className={[
          'w-full rounded-xl border border-brand-brown/20 bg-brand-cream dark:bg-brand-espresso',
          'px-4 py-2 text-sm text-brand-espresso dark:text-brand-cream placeholder-brand-brown/40 dark:placeholder-brand-tan/40',
          'focus:outline-none focus:ring-2 focus:ring-brand-brown/40',
          'transition-colors duration-200',
        ].join(' ')}
      />

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-brand-brown text-sm">No songs match your search.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((song) => {
            const isAdded = addedIds.has(song.id)
            const isAdding = addingId === song.id

            return (
              <div
                key={song.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-cream dark:bg-brand-espresso border border-brand-brown/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-brand-espresso font-medium text-sm truncate">{song.title}</p>
                  {song.artist && (
                    <p className="text-brand-brown/70 text-xs truncate">{song.artist}</p>
                  )}
                </div>

                <span className="bg-[var(--brand-tan-alpha)] text-brand-espresso text-xs font-medium px-2 py-0.5 rounded shrink-0">
                  {song.original_key}
                </span>

                <button
                  type="button"
                  onClick={() => !isAdded && !isAdding && onAdd(song)}
                  disabled={isAdded || isAdding}
                  aria-disabled={isAdded || isAdding}
                  aria-label={isAdded ? `${song.title} already added` : `Add ${song.title}`}
                  className={[
                    'shrink-0 text-sm font-medium px-3 py-1 rounded-lg border transition-colors duration-200',
                    isAdded
                      ? 'border-brand-brown/20 text-brand-brown/40 cursor-not-allowed bg-transparent'
                      : isAdding
                      ? 'border-brand-brown/20 text-brand-brown/40 cursor-not-allowed bg-transparent'
                      : 'border-brand-brown text-brand-brown hover:bg-[var(--brand-tan-alpha)]',
                  ].join(' ')}
                >
                  {isAdding ? (
                    <span
                      className="inline-block w-3 h-3 border-2 border-brand-brown/40 border-t-brand-brown rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : isAdded ? (
                    'Added'
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
