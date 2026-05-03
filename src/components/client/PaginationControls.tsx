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

function buildUrl(page: number, basePath: string, q?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
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
      {/* First */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.replace(buildUrl(1, basePath, q))}
        disabled={isFirst}
        aria-label="Go to first page"
        aria-disabled={isFirst}
      >
        <ChevronsLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      {/* Prev */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.replace(buildUrl(currentPage - 1, basePath, q))}
        disabled={isFirst}
        aria-label="Go to previous page"
        aria-disabled={isFirst}
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      {/* Page indicator */}
      <span
        className="px-3 py-1.5 text-sm font-semibold text-brand-brown select-none"
        aria-live="polite"
      >
        Page {currentPage} of {totalPages}
      </span>

      {/* Next */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.replace(buildUrl(currentPage + 1, basePath, q))}
        disabled={isLast}
        aria-label="Go to next page"
        aria-disabled={isLast}
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>

      {/* Last */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.replace(buildUrl(totalPages, basePath, q))}
        disabled={isLast}
        aria-label="Go to last page"
        aria-disabled={isLast}
      >
        <ChevronsRight size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </nav>
  );
}
