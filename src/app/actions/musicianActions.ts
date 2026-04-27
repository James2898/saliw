'use server'

import { createClient } from '@/services/supabase/server'
import type { DbMusician } from '@/types/supabase'

/**
 * Fetches all musicians from the musicians table, ordered by name ascending.
 * READ-ONLY. Any authenticated user may read musicians.
 *
 * @returns All musician rows ordered by name, or an error message
 */
export async function listMusicians(): Promise<{ data: DbMusician[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('musicians')
      .select('id, name, notes, created_by, created_at, updated_at')
      .order('name', { ascending: true })

    if (error) {
      return { data: null, error: 'Unable to load musicians. Please try again.' }
    }

    return { data: (data ?? []) as DbMusician[], error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Fetches a single musician by ID.
 * READ-ONLY. Any authenticated user may read musicians.
 *
 * @param input - The musician UUID to fetch
 * @returns The musician row, or an error message (PGRST116 → not-found)
 */
export async function getMusicianById(
  input: { id: string }
): Promise<{ data: DbMusician | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('musicians')
      .select('id, name, notes, created_by, created_at, updated_at')
      .eq('id', input.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Musician not found.' }
      }
      return { data: null, error: 'Unable to load musician. Please try again.' }
    }

    return { data: data as DbMusician, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Creates a new musician record.
 * Requires: authenticated user with music_director role (enforced via RLS).
 * Sets created_by to the currently authenticated user's id.
 *
 * @param input - The musician name and optional notes
 * @returns The created musician row, or an error message
 */
export async function createMusician(
  input: { name: string; notes?: string }
): Promise<{ data: DbMusician | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const userId = (await supabase.auth.getUser()).data.user?.id

    if (!userId) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('musicians')
      .insert({
        name: input.name,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select('id, name, notes, created_by, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'You do not have permission to perform this action.' }
      }
      return { data: null, error: 'Unable to create musician. Please try again.' }
    }

    return { data: data as DbMusician, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Updates an existing musician record.
 * Requires: authenticated user with music_director role (enforced via RLS).
 * Only the fields explicitly provided are updated; omitted fields preserve their existing values.
 * If both name and notes are omitted, returns an error without touching the database.
 *
 * @param input - The musician id plus optional name and/or notes
 * @returns The updated musician row, or an error message
 */
export async function updateMusician(
  input: { id: string; name?: string; notes?: string }
): Promise<{ data: DbMusician | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Guard: at least one field must be supplied
    if (input.name === undefined && input.notes === undefined) {
      return { data: null, error: 'No fields to update.' }
    }

    // Build payload with only the fields that are explicitly provided
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.notes !== undefined) payload.notes = input.notes

    const { data, error } = await supabase
      .from('musicians')
      .update(payload)
      .eq('id', input.id)
      .select('id, name, notes, created_by, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'You do not have permission to perform this action.' }
      }
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Musician not found.' }
      }
      return { data: null, error: 'Unable to update musician. Please try again.' }
    }

    return { data: data as DbMusician, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}

/**
 * Deletes a musician record by ID.
 * Requires: authenticated user with music_director role (enforced via RLS).
 * FK constraints handle downstream effects (ON DELETE SET NULL / CASCADE in the DB).
 *
 * @param input - The musician id to delete
 * @returns The deleted musician id, or an error message
 */
export async function deleteMusician(
  input: { id: string }
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('musicians')
      .delete()
      .eq('id', input.id)

    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'You do not have permission to perform this action.' }
      }
      return { data: null, error: 'Unable to delete musician. Please try again.' }
    }

    return { data: { id: input.id }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred. Please try again.' }
  }
}
