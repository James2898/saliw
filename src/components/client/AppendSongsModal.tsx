"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/client/button";
import { addSongToSetlist } from "@/app/actions/setlistActions";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModalSong {
  id: string;
  title: string;
  artist: string;
  original_key: string;
}

interface AppendSongsModalProps {
  isOpen: boolean;
  setlistId: string;
  existingSongIds: Set<string>;
  onClose: () => void;
  /** Ref for the FAB button — focus returns here on modal close (AC-16). */
  fabRef: React.RefObject<HTMLButtonElement | null>;
  /** Songs to display; fetched by the parent before opening (AC-33). */
  songs: ModalSong[];
  /** Whether the parent is still fetching songs. */
  isFetchingSongs: boolean;
  /** Error from song fetch, if any. */
  fetchError: string | null;
  /** Called when the user clicks "Retry" after a fetch error. */
  onRetryFetch: () => void;
}

// ── Module-level CSS class constants ──────────────────────────────────────────

const backdropClass =
  "fixed inset-0 z-[80] bg-[var(--brand-espresso)]/40 backdrop-blur-sm";

const panelClass = [
  "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "w-[min(90vw,36rem)]",
  "max-h-[80vh]",
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

const bodyClass = "flex-1 overflow-y-auto px-6 py-4 min-h-0";

const footerClass = [
  "flex items-center justify-between gap-3",
  "px-6 py-4",
  "border-t border-[var(--brand-tan)]/20",
  "shrink-0",
].join(" ");

const songRowBaseClass = [
  "flex items-center gap-3 px-4 py-3 rounded-xl",
  "border border-[var(--brand-tan)]/10",
  "transition-colors duration-200",
].join(" ");

const songRowEnabledClass = [
  songRowBaseClass,
  "bg-[var(--brand-background)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "cursor-pointer",
].join(" ");

const songRowDisabledClass = [
  songRowBaseClass,
  "bg-[var(--brand-tan-alpha)]/40",
  "opacity-60",
  "cursor-not-allowed",
].join(" ");

const checkboxClass = [
  "w-4 h-4 shrink-0 rounded",
  "border border-[var(--brand-tan)]",
  "accent-[var(--brand-espresso)]",
  "cursor-pointer",
].join(" ");

const retryButtonClass = [
  "text-sm font-semibold px-4 py-2 rounded-lg",
  "border border-[var(--brand-tan)]/40",
  "text-[var(--brand-brown)]",
  "hover:bg-[var(--brand-tan-alpha)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tan)]",
  "transition-colors duration-200",
].join(" ");

const searchInputClass = [
  "w-full",
  "rounded-xl",
  "border border-brand-tan",
  "bg-brand-cream dark:bg-brand-espresso",
  "text-brand-espresso dark:text-brand-cream",
  "placeholder:text-brand-tan",
  "px-4 py-2",
  "text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso focus-visible:ring-offset-2",
].join(" ");

// ── AppendSongsModal ──────────────────────────────────────────────────────────

/**
 * AppendSongsModal — scrollable song-picker dialog for adding songs to a setlist.
 *
 * Songs are fetched by the parent (AppendSongsButton) before opening to avoid
 * calling setState inside a useEffect body (React Compiler lint rule).
 *
 * AC-8:  Opens when FAB is clicked.
 * AC-9:  Closeable via X button.
 * AC-10: Closeable by clicking the backdrop.
 * AC-11: Closeable by Escape key.
 * AC-12: State is reset on every close.
 * AC-13: role="dialog", aria-modal="true", aria-labelledby.
 * AC-14: Focus trap (Tab/Shift+Tab).
 * AC-15: Focus moves to first focusable element on open.
 * AC-16: Focus returns to FAB on close.
 * AC-17–21: Song list from getAllSongs(), pre-check existing songs.
 * AC-22–24: Checkbox interaction; no duplicates.
 * AC-25–30: Save with sequential appends, refresh, close on success.
 * AC-31–32: Empty state message.
 * AC-33–36: Loading, error, save-error states.
 */
export default function AppendSongsModal({
  isOpen,
  setlistId,
  existingSongIds,
  onClose,
  fabRef,
  songs,
  isFetchingSongs,
  fetchError,
  onRetryFetch,
}: AppendSongsModalProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Refs ───────────────────────────────────────────────────────────────────

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Helpers — declared BEFORE useEffects (BUG-007) ────────────────────────

  /** Reset checkbox + error state when the modal closes (AC-12). */
  const resetSelectionState = useCallback(() => {
    setChecked(new Set());
    setSaveError(null);
    setSearchQuery("");
  }, []);

  /** Toggle a song's checked state (only for non-existing songs, AC-22). */
  const toggleSong = useCallback(
    (songId: string) => {
      if (existingSongIds.has(songId)) return;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(songId)) {
          next.delete(songId);
        } else {
          next.add(songId);
        }
        return next;
      });
    },
    [existingSongIds]
  );

  /** Update search query on every keystroke. */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  /** Handle Save: sequentially append checked songs (AC-28, anti-race BUG). */
  const handleSave = useCallback(async () => {
    // Collect checked songs in modal-list order (top-to-bottom, AC-28).
    const toAdd = songs.filter(
      (s) => checked.has(s.id) && !existingSongIds.has(s.id)
    );
    if (toAdd.length === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Sequential loop — no Promise.all — to avoid MAX(order_index) race (AC-27–28).
      for (const song of toAdd) {
        const result = await addSongToSetlist({
          setlist_id: setlistId,
          song_id: song.id,
        });
        if (result.error) {
          setSaveError(result.error);
          setIsSaving(false);
          return;
        }
      }

      // Success: reset selections, close modal, refresh the setlist view (AC-29).
      resetSelectionState();
      onClose();
      // Return focus to FAB before refreshing (AC-16).
      fabRef.current?.focus();
      router.refresh();
    } catch {
      setSaveError("An unexpected error occurred. Please try again.");
      setIsSaving(false);
    }
  }, [
    songs,
    checked,
    existingSongIds,
    setlistId,
    resetSelectionState,
    onClose,
    fabRef,
    router,
  ]);

  /** Close modal: reset state and return focus to FAB (AC-12, AC-16). */
  const handleClose = useCallback(() => {
    resetSelectionState();
    onClose();
    fabRef.current?.focus();
  }, [resetSelectionState, onClose, fabRef]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Move focus to close button when modal opens (AC-15).
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Escape key dismiss + Tab focus trap (AC-11, AC-14).
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusableSelectors = [
          "button:not([disabled])",
          'input[type="checkbox"]:not([disabled])',
          'input[type="search"]:not([disabled])',
        ].join(", ");
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
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // ── Derived values ─────────────────────────────────────────────────────────

  const hasNewChecked =
    checked.size > 0 && [...checked].some((id) => !existingSongIds.has(id));
  const isEmpty = !isFetchingSongs && !fetchError && songs.length === 0;

  const lowerQuery = searchQuery.toLowerCase();
  const filteredSongs =
    lowerQuery.trim() === ""
      ? songs
      : songs.filter(
          (s) =>
            s.title.toLowerCase().includes(lowerQuery) ||
            s.artist.toLowerCase().includes(lowerQuery)
        );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (AC-10) */}
      <div className={backdropClass} aria-hidden="true" onClick={handleClose} />

      {/* Dialog panel (AC-13) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="append-songs-modal-title"
        className={panelClass}
      >
        {/* Header */}
        <div className={headerClass}>
          <h2 id="append-songs-modal-title" className={titleClass}>
            Add Songs to Setlist
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

        {/* Body */}
        <div className={bodyClass}>
          {/* Search input */}
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search songs…"
            className={searchInputClass}
            aria-label="Search songs"
          />

          {/* Loading state (AC-33) */}
          {isFetchingSongs && (
            <div className="flex items-center justify-center py-10 gap-3 text-[var(--brand-brown)]">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium">Loading songs…</span>
            </div>
          )}

          {/* Fetch error state (AC-34) */}
          {!isFetchingSongs && fetchError && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <p
                role="alert"
                className="text-sm font-medium text-[var(--brand-brown)]"
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
          )}

          {/* Empty state (AC-31) */}
          {isEmpty && (
            <p className="py-10 text-center text-sm text-[var(--brand-brown)]">
              No songs in your library yet. Add songs in the Song Library first.
            </p>
          )}

          {/* Song list (AC-17–24) */}
          {!isFetchingSongs && !fetchError && songs.length > 0 && (
            <div className="flex flex-col gap-2">
              {/* No-results message when search yields nothing */}
              {filteredSongs.length === 0 && lowerQuery.trim() !== "" && (
                <p className="text-brand-brown dark:text-brand-tan text-sm py-4 text-center">
                  No songs match your search.
                </p>
              )}
              {filteredSongs.map((song) => {
                const isExisting = existingSongIds.has(song.id);
                const isChecked = isExisting || checked.has(song.id);

                return (
                  <div
                    key={song.id}
                    className={
                      isExisting ? songRowDisabledClass : songRowEnabledClass
                    }
                    onClick={isExisting ? undefined : () => toggleSong(song.id)}
                    aria-disabled={isExisting}
                  >
                    {/* Checkbox (AC-22) */}
                    <input
                      type="checkbox"
                      id={`append-song-${song.id}`}
                      checked={isChecked}
                      disabled={isExisting}
                      onChange={
                        isExisting ? undefined : () => toggleSong(song.id)
                      }
                      className={checkboxClass}
                      aria-label={
                        isExisting
                          ? `${song.title} — already in setlist`
                          : song.title
                      }
                    />

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--brand-espresso)] dark:text-[var(--brand-cream)] font-medium text-sm truncate">
                        {song.title}
                      </p>
                      {song.artist && (
                        <p className="text-[var(--brand-brown)] text-xs truncate">
                          {song.artist}
                        </p>
                      )}
                    </div>

                    {/* Key badge */}
                    <span className="bg-[var(--brand-tan-alpha)] text-[var(--brand-espresso)] dark:text-[var(--brand-cream)] text-xs font-medium px-2 py-0.5 rounded shrink-0">
                      {song.original_key}
                    </span>

                    {/* "Already added" label (AC-20) */}
                    {isExisting && (
                      <span className="text-xs font-medium text-[var(--brand-brown)]/60 shrink-0">
                        Already added
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={footerClass}>
          {/* Save error message (AC-35, AC-36) */}
          <div className="flex-1 min-w-0">
            {saveError && (
              <p
                role="alert"
                className="text-sm font-medium text-red-700 dark:text-red-400 truncate"
              >
                {saveError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            {/* Save button — hidden in empty state (AC-32), enabled only when new songs checked (AC-25) */}
            {!isEmpty && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!hasNewChecked || isSaving || isFetchingSongs}
                aria-label={isSaving ? "Saving songs" : "Save selected songs"}
              >
                {isSaving ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin mr-2"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
