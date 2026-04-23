import type { ReactElement } from 'react'
import Link from 'next/link'

export interface RecentSong {
  id: string
  title: string
  artist: string
  original_key: string
}

interface RecentSongsProps {
  songs: RecentSong[]
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso'

export default function RecentSongs({ songs }: RecentSongsProps): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-3">
        Recent Songs
      </p>
      {songs.length === 0 ? (
        <p className="text-sm text-brand-brown">No songs in the library yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/library/${song.id}`}
                className={[
                  'flex items-center justify-between gap-3 px-3 py-2 rounded-lg',
                  'hover:bg-brand-tan/10 transition-colors duration-200',
                  focusRing,
                ].join(' ')}
                aria-label={`View ${song.title} by ${song.artist}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-espresso leading-snug">
                    {song.title}
                  </p>
                  <p className="truncate text-xs font-medium text-brand-brown mt-0.5">
                    {song.artist}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand-brown bg-brand-cream rounded-lg px-2 py-0.5 border border-brand-brown/20">
                  {song.original_key}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
