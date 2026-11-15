import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSetlistProposalAction,
  refreshSingleSongRecommendationAction,
} from "../liturgyAgentActions";
import * as supabaseServer from "@/services/supabase/server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("liturgyAgentActions", () => {
  const mockSongs = [
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
    {
      id: "song-s3",
      title: "Gratitude",
      artist: "Brandon Lake",
      original_key: "B",
      tags: ["solemn"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation boundaries", () => {
    it("fails when total song count is less than 1", async () => {
      const res = await generateSetlistProposalAction({
        joyfulCount: 0,
        solemnCount: 0,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/At least one song must be requested./i);
      expect(res.proposedSongs).toHaveLength(0);
    });

    it("fails when total song count exceeds 6", async () => {
      const res = await generateSetlistProposalAction({
        joyfulCount: 4,
        solemnCount: 3,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(
        /Total count of joyful and solemn songs must not exceed 6./i
      );
    });

    it("fails on negative count values", async () => {
      const res = await generateSetlistProposalAction({
        joyfulCount: -1,
        solemnCount: 2,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe("Auth verification (AM-5)", () => {
    it("returns Unauthorized when user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    });
  });

  describe("Proposal generation & counts", () => {
    it("returns exact joyful and solemn counts requested (default 1 to 1)", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSongs,
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(true);
      expect(res.proposedSongs).toHaveLength(2);
      expect(res.proposedSongs.filter((s) => s.tag === "joyful")).toHaveLength(
        1
      );
      expect(res.proposedSongs.filter((s) => s.tag === "solemn")).toHaveLength(
        1
      );
    });

    it("records tool execution steps in response", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSongs,
                  error: null,
                }),
              }),
            };
          }
          if (table === "setlists") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "setlist-1",
                      date: "2026-01-01",
                      setlist_songs: [
                        { song_id: "song-s1", performance_key: "D" },
                      ],
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        worshipLeaderId: "leader-farah",
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(true);
      expect(res.stepsExecuted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            step: "leader_history",
            status: "completed",
          }),
          expect.objectContaining({
            step: "library_tag_search",
            status: "completed",
          }),
          expect.objectContaining({
            step: "harmonic_optimization",
            status: "completed",
          }),
        ])
      );
    });

    it("skips excludedSongIds when swapping or re-rolling a song", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockSongs,
              error: null,
            }),
          }),
        })),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        joyfulCount: 1,
        solemnCount: 1,
        excludedSongIds: ["song-j1", "song-s1"],
      });

      expect(res.success).toBe(true);
      const chosenIds = res.proposedSongs.map((s) => s.songId);
      expect(chosenIds).not.toContain("song-j1");
      expect(chosenIds).not.toContain("song-s1");
    });
  });

  describe("Worship leader key history & harmonic modulation (AC-11, AC-12, AC-13)", () => {
    it("prioritizes worship leader most recently used performance_key for a song", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "song-j1",
                      title: "House of the Lord",
                      artist: "Phil Wickham",
                      original_key: "Bb",
                      tags: ["joyful"],
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          if (table === "setlists") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "setlist-old",
                        date: "2026-01-01",
                        setlist_songs: [
                          { song_id: "song-j1", performance_key: "C" },
                        ],
                      },
                      {
                        id: "setlist-new",
                        date: "2026-02-15",
                        setlist_songs: [
                          { song_id: "song-j1", performance_key: "D" },
                        ],
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        worshipLeaderId: "leader-1",
        joyfulCount: 1,
        solemnCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.proposedSongs).toHaveLength(1);
      expect(res.proposedSongs[0].recommendedKey).toBe("D");
      expect(res.proposedSongs[0].keySource).toBe("leader_history");
      expect(res.proposedSongs[0].previouslySungKey).toBe("D");
      expect(res.proposedSongs[0].lastSungDate).toBe("2026-02-15");
    });

    it("falls back to harmonic modulation when worship leader has no performance history", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "song-1",
                      title: "First Song",
                      artist: "Artist A",
                      original_key: "C",
                      tags: ["joyful"],
                    },
                    {
                      id: "song-2",
                      title: "Second Song",
                      artist: "Artist B",
                      original_key: "G", // circle of fifths (offset 7)
                      tags: ["solemn"],
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await generateSetlistProposalAction({
        joyfulCount: 1,
        solemnCount: 1,
      });

      expect(res.success).toBe(true);
      expect(res.proposedSongs[0].recommendedKey).toBe("C");
      expect(res.proposedSongs[0].previouslySungKey).toBeNull();
      expect(res.proposedSongs[1].recommendedKey).toBe("G");
      expect(res.proposedSongs[1].keySource).toBe("harmonic_modulation");
      expect(res.proposedSongs[1].transitionNote).toMatch(/dominant/i);
      expect(res.proposedSongs[1].previouslySungKey).toBeNull();
    });
  });

  describe("Single-song refresh action (AC-6, AC-7, AC-8, AC-9, AC-10)", () => {
    it("successfully returns a replacement song excluding current and existing song IDs", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSongs,
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await refreshSingleSongRecommendationAction({
        slotIndex: 0,
        currentSong: {
          songId: "song-j1",
          title: "House of the Lord",
          artist: "Phil Wickham",
          originalKey: "Bb",
          recommendedKey: "Bb",
          tag: "joyful",
          transitionNote: "Starting set",
          keySource: "original_key",
        },
        liturgyContext: {
          joyfulCount: 1,
          solemnCount: 1,
        },
        excludedSongIds: ["song-s1"],
      });

      expect(res.success).toBe(true);
      expect(res.song).toBeDefined();
      expect(res.song?.songId).toBe("song-j2"); // The only other joyful song
      expect(res.song?.tag).toBe("joyful");
    });

    it("returns error message when no alternative candidate song exists", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "songs") {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "song-j1",
                      title: "Only Joyful Song",
                      artist: "Artist",
                      original_key: "C",
                      tags: ["joyful"],
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const res = await refreshSingleSongRecommendationAction({
        slotIndex: 0,
        currentSong: {
          songId: "song-j1",
          title: "Only Joyful Song",
          artist: "Artist",
          originalKey: "C",
          recommendedKey: "C",
          tag: "joyful",
          transitionNote: "Starting set",
          keySource: "original_key",
        },
        liturgyContext: {
          joyfulCount: 1,
          solemnCount: 0,
        },
        excludedSongIds: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unable to find an alternative song/i);
    });
  });
});
