import type { ReactElement } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ChangelogRelease, ChangelogCategory } from "@/utils/changelogParser";

interface RecentChangelogProps {
  releases: ChangelogRelease[];
}

const CATEGORY_BADGE_STYLES: Record<ChangelogCategory, string> = {
  Added:
    "bg-brand-brown/15 text-brand-espresso border-brand-brown/30 dark:bg-brand-tan/20 dark:text-brand-cream dark:border-brand-tan/30",
  Changed:
    "bg-brand-tan/30 text-brand-espresso border-brand-tan/40 dark:bg-brand-espresso/60 dark:text-brand-tan dark:border-brand-tan/25",
  Fixed:
    "bg-brand-cream text-brand-brown border-brand-brown/25 dark:bg-brand-darker dark:text-brand-tan dark:border-brand-tan/20",
  Security:
    "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream",
};

export default function RecentChangelog({
  releases,
}: RecentChangelogProps): ReactElement {
  const latestRelease = releases[0];

  return (
    <section className="w-full rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-brand-tan/20 dark:border-brand-tan/10">
        <div className="flex items-center gap-2">
          <Sparkles
            size={16}
            className="text-brand-brown dark:text-brand-tan shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
            Recent Updates & Improvements
          </p>
        </div>
        <Link
          href="/changelog"
          className="text-xs font-semibold text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream transition-colors duration-150 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-1 rounded-sm w-fit"
          aria-label="View all updates in changelog"
        >
          <span>View all updates</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {!latestRelease ? (
        <p className="text-sm text-brand-brown dark:text-brand-tan">
          No recent updates available.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-brown dark:bg-brand-tan" />
            <h3 className="text-sm sm:text-base font-bold text-brand-espresso dark:text-brand-cream font-sans">
              {latestRelease.displayDate}
            </h3>
            <span className="text-[11px] text-brand-brown/70 dark:text-brand-tan/70 font-medium">
              ({latestRelease.entries.length}{" "}
              {latestRelease.entries.length === 1 ? "update" : "updates"})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {latestRelease.entries.slice(0, 4).map((entry, idx) => {
              const primaryCat = entry.category || "Changed";
              const badgeStyle =
                CATEGORY_BADGE_STYLES[primaryCat] ??
                CATEGORY_BADGE_STYLES.Changed;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-brand-tan/10 dark:bg-brand-espresso/60 border border-brand-tan/20 dark:border-brand-tan/10 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md border shrink-0 ${badgeStyle}`}
                    >
                      {primaryCat}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-brand-espresso dark:text-brand-cream truncate">
                      {entry.title}
                    </h4>
                  </div>
                  {entry.details.length > 0 && (
                    <p className="text-xs text-brand-brown dark:text-brand-tan line-clamp-2 leading-relaxed">
                      {entry.details[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
