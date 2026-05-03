"use server";

import { createClient } from "@/services/supabase/server";
import { NOTES } from "@/utils/musicLogic";
import type {
  DbSetlist,
  DbSetlistSong,
  DbSetlistMusician,
} from "@/types/supabase";
import type { SetlistLineupEntry } from "@/types/Musician";

/**
 * Fetches the header fields of a single setlist by its ID.
 * Any authenticated user may read setlists (setlists_select_authenticated RLS policy).
 *
 * @param input - The setlist UUID to fetch
 * @returns The setlist header row, or an error message
 */
export async function getSetlistById(input: { id: string }): Promise<{
  data: {
    id: string;
    name: string;
    date: string;
    leader_id: string;
    worship_leader_id: string | null;
    is_public: boolean;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("setlists")
      .select("id, name, date, leader_id, worship_leader_id, is_public")
      .eq("id", input.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          data: null,
          error: "Unable to load setlist. Please try again.",
        };
      }
      return { data: null, error: "Unable to load setlist. Please try again." };
    }

    return {
      data: data as {
        id: string;
        name: string;
        date: string;
        leader_id: string;
        worship_leader_id: string | null;
        is_public: boolean;
      },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Creates a new setlist owned by the currently authenticated user.
 * Any authenticated user may create a setlist; leader_id is set to auth.uid().
 *
 * @param input - Setlist name, date, and optional is_public flag
 * @returns The created setlist row, or an error message
 */
export async function createSetlist(input: {
  name: string;
  date: string;
  is_public?: boolean;
}): Promise<{ data: DbSetlist | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("setlists")
      .insert({
        name: input.name,
        date: input.date,
        leader_id: user.id,
        is_public: input.is_public ?? false,
      })
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: "Unable to create setlist. Please try again.",
      };
    }

    return { data: data as DbSetlist, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Adds a song to a setlist.
 * Fetches the song's original_key and uses it as the initial performance_key.
 * Computes order_index server-side as MAX(order_index) + 1 (or 0 for empty setlists).
 * Only the setlist's leader may add songs (enforced via RLS on setlist_songs).
 *
 * @param input - The setlist id and song id
 * @returns The created setlist_songs row, or an error message
 */
export async function addSongToSetlist(input: {
  setlist_id: string;
  song_id: string;
}): Promise<{ data: DbSetlistSong | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Compute next order_index server-side using maybeSingle() to handle empty setlist gracefully
    const { data: maxRow } = await supabase
      .from("setlist_songs")
      .select("order_index")
      .eq("setlist_id", input.setlist_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextIndex = maxRow ? maxRow.order_index + 1 : 0;

    // Fetch the song's original_key to use as the default performance_key
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("original_key")
      .eq("id", input.song_id)
      .single();

    if (songError?.code === "PGRST116" || !song) {
      return { data: null, error: "Song not found." };
    }

    if (songError) {
      return { data: null, error: "Song not found." };
    }

    // Validate the original_key against the canonical NOTES array
    if (!(NOTES as readonly string[]).includes(song.original_key)) {
      return { data: null, error: "Song has an invalid original key." };
    }

    const { data, error } = await supabase
      .from("setlist_songs")
      .insert({
        setlist_id: input.setlist_id,
        song_id: input.song_id,
        order_index: nextIndex,
        performance_key: song.original_key,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to modify this setlist.",
        };
      }
      return {
        data: null,
        error: "Unable to add song to setlist. Please try again.",
      };
    }

    return { data: data as DbSetlistSong, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Removes a song entry from a setlist, then re-indexes the remaining entries
 * sequentially (0, 1, 2, …) to close the gap.
 * Only the setlist's leader may remove songs (enforced via RLS on setlist_songs).
 *
 * @param input - The setlist_songs PK (id) and the setlist_id for RLS scoping
 * @returns The deleted setlist_songs id, or an error message
 */
export async function removeSongFromSetlist(input: {
  id: string;
  setlist_id: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Delete the target row, scoped to the setlist for RLS
    const { error: deleteError, count } = await supabase
      .from("setlist_songs")
      .delete({ count: "exact" })
      .eq("id", input.id)
      .eq("setlist_id", input.setlist_id);

    if (deleteError) {
      if (deleteError.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to modify this setlist.",
        };
      }
      return {
        data: null,
        error: "Unable to remove song from setlist. Please try again.",
      };
    }

    if (count === 0) {
      return { data: null, error: "Song entry not found in setlist." };
    }

    // Fetch remaining rows ordered by current order_index to re-index them
    const { data: remaining, error: fetchError } = await supabase
      .from("setlist_songs")
      .select("id")
      .eq("setlist_id", input.setlist_id)
      .order("order_index", { ascending: true });

    if (fetchError) {
      return {
        data: null,
        error: "Unable to remove song from setlist. Please try again.",
      };
    }

    // Sequential re-index loop — each update scoped to setlist_id for RLS
    for (let i = 0; i < (remaining ?? []).length; i++) {
      const row = remaining![i];
      const { error: updateError } = await supabase
        .from("setlist_songs")
        .update({ order_index: i })
        .eq("id", row.id)
        .eq("setlist_id", input.setlist_id);

      if (updateError) {
        return {
          data: null,
          error: "Unable to remove song from setlist. Please try again.",
        };
      }
    }

    return { data: { id: input.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
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
export async function updateSetlistSongOrder(input: {
  setlist_id: string;
  updates: Array<{ id: string; order_index: number }>;
}): Promise<{ data: DbSetlistSong[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    if (!input.updates || input.updates.length === 0) {
      return { data: null, error: "No updates provided." };
    }

    // Perform sequential updates for each setlist_songs row.
    // Each update is scoped to the specific setlist_id for RLS coherence.
    const updatedRows: DbSetlistSong[] = [];

    for (const update of input.updates) {
      const { data, error } = await supabase
        .from("setlist_songs")
        .update({ order_index: update.order_index })
        .eq("id", update.id)
        .eq("setlist_id", input.setlist_id)
        .select()
        .single();

      if (error) {
        if (error.code === "42501") {
          return {
            data: null,
            error: "You do not have permission to modify this setlist.",
          };
        }
        return {
          data: null,
          error: "Unable to reorder setlist. Please try again.",
        };
      }

      updatedRows.push(data as DbSetlistSong);
    }

    return { data: updatedRows, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Updates the performance_key for a specific setlist_songs entry.
 * Only the setlist's leader may update performance details (enforced via RLS).
 *
 * @param input - The setlist_songs PK (id), the setlist_id for RLS scoping,
 *                and optional performance_key
 * @returns The full updated setlist_songs row, or an error message
 */
export async function updatePerformanceDetails(input: {
  id: string;
  setlist_id: string;
  performance_key?: string;
}): Promise<{ data: DbSetlistSong | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Guard: at least one field must be supplied
    if (input.performance_key === undefined) {
      return { data: null, error: "No fields to update." };
    }

    // Validate performance_key against NOTES if provided
    if (!(NOTES as readonly string[]).includes(input.performance_key)) {
      return {
        data: null,
        error: "Invalid performance key. Must be one of: " + NOTES.join(", "),
      };
    }

    // Build payload conditionally: only include fields that are explicitly present
    const payload: Record<string, unknown> = {};
    if (input.performance_key !== undefined)
      payload.performance_key = input.performance_key;

    const { data, error } = await supabase
      .from("setlist_songs")
      .update(payload)
      .eq("id", input.id)
      .eq("setlist_id", input.setlist_id)
      .select()
      .single();

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to modify this setlist.",
        };
      }
      if (error.code === "PGRST116") {
        return { data: null, error: "Setlist song entry not found." };
      }
      return {
        data: null,
        error: "Unable to update performance details. Please try again.",
      };
    }

    return { data: data as DbSetlistSong, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Fetches all songs for a setlist in a single join query (no N+1).
 * Returns setlist_songs rows with embedded song data, ordered by order_index ascending.
 * Any authenticated user may read (setlist_songs_select_authenticated RLS policy).
 *
 * @param input - The setlist id to fetch songs for
 * @returns An array of setlist_songs with joined song fields, or an error message
 */
export async function getSetlistWithSongs(input: {
  setlist_id: string;
}): Promise<{
  data: Array<{
    id: string;
    song_id: string;
    order_index: number;
    performance_key: string;
    songs: {
      id: string;
      title: string;
      artist: string;
      original_key: string;
      content: string;
    };
  }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("setlist_songs")
      .select(
        "id, song_id, order_index, performance_key, songs(id, title, artist, original_key, content)"
      )
      .eq("setlist_id", input.setlist_id)
      .order("order_index", { ascending: true });

    if (error) {
      return { data: null, error: "Unable to load setlist. Please try again." };
    }

    // Empty array is a valid success (setlist exists but has no songs).
    // Supabase infers the embedded relation as an array; cast via unknown to match the
    // contract shape where songs is a single object (FK relationship guarantees one song per row).
    return {
      data: (data ?? []) as unknown as Array<{
        id: string;
        song_id: string;
        order_index: number;
        performance_key: string;
        songs: {
          id: string;
          title: string;
          artist: string;
          original_key: string;
          content: string;
        };
      }>,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Updates the name, date, and/or worship_leader_id of an existing setlist.
 * All fields are optional; at least one must be supplied.
 * Only the setlist's leader may update it (enforced via RLS on setlists).
 *
 * @param input - The setlist id plus any combination of name, date, and worship_leader_id
 * @returns The updated setlist id, or an error message
 */
export async function updateSetlist(input: {
  id: string;
  name?: string;
  date?: string;
  worship_leader_id?: string | null;
  is_public?: boolean;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Guard: at least one field must be provided
    if (
      input.name === undefined &&
      input.date === undefined &&
      input.worship_leader_id === undefined &&
      input.is_public === undefined
    ) {
      return { data: null, error: "No fields to update." };
    }

    // Build payload conditionally — only include fields that are explicitly present
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.date !== undefined) payload.date = input.date || null;
    if (input.worship_leader_id !== undefined)
      payload.worship_leader_id = input.worship_leader_id;
    if (input.is_public !== undefined) payload.is_public = input.is_public;

    const { error } = await supabase
      .from("setlists")
      .update(payload)
      .eq("id", input.id);

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to modify this setlist.",
        };
      }
      return {
        data: null,
        error: "Unable to update setlist. Please try again.",
      };
    }

    return { data: { id: input.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Clones a setlist and all its songs, creating a new setlist owned by the current user.
 * The cloned setlist's name will have " copy" appended to it.
 * Performance keys and order_index values from the source are preserved.
 *
 * @param input - The id of the source setlist to clone
 * @returns The newly created setlist id, or an error message
 */
export async function cloneSetlist(input: {
  id: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    // Fetch the source setlist header
    const { data: source, error: sourceError } = await supabase
      .from("setlists")
      .select("id, name, date, is_public, worship_leader_id")
      .eq("id", input.id)
      .single();

    if (sourceError || !source) {
      return {
        data: null,
        error: "Unable to load source setlist. Please try again.",
      };
    }

    // Create the new setlist with " copy" appended to the name; copy worship_leader_id
    const { data: cloned, error: createError } = await supabase
      .from("setlists")
      .insert({
        name: `${source.name} copy`,
        date: source.date,
        leader_id: user.id,
        is_public: source.is_public,
        worship_leader_id: source.worship_leader_id,
      })
      .select("id")
      .single();

    if (createError || !cloned) {
      return {
        data: null,
        error: "Unable to clone setlist. Please try again.",
      };
    }

    // Fetch all songs from the source setlist ordered by order_index
    const { data: sourceSongs, error: songsError } = await supabase
      .from("setlist_songs")
      .select("song_id, order_index, performance_key")
      .eq("setlist_id", input.id)
      .order("order_index", { ascending: true });

    if (songsError) {
      // Rollback: delete the cloned setlist header (songs cascade won't trigger since none were added)
      await supabase.from("setlists").delete().eq("id", cloned.id);
      return {
        data: null,
        error: "Unable to clone setlist songs. Please try again.",
      };
    }

    // Insert all songs into the cloned setlist preserving order and performance keys
    if (sourceSongs && sourceSongs.length > 0) {
      const rows = sourceSongs.map((s) => ({
        setlist_id: cloned.id,
        song_id: s.song_id,
        order_index: s.order_index,
        performance_key: s.performance_key,
      }));

      const { error: insertError } = await supabase
        .from("setlist_songs")
        .insert(rows);

      if (insertError) {
        // Rollback: delete the cloned setlist header
        await supabase.from("setlists").delete().eq("id", cloned.id);
        return {
          data: null,
          error: "Unable to clone setlist songs. Please try again.",
        };
      }
    }

    // Copy the lineup (setlist_musicians) from the source setlist to the clone
    const { data: sourceLineup, error: lineupFetchError } = await supabase
      .from("setlist_musicians")
      .select("musician_id, instrument")
      .eq("setlist_id", input.id);

    if (lineupFetchError) {
      // Rollback: delete the cloned setlist header (cascade deletes cloned songs too)
      await supabase.from("setlists").delete().eq("id", cloned.id);
      return {
        data: null,
        error: "Unable to clone setlist lineup. Please try again.",
      };
    }

    if (sourceLineup && sourceLineup.length > 0) {
      const lineupRows = sourceLineup.map((m) => ({
        setlist_id: cloned.id,
        musician_id: m.musician_id,
        instrument: m.instrument,
      }));

      const { error: lineupInsertError } = await supabase
        .from("setlist_musicians")
        .insert(lineupRows);

      if (lineupInsertError) {
        // Rollback: delete the cloned setlist header (cascade deletes cloned songs too)
        await supabase.from("setlists").delete().eq("id", cloned.id);
        return {
          data: null,
          error: "Unable to clone setlist lineup. Please try again.",
        };
      }
    }

    return { data: { id: cloned.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Deletes a setlist and all its associated setlist_songs entries (via CASCADE).
 * Only the setlist's leader may delete it (enforced via RLS on setlists).
 *
 * @param input - The id of the setlist to delete
 * @returns The deleted setlist id, or an error message
 */
export async function deleteSetlist(input: {
  id: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("setlists")
      .delete()
      .eq("id", input.id);

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to delete this setlist.",
        };
      }
      return {
        data: null,
        error: "Unable to delete setlist. Please try again.",
      };
    }

    return { data: { id: input.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Sets or clears the worship_leader_id for a setlist.
 * Delegates to updateSetlist to keep all setlist mutation logic in one place.
 * Only the setlist's leader may update it (enforced via RLS on setlists).
 *
 * @param input - The setlist id and the new worship_leader_id (pass null to clear)
 * @returns The updated setlist id, or an error message
 */
export async function setSetlistWorshipLeader(input: {
  setlist_id: string;
  worship_leader_id: string | null;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  return updateSetlist({
    id: input.setlist_id,
    worship_leader_id: input.worship_leader_id,
  });
}

/**
 * Adds a musician to a setlist lineup with a specified instrument.
 * Only the setlist's leader may manage the lineup (enforced via RLS on setlist_musicians).
 *
 * @param input - The setlist id, musician id, and instrument name
 * @returns The created setlist_musicians row, or an error message
 */
export async function addSetlistMusician(input: {
  setlist_id: string;
  musician_id: string;
  instrument: string;
}): Promise<{ data: DbSetlistMusician | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("setlist_musicians")
      .insert({
        setlist_id: input.setlist_id,
        musician_id: input.musician_id,
        instrument: input.instrument.trim(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          data: null,
          error: "That musician is already assigned to that instrument.",
        };
      }
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to perform this action.",
        };
      }
      return {
        data: null,
        error: "Unable to add musician to setlist. Please try again.",
      };
    }

    return { data: data as DbSetlistMusician, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Removes a musician entry from a setlist lineup.
 * Only the setlist's leader may manage the lineup (enforced via RLS on setlist_musicians).
 *
 * @param input - The setlist_musicians PK (id) and the setlist_id for RLS scoping
 * @returns The deleted row id, or an error message
 */
export async function removeSetlistMusician(input: {
  id: string;
  setlist_id: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("setlist_musicians")
      .delete()
      .eq("id", input.id)
      .eq("setlist_id", input.setlist_id);

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to perform this action.",
        };
      }
      return {
        data: null,
        error: "Unable to remove musician from setlist. Please try again.",
      };
    }

    return { data: { id: input.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Fetches the full lineup for a setlist, with musician details resolved.
 * Any authenticated user may read the lineup (read is open to authenticated users via RLS).
 *
 * @param input - The setlist id
 * @returns An array of SetlistLineupEntry rows, or an error message
 */
export async function getSetlistLineup(input: {
  setlist_id: string;
}): Promise<{ data: SetlistLineupEntry[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("setlist_musicians")
      .select("id, musician_id, instrument, musicians(id, name)")
      .eq("setlist_id", input.setlist_id)
      .order("instrument", { ascending: true })
      .order("name", { referencedTable: "musicians", ascending: true });

    if (error) {
      return {
        data: null,
        error: "Unable to load setlist lineup. Please try again.",
      };
    }

    return {
      data: (data ?? []) as unknown as SetlistLineupEntry[],
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
