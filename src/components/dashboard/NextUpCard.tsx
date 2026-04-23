import type { ReactElement } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'

export interface NextUpSetlist {
  id: string
  name: string
  date: string
  songCount: number
}

interface NextUpCardProps {
  setlist: NextUpSetlist | null
  isMusicDirector: boolean
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso'

export default function NextUpCard({
  setlist,
  isMusicDirector,
}: NextUpCardProps): ReactElement {
  // No setlists at all
  if (!setlist) {
    return (
      <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-2">
          Next Up
        </p>
        {isMusicDirector ? (
          <div className="flex flex-col gap-4">
            <p className="text-base text-brand-espresso">
              You don&apos;t have any setlists yet. Build your first one to get started.
            </p>
            <div>
              <Link
                href="/setlists/new"
                className={[
                  'inline-flex items-center justify-center font-sans font-semibold',
                  'bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream',
                  'border border-brand-tan hover:border-brand-brown',
                  'transition-colors duration-200',
                  'text-base px-4 py-2 rounded-xl',
                  focusRing,
                ].join(' ')}
              >
                Create your first setlist
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-base text-brand-espresso">
            No upcoming setlists — check back soon.
          </p>
        )}
      </section>
    )
  }

  const formattedDate = new Date(setlist.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-2">
            Next Up
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-brand-espresso truncate">
            {setlist.name}
          </h2>
          <p className="text-sm text-brand-brown mt-1">
            {formattedDate} &middot; {setlist.songCount}{' '}
            {setlist.songCount === 1 ? 'song' : 'songs'}
          </p>
        </div>
        {isMusicDirector && (
          <Link
            href={`/setlists/${setlist.id}/edit`}
            aria-label={`Edit ${setlist.name}`}
            className={[
              'shrink-0 flex items-center justify-center w-9 h-9 rounded-lg',
              'text-brand-brown hover:text-brand-espresso hover:bg-brand-brown/10',
              'transition-colors duration-200',
              focusRing,
            ].join(' ')}
          >
            <Pencil size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-4">
        <Link
          href={`/setlists/${setlist.id}`}
          className={[
            'inline-flex items-center justify-center font-sans font-semibold',
            'bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream',
            'border border-brand-tan hover:border-brand-brown',
            'transition-colors duration-200',
            'text-base px-4 py-2 rounded-xl',
            focusRing,
          ].join(' ')}
        >
          Open Stage View
        </Link>
      </div>
    </section>
  )
}
