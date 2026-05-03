/**
 * loading.tsx — Dashboard (root route) skeleton
 *
 * Mirrors the outer shell of src/app/page.tsx exactly to prevent layout shift.
 * Uses animate-pulse with bg-brand-brown/10 per the existing setlists/loading.tsx pattern.
 * No imports — purely static markup.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darker p-4 sm:p-8 flex flex-col">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
        {/* Card shell — mirrors <Card padding="lg"> (rounded-3xl border p-10 main-card) */}
        <div className="flex-1 main-card rounded-3xl border p-10">
          <div className="flex flex-col gap-6">
            {/* ── GreetingStrip skeleton ──────────────────────────────────── */}
            <div className="flex flex-col gap-2" aria-hidden="true">
              <div className="h-8 w-56 rounded-lg animate-pulse bg-brand-brown/10" />
              <div className="h-3 w-32 rounded animate-pulse bg-brand-brown/10" />
            </div>

            {/* ── NextUpCard skeleton — hero card ────────────────────────── */}
            <div
              className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6 animate-pulse"
              aria-hidden="true"
            >
              <div className="flex flex-col gap-3">
                <div className="h-3 w-20 rounded animate-pulse bg-brand-brown/10" />
                <div className="h-6 w-64 rounded-lg animate-pulse bg-brand-brown/10" />
                <div className="h-3 w-40 rounded animate-pulse bg-brand-brown/10" />
                <div className="h-9 w-32 rounded-xl animate-pulse bg-brand-brown/10 mt-2" />
              </div>
            </div>

            {/* ── QuickActions skeleton — two button-shaped placeholders ─── */}
            <div className="flex flex-row gap-3" aria-hidden="true">
              <div className="h-10 w-40 rounded-xl animate-pulse bg-brand-brown/10" />
              <div className="h-10 w-40 rounded-xl animate-pulse bg-brand-brown/10" />
            </div>

            {/* ── RecentSongs + UpcomingSetlists — 2-column grid ─────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RecentSongs skeleton */}
              <div
                className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6"
                aria-hidden="true"
              >
                <div className="h-4 w-28 rounded animate-pulse bg-brand-brown/10 mb-4" />
                <ul
                  className="flex flex-col gap-3"
                  role="list"
                  aria-label="Loading recent songs"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="h-4 w-36 rounded animate-pulse bg-brand-brown/10" />
                        <div className="h-3 w-24 rounded animate-pulse bg-brand-brown/10" />
                      </div>
                      <div className="h-5 w-10 rounded-lg animate-pulse bg-brand-brown/10 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>

              {/* UpcomingSetlists skeleton */}
              <div
                className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6"
                aria-hidden="true"
              >
                <div className="h-4 w-36 rounded animate-pulse bg-brand-brown/10 mb-4" />
                <ul
                  className="flex flex-col gap-3"
                  role="list"
                  aria-label="Loading upcoming setlists"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="h-4 w-40 rounded animate-pulse bg-brand-brown/10" />
                      <div className="h-3 w-20 rounded animate-pulse bg-brand-brown/10" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
