import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  curateSetlistWithAi,
  recommendAlternativeSongWithAi,
  CandidateSongForAi,
} from "../liturgyAiService";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      ARRAY: "ARRAY",
      OBJECT: "OBJECT",
      STRING: "STRING",
      INTEGER: "INTEGER",
    },
  };
});

describe("liturgyAiService", () => {
  const originalEnv = process.env;

  const mockCandidates: CandidateSongForAi[] = [
    {
      id: "song-j1",
      title: "House of the Lord",
      artist: "Phil Wickham",
      original_key: "Bb",
      tags: ["joyful"],
    },
    {
      id: "song-j2",
      title: "Praise",
      artist: "Elevation Worship",
      original_key: "C",
      tags: ["joyful"],
    },
    {
      id: "song-s1",
      title: "Build My Life",
      artist: "Housefires",
      original_key: "G",
      tags: ["solemn"],
    },
    {
      id: "song-s2",
      title: "Goodness of God",
      artist: "Bethel Music",
      original_key: "Ab",
      tags: ["solemn"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("curateSetlistWithAi", () => {
    it("returns missing_api_key when GEMINI_API_KEY is unset or empty", async () => {
      delete process.env.GEMINI_API_KEY;
      const res = await curateSetlistWithAi({
        candidateSongs: mockCandidates,
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.reason).toBe("missing_api_key");
      }
    });

    it("successfully curates songs when AI returns valid JSON", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            songId: "song-j1",
            slot: 0,
            rationale: "Celebratory opening gathering.",
          },
          {
            songId: "song-s1",
            slot: 1,
            rationale: "Deep prayer and dedication.",
          },
        ]),
      });

      const res = await curateSetlistWithAi({
        candidateSongs: mockCandidates,
        joyfulCount: 1,
        solemnCount: 1,
        additionalInstructions: "Focus on God's faithfulness and trust.",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.selectedSongs).toHaveLength(2);
        expect(res.selectedSongs[0].songId).toBe("song-j1");
        expect(res.selectedSongs[1].songId).toBe("song-s1");
        expect(res.selectedSongs[0].rationale).toBe(
          "Celebratory opening gathering."
        );
      }
    });

    it("rejects response when AI returns song ID not in candidate pool", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify([
          {
            songId: "hallucinated-song-id",
            slot: 0,
            rationale: "Great song.",
          },
          {
            songId: "song-s1",
            slot: 1,
            rationale: "Worship response.",
          },
        ]),
      });

      const res = await curateSetlistWithAi({
        candidateSongs: mockCandidates,
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.reason).toBe("invalid_response");
        expect(res.errorDetail).toMatch(/not found in candidate pool/i);
      }
    });

    it("handles rate limiting (429 / quota exceeded) gracefully", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      mockGenerateContent.mockRejectedValueOnce(
        new Error("429 Resource has been exhausted (e.g. check quota)")
      );

      const res = await curateSetlistWithAi({
        candidateSongs: mockCandidates,
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.reason).toBe("rate_limit");
      }
    });
  });

  describe("recommendAlternativeSongWithAi", () => {
    it("returns alternative recommendation when AI returns valid candidate", async () => {
      process.env.GEMINI_API_KEY = "test-key";
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          songId: "song-j2",
          rationale: "Fresh high-energy alternative for opening praise.",
        }),
      });

      const res = await recommendAlternativeSongWithAi({
        candidates: mockCandidates.filter((s) => s.tags.includes("joyful")),
        slotIndex: 0,
        requiredTag: "joyful",
        additionalInstructions: "Looking for energetic songs.",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.songId).toBe("song-j2");
        expect(res.rationale).toContain("Fresh high-energy alternative");
      }
    });
  });
});
