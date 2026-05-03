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
  id: string;
  name: string;
  date: string;
  /**
   * The authenticated Supabase user who owns (created) this setlist.
   * Distinct from worship_leader_id, which references a row in public.musicians
   * and represents the human worship leader credited for the service.
   */
  leader_id: string;
  /**
   * Optional reference to a musicians.id row identifying the worship leader
   * for this service. Null when no worship leader has been assigned.
   * Distinct from leader_id, which is the Supabase auth uid of the setlist owner.
   */
  worship_leader_id: string | null;
  is_public: boolean;
};
