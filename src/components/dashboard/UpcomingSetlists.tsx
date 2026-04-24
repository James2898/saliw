import type { ReactElement } from 'react'
import Link from 'next/link'

export interface UpcomingSetlist {
  id: string
  name: string
  date: string
  songCount: number
}

interface UpcomingSetlistsProps {
  setlists: UpcomingSetlist[]
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan'

export default function UpcomingSetlists({
  setlists,
}: UpcomingSetlistsProps): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-3">
        Upcoming Setlists
      </p>
      {setlists.length === 0 ? (
        <p className="text-sm text-brand-brown dark:text-brand-tan">No upcoming setlists scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {setlists.map((setlist) => {
            const formattedDate = new Date(setlist.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
            return (
              <li key={setlist.id}>
                <Link
                  href={`/setlists/${setlist.id}`}
                  className={[
                    'flex items-center justify-between gap-3 px-3 py-2 rounded-lg',
                    'hover:bg-brand-tan/10 transition-colors duration-200',
                    focusRing,
                  ].join(' ')}
                  aria-label={`Open ${setlist.name} on ${formattedDate}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-espresso dark:text-brand-cream leading-snug">
                      {setlist.name}
                    </p>
                    <p className="truncate text-xs font-medium text-brand-brown dark:text-brand-tan mt-0.5">
                      {setlist.songCount} {setlist.songCount === 1 ? 'song' : 'songs'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-brand-brown dark:text-brand-tan">
                    {formattedDate}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
