"use client";

import { useRouter } from "next/navigation";
import { useCallback, useOptimistic } from "react";
import { useFilterTransition } from "@/components/library/LibraryFilterTransition";

// BUG-016: Use ALPHABET (not LETTERS) to avoid shadowing any dynamic variable
// derived from searchParams in the same scope.
const ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

// BUG-019: chips hoisted to module scope to avoid re-creation on every render.
const chips: Array<{ label: string; value: string | null }> = [
  { label: "All", value: null },
  ...ALPHABET.map((l) => ({ label: l, value: l })),
];

interface AlphabetFilterProps {
  activeLetter: string | null;
  basePath: string;
  /** Pass current search query so navigation preserves it */
  q?: string;
  /** Pass current page size so navigation preserves it */
  pageSize?: number;
  /** Pass current tag so navigation preserves it */
  tag?: string;
}

// BUG-007: buildUrl declared above any hook that references it.
function buildUrl(
  basePath: string,
  letter: string | null,
  q: string | undefined,
  pageSize: number | undefined,
  tag: string | undefined
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  // Always reset page to 1 when changing letter filter (AC-6)
  params.set("page", "1");
  if (letter) params.set("letter", letter);
  if (tag) params.set("tag", tag);
  return `${basePath}?${params.toString()}`;
}

/**
 * AlphabetFilter — Client Component
 *
 * Renders 27 chips: "All" + A–Z. Clicking a letter filters results by first
 * letter prefix. Clicking an active letter or "All" clears the filter.
 *
 * State is URL-driven: the active letter comes in as a prop from the Server
 * Component (BUG-001 prevention — no useEffect + setState for URL reading).
 * Navigation uses router.replace to avoid polluting browser history.
 *
 * Mobile layout: flex-wrap (multi-row on mobile — NOT horizontal scroll per OQ-2).
 */
export default function AlphabetFilter({
  activeLetter,
  basePath,
  q,
  pageSize,
  tag,
}: AlphabetFilterProps) {
  const router = useRouter();
  const { startTransition } = useFilterTransition();
  const [optimisticLetter, setOptimisticLetter] = useOptimistic(
    activeLetter,
    (_currentLetter: string | null, nextLetter: string | null) => nextLetter
  );

  // BUG-002: dependency array uses whole/destructured identifiers, not property paths
  const handleSelect = useCallback(
    (letter: string | null) => {
      // Clicking an active letter deselects it (AC-5)
      const next = letter === optimisticLetter ? null : letter;
      const url = buildUrl(basePath, next, q, pageSize, tag);
      startTransition(() => {
        setOptimisticLetter(next);
        router.replace(url, { scroll: false });
      });
    },
    [
      router,
      optimisticLetter,
      basePath,
      q,
      pageSize,
      tag,
      startTransition,
      setOptimisticLetter,
    ]
  );

  return (
    <nav aria-label="Filter by first letter" className="mb-4">
      {/* flex-wrap ensures multi-row layout on mobile (OQ-2) — NOT overflow-x scroll */}
      <div className="flex flex-wrap justify-between">
        {chips.map(({ label, value }) => {
          const isActive =
            value === null
              ? optimisticLetter === null
              : optimisticLetter === value;

          return (
            <button
              key={label}
              type="button"
              aria-pressed={isActive}
              aria-label={
                value === null
                  ? "Show all (clear letter filter)"
                  : `Filter by letter ${label}`
              }
              onClick={() => handleSelect(value)}
              className={`cursor-pointer text-sm font-semibold transition-colors bg-transparent border-none p-0 leading-none${
                isActive
                  ? " font-bold text-brand-espresso dark:text-brand-cream"
                  : " text-brand-brown dark:text-brand-tan hover:text-brand-espresso dark:hover:text-brand-cream"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
