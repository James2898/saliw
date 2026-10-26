"use client";

import { useState } from "react";
import SongCard from "@/components/client/SongCard";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import SongTagBadge from "@/components/SongTags/SongTagBadge";
import { STANDARD_SONG_TAGS } from "@/types/Song";
import type { SongLibraryItem } from "./SetlistBuilderClient";

const TAG_OPTIONS = [
  { label: "All", value: null },
  ...STANDARD_SONG_TAGS.map((t) => ({ label: t.label, value: t.value })),
];

interface LibraryPanelProps {
  songs: SongLibraryItem[];
  addedIds: Set<string>;
  onAdd: (song: SongLibraryItem) => void;
  addingId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  libraryError?: string | null;
  listClassName?: string;
}

export default function LibraryPanel({
  songs,
  addedIds,
  onAdd,
  addingId,
  query,
  onQueryChange,
  libraryError,
  listClassName,
}: LibraryPanelProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // ── Library fetch error ────────────────────────────────────────────────────
  if (libraryError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest">
          Song Library
        </p>
        <p className="text-brand-brown dark:text-brand-tan text-sm">
          Unable to load song library. Please try again.
        </p>
      </div>
    );
  }

  // ── Library is empty ───────────────────────────────────────────────────────
  if (songs.length === 0 && !query) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest">
          Song Library
        </p>
        <p className="text-brand-brown dark:text-brand-tan text-sm">
          No songs in the library yet.
        </p>
      </div>
    );
  }

  // ── Client-side filtered list ──────────────────────────────────────────────
  const lowerQuery = query.toLowerCase();
  const filtered = songs.filter((s) => {
    const matchesQuery =
      query.trim() === "" ||
      s.title.toLowerCase().includes(lowerQuery) ||
      s.artist.toLowerCase().includes(lowerQuery);

    const matchesTag =
      !selectedTag ||
      (s.tags &&
        s.tags.some(
          (t) => t.trim().toLowerCase() === selectedTag.toLowerCase()
        ));

    return matchesQuery && matchesTag;
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-brand-brown/60 dark:text-brand-tan/60 uppercase tracking-widest">
        Song Library
      </p>

      {/* Tag quick filter bar */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none"
        role="group"
        aria-label="Filter library by tag"
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
              onClick={() => setSelectedTag(value)}
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

      {/* Search input */}
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search by title or artist…"
        aria-label="Search song library"
        className={[
          "w-full rounded-xl border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream dark:bg-brand-espresso",
          "px-4 py-2 text-sm text-brand-espresso dark:text-brand-cream placeholder-brand-brown/40 dark:placeholder-brand-tan/40",
          "focus:outline-none focus:ring-2 focus:ring-brand-brown/40 dark:focus:ring-brand-tan/40",
          "transition-colors duration-200",
        ].join(" ")}
      />

      {filtered.length === 0 ? (
        <p className="text-brand-brown dark:text-brand-tan text-sm">
          No songs match your search.
        </p>
      ) : (
        <div
          className={["flex flex-col gap-2", listClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {filtered.map((song) => {
            const isAdded = addedIds.has(song.id);
            const isAdding = addingId === song.id;

            return (
              <SongCard
                key={song.id}
                title={song.title}
                artist={song.artist}
                badgeSlot={
                  song.tags && song.tags.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {song.tags.map((t) => (
                        <SongTagBadge key={t} tag={t} size="sm" />
                      ))}
                    </div>
                  ) : undefined
                }
                actionsSlot={
                  <>
                    <SongKeyBadge musicalKey={song.original_key} />
                    <button
                      type="button"
                      onClick={() => !isAdded && !isAdding && onAdd(song)}
                      disabled={isAdded || isAdding}
                      aria-disabled={isAdded || isAdding}
                      aria-label={
                        isAdded
                          ? `${song.title} already added`
                          : `Add ${song.title}`
                      }
                      className={[
                        "shrink-0 text-sm font-medium px-3 py-1 rounded-lg border transition-colors duration-200",
                        isAdded
                          ? "border-brand-brown/20 dark:border-brand-tan/20 text-brand-brown/40 dark:text-brand-tan/40 cursor-not-allowed bg-transparent"
                          : isAdding
                            ? "border-brand-brown/20 dark:border-brand-tan/20 text-brand-brown/40 dark:text-brand-tan/40 cursor-not-allowed bg-transparent"
                            : "border-brand-brown dark:border-brand-tan text-brand-brown dark:text-brand-tan hover:bg-[var(--brand-tan-alpha)]",
                      ].join(" ")}
                    >
                      {isAdding ? (
                        <span
                          className="inline-block w-3 h-3 border-2 border-brand-brown/40 dark:border-brand-tan/40 border-t-brand-brown dark:border-t-brand-tan rounded-full animate-spin"
                          aria-hidden="true"
                        />
                      ) : isAdded ? (
                        "Added"
                      ) : (
                        "Add"
                      )}
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
