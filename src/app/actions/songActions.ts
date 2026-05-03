"use server";

import { createClient } from "@/services/supabase/server";
import { chordRegex, NOTES } from "@/utils/musicLogic";
import type { DbSong } from "@/types/supabase";

/**
 * Validates that the given song content contains at least one recognizable chord.
 * Uses the shared chordRegex from musicLogic.ts.
 *
 * IMPORTANT: chordRegex uses the global flag (g). Reset lastIndex before each .test() call
 * to prevent stale state from prior regex executions producing false negatives.
 */
function hasValidChordContent(content: string): boolean {
  chordRegex.lastIndex = 0;
  return chordRegex.test(content);
}

/**
 * Creates a new song in the songs table.
 * Requires: authenticated user with music_director role (enforced via RLS).
 * Validates: content must contain at least one chord.
 *
 * @param input - Song fields to insert
 * @returns The created song row, or an error message
 */
export async function createSong(input: {
  title: string;
  artist: string;
  original_key: string;
  content: string;
  singer?: string;
}): Promise<{ data: DbSong | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    if (
      input.original_key !== undefined &&
      !(NOTES as readonly string[]).includes(input.original_key)
    ) {
      return {
        data: null,
        error: "Invalid key. Must be one of: " + NOTES.join(", "),
      };
    }

    if (!hasValidChordContent(input.content)) {
      return {
        data: null,
        error: "Song content must contain at least one valid chord.",
      };
    }

    const { data, error } = await supabase
      .from("songs")
      .insert({
        title: input.title,
        artist: input.artist,
        original_key: input.original_key,
        content: input.content,
        created_by: user.id,
        singer: input.singer ?? null,
      })
      .select("id, title, artist, original_key, content, created_by, singer")
      .single();

    if (error) {
      if (error.code === "42501") {
        // PostgreSQL insufficient privilege — RLS rejection
        return {
          data: null,
          error: "You do not have permission to perform this action.",
        };
      }
      return { data: null, error: "Unable to create song. Please try again." };
    }

    return { data: data as DbSong, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Updates an existing song in the songs table.
 * Requires: authenticated user with music_director role (enforced via RLS).
 * Validates: if content is provided, it must contain at least one chord.
 *
 * @param input - Song id plus any fields to update (all optional except id)
 * @returns The updated song row, or an error message
 */
export async function updateSong(input: {
  id: string;
  title?: string;
  artist?: string;
  original_key?: string;
  content?: string;
  singer?: string;
}): Promise<{ data: DbSong | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Unauthorized" };
    }

    if (
      input.original_key !== undefined &&
      !(NOTES as readonly string[]).includes(input.original_key)
    ) {
      return {
        data: null,
        error: "Invalid key. Must be one of: " + NOTES.join(", "),
      };
    }

    if (input.content !== undefined && !hasValidChordContent(input.content)) {
      return {
        data: null,
        error: "Song content must contain at least one valid chord.",
      };
    }

    const { id, ...fields } = input;
    const updatePayload = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from("songs")
      .update(updatePayload)
      .eq("id", id)
      .select("id, title, artist, original_key, content, created_by, singer")
      .single();

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to perform this action.",
        };
      }
      if (error.code === "PGRST116") {
        // PostgREST: no rows returned — song not found or RLS hid it
        return { data: null, error: "Song not found." };
      }
      return { data: null, error: "Unable to update song. Please try again." };
    }

    return { data: data as DbSong, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Fetches all songs in the library for display in the SetlistBuilder Add panel.
 * READ-ONLY. No authentication required (songs_select_public RLS policy uses USING(true)).
 *
 * @returns All songs ordered by title ascending, or an error message
 */
export async function getAllSongs(): Promise<{
  data: Array<{
    id: string;
    title: string;
    artist: string;
    original_key: string;
  }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, original_key")
      .order("title", { ascending: true });

    if (error) {
      return {
        data: null,
        error: "Unable to load song library. Please try again.",
      };
    }

    return { data: data ?? [], error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Deletes a song from the songs table.
 * Requires: authenticated user with music_director role (enforced via RLS).
 *
 * @param input - The id of the song to delete
 * @returns The deleted song id, or an error message
 */
export async function deleteSong(input: {
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

    const { error } = await supabase.from("songs").delete().eq("id", input.id);

    if (error) {
      if (error.code === "42501") {
        return {
          data: null,
          error: "You do not have permission to perform this action.",
        };
      }
      return { data: null, error: "Unable to delete song. Please try again." };
    }

    return { data: { id: input.id }, error: null };
  } catch {
    return {
      data: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
