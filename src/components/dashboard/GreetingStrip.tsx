import type { ReactElement } from 'react'

interface GreetingStripProps {
  fullName: string
  isMusicDirector: boolean
}

export default function GreetingStrip({
  fullName,
  isMusicDirector,
}: GreetingStripProps): ReactElement {
  const subtitle = isMusicDirector
    ? 'You have everything ready for your next service.'
    : "Check what's coming up next."

  const rolePillClasses = isMusicDirector
    ? 'bg-brand-espresso text-brand-cream'
    : 'bg-brand-tan text-brand-espresso'

  const roleLabel = isMusicDirector ? 'Music Director' : 'Musician'

  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream p-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-espresso">
          Welcome back, {fullName}
        </h1>
        <span
          className={`${rolePillClasses} text-xs font-semibold px-3 py-1 rounded-full`}
        >
          {roleLabel}
        </span>
      </div>
      <p className="mt-2 text-sm text-brand-brown">{subtitle}</p>
    </section>
  )
}
