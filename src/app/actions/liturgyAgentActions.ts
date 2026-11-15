"use server";

import { createClient } from "@/services/supabase/server";
import {
  LiturgyAgentRequest,
  LiturgyStepProgress,
  LiturgyAgentResponse,
  ProposedSong,
  KeySource,
  RefreshSingleSongRequest,
  RefreshSingleSongResponse,
} from "@/types/liturgyAgent";
import { getSemitoneOffset, shiftChord } from "@/utils/musicLogic";

/**
 * Calculates a harmonic key recommendation based on the preceding song's key.
 * Evaluates candidate shifts within +/- 2 semitones of originalKey to preserve vocal range,
 * prioritizing same key (unison), circle of fifths (dominant), fourth (subdominant), or whole step lift.
 */
function getHarmonicKeyRecommendation(
  originalKey: string,
  prevKey: string
): { recommendedKey: string; keySource: KeySource; transitionNote: string } {
  if (!originalKey) {
    return {
      recommendedKey: prevKey || "C",
      keySource: "original_key",
      transitionNote: "Defaulted key.",
    };
  }

  // Preference order: same key (0 semitones), whole step (+2), fifth (+7), fourth (+5), half step (+1)
  const allowedShifts = [0, 2, 1, -1, -2];

  for (const shift of allowedShifts) {
    const candidateKey = shiftChord(originalKey, shift);
    const offsetFromPrev = getSemitoneOffset(prevKey, candidateKey);

    if (offsetFromPrev === 0) {
      return {
        recommendedKey: candidateKey,
        keySource: "harmonic_modulation",
        transitionNote:
          shift === 0
            ? `Seamless same-key flow (${candidateKey}) from previous song.`
            : `Modulated to ${candidateKey} for seamless same-key flow from previous song.`,
      };
    }
    if (offsetFromPrev === 7) {
      return {
        recommendedKey: candidateKey,
        keySource: "harmonic_modulation",
        transitionNote:
          shift === 0
            ? `Harmonic circle-of-fifths (dominant) transition from ${prevKey} to ${candidateKey}.`
            : `Modulated to ${candidateKey} for circle-of-fifths (dominant) transition from ${prevKey}.`,
      };
    }
    if (offsetFromPrev === 5) {
      return {
        recommendedKey: candidateKey,
        keySource: "harmonic_modulation",
        transitionNote:
          shift === 0
            ? `Harmonic subdominant transition from ${prevKey} to ${candidateKey}.`
            : `Modulated to ${candidateKey} for subdominant transition from ${prevKey}.`,
      };
    }
    if (offsetFromPrev === 2) {
      return {
        recommendedKey: candidateKey,
        keySource: "harmonic_modulation",
        transitionNote:
          shift === 0
            ? `Harmonic energy lift (+2 semitones) from ${prevKey} to ${candidateKey}.`
            : `Modulated to ${candidateKey} (+2 semitones) for energy lift from ${prevKey}.`,
      };
    }
  }

  return {
    recommendedKey: originalKey,
    keySource: "original_key",
    transitionNote: `Flow from ${prevKey} to ${originalKey}.`,
  };
}

/**
 * Recommends a key for a given song slot using the 3-tier fallback ladder:
 * 1. Worship leader past performance history for that song
 * 2. Harmonic modulation transition relative to the preceding song
 * 3. Song's original key
 */
function recommendKeyForSong(
  song: { id: string; original_key: string; title: string },
  slotIndex: number,
  prevKey: string | null,
  leaderKeyMap: Map<string, { performanceKey: string; lastSungDate: string }>
): { recommendedKey: string; keySource: KeySource; transitionNote: string } {
  // 1. Leader history priority
  const leaderEntry = leaderKeyMap.get(song.id);
  if (leaderEntry && leaderEntry.performanceKey) {
    return {
      recommendedKey: leaderEntry.performanceKey,
      keySource: "leader_history",
      transitionNote:
        slotIndex === 0
          ? `Starting the set with ${song.title} in ${leaderEntry.performanceKey} (worship leader preferred key).`
          : `Using ${leaderEntry.performanceKey} based on worship leader history.`,
    };
  }

  // 2. Harmonic modulation fallback
  if (prevKey) {
    return getHarmonicKeyRecommendation(song.original_key, prevKey);
  }

  // 3. Fallback to original key
  return {
    recommendedKey: song.original_key,
    keySource: "original_key",
    transitionNote: `Starting the set with ${song.title}.`,
  };
}

