"use client";

import { useRouter } from "next/navigation";
import { useCallback, useOptimistic } from "react";
import { useFilterTransition } from "@/components/library/LibraryFilterTransition";
import { STANDARD_SONG_TAGS } from "@/types/Song";

interface TagFilterBarProps {
  activeTag: string | null;
  basePath?: string;
  q?: string;
  letter?: string;
  pageSize?: number;
}

const TAG_OPTIONS = [
  { label: "All", value: null },
  ...STANDARD_SONG_TAGS.map((t) => ({ label: t.label, value: t.value })),
];

function buildUrl(
  basePath: string,
  tag: string | null,
  q: string | undefined,
  letter: string | undefined,
  pageSize: number | undefined
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (letter) params.set("letter", letter);
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  // Reset page to 1 on tag filter change
  params.set("page", "1");
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function TagFilterBar({
  activeTag,
  basePath = "/library",
  q,
  letter,
  pageSize,
}: TagFilterBarProps) {
  const router = useRouter();
  const { startTransition } = useFilterTransition();
  const [optimisticTag, setOptimisticTag] = useOptimistic(
    activeTag,
    (_currentTag: string | null, nextTag: string | null) => nextTag
  );

  const handleSelect = useCallback(
    (tag: string | null) => {
      const url = buildUrl(basePath, tag, q, letter, pageSize);
      startTransition(() => {
        setOptimisticTag(tag);
        router.replace(url, { scroll: false });
      });
    },
    [basePath, q, letter, pageSize, router, startTransition, setOptimisticTag]
  );

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none mb-3"
      role="group"
      aria-label="Filter songs by tag"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-brand-brown/70 dark:text-brand-tan/70 shrink-0 mr-1 select-none">
        Tag:
      </span>
      {TAG_OPTIONS.map(({ label, value }) => {
        const isActive =
          value === null
            ? !optimisticTag
            : optimisticTag?.toLowerCase() === value.toLowerCase();

        return (
          <button
            key={label}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleSelect(value)}
            className={[
              "px-3 py-1 rounded-full text-xs font-semibold shrink-0 border transition-all duration-200 cursor-pointer select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              isActive
                ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream shadow-xs"
                : "bg-brand-cream/60 dark:bg-brand-espresso/60 text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown dark:hover:border-brand-tan hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
