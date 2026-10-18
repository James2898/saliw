"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  addSongToSetlist,
  removeSongFromSetlist,
  updatePerformanceDetails,
  updateSetlistSongOrder,
} from "@/app/actions/setlistActions";
import ErrorBanner from "@/components/client/SetlistBuilder/ErrorBanner";
import LibraryPanel from "@/components/client/SetlistBuilder/LibraryPanel";
import SetlistPanel from "@/components/client/SetlistBuilder/SetlistPanel";
import type {
  SongLibraryItem,
  SortableSong,
} from "@/components/client/SetlistBuilder/SetlistBuilderClient";
import type { SongSummary } from "@/types/Song";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModalSong = SongSummary;

interface AppendSongsModalProps {
  isOpen: boolean;
  setlistId: string;
  existingSongIds?: Set<string>;
  /** Current ordered songs in the setlist (passed from SetlistViewerClient). */
  currentSongs?: SortableSong[];
  onClose: () => void;
  /** Ref for the FAB button — focus returns here on modal close. */
  fabRef: React.RefObject<HTMLButtonElement | null>;
  /** Songs from the library; fetched by the parent before opening. */
  songs: ModalSong[];
  /** Whether the parent is still fetching library songs. */
  isFetchingSongs: boolean;
  /** Error from library song fetch, if any. */
  fetchError: string | null;
  /** Called when the user clicks "Retry" after a fetch error. */
  onRetryFetch: () => void;
}

// ── Module-level constants (BUG-019: stable references) ──────────────────────

const EMPTY_SORTABLE_SONGS: SortableSong[] = [];

function noopSave() {
  // No-op: Edit Songs modal auto-saves each mutation immediately (AC-4, AC-6).
}

const backdropClass =
  "fixed inset-0 z-[80] bg-[var(--brand-espresso)]/40 backdrop-blur-sm";

const panelClass = [
  "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "w-[min(95vw,64rem)]",
  "max-h-[85vh]",
  "bg-[var(--brand-background)]",
  "border border-[var(--brand-tan)]/30",
  "rounded-2xl shadow-lg",
  "flex flex-col",
  "overflow-hidden",
].join(" ");

const headerClass = [
  "flex items-center justify-between",
  "px-6 py-4",
  "border-b border-[var(--brand-tan)]/20",
  "shrink-0",
].join(" ");

const titleClass = [
  "font-sans font-bold text-base",
  "text-[var(--brand-espresso)]",
  "dark:text-[var(--brand-cream)]",
].join(" ");

