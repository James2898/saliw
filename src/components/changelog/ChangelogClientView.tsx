"use client";

import { useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChangelogRelease } from "@/utils/changelogParser";
import ChangelogFilterChips, {
  type FilterCategory,
} from "./ChangelogFilterChips";
import ChangelogTimeline from "./ChangelogTimeline";
import ChangelogJumpIndex from "./ChangelogJumpIndex";

const RELEASES_PER_PAGE = 5;

interface ChangelogClientViewProps {
  releases: ChangelogRelease[];
}

export default function ChangelogClientView({
  releases,
}: ChangelogClientViewProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Compute category item counts across all releases
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      All: 0,
      Added: 0,
      Changed: 0,
      Fixed: 0,
      Security: 0,
    };

    for (const release of releases) {
      for (const entry of release.entries) {
        counts.All++;
        if (entry.categories.includes("Added")) counts.Added++;
        if (entry.categories.includes("Changed")) counts.Changed++;
        if (entry.categories.includes("Fixed")) counts.Fixed++;
        if (entry.categories.includes("Security")) counts.Security++;
      }
    }

    return counts;
  }, [releases]);

  // Filter releases that have matching entries under the active category
  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      if (activeCategory === "All") return release.entries.length > 0;
      return release.entries.some((entry) =>
        entry.categories.includes(activeCategory)
      );
    });
  }, [releases, activeCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReleases.length / RELEASES_PER_PAGE)
  );

  // Reset page when category changes
  const handleSelectCategory = useCallback((category: FilterCategory) => {
    setActiveCategory(category);
    setCurrentPage(1);
  }, []);

  const handleResetFilter = useCallback(() => {
    setActiveCategory("All");
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== "undefined") {
      const timelineEl = document.getElementById("changelog-timeline");
      if (timelineEl) {
        timelineEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  // Jump to specific release anchor across pages
  const handleJumpToRelease = useCallback(
    (anchorId: string) => {
      const releaseIndex = filteredReleases.findIndex(
        (r) => r.anchorId === anchorId
      );
      if (releaseIndex !== -1) {
        const targetPage = Math.floor(releaseIndex / RELEASES_PER_PAGE) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }

      setTimeout(() => {
        if (typeof window !== "undefined") {
          const target = document.getElementById(anchorId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            window.history.pushState(null, "", `#${anchorId}`);
          }
        }
      }, 100);
    },
    [filteredReleases, currentPage]
  );

  // Paginated slice
  const paginatedReleases = useMemo(() => {
    const startIndex = (currentPage - 1) * RELEASES_PER_PAGE;
    return filteredReleases.slice(startIndex, startIndex + RELEASES_PER_PAGE);
  }, [filteredReleases, currentPage]);

  const startReleaseNum =
    filteredReleases.length === 0
      ? 0
      : (currentPage - 1) * RELEASES_PER_PAGE + 1;
  const endReleaseNum = Math.min(
    currentPage * RELEASES_PER_PAGE,
    filteredReleases.length
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Category filter bar */}
      <div className="pb-2">
        <ChangelogFilterChips
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          counts={categoryCounts}
        />
      </div>

      {/* Main content: full width left-aligned timeline */}
      <div className="w-full max-w-4xl" id="changelog-timeline">
        <ChangelogTimeline
          releases={paginatedReleases}
          activeCategory={activeCategory}
          onResetFilter={handleResetFilter}
        />

        {/* Pagination Controls */}
        {filteredReleases.length > RELEASES_PER_PAGE && (
          <div className="mt-10 pt-6 border-t border-brand-brown/15 dark:border-brand-tan/15 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
            <p className="text-xs text-brand-brown/80 dark:text-brand-tan/80 font-sans">
              Showing releases{" "}
              <span className="font-bold text-brand-espresso dark:text-brand-cream">
                {startReleaseNum}–{endReleaseNum}
              </span>{" "}
              of{" "}
              <span className="font-bold text-brand-espresso dark:text-brand-cream">
                {filteredReleases.length}
              </span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-brown/20 dark:border-brand-tan/20 text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-1"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => {
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={[
                        "w-8 h-8 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer",
                        isCurrent
                          ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream shadow-xs"
                          : "border-brand-brown/20 dark:border-brand-tan/20 text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                      ].join(" ")}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-brown/20 dark:border-brand-tan/20 text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-1"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Jump to Release Index */}
      <ChangelogJumpIndex
        releases={filteredReleases}
        activeCategory={activeCategory}
        onJumpToRelease={handleJumpToRelease}
      />
    </div>
  );
}
