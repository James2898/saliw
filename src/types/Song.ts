/**
 * Frontend-facing Song type.
 * Aligned with the public.songs database schema (TASK-007).
 *
 * Field mapping from legacy type:
 *   id: number  →  id: string (uuid)
 *   key: string →  original_key: string
 */
export type Song = {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  content: string;
  singer?: string | null;
  youtube_url?: string | null;
};

/**
 * Canonical 4-field song summary used across dashboard, library lists, and setlist pickers.
 */
export type SongSummary = Pick<
  Song,
  "id" | "title" | "artist" | "original_key"
>;
