"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronUp, X } from "lucide-react";
import type { ChangelogRelease } from "@/utils/changelogParser";
import type { FilterCategory } from "./ChangelogFilterChips";

interface ChangelogJumpIndexProps {
  releases: ChangelogRelease[];
  activeCategory: FilterCategory;
  onJumpToRelease?: (anchorId: string) => void;
}

export default function ChangelogJumpIndex({
  releases,
  activeCategory,
  onJumpToRelease,
}: ChangelogJumpIndexProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("");
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Dismiss on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
    setIsOpen(false);
    if (onJumpToRelease) {
      onJumpToRelease(anchorId);
    } else {
      if (typeof window !== "undefined") {
        const target = document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", `#${anchorId}`);
        }
      }
    }
  }

  return (
    <div ref={popoverRef} className="fixed bottom-6 right-6 z-40">
      {/* Popover Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Release dates"
          className="absolute bottom-14 right-0 w-72 sm:w-80 max-h-[70vh] flex flex-col rounded-3xl border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream dark:bg-brand-espresso shadow-2xl p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-brand-brown/15 dark:border-brand-tan/15">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-brand-brown dark:text-brand-tan" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-espresso dark:text-brand-cream font-sans">
                Jump to Release
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-brand-brown/80 dark:text-brand-tan/80 bg-brand-brown/10 dark:bg-brand-tan/10 px-2 py-0.5 rounded-full">
                {visibleReleases.length}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-brand-brown/60 hover:text-brand-espresso dark:text-brand-tan/60 dark:hover:text-brand-cream hover:bg-brand-brown/10 transition-colors"
                aria-label="Close jump menu"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <ul className="space-y-1 list-none m-0 p-0 text-xs overflow-y-auto scrollbar-thin pr-1 flex-1">
            {visibleReleases.map((release) => {
              const isSelected = activeHash === `#${release.anchorId}`;

              return (
                <li key={release.anchorId}>
                  <button
                    type="button"
                    onClick={() => handleAnchorClick(release.anchorId)}
                    className={[
                      "w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-medium transition-colors duration-150 cursor-pointer select-none",
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
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="px-4 py-2.5 rounded-full font-semibold text-xs sm:text-sm bg-brand-espresso text-brand-cream dark:bg-brand-cream dark:text-brand-espresso border border-brand-brown/30 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
      >
        <Calendar size={15} />
        <span>Jump to Release</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-cream/20 text-brand-cream dark:bg-brand-espresso/20 dark:text-brand-espresso font-bold leading-none">
          {visibleReleases.length}
        </span>
        <ChevronUp
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
