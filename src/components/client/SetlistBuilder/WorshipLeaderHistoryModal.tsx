"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getWorshipLeaderSongHistory,
  type WorshipLeaderSongHistoryItem,
} from "@/app/actions/setlistActions";
import Button from "@/components/client/button";
import SongCard from "@/components/client/SongCard";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import SongTagBadge from "@/components/SongTags/SongTagBadge";
import { STANDARD_SONG_TAGS } from "@/types/Song";
import type {
  SongLibraryItem,
  SortableSong,
} from "@/components/client/SetlistBuilder/SetlistBuilderClient";

// ── Module-level constants (AM-2, BUG-019: hoisted outside component) ─────────

export const TAG_OPTIONS = [
  { label: "All", value: null },
  ...STANDARD_SONG_TAGS.map((t) => ({ label: t.label, value: t.value })),
] as const;

const backdropClass =
  "fixed inset-0 z-[80] bg-brand-espresso/40 backdrop-blur-sm";

const panelClass = [
  "fixed inset-0 z-[90] w-full h-full rounded-none overflow-y-auto",
  "md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
  "md:w-[min(90vw,48rem)] md:h-auto md:max-h-[85vh] md:rounded-2xl",
  "bg-brand-cream dark:bg-brand-darker",
  "border border-brand-brown/20 dark:border-brand-tan/30",
  "shadow-lg flex flex-col",
].join(" ");

const headerClass = [
  "flex items-center justify-between gap-3",
  "px-6 py-4",
  "border-b border-brand-brown/15 dark:border-brand-tan/20",
  "bg-brand-cream dark:bg-brand-espresso",
  "shrink-0",
].join(" ");

const titleClass =
  "font-sans font-bold text-base text-brand-espresso dark:text-brand-cream truncate";

const closeButtonClass = [
  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
  "text-brand-brown dark:text-brand-tan",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan",
  "transition-colors duration-200 cursor-pointer",
].join(" ");

const bodyClass =
  "flex-1 overflow-y-auto px-6 py-5 min-h-0 flex flex-col gap-4";

