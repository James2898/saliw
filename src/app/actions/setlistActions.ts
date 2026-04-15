'use server'

import { createClient } from '@/services/supabase/server'
import type { DbSetlist, DbSetlistSong } from '@/types/supabase'

/**
 * Creates a new setlist owned by the currently authenticated user.
 * Any authenticated user may create a setlist; leader_id is set to auth.uid().
 *
 * @param input - Setlist name, date, and optional is_public flag
 * @returns The created setlist row, or an error message
 */
export async function createSetlist(
  input: { name: string; date: string; is_public?: boolean }
): Promise<{ data: DbSetlist | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('setlists')
      .insert({
        name: input.name,
        date: input.date,
        leader_id: user.id,
        is_public: input.is_public ?? false,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: 'Unable to create setlist. Please try again.' }
    }

    return { data: data as DbSetlist, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Adds a song to a setlist.
 * Fetches the song's original_key and uses it as the initial performance_key.
 * Only the setlist's leader may add songs (enforced via RLS on setlist_songs).
 *
 * @param input - The setlist id, song id, and desired order position
 * @returns The created setlist_songs row, or an error message
 */
export async function addSongToSetlist(
  input: { setlist_id: string; song_id: string; order_index: number }
): Promise<{ data: DbSetlistSong | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Fetch the song's original_key to use as the default performance_key
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('original_key')
      .eq('id', input.song_id)
      .single()

    if (songError || !song) {
      return { data: null, error: 'Song not found.' }
    }

    const { data, error } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: input.setlist_id,
        song_id: input.song_id,
        order_index: input.order_index,
        performance_key: song.original_key,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'You do not have permission to modify this setlist.' }
      }
      return { data: null, error: 'Unable to add song to setlist. Please try again.' }
    }

    return { data: data as DbSetlistSong, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Reorders songs within a setlist by updating order_index for each specified entry.
 * Only the setlist's leader may reorder (enforced via RLS on setlist_songs).
 *
 * @param input - The setlist id and an array of { id, order_index } pairs,
 *                where id is the setlist_songs.id (junction table PK)
 * @returns The updated setlist_songs rows, or an error message
 */
export async function reorderSetlist(
  input: { setlist_id: string; updates: Array<{ id: string; order_index: number }> }
): Promise<{ data: DbSetlistSong[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    if (!input.updates || input.updates.length === 0) {
      return { data: null, error: 'No updates provided.' }
    }

    // Perform sequential updates for each setlist_songs row.
    // Each update is scoped to the specific setlist_id for RLS coherence.
    const updatedRows: DbSetlistSong[] = []

    for (const update of input.updates) {
      const { data, error } = await supabase
        .from('setlist_songs')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('setlist_id', input.setlist_id)
        .select()
        .single()

      if (error) {
        if (error.code === '42501') {
          return { data: null, error: 'You do not have permission to modify this setlist.' }
        }
        return { data: null, error: 'Unable to reorder setlist. Please try again.' }
      }

      updatedRows.push(data as DbSetlistSong)
    }

    return { data: updatedRows, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Deletes a setlist and all its associated setlist_songs entries (via CASCADE).
 * Only the setlist's leader may delete it (enforced via RLS on setlists).
 *
 * @param input - The id of the setlist to delete
 * @returns The deleted setlist id, or an error message
 */
export async function deleteSetlist(
  input: { id: string }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('setlists')
      .delete()
      .eq('id', input.id)

    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'You do not have permission to delete this setlist.' }
      }
      return { data: null, error: 'Unable to delete setlist. Please try again.' }
    }

    return { data: { id: input.id }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}
