const SKELETON_ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * SongListSkeleton — 10-row animated placeholder list matching the Song Library card layout.
 *
 * Shared between the route-level `src/app/library/loading.tsx` boundary and
 * client-side filter/pagination transitions on `/library`.
 */
export default function SongListSkeleton() {
  return (
    <ul
      className="flex flex-col gap-2"
      role="list"
      aria-busy="true"
      aria-label="Loading songs"
    >
      {SKELETON_ROWS.map((i) => (
        <li key={i}>
          <div
            className="flex items-center gap-2 rounded-xl bg-brand-brown/10 dark:bg-brand-tan/10 border border-brand-brown/10 dark:border-brand-tan/10 px-4 py-3 animate-pulse"
            aria-hidden="true"
          >
            {/* Left text block — title + artist */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="h-4 w-48 rounded animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
              <div className="h-3 w-32 rounded animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
            </div>
            {/* Right key badge placeholder */}
            <div className="shrink-0 h-5 w-8 rounded-lg animate-pulse bg-brand-brown/10 dark:bg-brand-tan/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}
