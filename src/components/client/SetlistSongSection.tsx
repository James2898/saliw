"use client";

import { memo, useState, useCallback, useTransition, useRef } from "react";
import { RefreshCw, Check, Loader2 } from "lucide-react";
import type { ProcessedLine } from "@/utils/musicLogic";
import { getSemitoneOffset } from "@/utils/musicLogic";
import { updatePerformanceDetails } from "@/app/actions/setlistActions";
import ChordSheetClient from "@/components/SongViewer/ChordSheetClient";
import YouTubeLinkModal from "@/components/client/YouTubeLinkModal";
import type { SongSyncState } from "@/hooks/useSetlistSync";
import type { UseAutoScrollReturn } from "@/hooks/useAutoScroll";

interface SetlistSongSectionProps {
  junctionId: string;
  /** songs table PK — used for YouTube URL updates via updateSong. */
  songId: string;
  setlistId: string;
  title: string;
  artist: string;
  processedLines: ProcessedLine[];
  originalKey: string;
  performanceKey: string;
  isLeader: boolean;
  /** YouTube embed URL stored on the library song (null if not set). */
  youtubeUrl?: string | null;
  /** True when the authenticated viewer is a music_director. */
  isMusicDirector?: boolean;
  /** NEW — Key override from Follow Leader mode. Passed to ChordSheetClient as externalKey. */
  overrideKey?: string;
  /** NEW — Callback for every key change for debounced Go Live persist. */
  onKeyChangeLive?: (junctionId: string, key: string) => void;
  /** NEW — Per-song live sync status from useSetlistSync (D-4/D-5/D-6). */
  liveSyncState?: SongSyncState;
  /** Global chords visibility override from the toolbar toggle. */
  externalChordsHidden?: boolean;
  /** Shared auto-scroll instance owned by SetlistViewerClient — passed down
   *  so each per-song ChordSheetClient does not spawn its own rAF loop. */
  autoScroll?: UseAutoScrollReturn;
  /** Lyric font size in pixels, lifted from SetlistViewerClient. */
  fontSize?: number;
  /** Increase lyric font size callback, lifted from SetlistViewerClient. */
  onIncreaseFont?: () => void;
  /** Decrease lyric font size callback, lifted from SetlistViewerClient. */
  onDecreaseFont?: () => void;
  /** Reset lyric font size callback, lifted from SetlistViewerClient. */
  onResetFont?: () => void;
  /** Chord-specific font size in pixels. */
  chordFontSize?: number;
  /** Chord background color CSS value (hex or "transparent"). */
  chordBg?: string;
  /** Chord font color CSS value (hex). */
  chordColor?: string;
  /** 0-based position of this song in the setlist — used for alternating background. */
  songIndex?: number;
  /**
   * Callback fired when a chord token is clicked in the chord sheet.
   * Receives the transposed (displayed) chord name as the performer sees it.
   * Owned by SetlistViewerClient and passed down through SetlistSongSection.
   */
  onChordClick?: (chordName: string) => void;
  /**
   * Callback fired when this song's semitone offset changes (transpose or key change).
   * Receives the junctionId and the new absolute semitone offset from originalKey.
   * Used by SetlistViewerClient to keep songOffsets map in sync for uniqueChords.
   */
  onOffsetChange?: (junctionId: string, newOffset: number) => void;
}

// Wrap ChordSheetClient in React.memo to prevent re-renders triggered
// by IntersectionObserver state changes in the navigator (AC-11).
const MemoChordSheetClient = memo(ChordSheetClient);

/**
 * SetlistSongSection — Per-song wrapper with transpose state access and Sync button.
 *
 * Renders a named section element used as an IntersectionObserver target.
 * The Sync button is only shown to the authenticated setlist leader.
 *
 * No Supabase calls are made from this component — all DB interactions
 * go through the `updatePerformanceDetails` Server Action.
 */
