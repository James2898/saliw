/**
 * loading.tsx — Musicians page skeleton
 *
 * 4 skeleton rows matching the musician list layout, plus a header skeleton.
 * Uses animate-pulse with bg-brand-brown/10 dark:bg-brand-tan/10 per spec.
 */
export default function MusiciansLoading() {
  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* ── Header skeleton ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            {/* Title block */}
            <div className="h-9 w-40 rounded-lg animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
            {/* Button placeholder */}
            <div className="hidden md:block h-9 w-36 rounded-xl animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
          </div>
          {/* Subtitle / count line */}
          <div className="h-3 w-20 rounded animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
        </div>

        {/* ── Skeleton rows ─────────────────────────────────────────────────── */}
        <ul className="flex flex-col gap-2" role="list" aria-label="Loading musicians">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <div
                className={[
                  'flex flex-col md:flex-row md:items-center md:justify-between gap-2',
                  'rounded-xl border-l-4 border-brand-brown/10 p-4',
                  'animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10',
                ].join(' ')}
                aria-hidden="true"
              >
                {/* Name placeholder */}
                <div className="h-5 w-44 rounded bg-brand-brown/10 dark:bg-brand-tan/10" />

                {/* Notes preview placeholder */}
                <div className="h-3 w-64 rounded bg-brand-brown/10 dark:bg-brand-tan/10" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
