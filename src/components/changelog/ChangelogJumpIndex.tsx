"use client";

import { useEffect, useState } from "react";
import type { ChangelogRelease } from "@/utils/changelogParser";
import type { FilterCategory } from "./ChangelogFilterChips";

interface ChangelogJumpIndexProps {
  releases: ChangelogRelease[];
  activeCategory: FilterCategory;
}

export default function ChangelogJumpIndex({
  releases,
  activeCategory,
}: ChangelogJumpIndexProps) {
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    function updateHash() {
      if (typeof window !== "undefined") {
        setActiveHash(window.location.hash);
      }
    }
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  // Filter releases that have matching entries under the active category
  const visibleReleases = releases
    .map((release) => {
      const matchCount = release.entries.filter((entry) => {
        if (activeCategory === "All") return true;
        return entry.categories.includes(activeCategory);
      }).length;
      return {
        ...release,
        matchCount,
      };
    })
    .filter((r) => r.matchCount > 0);

  if (visibleReleases.length === 0) {
    return null;
  }

  function handleAnchorClick(anchorId: string) {
    setActiveHash(`#${anchorId}`);
  }

  return (
    <nav
      aria-label="Release jump index"
      className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin rounded-3xl border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream/30 dark:bg-brand-espresso/20 p-5 shadow-xs"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-brown/15 dark:border-brand-tan/15">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-espresso dark:text-brand-cream font-sans">
          Jump to Release
        </h3>
        <span className="text-[11px] font-semibold text-brand-brown/70 dark:text-brand-tan/70 bg-brand-brown/10 dark:bg-brand-tan/10 px-2 py-0.5 rounded-full">
          {visibleReleases.length}
        </span>
      </div>

      <ul className="space-y-1 list-none m-0 p-0 text-xs">
        {visibleReleases.map((release) => {
          const isSelected = activeHash === `#${release.anchorId}`;

          return (
            <li key={release.anchorId}>
              <a
                href={`#${release.anchorId}`}
                onClick={() => handleAnchorClick(release.anchorId)}
                className={[
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-medium transition-colors duration-150 select-none",
                  isSelected
                    ? "bg-brand-brown/15 text-brand-espresso font-bold dark:bg-brand-tan/20 dark:text-brand-cream shadow-2xs"
                    : "text-brand-brown dark:text-brand-tan hover:bg-brand-brown/10 hover:text-brand-espresso dark:hover:bg-brand-tan/10 dark:hover:text-brand-cream",
                ].join(" ")}
              >
                <span className="truncate">{release.displayDate}</span>
                <span
                  className={[
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0",
                    isSelected
                      ? "bg-brand-brown text-brand-cream dark:bg-brand-tan dark:text-brand-espresso"
                      : "bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-brown/80 dark:text-brand-tan/80",
                  ].join(" ")}
                >
                  {release.matchCount}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
