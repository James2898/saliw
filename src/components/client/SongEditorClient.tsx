"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { preProcessChords, NOTES } from "@/utils/musicLogic";
import { updateSong } from "@/app/actions/songActions";
import { normaliseYouTubeUrl } from "@/components/client/YouTubeLinkModal";
import ChordSheetClient from "@/components/SongViewer/ChordSheetClient";
import type { Song } from "@/types/Song";

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

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-1.5";

interface SongEditorClientProps {
  song: Song;
}

type MobileTab = "edit" | "preview";

export default function SongEditorClient({ song }: SongEditorClientProps) {
  const router = useRouter();

  // ── Content state ───────────────────────────────────────────────────────────
  const [currentContent, setCurrentContent] = useState(song.content);
  const [savedBaseline, setSavedBaseline] = useState(song.content);

  // ── Singer state — lazy initializer avoids setState-in-effect ──────────────
  const [singer, setSinger] = useState(() => song.singer ?? "");

  // ── Saved baseline for singer (for dirty-tracking) ──────────────────────────
  const [savedSinger, setSavedSinger] = useState(() => song.singer ?? "");

  // ── Original key state ───────────────────────────────────────────────────────
  const [originalKey, setOriginalKey] = useState(
    () => song.original_key ?? "C"
  );
  const [savedOriginalKey, setSavedOriginalKey] = useState(
    () => song.original_key ?? "C"
  );

  // ── Title state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(() => song.title);
  const [savedTitle, setSavedTitle] = useState(() => song.title);

  // ── Artist state ─────────────────────────────────────────────────────────────
  const [artist, setArtist] = useState(() => song.artist);
  const [savedArtist, setSavedArtist] = useState(() => song.artist);

  // ── YouTube URL state — lazy initializer avoids setState-in-effect (BUG-001) ──
  const [youtubeUrl, setYoutubeUrl] = useState(() => song.youtube_url ?? "");
  const [savedYoutubeUrl, setSavedYoutubeUrl] = useState(
    () => song.youtube_url ?? ""
  );

  // isDirty: true if content, singer, original key, title, artist, or youtube_url diverge from last saved state
  const isDirty =
    currentContent !== savedBaseline ||
    singer !== savedSinger ||
    originalKey !== savedOriginalKey ||
    title !== savedTitle ||
    artist !== savedArtist ||
    youtubeUrl !== savedYoutubeUrl;

  // ── Mobile tab state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MobileTab>("edit");

  // ── Save state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Unsaved-changes modal state ─────────────────────────────────────────────
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const isModalOpen = pendingNavHref !== null;

  // ── Focus trap refs for modal ───────────────────────────────────────────────
  const modalStayRef = useRef<HTMLButtonElement>(null);
  const modalLeaveRef = useRef<HTMLButtonElement>(null);

  // ── beforeunload — browser-level guard ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Focus trap + Escape key for modal ──────────────────────────────────────
  useEffect(() => {
    if (!isModalOpen) return;

    // Focus the "Stay" button when modal opens
    modalStayRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingNavHref(null);
        return;
      }
      // Focus trap: Tab cycles between Stay and Leave buttons only
      if (e.key === "Tab") {
        e.preventDefault();
        const focusedEl = document.activeElement;
        if (focusedEl === modalStayRef.current) {
          modalLeaveRef.current?.focus();
        } else {
          modalStayRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // ── Modal actions ───────────────────────────────────────────────────────────
  const handleStay = () => setPendingNavHref(null);

  const handleLeave = () => {
    const href = pendingNavHref;
    setPendingNavHref(null);
    if (href) router.push(href);
  };

  // ── Paste & Clean ───────────────────────────────────────────────────────────
  const handleClean = () => {
    const cleaned = currentContent
      .split(/\r?\n|\r/)
      .map((line) => line.trimEnd())
      .join("\n");
    setCurrentContent(cleaned);
    setSaveError(null);
  };

  // ── Save action ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Normalise youtube_url before saving (AC-4/5/6)
    let normalisedYoutubeUrl: string | null = null;
    let youtubeUrlChanged = false;
    if (youtubeUrl !== savedYoutubeUrl) {
      const normalised = normaliseYouTubeUrl(youtubeUrl);
      if (!normalised.ok) {
        setIsSaving(false);
        setSaveError(normalised.error);
        return;
      }
      normalisedYoutubeUrl = normalised.embedUrl ?? null;
      youtubeUrlChanged = true;
    }

    const result = await updateSong({
      id: song.id,
      title,
      artist,
      original_key: originalKey,
      content: currentContent,
      singer: singer || undefined,
      ...(youtubeUrlChanged ? { youtube_url: normalisedYoutubeUrl } : {}),
    });

    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
    } else {
      setSavedBaseline(currentContent);
      setSavedSinger(singer);
      setSavedOriginalKey(originalKey);
      setSavedTitle(title);
      setSavedArtist(artist);
      setSavedYoutubeUrl(youtubeUrl);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // ── Live preview data ───────────────────────────────────────────────────────
  const processedLines = preProcessChords(currentContent);

  // ── Shared panel styles ─────────────────────────────────────────────────────
  const panelClasses = [
    "rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20",
    "bg-brand-cream dark:bg-brand-espresso",
    "p-4",
  ].join(" ");

  const tabButtonBase = [
    "px-4 py-2 text-sm font-semibold transition-colors duration-200 border-b-2",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
  ].join(" ");

  // ── Shared textarea element — auto-grows to fit content, no scrollbar ───────
  const textareaEl = (
    <textarea
      value={currentContent}
      onChange={(e) => {
        setCurrentContent(e.target.value);
        if (saveError) setSaveError(null);
        // Auto-resize: reset to auto so shrinking works, then expand to scrollHeight
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      aria-label="Song chord sheet editor"
      spellCheck={false}
      rows={1}
      className={[
        "w-full resize-none overflow-x-auto overflow-y-hidden rounded-xl p-3",
        "font-mono text-sm leading-relaxed",
        "text-brand-espresso dark:text-brand-cream",
        "bg-brand-cream dark:bg-brand-espresso",
        "border border-brand-brown/20 dark:border-brand-tan/20",
        "focus:outline-none focus:ring-2 focus:ring-brand-espresso dark:focus:ring-brand-tan focus:ring-offset-1",
        "transition-colors duration-200",
      ].join(" ")}
      style={{ whiteSpace: "pre" }}
      ref={(el) => {
        if (el) {
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }
      }}
    />
  );

  // ── Shared preview element ──────────────────────────────────────────────────
  const previewEl = (
    <div className="overflow-x-auto">
      <ChordSheetClient
        processedLines={processedLines}
        originalKey={originalKey}
      />
    </div>
  );

  return (
    <>
      {/* ── Metadata fields — Title, Artist, Singer, Original Key ─────────── */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
        {/* Title */}
        <div>
          <label htmlFor="editor-title" className={labelClass}>
            Title
          </label>
          <input
            id="editor-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            className={inputBaseClass}
          />
        </div>

        {/* Artist */}
        <div>
          <label htmlFor="editor-artist" className={labelClass}>
            Artist
          </label>
          <input
            id="editor-artist"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist or band name"
            className={inputBaseClass}
          />
        </div>

        {/* Singer */}
        <div>
          <label htmlFor="editor-singer" className={labelClass}>
            Singer
          </label>
          <input
            id="editor-singer"
            type="text"
            value={singer}
            onChange={(e) => setSinger(e.target.value)}
            placeholder="Vocalist name"
            className={inputBaseClass}
          />
        </div>

        {/* Original Key */}
        <div>
          <label htmlFor="editor-original-key" className={labelClass}>
            Original Key
          </label>
          <select
            id="editor-original-key"
            value={originalKey}
            onChange={(e) => setOriginalKey(e.target.value)}
            className={[
              inputBaseClass,
              "cursor-pointer",
              "font-mono font-bold",
            ].join(" ")}
          >
            {(NOTES as string[]).map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>

        {/* YouTube URL — spans full width on sm+ (sm:col-span-2) */}
        <div className="sm:col-span-2">
          <label htmlFor="editor-youtube-url" className={labelClass}>
            YouTube URL
          </label>
          <input
            id="editor-youtube-url"
            type="url"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (saveError) setSaveError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=... (optional)"
            className={inputBaseClass}
          />
          <p className="mt-1 text-xs text-brand-brown/60 dark:text-brand-tan/60">
            Leave blank to remove. Saved as a canonical embed URL.
          </p>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          aria-label={isSaving ? "Saving changes" : "Save changes"}
          className={[
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
            isDirty && !isSaving
              ? "bg-brand-espresso text-brand-cream hover:bg-brand-brown cursor-pointer"
              : "bg-brand-espresso/30 text-brand-cream/50 opacity-50 cursor-not-allowed",
          ].join(" ")}
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </button>

        <button
          type="button"
          onClick={handleClean}
          aria-label="Strip trailing whitespace and normalize line endings"
          className={[
            "px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
            "text-brand-espresso dark:text-brand-cream",
            "bg-brand-cream dark:bg-brand-espresso",
            "border border-brand-brown/30 dark:border-brand-tan/30",
            "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
          ].join(" ")}
        >
          Clean
        </button>

        {isDirty && (
          <span
            className="text-xs font-medium text-brand-brown dark:text-brand-tan"
            aria-live="polite"
          >
            Unsaved changes
          </span>
        )}

        {saveSuccess && (
          <span
            className="text-xs font-medium text-green-700 dark:text-green-400"
            aria-live="polite"
          >
            Saved!
          </span>
        )}
      </div>

      {/* ── Save error ──────────────────────────────────────────────────────── */}
      {saveError && (
        <p
          role="alert"
          className="mb-4 text-sm font-medium text-red-700 dark:text-red-400"
        >
          {saveError}
        </p>
      )}

      {/* ── Mobile tab bar — hidden on lg+ ──────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Editor view"
        className="flex gap-0 mb-4 border-b border-brand-brown/20 dark:border-brand-tan/20 lg:hidden"
      >
        <button
          id="tab-edit"
          type="button"
          role="tab"
          aria-selected={activeTab === "edit"}
          aria-controls="panel-edit"
          onClick={() => setActiveTab("edit")}
          className={[
            tabButtonBase,
            activeTab === "edit"
              ? "text-brand-espresso dark:text-brand-cream border-brand-espresso dark:border-brand-cream"
              : "text-brand-brown dark:text-brand-tan border-transparent hover:text-brand-espresso dark:hover:text-brand-cream",
          ].join(" ")}
        >
          Edit
        </button>
        <button
          id="tab-preview"
          type="button"
          role="tab"
          aria-selected={activeTab === "preview"}
          aria-controls="panel-preview"
          onClick={() => setActiveTab("preview")}
          className={[
            tabButtonBase,
            activeTab === "preview"
              ? "text-brand-espresso dark:text-brand-cream border-brand-espresso dark:border-brand-cream"
              : "text-brand-brown dark:text-brand-tan border-transparent hover:text-brand-espresso dark:hover:text-brand-cream",
          ].join(" ")}
        >
          Preview
        </button>
      </div>

      {/* ── Panels ──────────────────────────────────────────────────────────── */}
      {/*
        Desktop (lg+): two-column grid, both panels always visible.
        Mobile/tablet (<lg): only the active tab panel is rendered.
      */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Editor panel */}
        <div
          id="panel-edit"
          role="tabpanel"
          aria-labelledby="tab-edit"
          className={[
            panelClasses,
            activeTab === "edit" ? "block" : "hidden",
            "lg:block",
          ].join(" ")}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-2">
            Editor
          </p>
          {textareaEl}
        </div>

        {/* Preview panel */}
        <div
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className={[
            panelClasses,
            activeTab === "preview" ? "block" : "hidden",
            "lg:block",
          ].join(" ")}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-2">
            Preview
          </p>
          {previewEl}
        </div>
      </div>

      {/* ── Unsaved Changes Modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleStay();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-modal-title"
            className={[
              "w-full max-w-sm rounded-2xl p-6",
              "bg-brand-cream dark:bg-brand-espresso",
              "border border-brand-brown/20 dark:border-brand-tan/20",
              "shadow-2xl",
            ].join(" ")}
          >
            <h2
              id="unsaved-modal-title"
              className="text-lg font-extrabold text-brand-espresso dark:text-brand-cream mb-2"
            >
              Unsaved Changes
            </h2>
            <p className="text-sm text-brand-brown dark:text-brand-tan mb-6">
              You have unsaved changes to this song. If you leave now, your
              changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                ref={modalStayRef}
                type="button"
                onClick={handleStay}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
                  "text-brand-espresso dark:text-brand-cream",
                  "bg-brand-cream dark:bg-brand-espresso",
                  "border border-brand-brown/30 dark:border-brand-tan/30",
                  "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                ].join(" ")}
              >
                Stay
              </button>
              <button
                ref={modalLeaveRef}
                type="button"
                onClick={handleLeave}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
                  "bg-brand-espresso text-brand-cream",
                  "hover:bg-brand-brown",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
                ].join(" ")}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
