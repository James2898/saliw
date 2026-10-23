"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import Button from "@/components/client/button";
import { useFilterTransition } from "@/components/library/LibraryFilterTransition";

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  q?: string;
  basePath?: string;
  letter?: string;
  tag?: string;
}

// BUG-007: buildUrl declared before hooks below
function buildUrl(
  page: number,
  basePath: string,
  pageSize: number,
  q?: string,
  letter?: string,
  tag?: string
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("pageSize", String(pageSize));
  params.set("page", String(page));
  if (letter) params.set("letter", letter);
  if (tag) params.set("tag", tag);
  return `${basePath}?${params.toString()}`;
}

export default function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  q,
  basePath = "/library",
  letter,
  tag,
}: PaginationControlsProps) {
  const router = useRouter();
  const { startTransition } = useFilterTransition();
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirst = currentPage === 1;
  const isLast = totalPages === 0 || currentPage === totalPages;

  const handlePageChange = useCallback(
    (targetPage: number) => {
      const url = buildUrl(targetPage, basePath, pageSize, q, letter, tag);
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [basePath, pageSize, q, letter, tag, router, startTransition]
  );

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(1)}
        disabled={isFirst}
        aria-label="Go to first page"
        aria-disabled={isFirst}
      >
        <ChevronsLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isFirst}
        aria-label="Go to previous page"
        aria-disabled={isFirst}
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <span
        className="px-3 py-1.5 text-sm font-semibold text-brand-brown dark:text-brand-tan select-none"
        aria-live="polite"
      >
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isLast}
        aria-label="Go to next page"
        aria-disabled={isLast}
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(totalPages)}
        disabled={isLast}
        aria-label="Go to last page"
        aria-disabled={isLast}
      >
        <ChevronsRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </nav>
  );
}
