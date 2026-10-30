"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Check } from "lucide-react";
import type {
  ChangelogRelease,
  ChangelogCategory,
} from "@/utils/changelogParser";
import type { FilterCategory } from "./ChangelogFilterChips";

const CATEGORY_BADGE_STYLES: Record<ChangelogCategory, string> = {
  Added:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60",
  Changed:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/60",
  Fixed:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60",
  Security:
    "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60",
};

interface ChangelogTimelineProps {
  releases: ChangelogRelease[];
  activeCategory: FilterCategory;
  onResetFilter: () => void;
}

function FormattedInline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-mono bg-brand-brown/10 dark:bg-brand-tan/15 text-brand-espresso dark:text-brand-cream border border-brand-brown/15 dark:border-brand-tan/15"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

function CategoryBadge({ category }: { category: ChangelogCategory }) {
  const colorClass =
    CATEGORY_BADGE_STYLES[category] ?? CATEGORY_BADGE_STYLES.Changed;
  return (
    <span
      className={`inline-flex items-center text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md border shrink-0 ${colorClass}`}
    >
      {category}
    </span>
  );
}

export default function ChangelogTimeline({
  releases,
  activeCategory,
  onResetFilter,
}: ChangelogTimelineProps) {
  const [copiedAnchor, setCopiedAnchor] = useState<string | null>(null);

  function copyAnchorLink(anchorId: string) {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedAnchor(anchorId);
        setTimeout(() => setCopiedAnchor(null), 2000);
      });
    }
  }

  // Filter releases and their entries
  const filteredReleases = useMemo(() => {
    return releases
      .map((release) => {
        const matchingEntries = release.entries.filter((entry) => {
          if (activeCategory === "All") return true;
          return entry.categories.includes(activeCategory);
        });
        return {
          ...release,
          matchingEntries,
        };
      })
      .filter((release) => release.matchingEntries.length > 0);
  }, [releases, activeCategory]);

  if (filteredReleases.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-brand-brown/30 dark:border-brand-tan/30 bg-brand-cream/40 dark:bg-brand-espresso/20">
        <h3 className="text-base sm:text-lg font-bold text-brand-espresso dark:text-brand-cream mb-2 font-sans">
          No entries match the category filter.
        </h3>
        <p className="text-xs sm:text-sm text-brand-brown/80 dark:text-brand-tan/80 max-w-sm mx-auto mb-5 font-sans">
          There are no updates tagged under &ldquo;{activeCategory}&rdquo; in
          the changelog.
        </p>
        <button
          type="button"
          onClick={onResetFilter}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-brand-brown text-brand-cream hover:bg-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:hover:bg-brand-cream transition-colors duration-200 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
        >
          Reset Filter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {filteredReleases.map((release) => {
        const isCopied = copiedAnchor === release.anchorId;

        return (
          <section
            key={release.anchorId}
            id={release.anchorId}
            className="scroll-mt-20 group rounded-3xl border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream/30 dark:bg-brand-espresso/20 p-5 sm:p-7 shadow-xs transition-shadow duration-200 hover:shadow-md"
            aria-labelledby={`heading-${release.anchorId}`}
          >
            {/* Release Header */}
            <div className="flex items-center justify-between gap-3 border-b border-brand-brown/15 dark:border-brand-tan/15 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-3 h-3 rounded-full bg-brand-brown dark:bg-brand-tan" />
                <h2
                  id={`heading-${release.anchorId}`}
                  className="text-lg sm:text-xl font-bold font-sans text-brand-espresso dark:text-brand-cream tracking-tight"
                >
                  {release.displayDate}
                </h2>
              </div>

              {/* Anchor Link / Copy Button */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand-brown/70 dark:text-brand-tan/70">
                  {release.matchingEntries.length}{" "}
                  {release.matchingEntries.length === 1 ? "update" : "updates"}
                </span>
                <Link
                  href={`#${release.anchorId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    copyAnchorLink(release.anchorId);
                  }}
                  title="Copy direct link to this release"
                  className="p-1.5 rounded-lg text-brand-brown/60 dark:text-brand-tan/60 hover:text-brand-espresso dark:hover:text-brand-cream hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown"
                  aria-label={`Copy link for ${release.displayDate}`}
                >
                  {isCopied ? (
                    <Check
                      size={16}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  ) : (
                    <Link2 size={16} />
                  )}
                </Link>
              </div>
            </div>

            {/* Release Entries */}
            <div className="space-y-4">
              {release.matchingEntries.map((entry, idx) => (
                <article
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-brand-cream/60 dark:bg-brand-espresso/40 border border-brand-brown/10 dark:border-brand-tan/10"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {entry.categories.map((cat) => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                    <h3 className="text-sm sm:text-base font-semibold text-brand-espresso dark:text-brand-cream font-sans">
                      <FormattedInline text={entry.title} />
                    </h3>
                  </div>

                  {entry.details.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-brand-espresso/80 dark:text-brand-cream/80 marker:text-brand-brown/50 dark:marker:text-brand-tan/50">
                      {entry.details.map((detail, dIdx) => (
                        <li key={dIdx} className="leading-relaxed">
                          <FormattedInline text={detail} />
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
