import type { ReactElement } from 'react'
import Link from 'next/link'
import { ArrowRight, ListMusic, Music, Sparkles } from 'lucide-react'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso'

interface FeatureCardProps {
  icon: ReactElement
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
      <div className="text-brand-brown mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-bold text-brand-espresso mb-1">{title}</h3>
      <p className="text-sm text-brand-brown">{description}</p>
    </section>
  )
}

export default function PublicDashboardView(): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-espresso">
          Plan Sunday. Lead the room.
        </h1>
        <p className="text-base text-brand-brown max-w-prose">
          Saliw keeps your worship team in sync — chord charts that transpose on the fly,
          setlists that every musician can follow, and live key changes during service.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/login"
            className={[
              'inline-flex items-center justify-center gap-2 font-sans font-semibold',
              'bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream',
              'border border-brand-tan hover:border-brand-brown',
              'transition-colors duration-200',
              'text-base px-4 py-2 rounded-xl',
              focusRing,
            ].join(' ')}
          >
            Sign in
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link
            href="/library"
            className={[
              'inline-flex items-center justify-center font-sans font-semibold',
              'bg-transparent text-brand-espresso hover:bg-brand-brown/10',
              'border border-brand-brown/30 hover:border-brand-brown',
              'transition-colors duration-200',
              'text-base px-4 py-2 rounded-xl',
              focusRing,
            ].join(' ')}
          >
            Browse the song library
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Music size={24} aria-hidden="true" />}
          title="Chord charts that transpose"
          description="Change keys live without rewriting a single chord."
        />
        <FeatureCard
          icon={<ListMusic size={24} aria-hidden="true" />}
          title="Setlists that sync"
          description="Everyone sees the same song and key during service."
        />
        <FeatureCard
          icon={<Sparkles size={24} aria-hidden="true" />}
          title="Built for worship"
          description="Crafted for directors, musicians, and the moments in between."
        />
      </div>
    </div>
  )
}
