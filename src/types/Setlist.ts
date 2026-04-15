/**
 * Frontend-facing Setlist type.
 * Aligned with the public.setlists database schema (TASK-007).
 *
 * Field mapping from legacy type:
 *   id: number        →  id: string (uuid)
 *   leader: string    →  leader_id: string (uuid)
 *   songs: Song[]     →  removed (relationship managed via setlist_songs junction table)
 *   (new)             →  is_public: boolean
 */
export type Setlist = {
  id: string
  name: string
  date: string
  leader_id: string
  is_public: boolean
}
