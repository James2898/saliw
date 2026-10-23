"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import Button from "@/components/client/button";
import { useFilterTransition } from "@/components/library/LibraryFilterTransition";

interface SearchBarProps {
  defaultValue: string;
  basePath?: string;
  /** Pass current page size so search navigation preserves it (AC-19 / AM-2) */
  pageSize?: number;
  /** Pass current letter filter so search navigation preserves it (AC-19 / AM-2) */
  letter?: string;
  /** Pass current tag filter so search navigation preserves it */
  tag?: string;
  placeholder?: string;
  ariaLabel?: string;
}

// BUG-007: buildSearchUrl declared above any hook that references it.
function buildSearchUrl(
  basePath: string,
  term: string,
  pageSize: number | undefined,
  letter: string | undefined,
  tag: string | undefined
): string {
  const params = new URLSearchParams();
  if (term) params.set("q", term);
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  // Always reset to page 1 on new search
  params.set("page", "1");
  if (letter) params.set("letter", letter);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * SearchBar — Client Component for the Song Library and Setlist List.
 *
 * Implements explicit search submission via <form role="search"> with an
 * explicit search Button. Executes search on Form submit (Enter or button click).
 * Clearing via the X button immediately restores the unfiltered list.
 *
 * Preserves all live params (pageSize, letter) when navigating (AM-2 / AC-19).
 * Does NOT call Supabase or any Server Action.
 */
export default function SearchBar({
  defaultValue,
  basePath = "/library",
  pageSize,
  letter,
  tag,
  placeholder = "Search by title or artist…",
  ariaLabel = "Search songs by title or artist",
}: SearchBarProps) {
  const router = useRouter();
  const { startTransition } = useFilterTransition();
  // BUG-001: useState lazy initializer for values derived from props
  const [query, setQuery] = useState(() => defaultValue ?? "");

  const handleSearch = useCallback(
    (term: string) => {
      const url = buildSearchUrl(basePath, term.trim(), pageSize, letter, tag);
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [router, basePath, pageSize, letter, tag, startTransition]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch(query);
    },
    [handleSearch, query]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    handleSearch("");
  }, [handleSearch]);

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex items-center gap-2 w-full max-w-md"
    >
      <div className="relative flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={[
            "w-full pl-4 pr-9 py-2 rounded-xl",
            "bg-brand-cream dark:bg-brand-espresso",
            "border border-brand-tan dark:border-brand-tan/40",
            "font-sans text-sm text-brand-espresso dark:text-brand-cream",
            "placeholder:text-brand-tan dark:placeholder:text-brand-tan/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-2",
            "transition-colors duration-200",
          ].join(" ")}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-2.5 flex items-center text-brand-brown/60 hover:text-brand-espresso dark:text-brand-tan/60 dark:hover:text-brand-cream transition-colors"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="sm"
        aria-label="Submit search"
        className="h-[38px] px-3.5 shrink-0"
      >
        <Search size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </form>
  );
}
