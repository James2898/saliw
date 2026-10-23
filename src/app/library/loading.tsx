import SongListSkeleton from "@/components/library/SongListSkeleton";

/**
 * loading.tsx — Song Library page skeleton
 *
 * Mirrors the outer shell of src/app/library/page.tsx exactly to prevent layout shift.
 * Uses animate-pulse with bg-brand-brown/10 dark:bg-brand-tan/10 per the existing skeleton pattern.
 */
export default function LibraryLoading() {
  return (
    <main className="min-h-screen bg-brand-cream dark:bg-brand-darker px-4 py-8 sm:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* ── Header skeleton ──────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between gap-4 mb-1"
          aria-hidden="true"
        >
          {/* Title placeholder */}
          <div className="h-9 w-44 rounded-lg animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
          {/* New Song button placeholder (desktop) */}
          <div className="hidden md:block h-9 w-28 rounded-xl animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
        </div>
        {/* Count line placeholder */}
        <div
          className="h-3 w-28 rounded animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10 mb-6"
          aria-hidden="true"
        >
          <span className="sr-only">Loading</span>
        </div>

        {/* ── Search bar skeleton ───────────────────────────────────────────── */}
        <div className="mb-6" aria-hidden="true">
          <div className="h-10 w-full rounded-xl animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
        </div>

        {/* ── Song row skeletons ────────────────────────────────────────────── */}
        <SongListSkeleton />
      </div>
    </main>
  );
}
