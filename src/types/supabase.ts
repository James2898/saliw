/**
 * supabase.ts — Database-layer types for Saliw Music Portal.
 *
 * These types mirror the exact column names and types in the Supabase/PostgreSQL schema.
 * Use these types in Server Actions and data-fetching code.
 *
 * For frontend-facing types with ergonomic field names, see Song.ts and Setlist.ts.
 */

/**
 * Mirrors the public.songs table.
 */
export type DbSong = {
  id: string
  title: string
  artist: string
  original_key: string
  content: string
  created_by: string | null
}

/**
 * Mirrors the public.setlists table.
 */
export type DbSetlist = {
  id: string
  name: string
  date: string
  leader_id: string
  is_public: boolean
}

/**
 * Mirrors the public.setlist_songs junction table.
 */
export type DbSetlistSong = {
  id: string
  setlist_id: string
  song_id: string
  order_index: number
  performance_key: string
}
