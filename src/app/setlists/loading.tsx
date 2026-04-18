/**
 * loading.tsx — Setlists page skeleton
 *
 * 3 skeleton cards matching the desktop/mobile card layout, plus a header skeleton.
 * Uses animate-pulse with bg-brand-brown/10 per spec.
 */
export default function SetlistsLoading() {
  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* ── Header skeleton ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            {/* Title block */}
            <div className="h-9 w-36 rounded-lg animate-pulse bg-brand-brown/10" />
            {/* Button placeholder */}
            <div className="hidden md:block h-9 w-32 rounded-xl animate-pulse bg-brand-brown/10" />
          </div>
          {/* Subtitle / count line */}
          <div className="h-3 w-24 rounded animate-pulse bg-brand-brown/10 mb-4" />
          {/* Search bar placeholder */}
          <div className="h-10 w-full max-w-md rounded-xl animate-pulse bg-brand-brown/10" />
        </div>

        {/* ── Skeleton cards ────────────────────────────────────────────────── */}
        <ul className="flex flex-col gap-2" role="list" aria-label="Loading setlists">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <div
                className={[
                  'flex flex-col md:flex-row md:items-center md:justify-between gap-2',
                  'rounded-xl border-l-4 border-brand-brown/10 p-4',
                  'animate-pulse bg-brand-brown/10',
                ].join(' ')}
                aria-hidden="true"
              >
                {/* Name placeholder */}
                <div className="h-5 w-48 rounded bg-brand-brown/10" />

                {/* Metadata row placeholder */}
                <div className="flex flex-row items-center gap-3 md:shrink-0">
                  <div className="h-3 w-28 rounded bg-brand-brown/10" />
                  <div className="h-5 w-16 rounded-lg bg-brand-brown/10" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
