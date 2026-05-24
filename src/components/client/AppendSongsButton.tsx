"use client";

import { useCallback, useRef, useState } from "react";
import AppendSongsModal from "@/components/client/AppendSongsModal";
import type { ModalSong } from "@/components/client/AppendSongsModal";
import { getAllSongs } from "@/app/actions/songActions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppendSongsButtonProps {
  setlistId: string;
  existingSongIds: Set<string>;
}

// ── Module-level CSS class constants ──────────────────────────────────────────

/**
 * Outer container — desktop-only, fixed bottom-left (AC-1, AC-2, AM-1).
 * `hidden lg:flex` enforces the desktop-only breakpoint guard (explicit, per AM-1).
 * z-50 matches the auto-scroll FAB on the right.
 */
const containerClass = [
  "hidden lg:flex",
  "fixed bottom-6 left-6 z-50",
  "flex-col items-start gap-2",
  "font-sans",
].join(" ");

/**
 * FAB button — Artisan palette via CSS-variable arbitrary values (AC-7, BUG-004).
 * bg-[var(--brand-espresso)] auto-switches in dark mode; no dark: pair needed.
 */
const fabButtonClass = [
  "flex items-center gap-2 px-4 py-2.5",
  "rounded-2xl shadow-lg",
  "bg-[var(--brand-espresso)]",
  "text-[var(--brand-cream)]",
  "border border-[var(--brand-tan)]/30",
  "text-xs font-semibold uppercase tracking-widest",
  "hover:opacity-90",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
  "focus-visible:ring-[var(--brand-tan)]",
  "transition-opacity duration-200",
].join(" ");

// ── AppendSongsButton ─────────────────────────────────────────────────────────

/**
 * AppendSongsButton — Desktop-only FAB that opens the AppendSongsModal.
 *
 * Owns the song-fetch lifecycle: fetches all songs when clicked so the modal
 * receives pre-loaded data (avoids calling setState inside useEffect, per
 * React Compiler lint rules observed during TASK-038 build).
 *
 * AC-1:  hidden lg:flex — renders only at lg: breakpoint and larger.
 * AC-2:  fixed bottom-6 left-6 z-50.
 * AC-3:  Rendered only inside {isLeader && ...} guard in SetlistViewerClient.
 * AC-4:  Music-note-plus icon.
 * AC-5:  aria-label="Append songs to setlist".
 * AC-6:  title="Add Songs" for tooltip on hover.
 * AC-7:  Artisan CSS-variable colors; auto dark mode.
 * AC-8:  Opens AppendSongsModal on click.
 */
export default function AppendSongsButton({
  setlistId,
  existingSongIds,
}: AppendSongsButtonProps) {
  // ── State ──────────────────────────────────────────────────────────────────

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [songs, setSongs] = useState<ModalSong[]>([]);
  const [isFetchingSongs, setIsFetchingSongs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────

  // Ref to FAB button so focus can return here when modal closes (AC-16).
  const fabRef = useRef<HTMLButtonElement>(null);

  // ── Helpers — declared BEFORE useEffects (BUG-007) ────────────────────────
  // (No useEffects in this component — callbacks are used as event handlers.)

  /** Fetch all songs from the library. Used on click and on retry. */
  const fetchSongs = useCallback(async () => {
    setIsFetchingSongs(true);
    setFetchError(null);
    try {
      const result = await getAllSongs();
      if (result.error) {
        setFetchError(result.error);
      } else {
        setSongs(result.data ?? []);
      }
    } catch {
      setFetchError("An unexpected error occurred. Please try again.");
    } finally {
      setIsFetchingSongs(false);
    }
  }, []);

  /** Open the modal and fetch songs (AC-8, AC-33: fetch before open = no empty flash). */
  const openModal = useCallback(async () => {
    // Reset previous fetch state and open the modal immediately so the loading
    // state is visible right away (AC-33: no empty flash — spinner shown during load).
    setSongs([]);
    setFetchError(null);
    setIsModalOpen(true);
    await fetchSongs();
  }, [fetchSongs]);

  /** Close the modal (called by AppendSongsModal). */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /** Retry fetch after an error (AC-34). */
  const handleRetryFetch = useCallback(async () => {
    await fetchSongs();
  }, [fetchSongs]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className={containerClass}>
        <button
          ref={fabRef}
          type="button"
          onClick={openModal}
          aria-label="Append songs to setlist"
          title="Add Songs"
          className={fabButtonClass}
        >
          {/* Music-note-plus icon (AC-4) */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Music note stem */}
            <line x1="6" y1="12" x2="6" y2="3" />
            {/* Note flag */}
            <path d="M6 3l7-1.5V8" />
            {/* Note head */}
            <circle
              cx="4.5"
              cy="12"
              r="1.5"
              fill="currentColor"
              stroke="none"
            />
            <circle
              cx="11.5"
              cy="9.5"
              r="1.5"
              fill="currentColor"
              stroke="none"
            />
            {/* Plus sign */}
            <line x1="13" y1="1" x2="13" y2="5" />
            <line x1="11" y1="3" x2="15" y2="3" />
          </svg>

          <span>Add Songs</span>
        </button>
      </div>

      {/* Modal — rendered outside the FAB container (AC-8) */}
      <AppendSongsModal
        isOpen={isModalOpen}
        setlistId={setlistId}
        existingSongIds={existingSongIds}
        onClose={closeModal}
        fabRef={fabRef}
        songs={songs}
        isFetchingSongs={isFetchingSongs}
        fetchError={fetchError}
        onRetryFetch={handleRetryFetch}
      />
    </>
  );
}
