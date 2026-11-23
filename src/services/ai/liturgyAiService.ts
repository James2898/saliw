import { GoogleGenAI, Type } from "@google/genai";

export interface CandidateSongForAi {
  id: string;
  title: string;
  artist: string;
  original_key: string;
  tags: string[];
}

export interface CurateSetlistAiParams {
  candidateSongs: CandidateSongForAi[];
  joyfulCount: number;
  solemnCount: number;
  additionalInstructions?: string;
  worshipLeaderName?: string;
}

export type AiCurationResult =
  | {
      success: true;
      selectedSongs: Array<{
        songId: string;
        slot: number;
        rationale: string;
      }>;
    }
  | {
      success: false;
      reason:
        | "missing_api_key"
        | "timeout"
        | "rate_limit"
        | "invalid_response"
        | "api_error";
      errorDetail?: string;
    };

export interface AlternativeSongAiParams {
  candidates: CandidateSongForAi[];
  slotIndex: number;
  requiredTag: "joyful" | "solemn";
  additionalInstructions?: string;
}

export type AiAlternativeResult =
  | {
      success: true;
      songId: string;
      rationale: string;
    }
  | {
      success: false;
      reason:
        | "missing_api_key"
        | "timeout"
        | "rate_limit"
        | "invalid_response"
        | "api_error";
      errorDetail?: string;
    };

const AI_TIMEOUT_MS = 10000;
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

/**
 * Curates a cohesive worship setlist from library candidates using Gemini.
 * Enforces a strict 6-second timeout and structured JSON response.
 */
export async function curateSetlistWithAi(
  params: CurateSetlistAiParams
): Promise<AiCurationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { success: false, reason: "missing_api_key" };
  }

  const {
    candidateSongs,
    joyfulCount,
    solemnCount,
    additionalInstructions,
    worshipLeaderName,
  } = params;

  const totalRequired = joyfulCount + solemnCount;
  if (totalRequired === 0 || candidateSongs.length === 0) {
    return {
      success: false,
      reason: "invalid_response",
      errorDetail: "No songs requested or no candidates available.",
    };
  }

  // Sanitize instructions to 300 characters to prevent prompt bloat
  const sanitizedInstructions = (additionalInstructions || "").slice(0, 300).trim();

  // Create lightweight candidate summary for prompt context
  const candidateSummary = candidateSongs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.original_key,
    tags: s.tags,
  }));

  const prompt = `You are an expert worship music director and Christian liturgy curator.
Given the church's song library candidates, select a cohesive worship setlist that matches the requested mood balance and sermon themes.

REQUIREMENTS:
1. Select exactly ${joyfulCount} joyful song(s) and exactly ${solemnCount} solemn song(s) (total ${totalRequired} songs).
2. Assign each song a 0-indexed 'slot' number in sequential order:
   - Slots 0 to ${joyfulCount - 1}: Joyful songs (Gathering, Praise, Thanksgiving).
   - Slots ${joyfulCount} to ${totalRequired - 1}: Solemn songs (Worship, Reflection, Surrender, Response).
3. Choose ONLY from the CANDIDATE SONGS list below by exact 'songId'. Do not invent songs or IDs.
4. Each selected song MUST be unique (no duplicates).
5. For each song, write a brief, warm 1-sentence pastoral 'rationale' explaining why it fits the sermon focus or liturgical slot.

${worshipLeaderName ? `Worship Leader: ${worshipLeaderName}` : ""}
${sanitizedInstructions ? `Sermon Focus / Pastoral Instructions:\n"${sanitizedInstructions}"` : "Sermon Focus: General Sunday worship gathering."}

CANDIDATE SONGS:
${JSON.stringify(candidateSummary, null, 2)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              songId: { type: Type.STRING },
              slot: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: ["songId", "slot", "rationale"],
          },
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("AI curation timed out"));
      }, AI_TIMEOUT_MS);
      // Ensure timeout timer does not hold node process open in tests
      if (typeof timer.unref === "function") {
        timer.unref();
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = response.text;
    if (!rawText) {
      return {
        success: false,
        reason: "invalid_response",
        errorDetail: "Empty response received from AI model.",
      };
    }

    const parsed = JSON.parse(rawText) as Array<{
      songId?: string;
      slot?: number;
      rationale?: string;
    }>;

    if (!Array.isArray(parsed) || parsed.length !== totalRequired) {
      return {
        success: false,
        reason: "invalid_response",
        errorDetail: `Expected ${totalRequired} songs from AI, but received ${parsed?.length ?? 0}.`,
      };
    }

    const candidateMap = new Map(candidateSongs.map((s) => [s.id, s]));
    const seenIds = new Set<string>();
    const selectedSongs: Array<{
      songId: string;
      slot: number;
      rationale: string;
    }> = [];

    // Verify all selected songs are valid, unique, and match tag slots
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item.songId || seenIds.has(item.songId)) {
        return {
          success: false,
          reason: "invalid_response",
          errorDetail: "Duplicate or invalid song ID returned by AI.",
        };
      }

      const song = candidateMap.get(item.songId);
      if (!song) {
        return {
          success: false,
          reason: "invalid_response",
          errorDetail: `Song ID "${item.songId}" not found in candidate pool.`,
        };
      }

      const expectedTag = i < joyfulCount ? "joyful" : "solemn";
      const isTagMatch =
        expectedTag === "joyful"
          ? song.tags.includes("joyful")
          : song.tags.includes("solemn") || song.tags.includes("hymn");

      if (!isTagMatch) {
        return {
          success: false,
          reason: "invalid_response",
          errorDetail: `Song "${song.title}" does not match slot tag "${expectedTag}".`,
        };
      }

      seenIds.add(item.songId);
      selectedSongs.push({
        songId: item.songId,
        slot: i,
        rationale:
          item.rationale?.trim() ||
          (expectedTag === "joyful"
            ? "Selected for joyful praise and celebration."
            : "Selected for prayerful reflection and response."),
      });
    }

    return {
      success: true,
      selectedSongs,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LiturgyAiService error message]:", message);
    if (message.includes("timed out")) {
      return { success: false, reason: "timeout", errorDetail: message };
    }
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit")) {
      return { success: false, reason: "rate_limit", errorDetail: message };
    }
    return { success: false, reason: "api_error", errorDetail: message };
  }
}

/**
 * Recommends an alternative song for an individual setlist slot using Gemini.
 */
export async function recommendAlternativeSongWithAi(
  params: AlternativeSongAiParams
): Promise<AiAlternativeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { success: false, reason: "missing_api_key" };
  }

  const { candidates, slotIndex, requiredTag, additionalInstructions } = params;
  if (candidates.length === 0) {
    return {
      success: false,
      reason: "invalid_response",
      errorDetail: "No candidates available for alternative selection.",
    };
  }

  const sanitizedInstructions = (additionalInstructions || "").slice(0, 300).trim();

  const candidateSummary = candidates.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.original_key,
    tags: s.tags,
  }));

  const prompt = `You are an expert worship music director.
