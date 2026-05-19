"use client";

import { useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import Button from "@/components/client/button";

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  q?: string;
  basePath?: string;
}

// BUG-007: buildUrl declared before useRouter hook reference below
function buildUrl(
  page: number,
  basePath: string,
  pageSize: number,
  q?: string
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("pageSize", String(pageSize));
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export default function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  q,
  basePath = "/library",
}: PaginationControlsProps) {
  const router = useRouter();
  const totalPages = Math.ceil(totalCount / pageSize);

  const isFirst = currentPage === 1;
  const isLast = totalPages === 0 || currentPage === totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.replace(buildUrl(1, basePath, pageSize, q))}
        disabled={isFirst}
        aria-label="Go to first page"
        aria-disabled={isFirst}
      >
        <ChevronsLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          router.replace(buildUrl(currentPage - 1, basePath, pageSize, q))
        }
        disabled={isFirst}
        aria-label="Go to previous page"
        aria-disabled={isFirst}
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <span
        className="px-3 py-1.5 text-sm font-semibold text-brand-brown select-none"
        aria-live="polite"
      >
        Page {currentPage} of {totalPages}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          router.replace(buildUrl(currentPage + 1, basePath, pageSize, q))
        }
        disabled={isLast}
        aria-label="Go to next page"
        aria-disabled={isLast}
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          router.replace(buildUrl(totalPages, basePath, pageSize, q))
        }
        disabled={isLast}
        aria-label="Go to last page"
        aria-disabled={isLast}
      >
        <ChevronsRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </nav>
  );
}
