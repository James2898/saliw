/**
 * Frontend-facing Song type.
 * Aligned with the public.songs database schema (TASK-007).
 *
 * Field mapping from legacy type:
 *   id: number  →  id: string (uuid)
 *   key: string →  original_key: string
 */

export type SongTag = "joyful" | "solemn" | "hymn" | (string & {});

export const STANDARD_SONG_TAGS = [
  { value: "joyful" as const, label: "Joyful" },
  { value: "solemn" as const, label: "Solemn" },
  { value: "hymn" as const, label: "Hymn" },
] as const;

export type Song = {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  content: string;
  singer?: string | null;
  youtube_url?: string | null;
  tags?: SongTag[];
};

/**
 * Canonical song summary used across dashboard, library lists, and setlist pickers.
 */
export type SongSummary = Pick<
  Song,
  "id" | "title" | "artist" | "original_key" | "tags"
>;
