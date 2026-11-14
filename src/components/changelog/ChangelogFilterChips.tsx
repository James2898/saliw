"use client";

import type { ChangelogCategory } from "@/utils/changelogParser";

export type FilterCategory = "All" | ChangelogCategory;

export const CATEGORY_OPTIONS: readonly FilterCategory[] = [
  "All",
  "Added",
  "Changed",
  "Fixed",
  "Security",
] as const;

interface ChangelogFilterChipsProps {
  activeCategory: FilterCategory;
  onSelectCategory: (category: FilterCategory) => void;
  counts?: Record<FilterCategory, number>;
}

export default function ChangelogFilterChips({
  activeCategory,
  onSelectCategory,
  counts,
}: ChangelogFilterChipsProps) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none"
      role="group"
      aria-label="Filter changelog entries by category"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-brown/70 dark:text-brand-tan/70 shrink-0 mr-1 select-none">
        Category:
      </span>
      {CATEGORY_OPTIONS.map((cat) => {
        const isActive = activeCategory === cat;
        const count = counts ? counts[cat] : undefined;

        return (
          <button
            key={cat}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectCategory(cat)}
            className={[
              "px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              isActive
                ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream shadow-xs"
                : "bg-brand-cream/60 dark:bg-brand-espresso/60 text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown dark:hover:border-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
            ].join(" ")}
          >
            <span>{cat}</span>
            {count !== undefined && (
              <span
                className={[
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none",
                  isActive
                    ? "bg-brand-cream/20 text-brand-cream dark:bg-brand-espresso/20 dark:text-brand-espresso"
                    : "bg-brand-brown/10 dark:bg-brand-tan/10 text-brand-brown/80 dark:text-brand-tan/80",
                ].join(" ")}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