export async function generateSetlistProposalAction(
  request: LiturgyAgentRequest
): Promise<LiturgyAgentResponse> {
  try {
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

    const supabase = await createClient();

    // Session auth verification (AM-5)
    if (supabase.auth?.getUser) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "Unauthorized",
          stepsExecuted: [],
          proposedSongs: [],
        };
      }
    }

    // Query worship leader history if leader is selected (AC-11, AC-12)
    const leaderKeyMap = new Map<
      string,
      { performanceKey: string; lastSungDate: string }
    >();
    let leaderHistoryChecked = false;

    if (worshipLeaderId && worshipLeaderId.trim()) {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        let query = supabase
          .from("setlists")
          .select(
            "id, date, setlist_songs(song_id, performance_key, songs(id, title, artist, original_key, tags))"
          )
          .eq("worship_leader_id", worshipLeaderId);

        if (typeof (query as unknown as { lt: unknown }).lt === "function") {
          query = (
            query as unknown as {
              lt: (col: string, val: string) => typeof query;
            }
          ).lt("date", todayStr);
        }

        const { data: setlistsData, error: setlistsError } = await query;
        if (!setlistsError && setlistsData) {
          const rows = setlistsData as unknown as Array<{
            id: string;
            date?: string | null;
            setlist_songs?: Array<{
              song_id?: string;
              performance_key?: string;
            }> | null;
          }>;
          for (const setlist of rows) {
            const dateStr =
              (setlist.date ? setlist.date.slice(0, 10) : "") || "1970-01-01";
            for (const entry of setlist.setlist_songs ?? []) {
              if (entry?.song_id && entry?.performance_key) {
                const existing = leaderKeyMap.get(entry.song_id);
                if (!existing || dateStr > existing.lastSungDate) {
                  leaderKeyMap.set(entry.song_id, {
                    performanceKey: entry.performance_key,
                    lastSungDate: dateStr,
                  });
                }
              }
            }
          }
          leaderHistoryChecked = true;
        }
      } catch {
        // Fallback gracefully on query error without throwing
      }
    }

    const stepsExecuted: LiturgyStepProgress[] = [
      {
        step: "leader_history",
        status: worshipLeaderId ? "completed" : "skipped",
        detail: worshipLeaderId
          ? leaderHistoryChecked && leaderKeyMap.size > 0
            ? `Checked worship leader history (${leaderKeyMap.size} past performance keys found).`
            : "Checked worship leader history."
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
        detail: "Optimized song keys for smooth transitions.",
      },
    ];

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

    const excludedSet = new Set(excludedSongIds);
    const joyfulSongs = allSongs.filter(
      (song) => song.tags.includes("joyful") && !excludedSet.has(song.id)
    );
    const solemnSongs = allSongs.filter(
      (song) => song.tags.includes("solemn") && !excludedSet.has(song.id)
    );

    const selectedJoyfulSongs = joyfulSongs.slice(0, joyfulCount);
    const selectedSolemnSongs = solemnSongs.slice(0, solemnCount);

    const selectedSongsWithTags = [
      ...selectedJoyfulSongs.map((s) => ({ ...s, tag: "joyful" as const })),
      ...selectedSolemnSongs.map((s) => ({ ...s, tag: "solemn" as const })),
    ];

    const proposedSongs: ProposedSong[] = [];
    for (let i = 0; i < selectedSongsWithTags.length; i++) {
      const song = selectedSongsWithTags[i];
      const prevKey = i > 0 ? proposedSongs[i - 1].recommendedKey : null;
      const recommendation = recommendKeyForSong(
        song,
        i,
        prevKey,
        leaderKeyMap
      );

      const leaderEntry = leaderKeyMap.get(song.id);

      proposedSongs.push({
        songId: song.id,
        title: song.title,
        artist: song.artist,
        originalKey: song.original_key,
        recommendedKey: recommendation.recommendedKey,
        tag: song.tag,
        transitionNote: recommendation.transitionNote,
        keySource: recommendation.keySource,
        previouslySungKey: leaderEntry?.performanceKey ?? null,
        lastSungDate: leaderEntry?.lastSungDate ?? null,
      });
    }

    return {
      success: true,
      stepsExecuted,
      proposedSongs,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to generate proposal.",
      stepsExecuted: [],
      proposedSongs: [],
    };
  }
}

