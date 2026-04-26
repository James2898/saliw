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
  singer: string | null
  created_at: string
  updated_at: string
}

/**
 * Mirrors the public.setlists table.
 */
export type DbSetlist = {
  id: string
  name: string
  date: string
  leader_id: string
  worship_leader_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
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

/**
 * Mirrors the public.musicians table.
 */
export type DbMusician = {
  id: string
  name: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Mirrors the public.setlist_musicians junction table.
 */
export type DbSetlistMusician = {
  id: string
  setlist_id: string
  musician_id: string
  instrument: string
  created_at: string
  updated_at: string
}
