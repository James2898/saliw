"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NOTES, preProcessChords } from "@/utils/musicLogic";
import { createSong } from "@/app/actions/songActions";
import { normaliseYouTubeUrl } from "@/components/client/YouTubeLinkModal";
import ChordSheetClient from "@/components/SongViewer/ChordSheetClient";

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

const panelClasses = [
  "rounded-2xl border border-brand-brown/20 dark:border-brand-tan/20",
  "bg-brand-cream dark:bg-brand-espresso",
  "p-4",
].join(" ");

export default function NewSongFormClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [originalKey, setOriginalKey] = useState<string>(NOTES[0] as string);
  const [singer, setSinger] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processedLines = preProcessChords(content);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      let normalisedYoutubeUrl: string | null = null;
      if (youtubeUrl.trim() !== "") {
        const normalised = normaliseYouTubeUrl(youtubeUrl);
        if (!normalised.ok) {
          setError(normalised.error);
          setIsSaving(false);
          return;
        }
        normalisedYoutubeUrl = normalised.embedUrl ?? null;
      }

      const result = await createSong({
        title: title.trim(),
        artist: artist.trim(),
        original_key: originalKey,
        content,
        singer: singer.trim() || undefined,
        youtube_url: normalisedYoutubeUrl,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        router.push(`/library/${result.data.id}`);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Metadata fields ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
        <div>
          <label htmlFor="song-title" className={labelClass}>
            Title
          </label>
          <input
            id="song-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Song title"
            required
            className={inputBaseClass}
          />
        </div>

        <div>
          <label htmlFor="song-artist" className={labelClass}>
            Artist
          </label>
          <input
            id="song-artist"
            type="text"
            value={artist}
            onChange={(e) => {
              setArtist(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Artist or band name"
            required
            className={inputBaseClass}
          />
        </div>

        <div>
          <label htmlFor="song-singer" className={labelClass}>
            Singer
          </label>
          <input
            id="song-singer"
            type="text"
            value={singer}
            onChange={(e) => {
              setSinger(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Vocalist name"
            className={inputBaseClass}
          />
        </div>

        <div>
          <label htmlFor="song-key" className={labelClass}>
            Original Key
          </label>
          <select
            id="song-key"
            value={originalKey}
            onChange={(e) => {
              setOriginalKey(e.target.value);
              if (error) setError(null);
            }}
            className={[
              inputBaseClass,
              "cursor-pointer font-mono font-bold",
            ].join(" ")}
          >
            {(NOTES as string[]).map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="song-youtube-url" className={labelClass}>
            YouTube URL
          </label>
          <input
            id="song-youtube-url"
            type="url"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=... (optional)"
            className={inputBaseClass}
          />
          <p className="mt-1 text-xs text-brand-brown/60 dark:text-brand-tan/60">
            Optional. Saved as a canonical embed URL.
          </p>
        </div>
      </div>

      {/* ── Editor + Preview panels ─────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 mb-6">
        {/* Editor panel */}
        <div className={panelClasses}>
          <p className={labelClass}>Chord Sheet</p>
          <textarea
            id="song-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            aria-label="Song chord sheet content"
            placeholder={
              "[VERSE]\nG    D    Em    C\nGreat is Thy faithfulness..."
            }
            required
            rows={1}
            spellCheck={false}
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
        </div>

        {/* Preview panel */}
        <div className={[panelClasses, "mt-6 lg:mt-0"].join(" ")}>
          <p className={labelClass}>Preview</p>
          {content.trim() ? (
            <div className="overflow-x-auto">
              <ChordSheetClient
                processedLines={processedLines}
                originalKey={originalKey}
              />
            </div>
          ) : (
            <p className="text-sm text-brand-brown/50 dark:text-brand-tan/50 font-mono">
              Preview will appear as you type…
            </p>
          )}
        </div>
      </div>

      {/* ── Error message ──────────────────────────────────────────────────────── */}
      {error && (
        <p
          role="alert"
          className="mb-4 text-sm font-medium text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* ── Submit button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          aria-label={isSaving ? "Creating song" : "Create song"}
          className={[
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
            "bg-brand-tan text-brand-espresso dark:bg-brand-tan dark:text-brand-espresso",
            "text-sm font-semibold font-sans",
            "border border-brand-tan dark:border-brand-tan",
            "hover:bg-brand-brown hover:text-brand-cream hover:border-brand-brown",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1",
            isSaving ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Creating…
            </>
          ) : (
            "Create Song"
          )}
        </button>
      </div>
    </form>
  );
}