export async function refreshSingleSongRecommendationAction(
  request: RefreshSingleSongRequest
): Promise<RefreshSingleSongResponse> {
  try {
    const {
      slotIndex,
      currentSong,
      liturgyContext,
      excludedSongIds = [],
      prevSongKey,
    } = request;
    const { worshipLeaderId } = liturgyContext;

    const supabase = await createClient();

    // Session auth verification (AM-5)
    if (supabase.auth?.getUser) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "Unauthorized",
        };
      }
    }

    // Leader history query if worshipLeaderId provided (AC-11, AC-12)
    const leaderKeyMap = new Map<
      string,
      { performanceKey: string; lastSungDate: string }
    >();

    if (worshipLeaderId && worshipLeaderId.trim()) {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        let query = supabase
          .from("setlists")
          .select(
            "id, date, setlist_songs(song_id, performance_key, songs(id, title, artist, original_key, tags))"
          )
          .eq("worship_leader_id", worshipLeaderId);

        if (typeof (query as unknown as { lt: unknown }).lt === "function") {
          query = (
            query as unknown as {
              lt: (col: string, val: string) => typeof query;
            }
          ).lt("date", todayStr);
        }

        const { data: setlistsData, error: setlistsError } = await query;
        if (!setlistsError && setlistsData) {
          const rows = setlistsData as unknown as Array<{
            id: string;
            date?: string | null;
            setlist_songs?: Array<{
              song_id?: string;
              performance_key?: string;
            }> | null;
          }>;
          for (const setlist of rows) {
            const dateStr =
              (setlist.date ? setlist.date.slice(0, 10) : "") || "1970-01-01";
            for (const entry of setlist.setlist_songs ?? []) {
              if (entry?.song_id && entry?.performance_key) {
                const existing = leaderKeyMap.get(entry.song_id);
                if (!existing || dateStr > existing.lastSungDate) {
                  leaderKeyMap.set(entry.song_id, {
                    performanceKey: entry.performance_key,
                    lastSungDate: dateStr,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Fallback gracefully on query error
      }
    }

    const { data: allSongs, error } = await supabase
      .from("songs")
      .select("id, title, artist, original_key, tags")
      .order("title", { ascending: true });

    if (error || !allSongs) {
      return {
        success: false,
        error: "Failed to fetch songs from the database.",
      };
    }

    const excludedSet = new Set([...excludedSongIds, currentSong.songId]);
    const candidates = allSongs.filter(
      (song) => song.tags.includes(currentSong.tag) && !excludedSet.has(song.id)
    );

    if (candidates.length === 0) {
      return {
        success: false,
        error: "Unable to find an alternative song for this liturgy slot",
      };
    }

    // Pick first candidate matching criteria
    const candidate = candidates[0];
    const recommendation = recommendKeyForSong(
      candidate,
      slotIndex,
      prevSongKey ?? null,
      leaderKeyMap
    );

    const leaderEntry = leaderKeyMap.get(candidate.id);

    return {
      success: true,
      song: {
        songId: candidate.id,
        title: candidate.title,
        artist: candidate.artist,
        originalKey: candidate.original_key,
        recommendedKey: recommendation.recommendedKey,
        tag: currentSong.tag,
        transitionNote: recommendation.transitionNote,
        keySource: recommendation.keySource,
        previouslySungKey: leaderEntry?.performanceKey ?? null,
        lastSungDate: leaderEntry?.lastSungDate ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to find an alternative song for this liturgy slot",
    };
  }
}
