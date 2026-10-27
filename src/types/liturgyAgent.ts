/**
 * liturgyAgent.ts — Type definitions for Saliw Agentic Liturgy & Worship Assistant.
 * Defines the request/response contracts for setlist curation and tool calling.
 */

export interface LiturgyAgentRequest {
  worshipLeaderId?: string | null;
  joyfulCount: number; // 0 to 4
  solemnCount: number; // 0 to 4
  additionalInstructions?: string; // e.g. "english only, hillsong artists"
  excludedSongIds?: string[]; // Used when re-rolling or swapping
}

export type SongVibeTag = "joyful" | "solemn";

export type KeySource = "leader_history" | "harmonic_modulation" | "original_key";

export interface ProposedSong {
  songId: string;
  title: string;
  artist: string;
  originalKey: string;
  recommendedKey: string;
  tag: SongVibeTag;
  transitionNote: string;
  keySource: KeySource;
}

export interface LiturgyStepProgress {
  step: "leader_history" | "library_tag_search" | "harmonic_optimization";
  status: "completed" | "skipped";
  detail: string;
}

export interface LiturgyAgentResponse {
  success: boolean;
  error?: string;
  stepsExecuted: LiturgyStepProgress[];
  proposedSongs: ProposedSong[];
}
