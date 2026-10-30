"use client";

import { useMemo, useState } from "react";
import type { ChangelogRelease } from "@/utils/changelogParser";
import ChangelogFilterChips, {
  type FilterCategory,
} from "./ChangelogFilterChips";
import ChangelogTimeline from "./ChangelogTimeline";
import ChangelogJumpIndex from "./ChangelogJumpIndex";

interface ChangelogClientViewProps {
  releases: ChangelogRelease[];
}

export default function ChangelogClientView({
  releases,
}: ChangelogClientViewProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");

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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Category filter bar */}
      <div className="pb-2">
        <ChangelogFilterChips
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={categoryCounts}
        />
      </div>

      {/* Main content grid: Timeline + Desktop Sticky Jump Index */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <main className="min-w-0" id="changelog-timeline">
          <ChangelogTimeline
            releases={releases}
            activeCategory={activeCategory}
            onResetFilter={() => setActiveCategory("All")}
          />
        </main>

        <aside className="hidden lg:block min-w-0" aria-label="Sidebar">
          <ChangelogJumpIndex
            releases={releases}
            activeCategory={activeCategory}
          />
        </aside>
      </div>
    </div>
  );
}
