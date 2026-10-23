"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useFilterTransition } from "@/components/library/LibraryFilterTransition";

interface PageSizeSelectProps {
  pageSize: number;
  q?: string;
  basePath: string;
  letter?: string;
  tag?: string;
}

const selectClass =
  "text-xs font-medium px-2 py-0.5 rounded border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream dark:bg-brand-espresso text-brand-espresso dark:text-brand-cream focus:outline-none focus:ring-1 focus:ring-brand-espresso dark:focus:ring-brand-tan";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function buildUrl(
  basePath: string,
  pageSize: number,
  q?: string,
  letter?: string,
  tag?: string
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("pageSize", String(pageSize));
  params.set("page", "1");
  if (letter) params.set("letter", letter);
  if (tag) params.set("tag", tag);
  return `${basePath}?${params.toString()}`;
}

export default function PageSizeSelect({
  pageSize,
  q,
  basePath,
  letter,
  tag,
}: PageSizeSelectProps) {
  const router = useRouter();
  const { startTransition } = useFilterTransition();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      const url = buildUrl(basePath, newSize, q, letter, tag);
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [basePath, q, letter, tag, router, startTransition]
  );

  return (
    <div className="flex items-center gap-2 shrink-0">
      <label
        htmlFor="pageSize"
        className="text-xs font-medium text-brand-brown dark:text-brand-tan select-none whitespace-nowrap"
      >
        Items per page
      </label>
      <select
        id="pageSize"
        value={pageSize}
        onChange={handleChange}
        className={selectClass}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
