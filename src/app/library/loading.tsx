/**
 * loading.tsx — Song Library page skeleton
 *
 * Mirrors the outer shell of src/app/library/page.tsx exactly to prevent layout shift.
 * Uses animate-pulse with bg-brand-brown/10 per the existing setlists/loading.tsx pattern.
 * No imports — purely static markup.
 */
export default function LibraryLoading() {
  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* ── Header skeleton ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-1" aria-hidden="true">
          {/* Title placeholder */}
          <div className="h-9 w-44 rounded-lg animate-pulse bg-brand-brown/10" />
          {/* New Song button placeholder (desktop) */}
          <div className="hidden md:block h-9 w-28 rounded-xl animate-pulse bg-brand-brown/10" />
        </div>
        {/* Count line placeholder */}
        <div className="h-3 w-28 rounded animate-pulse bg-brand-brown/10 mb-6" aria-hidden="true" />

        {/* ── Search bar skeleton ───────────────────────────────────────────── */}
        <div className="mb-6" aria-hidden="true">
          <div className="h-10 w-full rounded-xl animate-pulse bg-brand-brown/10" />
        </div>

        {/* ── Song row skeletons ────────────────────────────────────────────── */}
        <ul className="flex flex-col gap-2" role="list" aria-label="Loading songs">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i}>
              <div
                className="flex items-center gap-2 rounded-xl bg-brand-brown/10 border border-brand-brown/10 px-4 py-3 animate-pulse"
                aria-hidden="true"
              >
                {/* Left text block — title + artist */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="h-4 w-48 rounded animate-pulse bg-brand-brown/10" />
                  <div className="h-3 w-32 rounded animate-pulse bg-brand-brown/10" />
                </div>
                {/* Right key badge placeholder */}
                <div className="shrink-0 h-5 w-8 rounded-lg animate-pulse bg-brand-brown/10" />
              </div>
            </li>
          ))}
        </ul>

      </div>
    </main>
  )
}
