import type { ReactElement } from "react";
import Link from "next/link";
import SongKeyBadge from "@/components/SongKey/SongKeyBadge";
import type { SongSummary } from "@/types/Song";

export type RecentSong = SongSummary;

interface RecentSongsProps {
  songs: SongSummary[];
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan";

export default function RecentSongs({ songs }: RecentSongsProps): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-3">
        Recent Songs
      </p>
      {songs.length === 0 ? (
        <p className="text-sm text-brand-brown dark:text-brand-tan">
          No songs in the library yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/library/${song.id}`}
                className={[
                  "flex items-center justify-between gap-3 px-3 py-2 rounded-lg",
                  "hover:bg-brand-tan/10 transition-colors duration-200",
                  focusRing,
                ].join(" ")}
                aria-label={`View ${song.title} by ${song.artist}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-espresso dark:text-brand-cream leading-snug">
                    {song.title}
                  </p>
                  <p className="truncate text-xs font-medium text-brand-brown dark:text-brand-tan mt-0.5">
                    {song.artist}
                  </p>
                </div>
                <SongKeyBadge musicalKey={song.original_key} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
