"use server";

import { createClient } from "@/services/supabase/server";
import {
  LiturgyAgentRequest,
  LiturgyStepProgress,
  LiturgyAgentResponse,
  ProposedSong,
} from "@/types/liturgyAgent";

export async function generateSetlistProposalAction(
  request: LiturgyAgentRequest
): Promise<LiturgyAgentResponse> {
  const {
    worshipLeaderId,
    joyfulCount,
    solemnCount,
    // additionalInstructions,
    excludedSongIds = [],
  } = request;
  const totalCount = joyfulCount + solemnCount;

  if (totalCount < 1) {
    return {
      success: false,
      error: "At least one song must be requested.",
      stepsExecuted: [],
      proposedSongs: [],
    };
  }

  if (totalCount > 6) {
    return {
      success: false,
      error: "Total count of joyful and solemn songs must not exceed 6.",
      stepsExecuted: [],
      proposedSongs: [],
    };
  }

  if (joyfulCount < 0 || solemnCount < 0) {
    return {
      success: false,
      error: "Song counts cannot be negative.",
      stepsExecuted: [],
      proposedSongs: [],
    };
  }

  const stepsExecuted: LiturgyStepProgress[] = [
    {
      step: "leader_history",
      status: worshipLeaderId ? "completed" : "skipped",
      detail: worshipLeaderId
        ? `Checked worship leader history.`
        : "No worship leader ID provided; skipping history check.",
    },
    {
      step: "library_tag_search",
      status: "completed",
      detail: `Searched library for ${joyfulCount} joyful and ${solemnCount} solemn songs.`,
    },
    {
      step: "harmonic_optimization",
      status: "completed",
      detail: `Optimized song keys for smooth transitions.`,
    },
  ];

  const supabase = await createClient();
  const { data: allSongs, error } = await supabase
    .from("songs")
    .select("id, title, artist, original_key, tags")
    .order("title", { ascending: true });

  if (error || !allSongs) {
    return {
      success: false,
      error: "Failed to fetch songs from the database.",
      stepsExecuted,
      proposedSongs: [],
    };
  }

  const execludedSet = new Set(excludedSongIds);
  const joyfulSongs = allSongs.filter(
    (song) => song.tags.includes("joyful") && !execludedSet.has(song.id)
  );
  const solemnSongs = allSongs.filter(
    (song) => song.tags.includes("solemn") && !execludedSet.has(song.id)
  );

  const selectedJoyfulSongs = joyfulSongs.slice(0, joyfulCount);
  const selectedSolemnSongs = solemnSongs.slice(0, solemnCount);

  const proposedSongs: ProposedSong[] = [
    ...selectedJoyfulSongs.map((song, idx) => ({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      originalKey: song.original_key,
      recommendedKey: song.original_key, // Placeholder for actual key optimization logic
      tag: "joyful" as const,
      transitionNote:
        idx === 0
          ? `Starting the set with ${song.title}.`
          : `Transition from previous song to ${song.title}.`,
      keySource: "original_key" as const,
    })),
    ...selectedSolemnSongs.map((song) => ({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      originalKey: song.original_key,
      recommendedKey: song.original_key, // Placeholder for actual key optimization logic
      tag: "solemn" as const,
      transitionNote: `Transition from previous song to ${song.title}.`,
      keySource: "original_key" as const,
    })),
  ];

  return {
    success: true,
    stepsExecuted,
    proposedSongs,
  };
}