function SetlistSongSection({
  junctionId,
  songId,
  setlistId,
  title,
  artist,
  processedLines,
  originalKey,
  performanceKey,
  isLeader,
  youtubeUrl: initialYoutubeUrl = null,
  isMusicDirector = false,
  overrideKey,
  onKeyChangeLive,
  liveSyncState,
  externalChordsHidden,
  autoScroll,
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  onResetFont,
  chordFontSize,
  chordBg,
  chordColor,
  songIndex = 0,
  onChordClick,
  onOffsetChange,
}: SetlistSongSectionProps) {
  // Track the current display key as reported by ChordSheetClient via onKeyChange
  const [currentKey, setCurrentKey] = useState<string>(performanceKey);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── YouTube state ──────────────────────────────────────────────────────────
  // Local copy of the URL for optimistic update (AC-10)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(
    initialYoutubeUrl
  );
  // Embed toggle: starts collapsed on every page load (AC-14)
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  // YouTube link modal state
  const [isYtModalOpen, setIsYtModalOpen] = useState(false);
  // Transient success indicator (AC-10)
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Ref for the "Add/Edit YouTube link" trigger button — focus returns here on modal close
  const ytTriggerRef = useRef<HTMLButtonElement>(null);

  // handleKeyChange: lift the current display key back to this component
  // (for Sync button) and also notify parent of the new semitone offset (for drawer).
  // getSemitoneOffset imported from musicLogic (read-only, BUG-007: declared before hooks).
  const handleKeyChange = useCallback(
    (key: string) => {
      setCurrentKey(key);
      onOffsetChange?.(junctionId, getSemitoneOffset(originalKey, key));
    },
    [junctionId, originalKey, onOffsetChange]
  );

  const handleKeyChangeLive = useCallback(
    (key: string) => {
      onKeyChangeLive?.(junctionId, key);
    },
    [onKeyChangeLive, junctionId]
  );

  const handleSync = () => {
    setSyncError(null);
    setSyncSuccess(false);

    startTransition(async () => {
      const { error } = await updatePerformanceDetails({
        id: junctionId,
        setlist_id: setlistId,
        performance_key: currentKey,
      });

      if (error) {
        setSyncError(error);
      } else {
        setSyncSuccess(true);
        // Revert sync icon after 2 seconds
        setTimeout(() => {
          setSyncSuccess(false);
        }, 2000);
      }
    });
  };

  // ── YouTube modal helpers ──────────────────────────────────────────────────
  const handleYtModalOpen = useCallback(() => setIsYtModalOpen(true), []);
  const handleYtModalClose = useCallback(() => setIsYtModalOpen(false), []);

  // Optimistic update: update local URL state immediately on save success (AC-10)
  const handleYtSaveSuccess = useCallback((newUrl: string | null) => {
    setYoutubeUrl(newUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    // If a URL was just added/updated, auto-open the embed
    if (newUrl) {
      setIsEmbedOpen(true);
    } else {
      // URL cleared — close the embed
      setIsEmbedOpen(false);
    }
  }, []);

  // ── Autoscroll hide logic ──────────────────────────────────────────────────
  // Per AC-23–27: the embed container is visually hidden (CSS-only) when autoscroll is active.
  // The <iframe> DOM node is NOT unmounted — audio/video continues (BUG-014/015).
  // Use whole autoScroll object in deps per BUG-002.
  const isAutoScrollActive = autoScroll?.isActive ?? false;

  const isEven = songIndex % 2 === 0;

  return (
    <section
      id={`song-${junctionId}`}
      className={[
        "scroll-mt-16 lg:scroll-mt-0",
        "rounded-xl px-4 py-5",
        isEven
          ? "bg-brand-cream dark:bg-brand-espresso/40"
          : "bg-brand-tan/20 dark:bg-brand-brown/30",
      ].join(" ")}
      aria-label={title}
    >
      {/* ── Song header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-0.5">
            {title}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan">
            {artist}
          </p>
        </div>

        {/* ── Sync button — leader only (AC-12) ──────────────────────────────── */}
        {isLeader && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* ── Per-song Go Live sync status (D-4 / D-5 / D-6) ───────────── */}
            {liveSyncState && liveSyncState.status !== "idle" && (
              <div
                className="inline-flex items-center gap-1 text-xs"
                aria-live="polite"
              >
                {liveSyncState.status === "saving" && (
                  <>
                    <Loader2
                      size={12}
                      className="animate-spin text-brand-brown dark:text-brand-tan"
                      aria-hidden="true"
                    />
                    <span className="text-brand-brown dark:text-brand-tan">
                      Saving…
                    </span>
                  </>
                )}
                {liveSyncState.status === "saved" && (
                  <>
                    <Check
                      size={12}
                      className="text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                    <span className="text-green-600 dark:text-green-400">
                      Synced
                    </span>
                  </>
                )}
                {liveSyncState.status === "error" && (
                  <span
                    role="alert"
                    className="text-xs text-red-500 max-w-[200px] text-right"
                  >
                    {liveSyncState.errorMessage}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSync}
              disabled={isPending}
              aria-label={
                syncSuccess ? "Key synced" : "Sync current key to setlist"
              }
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-xs font-semibold",
                "border",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                isPending
                  ? "text-brand-brown/50 dark:text-brand-tan/50 border-brand-brown/20 dark:border-brand-tan/20 cursor-not-allowed"
                  : syncSuccess
                    ? "text-green-700 dark:text-green-400 border-green-500/30 bg-green-50 dark:bg-green-900/20"
                    : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
              ].join(" ")}
            >
              {isPending ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Syncing…
                </>
              ) : syncSuccess ? (
                <>
                  <Check size={13} aria-hidden="true" />
                  Synced
                </>
              ) : (
                <>
                  <RefreshCw size={13} aria-hidden="true" />
                  Sync to Setlist
                </>
              )}
            </button>

            {/* ── Inline error state (AC-15) ────────────────────────────────── */}
            {syncError && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-400 max-w-[200px] text-right"
              >
                {syncError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── YouTube section ──────────────────────────────────────────────────── */}
      {/*
        AC-23–27: embed container is CSS-hidden (not unmounted) when autoscroll is active.
        The toggle button is also hidden when autoscroll is active (AC-26).
        Both use visibility+pointer-events CSS-only hide to preserve the <iframe> DOM
        node and any in-progress audio/video playback.
        BUG-014/015: Never unmount the <iframe> to hide it.
      */}
      <div
        className={[
          "mb-4",
          isAutoScrollActive ? "invisible pointer-events-none" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {youtubeUrl ? (
          /* ── YouTube link present: show toggle button ───────────────────── */
          <>
            {/* Toggle button (AC-13, AC-15) */}
            <button
              type="button"
              onClick={() => setIsEmbedOpen((prev) => !prev)}
              aria-expanded={isEmbedOpen}
              aria-label={isEmbedOpen ? "Hide video" : "Show video"}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-xs font-semibold",
                "border transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                isEmbedOpen
                  ? "bg-brand-espresso text-brand-cream border-brand-espresso dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan"
                  : "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30 hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
              ].join(" ")}
            >
              {/* Video icon */}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              {isEmbedOpen ? "Hide video" : "Show video"}
            </button>

            {/* Add/Edit trigger — music_director only (AC-12, AC-29) */}
            {isMusicDirector && (
              <button
                ref={ytTriggerRef}
                type="button"
                onClick={handleYtModalOpen}
                className={[
                  "ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                  "text-xs font-semibold",
                  "border transition-colors duration-200",
                  "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30",
                  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                ].join(" ")}
              >
                Edit YouTube link
              </button>
            )}

            {/* Transient save success indicator (AC-10) */}
            {saveSuccess && (
              <span
                className="text-xs font-medium text-green-700 dark:text-green-400"
                aria-live="polite"
              >
                Saved!
              </span>
            )}

            {/*
              Embed container — CSS-collapsed (display:none) when user toggles it closed.
              NOT unmounted so the iframe is preserved in the DOM (AC-16 / BUG-014/015).
              When autoscroll hides this whole section, the parent div is invisible but
              the iframe remains mounted — audio continues (AC-24).
            */}
            <div
              className={["mt-3", isEmbedOpen ? "block" : "hidden"].join(" ")}
              aria-hidden={!isEmbedOpen}
            >
              {/* Responsive 16:9 embed container (AC-17) — BUG-021: use named brand utilities */}
              <div className="relative w-full rounded-xl overflow-hidden bg-brand-cream dark:bg-brand-espresso border border-brand-brown/20 dark:border-brand-tan/20 aspect-video">
                <iframe
                  src={youtubeUrl}
                  title={`${title} — YouTube video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                />
              </div>
            </div>
          </>
        ) : isMusicDirector ? (
          /* ── No YouTube link, viewer is music_director: show Add button (AC-7) ── */
          <>
            <button
              ref={ytTriggerRef}
              type="button"
              onClick={handleYtModalOpen}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-xs font-semibold",
                "border transition-colors duration-200",
                "text-brand-brown dark:text-brand-tan border-brand-brown/30 dark:border-brand-tan/30",
                "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              ].join(" ")}
            >
              {/* Plus icon */}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add YouTube link
            </button>

            {/* Transient save success indicator (AC-10) */}
            {saveSuccess && (
              <span
                className="ml-2 text-xs font-medium text-green-700 dark:text-green-400"
                aria-live="polite"
              >
                Saved!
              </span>
            )}
          </>
        ) : (
          /* ── No YouTube link, viewer is not music_director: neutral placeholder (AC-21/22) ── */
          <p className="text-xs text-brand-espresso/50 dark:text-brand-cream/40">
            No video available
          </p>
        )}
      </div>

      {/* ── Chord sheet — Client island ─────────────────────────────────────── */}
      {/*
        MemoChordSheetClient wraps ChordSheetClient in React.memo so that
        IntersectionObserver state changes in the navigator do not cause
        re-renders of the chord sheet (AC-11).

        originalKey is the song's stored key so transposition math stays correct.
        initialKey is the setlist's performanceKey so the sheet opens at that key on load.

        onKeyChange lifts the current displayKey back to this component
        so the Sync button can capture it without breaking ChordSheetClient's
        internal encapsulation of useTranspose. It also notifies the parent
        (SetlistViewerClient) of the new offset via onOffsetChange for the
        global chord drawer's uniqueChords recomputation.
      */}
      <MemoChordSheetClient
        processedLines={processedLines}
        originalKey={originalKey}
        initialKey={performanceKey}
        onKeyChange={handleKeyChange}
        onChordClick={onChordClick}
        externalKey={overrideKey}
        onKeyChangeLive={onKeyChangeLive ? handleKeyChangeLive : undefined}
        externalChordsHidden={externalChordsHidden}
        injectedAutoScroll={autoScroll}
        fontSize={fontSize}
        onIncreaseFont={onIncreaseFont}
        onDecreaseFont={onDecreaseFont}
        onResetFont={onResetFont}
        chordFontSize={chordFontSize}
        chordBg={chordBg}
        chordColor={chordColor}
        sectionIdPrefix={junctionId}
      />

      {/* ── YouTube Link Modal — music_director only (AC-8/9/10/11) ─────────── */}
      {isMusicDirector && (
        <YouTubeLinkModal
          isOpen={isYtModalOpen}
          onClose={handleYtModalClose}
          triggerRef={ytTriggerRef}
          songId={songId}
          currentUrl={youtubeUrl}
          onSaveSuccess={handleYtSaveSuccess}
        />
      )}
    </section>
  );
}

export default SetlistSongSection;
