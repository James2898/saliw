"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import Button from "@/components/client/button";

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

interface AlphabetFilterProps {
  activeLetter: string | null;
  basePath: string;
  /** Pass current search query so navigation preserves it */
  q?: string;
  /** Pass current page size so navigation preserves it */
  pageSize?: number;
}

// BUG-007: buildUrl declared above any hook that references it.
function buildUrl(
  basePath: string,
  letter: string | null,
  q: string | undefined,
  pageSize: number | undefined
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  // Always reset page to 1 when changing letter filter (AC-6)
  params.set("page", "1");
  if (letter) params.set("letter", letter);
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
}: AlphabetFilterProps) {
  const router = useRouter();

  // BUG-002: dependency array uses [router], not [router.replace]
  const handleSelect = useCallback(
    (letter: string | null) => {
      // Clicking an active letter deselects it (AC-5)
      const next = letter === activeLetter ? null : letter;
      router.replace(buildUrl(basePath, next, q, pageSize));
    },
    [router, activeLetter, basePath, q, pageSize]
  );

  const chips: Array<{ label: string; value: string | null }> = [
    { label: "All", value: null },
    ...ALPHABET.map((l) => ({ label: l, value: l })),
  ];

  return (
    <nav aria-label="Filter by first letter" className="mb-4">
      {/* flex-wrap ensures multi-row layout on mobile (OQ-2) — NOT overflow-x scroll */}
      <div className="flex flex-wrap gap-1">
        {chips.map(({ label, value }) => {
          const isActive =
            value === null ? activeLetter === null : activeLetter === value;

          if (isActive) {
            // AM-1: primary variant lacks dark: variants on text/border — add inline overrides.
            // BUG-004/BUG-005: every brand utility needs explicit dark: pair.
            return (
              <Button
                key={label}
                variant="primary"
                size="sm"
                aria-pressed={true}
                aria-label={
                  value === null
                    ? "Show all (clear letter filter)"
                    : `Filter by letter ${label}`
                }
                onClick={() => handleSelect(value)}
                className="dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan"
              >
                {label}
              </Button>
            );
          }

          return (
            <Button
              key={label}
              variant="ghost"
              size="sm"
              aria-pressed={false}
              aria-label={
                value === null
                  ? "Show all (clear letter filter)"
                  : `Filter by letter ${label}`
              }
              onClick={() => handleSelect(value)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