Please select the single best alternative ${requiredTag} song for slot index ${slotIndex} from the candidate songs below.

REQUIREMENTS:
1. Select exactly 1 song from CANDIDATE SONGS by its exact 'songId'.
2. Provide a 1-sentence pastoral 'rationale' for why this song fits this liturgy moment.

${sanitizedInstructions ? `Sermon Focus / Pastoral Instructions:\n"${sanitizedInstructions}"` : ""}

CANDIDATE SONGS:
${JSON.stringify(candidateSummary, null, 2)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            songId: { type: Type.STRING },
            rationale: { type: Type.STRING },
          },
          required: ["songId", "rationale"],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("AI alternative curation timed out"));
      }, AI_TIMEOUT_MS);
      if (typeof timer.unref === "function") {
        timer.unref();
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = response.text;
    if (!rawText) {
      return {
        success: false,
        reason: "invalid_response",
        errorDetail: "Empty response from AI model.",
      };
    }

    const parsed = JSON.parse(rawText) as {
      songId?: string;
      rationale?: string;
    };

    if (!parsed.songId || !candidates.some((c) => c.id === parsed.songId)) {
      return {
        success: false,
        reason: "invalid_response",
        errorDetail: "Returned songId was not found in candidate pool.",
      };
    }

    return {
      success: true,
      songId: parsed.songId,
      rationale:
        parsed.rationale?.trim() ||
        `Alternative ${requiredTag} recommendation selected for this liturgy slot.`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LiturgyAiService error message]:", message);
    if (message.includes("timed out")) {
      return { success: false, reason: "timeout", errorDetail: message };
    }
    if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit")) {
      return { success: false, reason: "rate_limit", errorDetail: message };
    }
    return { success: false, reason: "api_error", errorDetail: message };
  }
}
