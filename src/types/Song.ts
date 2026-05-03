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
  singer?: string;
};
