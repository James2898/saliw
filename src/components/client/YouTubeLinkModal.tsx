"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { updateSong } from "@/app/actions/songActions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface YouTubeLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref for the trigger button — focus returns here on modal close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  songId: string;
  /** Current stored youtube_url value (null if not set). */
  currentUrl: string | null;
  /** Called with the new canonical embed URL (or null if cleared) after successful save. */
  onSaveSuccess: (newUrl: string | null) => void;
}

// ── Utility: normalise any YouTube URL to a canonical embed URL ───────────────

/**
 * Extracts the YouTube video ID from a watch URL, youtu.be shortlink, or embed URL.
 * Returns null if the input does not match any known format.
 */
function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();

  // https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/
  );
  if (watchMatch) return watchMatch[1];

  // https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Validates and normalises a YouTube URL to the canonical embed format.
 * Returns { ok: true, embedUrl } on success, or { ok: false, error } if the URL is invalid.
 * An empty/blank string returns { ok: true, embedUrl: null } (clear the field — AC-6).
 */
export function normaliseYouTubeUrl(
  raw: string
): { ok: true; embedUrl: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, embedUrl: null };

  const videoId = extractYouTubeVideoId(trimmed);
  if (!videoId) {
    return { ok: false, error: "Please enter a valid YouTube URL." };
  }
  return { ok: true, embedUrl: `https://www.youtube.com/embed/${videoId}` };
}

// ── Module-level CSS class constants ──────────────────────────────────────────

const backdropClass =
  "fixed inset-0 z-[80] bg-[var(--brand-espresso)]/40 backdrop-blur-sm";

const panelClass = [
  "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "w-[min(90vw,28rem)]",
  "bg-brand-cream dark:bg-brand-espresso",
  "border border-brand-brown/20 dark:border-brand-tan/20",
  "rounded-2xl shadow-lg",
  "p-6",
].join(" ");

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5";

const inputBaseClass = [
  "w-full px-3 py-2 rounded-xl",
  "bg-brand-cream dark:bg-brand-espresso",
  "text-brand-espresso dark:text-brand-cream",
  "border border-brand-brown/30 dark:border-brand-tan/30",
  "text-sm font-sans",
  "placeholder:text-brand-brown/50 dark:placeholder:text-brand-tan/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  "transition-colors duration-200",
].join(" ");

// ── YouTubeLinkModal ──────────────────────────────────────────────────────────

/**
 * YouTubeLinkModal — Add/edit YouTube URL for a song.
 *
 * Doubles as both the "add" (no current URL) and "edit" (has URL) flow.
 * Input is validated and normalised to the canonical embed URL before saving.
 *
 * AC-7/8: Single modal, pre-filled with current URL.
 * AC-9: Save validates URL then calls updateSong Server Action.
 * AC-10: On success modal closes and onSaveSuccess is called with new URL.
 * AC-11: On Server Action failure, modal stays open with inline error.
 * BUG-007: All helper callbacks declared BEFORE useEffect blocks that reference them.
 * BUG-001: urlInput state uses a lazy initializer (no useEffect + setState).
 */
export default function YouTubeLinkModal({
  isOpen,
  onClose,
  triggerRef,
  songId,
  currentUrl,
  onSaveSuccess,
}: YouTubeLinkModalProps) {
  // Lazy initializer — BUG-001 compliance
  const [urlInput, setUrlInput] = useState(() => currentUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // ── Helpers — declared BEFORE useEffects (BUG-007) ────────────────────────

  /** Close modal and return focus to the trigger button. */
  const handleClose = useCallback(() => {
    setSaveError(null);
    setUrlError(null);
    onClose();
    triggerRef.current?.focus();
  }, [onClose, triggerRef]);

  /** Reset input to current URL when modal opens. */
  const resetInput = useCallback(() => {
    setUrlInput(currentUrl ?? "");
    setSaveError(null);
    setUrlError(null);
  }, [currentUrl]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setUrlError(null);

    const normalised = normaliseYouTubeUrl(urlInput);
    if (!normalised.ok) {
      setUrlError(normalised.error);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSong({
        id: songId,
        youtube_url: normalised.embedUrl,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      onSaveSuccess(normalised.embedUrl ?? null);
      onClose();
      triggerRef.current?.focus();
    } catch {
      setSaveError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [urlInput, songId, onSaveSuccess, onClose, triggerRef]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Reset input when modal opens (handles both "open new" and re-open cases).
  useEffect(() => {
    if (!isOpen) return;
    resetInput();
  }, [isOpen, resetInput]);

  // Move focus to input when modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Escape key dismiss + Tab focus trap.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusableSelectors = [
          "input:not([disabled])",
          "button:not([disabled])",
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

  const hasUrl = currentUrl !== null && currentUrl !== "";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className={backdropClass} aria-hidden="true" onClick={handleClose} />

      {/* Dialog panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="yt-modal-title"
        className={panelClass}
      >
        <h2
          id="yt-modal-title"
          className="text-base font-bold text-brand-espresso dark:text-brand-cream mb-4"
        >
          {hasUrl ? "Edit YouTube Link" : "Add YouTube Link"}
        </h2>

        {/* URL input */}
        <div className="mb-4">
          <label htmlFor="yt-url-input" className={labelClass}>
            YouTube URL
          </label>
          <input
            ref={inputRef}
            id="yt-url-input"
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (urlError) setUrlError(null);
              if (saveError) setSaveError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSave();
              }
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={[
              inputBaseClass,
              urlError
                ? "border-red-500 dark:border-red-400 focus-visible:ring-red-500"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-describedby={urlError ? "yt-url-error" : undefined}
          />
          {urlError && (
            <p
              id="yt-url-error"
              role="alert"
              className="mt-1 text-xs font-medium text-red-700 dark:text-red-400"
            >
              {urlError}
            </p>
          )}
        </div>

        {/* Server action error */}
        {saveError && (
          <p
            role="alert"
            className="mb-4 text-sm font-medium text-red-700 dark:text-red-400"
          >
            {saveError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className={[
              "px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
              "text-brand-espresso dark:text-brand-cream",
              "bg-brand-cream dark:bg-brand-espresso",
              "border border-brand-brown/30 dark:border-brand-tan/30",
              "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              isSaving ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            Cancel
          </button>
          <button
            ref={saveButtonRef}
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            aria-label={isSaving ? "Saving YouTube link" : "Save YouTube link"}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
              "bg-brand-espresso text-brand-cream dark:bg-brand-tan dark:text-brand-espresso",
              "hover:bg-brand-brown dark:hover:bg-brand-brown dark:hover:text-brand-cream",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
              isSaving ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isSaving ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
