"use client";

import { useState, useRef } from "react";
import YouTubeLinkModal from "@/components/client/YouTubeLinkModal";

interface SongYouTubeSectionProps {
  songId: string;
  /** YouTube embed URL from the database (null if not set). */
  initialYoutubeUrl: string | null;
  /** True when the authenticated viewer is a music_director. */
  isMusicDirector: boolean;
}

/**
 * SongYouTubeSection — Client island for the YouTube embed section in the song viewer page.
 *
 * Rendered inside the Server Component at src/app/library/[id]/page.tsx.
 * Handles: embed toggle (AC-13–17), add/edit modal (AC-7–12), empty state (AC-21/22).
 * Autoscroll is not applicable to the song viewer page.
 *
 * BUG-007: All helper callbacks (handleYtModalOpen, handleYtModalClose, handleYtSaveSuccess)
 * are defined before any useEffect (no useEffects in this component — no BUG-007 risk).
 * BUG-001: No useEffect + setState; initialYoutubeUrl is used in a regular useState.
 * BUG-021: embed container uses named brand utilities (bg-brand-cream / dark:bg-brand-espresso).
 * BUG-004: All named Artisan utilities have explicit dark: pairs.
 */
export default function SongYouTubeSection({
  songId,
  initialYoutubeUrl,
  isMusicDirector,
}: SongYouTubeSectionProps) {
  // Local copy of the URL for optimistic update (AC-10)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(
    initialYoutubeUrl
  );
  // Embed toggle: starts collapsed on every page load (AC-14)
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  // YouTube link modal state
  const [isYtModalOpen, setIsYtModalOpen] = useState(false);
  // Ref for the "Add/Edit YouTube link" trigger button — focus returns here on modal close
  const ytTriggerRef = useRef<HTMLButtonElement>(null);
  // Transient success indicator (AC-10)
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleYtModalOpen = () => setIsYtModalOpen(true);
  const handleYtModalClose = () => setIsYtModalOpen(false);

  // Optimistic update: update local URL state immediately on save success (AC-10)
  const handleYtSaveSuccess = (newUrl: string | null) => {
    setYoutubeUrl(newUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (newUrl) {
      setIsEmbedOpen(true);
    } else {
      setIsEmbedOpen(false);
    }
  };

  return (
    <div className="mt-6 mb-4">
      {youtubeUrl ? (
        /* ── YouTube link present: show toggle + optional edit button ───────── */
        <>
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Edit link — music_director only (AC-12, AC-29) */}
            {isMusicDirector && (
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
          </div>

          {/*
            Embed container — CSS-collapsed (display:none) when user toggles it closed.
            NOT unmounted so the iframe is preserved in the DOM (AC-16 / BUG-014/015).
          */}
          <div
            className={["mt-3", isEmbedOpen ? "block" : "hidden"].join(" ")}
            aria-hidden={!isEmbedOpen}
          >
            {/* Responsive 16:9 embed container (AC-17) — BUG-021: use named brand utilities */}
            <div className="relative w-full rounded-xl overflow-hidden bg-brand-cream dark:bg-brand-espresso border border-brand-brown/20 dark:border-brand-tan/20 aspect-video">
              <iframe
                src={youtubeUrl}
                title="YouTube video"
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
    </div>
  );
}