const focusableSelectors = [
  "button:not([disabled])",
  "select:not([disabled])",
  "input:not([disabled])",
].join(", ");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorshipLeaderHistoryModalProps {
  isOpen: boolean;
  worshipLeaderId: string | null;
  worshipLeaderName: string | null;
  currentSetlistId: string | null;
  localSongs: SortableSong[];
  onAddSongWithKey: (song: SongLibraryItem, performanceKey: string) => void;
  onUseKey: (songId: string, performanceKey: string) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

type RowActionState = "add" | "use_key" | "current";

interface DialogInnerProps {
  worshipLeaderId: string;
  worshipLeaderName: string | null;
  currentSetlistId: string | null;
  localSongs: SortableSong[];
  onAddSongWithKey: (song: SongLibraryItem, performanceKey: string) => void;
  onUseKey: (songId: string, performanceKey: string) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

// ── Inner Dialog (mounted when open) ──────────────────────────────────────────

function WorshipLeaderHistoryModalDialog({
  worshipLeaderId,
  worshipLeaderName,
  currentSetlistId,
  localSongs,
  onAddSongWithKey,
  onUseKey,
  onClose,
  triggerRef,
}: DialogInnerProps) {
  // ── State (BUG-001: lazy initializers) ────────────────────────────────────
  const [historyItems, setHistoryItems] = useState<
    WorshipLeaderSongHistoryItem[]
  >(() => []);
  const [isLoading, setIsLoading] = useState<boolean>(() => true);
  const [fetchError, setFetchError] = useState<string | null>(() => null);
  const [selectedTag, setSelectedTag] = useState<string | null>(() => null);
  const [announcement, setAnnouncement] = useState<string>(() => "");
  const [retryCount, setRetryCount] = useState<number>(() => 0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  const leaderDisplayName = worshipLeaderName ?? "Worship Leader";

  // ── Handlers — declared BEFORE hooks that reference them (AM-3, BUG-007) ──

  const handleClose = useCallback(() => {
    onCloseRef.current();
    triggerRef.current?.focus();
  }, [triggerRef]);

  function handleRetry() {
    setRetryCount((prev) => prev + 1);
  }

  function handleSelectTag(tag: string | null) {
    setSelectedTag(tag);
  }

  function handleRowAction(
    item: WorshipLeaderSongHistoryItem,
    actionState: RowActionState
  ) {
    if (actionState === "current") return;

    if (actionState === "add") {
      onAddSongWithKey(
        {
          id: item.songId,
          title: item.title,
          artist: item.artist,
          original_key: item.originalKey,
          tags: item.tags,
        },
        item.performanceKey
      );
      setAnnouncement(`Added ${item.title} in key ${item.performanceKey}`);
      return;
    }

    onUseKey(item.songId, item.performanceKey);
    setAnnouncement(`Updated ${item.title} key to ${item.performanceKey}`);
  }

  // ── Derived & Memoized values (AM-3, BUG-002) ─────────────────────────────

  const songKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of localSongs) {
      map.set(s.songId, s.performanceKey);
    }
    return map;
  }, [localSongs]);

  const filteredItems = useMemo(() => {
    if (!selectedTag) return historyItems;
    const target = selectedTag.toLowerCase();
    return historyItems.filter(
      (item) =>
        item.tags && item.tags.some((t) => t.trim().toLowerCase() === target)
    );
  }, [historyItems, selectedTag]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fetch past song history when modal opens, leader changes, or Retry is clicked
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setFetchError(null);

      const result = await getWorshipLeaderSongHistory(
        worshipLeaderId,
        currentSetlistId
      );

      if (cancelled) return;

      if (result.error) {
        setFetchError("Unable to load song history");
        setHistoryItems([]);
        setIsLoading(false);
        return;
      }

      setHistoryItems(result.data ?? []);
      setIsLoading(false);
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [worshipLeaderId, currentSetlistId, retryCount]);

  // Move focus to close button when modal mounts (AC-2)
  useEffect(() => {
    const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  // Escape key dismissal + Tab focus trap (AC-2)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (AC-2) */}
      <div className={backdropClass} aria-hidden="true" onClick={handleClose} />

      {/* Dialog panel (AC-2) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="worship-leader-history-modal-title"
        className={panelClass}
      >
        {/* Screen-reader live region for action announcements (AC-7) */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        {/* Header */}
        <div className={headerClass}>
          <h2 id="worship-leader-history-modal-title" className={titleClass}>
            Song History — {leaderDisplayName}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close song history"
            className={closeButtonClass}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={bodyClass}>
          {/* Tag filter chips (AC-6, AM-2) */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none shrink-0"
            role="group"
            aria-label="Filter song history by tag"
          >
            {TAG_OPTIONS.map(({ label, value }) => {
              const isActive =
                value === null
                  ? !selectedTag
                  : selectedTag?.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleSelectTag(value)}
                  className={[
                    "px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 border transition-all duration-200 cursor-pointer select-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                    isActive
                      ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-cream dark:text-brand-espresso dark:border-brand-cream shadow-xs"
                      : "bg-brand-cream/60 dark:bg-brand-espresso/60 text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20 hover:border-brand-brown hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content area: Loading, Error, Empty, or SongCard list (AC-4, AC-9) */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-brand-brown dark:text-brand-tan">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium">Loading song history…</span>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <p
                role="alert"
                className="text-sm font-medium text-brand-brown dark:text-brand-tan"
              >
                Unable to load song history
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="h-8 px-3 py-1.5 text-xs font-semibold rounded-lg"
              >
                Retry
              </Button>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-brand-brown dark:text-brand-tan">
                No past setlists for {leaderDisplayName}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-brand-brown dark:text-brand-tan">
                No songs match the selected tag.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredItems.map((item) => {
                const currentKeyInBuilder = songKeyMap.get(item.songId);
                const actionState: RowActionState =
                  currentKeyInBuilder === undefined
                    ? "add"
                    : currentKeyInBuilder === item.performanceKey
                      ? "current"
                      : "use_key";

                const isCurrent = actionState === "current";
                const buttonLabel =
                  actionState === "add"
                    ? "Add"
                    : actionState === "use_key"
                      ? "Use key"
                      : "Current";

                const buttonAriaLabel =
                  actionState === "add"
                    ? `Add ${item.title} in key ${item.performanceKey}`
                    : actionState === "use_key"
                      ? `Use key ${item.performanceKey} for ${item.title}`
                      : `${item.title} is currently in key ${item.performanceKey}`;

                return (
                  <SongCard
                    key={`${item.songId}-${item.performanceKey}`}
                    title={item.title}
                    artist={item.artist}
                    badgeSlot={
                      item.tags && item.tags.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.tags.map((t) => (
                            <SongTagBadge key={t} tag={t} size="sm" />
                          ))}
                        </div>
                      ) : undefined
                    }
                    actionsSlot={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <SongKeyBadge musicalKey={item.performanceKey} />
                        {item.count >= 2 && (
                          <span
                            className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-brown/10 dark:bg-brand-tan/15 text-brand-espresso dark:text-brand-cream border border-brand-brown/15 dark:border-brand-tan/20"
                            aria-label={`Performed ${item.count} times in key ${item.performanceKey}`}
                          >
                            ×{item.count}
                          </span>
                        )}
                        <span className="text-xs text-brand-brown dark:text-brand-tan tabular-nums">
                          {item.lastSungDate}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isCurrent}
                          aria-disabled={isCurrent}
                          aria-label={buttonAriaLabel}
                          onClick={() => handleRowAction(item, actionState)}
                          className="h-8 px-3 py-1.5 text-xs font-semibold rounded-lg"
                        >
                          {buttonLabel}
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Exported Modal Wrapper ────────────────────────────────────────────────────

export default function WorshipLeaderHistoryModal({
  isOpen,
  worshipLeaderId,
  ...rest
}: WorshipLeaderHistoryModalProps) {
  if (!isOpen || !worshipLeaderId) return null;
  return (
    <WorshipLeaderHistoryModalDialog
      worshipLeaderId={worshipLeaderId}
      {...rest}
    />
  );
}