const closeButtonClass = [
  "flex items-center justify-center w-7 h-7 rounded-lg",
  "text-[var(--brand-brown)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const bodyClass = "flex-1 overflow-y-auto px-6 py-5 min-h-0";

const retryButtonClass = [
  "text-sm font-semibold px-4 py-2 rounded-lg",
  "border border-[var(--brand-tan)]/40",
  "text-[var(--brand-brown)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const focusableSelectors = [
  "button:not([disabled])",
  "select:not([disabled])",
  "input:not([disabled])",
].join(", ");

// ── AppendSongsModalDialog (mounted only while open) ─────────────────────────

function AppendSongsModalDialog({
  setlistId,
  existingSongIds,
  currentSongs,
  onClose,
  fabRef,
  songs,
  isFetchingSongs,
  fetchError,
  onRetryFetch,
}: Omit<AppendSongsModalProps, "isOpen">) {
  const router = useRouter();

  // ── State (lazy initializers — BUG-001) ────────────────────────────────────

  const [localSongs, setLocalSongs] = useState<SortableSong[]>(
    () => currentSongs ?? EMPTY_SORTABLE_SONGS
  );
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Refs ───────────────────────────────────────────────────────────────────

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Helpers — declared BEFORE useMemo / useEffect (BUG-007) ────────────────

  /** Dismiss the inline error banner. */
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  /** Close modal and return focus to the trigger button (AC-3, AM-2). */
  const handleClose = useCallback(() => {
    onClose();
    fabRef.current?.focus();
  }, [onClose, fabRef]);

  /**
   * Auto-save Add Song (AC-6, AC-8):
   * Calls addSongToSetlist, appends the created row to localSongs, and refreshes.
   */
  const handleAdd = useCallback(
    async (song: SongLibraryItem) => {
      if (addingId !== null) return;
      if (localSongs.some((s) => s.songId === song.id)) return;

      setAddingId(song.id);
      setError(null);

      try {
        const result = await addSongToSetlist({
          setlist_id: setlistId,
          song_id: song.id,
        });

        if (result.error || !result.data) {
          setError(
            result.error ?? "Unable to add song to setlist. Please try again."
          );
          return;
        }

        const created = result.data;
        setLocalSongs((prev) => [
          ...prev,
          {
            junctionId: created.id,
            songId: song.id,
            title: song.title,
            artist: song.artist,
            originalKey: song.original_key,
            performanceKey: created.performance_key ?? song.original_key,
            orderIndex: prev.length,
          },
        ]);
        router.refresh();
      } catch {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setAddingId(null);
      }
    },
    [addingId, localSongs, setlistId, router]
  );

  /**
   * Auto-save Remove Song (AC-6, AC-8):
   * Optimistically removes the song from localSongs, calls removeSongFromSetlist,
   * rolls back on error, and refreshes on success.
   */
  const handleRemove = useCallback(
    async (songId: string) => {
      const target = localSongs.find((s) => s.songId === songId);
      if (!target) return;

      const previousSongs = localSongs;
      setError(null);
      setLocalSongs((prev) =>
        prev
          .filter((s) => s.songId !== songId)
          .map((s, index) => ({ ...s, orderIndex: index }))
      );

      if (!target.junctionId) return;

      try {
        const result = await removeSongFromSetlist({
          id: target.junctionId,
          setlist_id: setlistId,
        });

        if (result.error) {
          setLocalSongs(previousSongs);
          setError(result.error);
          return;
        }

        router.refresh();
      } catch {
        setLocalSongs(previousSongs);
        setError("An unexpected error occurred. Please try again.");
      }
    },
    [localSongs, setlistId, router]
  );

  /**
   * Auto-save Reorder Songs (AC-6, AC-8):
   * Optimistically updates localSongs order, calls updateSetlistSongOrder,
   * rolls back on error, and refreshes on success.
   */
  const handleReorder = useCallback(
    async (newSongs: SortableSong[]) => {
      const orderChanged =
        newSongs.length === localSongs.length &&
        newSongs.some((s, index) => s.songId !== localSongs[index]?.songId);

      if (!orderChanged) return;

      const previousSongs = localSongs;
      setError(null);
      setLocalSongs(newSongs);

      const updates = newSongs
        .filter(
          (s): s is SortableSong & { junctionId: string } =>
            s.junctionId !== null
        )
        .map((s, index) => ({
          id: s.junctionId,
          order_index: index,
        }));

      if (updates.length === 0) return;

      try {
        const result = await updateSetlistSongOrder({
          setlist_id: setlistId,
          updates,
        });

        if (result.error) {
          setLocalSongs(previousSongs);
          setError(result.error);
          return;
        }

        router.refresh();
      } catch {
        setLocalSongs(previousSongs);
        setError("An unexpected error occurred. Please try again.");
      }
    },
    [localSongs, setlistId, router]
  );

  /**
   * Auto-save Performance Key Change (AC-6, AC-8):
   * Optimistically updates performanceKey in localSongs, calls updatePerformanceDetails,
   * rolls back on error, and refreshes on success.
   */
  const handleKeyChange = useCallback(
    async (songId: string, newKey: string) => {
      const target = localSongs.find((s) => s.songId === songId);
      if (!target || target.performanceKey === newKey) return;

      const previousSongs = localSongs;
      setError(null);
      setLocalSongs((prev) =>
        prev.map((s) =>
          s.songId === songId ? { ...s, performanceKey: newKey } : s
        )
      );

      if (!target.junctionId) return;

      try {
        const result = await updatePerformanceDetails({
          id: target.junctionId,
          setlist_id: setlistId,
          performance_key: newKey,
        });

        if (result.error) {
          setLocalSongs(previousSongs);
          setError(result.error);
          return;
        }

        router.refresh();
      } catch {
        setLocalSongs(previousSongs);
        setError("An unexpected error occurred. Please try again.");
      }
    },
    [localSongs, setlistId, router]
  );

  // ── Derived values (wrapped in useMemo — BUG-019) ──────────────────────────

  const addedIds = useMemo(() => {
    if (currentSongs !== undefined) {
      return new Set(localSongs.map((s) => s.songId));
    }
    const ids = new Set(existingSongIds);
    for (const song of localSongs) {
      ids.add(song.songId);
    }
    return ids;
  }, [currentSongs, existingSongIds, localSongs]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Move focus to close button when modal mounts (AM-2).
  useEffect(() => {
    const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  // Escape key dismiss + Tab focus trap including select:not([disabled]) (AC-3, AC-9).
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (AC-3) */}
      <div className={backdropClass} aria-hidden="true" onClick={handleClose} />

      {/* Dialog panel (AC-3, AM-2) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-songs-modal-title"
        className={panelClass}
      >
        {/* Header (AC-3) */}
        <div className={headerClass}>
          <h2 id="edit-songs-modal-title" className={titleClass}>
            Edit Songs
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className={closeButtonClass}
          >
            {/* X icon */}
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

        {/* Body — two-column Edit Setlist song management layout (AC-4, AC-5) */}
        <div className={bodyClass}>
          {error && (
            <div className="mb-6">
              <ErrorBanner message={error} onDismiss={handleDismissError} />
            </div>
          )}

          <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
            {/* Setlist Panel — left / top */}
            <div>
              <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest mb-4">
                Setlist ({localSongs.length}{" "}
                {localSongs.length === 1 ? "song" : "songs"})
              </p>
              <SetlistPanel
                songs={localSongs}
                onReorder={handleReorder}
                onRemove={handleRemove}
                onKeyChange={handleKeyChange}
                isDirty={false}
                onSave={noopSave}
                isSaving={false}
              />
            </div>

            {/* Library Panel — right / bottom */}
            <div>
              {isFetchingSongs ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest">
                    Song Library
                  </p>
                  <div className="flex items-center justify-center py-10 gap-3 text-brand-brown dark:text-brand-tan">
                    <Loader2
                      size={20}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">Loading songs…</span>
                  </div>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest">
                    Song Library
                  </p>
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <p
                      role="alert"
                      className="text-sm font-medium text-brand-brown dark:text-brand-tan"
                    >
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={onRetryFetch}
                      className={retryButtonClass}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <LibraryPanel
                  songs={songs}
                  addedIds={addedIds}
                  onAdd={handleAdd}
                  addingId={addingId}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  libraryError={fetchError}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── AppendSongsModal wrapper ──────────────────────────────────────────────────

/**
 * AppendSongsModal — Edit Songs modal on the Setlist detail page.
 *
 * Reuses SetlistPanel and LibraryPanel from the Edit Setlist page so music
 * directors can reorder songs via drag-and-drop, change performance keys,
 * remove songs, and search/add library songs with automatic persistence and
 * optimistic rollback on error (no Cancel or Save footer buttons).
 */
export default function AppendSongsModal({
  isOpen,
  ...dialogProps
}: AppendSongsModalProps) {
  if (!isOpen) return null;
  return <AppendSongsModalDialog {...dialogProps} />;
}
