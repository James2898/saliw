"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOTES } from "@/utils/musicLogic";
import { createSong } from "@/app/actions/songActions";

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

/**
 * NewSongFormClient — Form for creating a new song.
 *
 * Fields: title, artist, original_key, content.
 * On submit: calls createSong() Server Action.
 * On success: navigates to /library/[id].
 * On error: displays error message inline near the submit button.
 */
export default function NewSongFormClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [originalKey, setOriginalKey] = useState<string>(NOTES[0] as string);
  const [singer, setSinger] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const result = await createSong({
        title: title.trim(),
        artist: artist.trim(),
        original_key: originalKey,
        content,
        singer: singer.trim() || undefined,
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
      <div className="flex flex-col gap-5">
        {/* ── Title ──────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="song-title" className={labelClass}>
            Title
          </label>
          <input
            id="song-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            required
            className={inputBaseClass}
          />
        </div>

        {/* ── Artist ─────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="song-artist" className={labelClass}>
            Artist
          </label>
          <input
            id="song-artist"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist or band name"
            required
            className={inputBaseClass}
          />
        </div>

        {/* ── Singer ─────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="song-singer" className={labelClass}>
            Singer
          </label>
          <input
            id="song-singer"
            type="text"
            value={singer}
            onChange={(e) => setSinger(e.target.value)}
            placeholder="Vocalist name"
            className={inputBaseClass}
          />
        </div>

        {/* ── Original Key ───────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="song-key" className={labelClass}>
            Original Key
          </label>
          <select
            id="song-key"
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

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="song-content" className={labelClass}>
            Chord Sheet
          </label>
          <textarea
            id="song-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            aria-label="Song chord sheet content"
            placeholder={
              "[VERSE]\nG    D    Em    C\nGreat is Thy faithfulness..."
            }
            required
            rows={16}
            spellCheck={false}
            className={[inputBaseClass, "font-mono resize-y"].join(" ")}
            style={{ whiteSpace: "pre" }}
          />
        </div>

        {/* ── Error message ──────────────────────────────────────────────────── */}
        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {/* ── Submit button ──────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
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
            {isSaving ? "Creating..." : "Create Song"}
          </button>
        </div>
      </div>
    </form>
  );
}
