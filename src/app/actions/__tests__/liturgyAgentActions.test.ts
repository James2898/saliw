import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSetlistProposalAction } from "../liturgyAgentActions";
import * as supabaseServer from "@/services/supabase/server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("liturgyAgentActions - generateSetlistProposalAction", () => {
  const mockSongs = [
    {
      id: "song-j1",
      title: "House of the Lord",
      artist: "Phil Wickham",
      original_key: "BB",
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
      original_key: "AB",
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
          if (table === "musicians") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "leader-farah", name: "Farah" },
                    error: null,
                  }),
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
});
