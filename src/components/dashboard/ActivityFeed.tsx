import type { ReactElement } from 'react'
import { Music, ListMusic } from 'lucide-react'

export interface ActivityItem {
  type: 'song' | 'setlist'
  id: string
  name: string
  updated_at: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  /** Server-side "now" used to compute relative time strings. */
  now: Date
}

function formatRelativeTime(updatedAt: string, now: Date): string {
  const then = new Date(updatedAt).getTime()
  const diffMs = now.getTime() - then

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 'just now'
  }

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`

  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

export default function ActivityFeed({
  items,
  now,
}: ActivityFeedProps): ReactElement | null {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown mb-3">
        Recent Activity
      </p>
      <ul className="flex flex-col gap-2" role="list">
        {items.map((item) => {
          const Icon = item.type === 'song' ? Music : ListMusic
          const relative = formatRelativeTime(item.updated_at, now)
          return (
            <li
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
            >
              <span
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-brand-tan/20 text-brand-brown"
                aria-hidden="true"
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-espresso leading-snug">
                  {item.name}
                </p>
                <p className="text-xs text-brand-brown mt-0.5">{relative}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
