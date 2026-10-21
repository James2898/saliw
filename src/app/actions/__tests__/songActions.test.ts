import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSong, updateSong, getAllSongs } from "../songActions";
import * as supabaseServer from "@/services/supabase/server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("songActions - tags persistence and update", () => {
  const mockUser = { id: "user_director_123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSong", () => {
    it("persists tags array cleanly when provided", async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "song_1",
          title: "Amazing Grace",
          artist: "John Newton",
          original_key: "G",
          content: "[G]Amazing grace how sweet the [C]sound",
          created_by: mockUser.id,
          singer: null,
          youtube_url: null,
          tags: ["hymn", "solemn"],
        },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      // Chain: from().insert().select().single()
      mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: mockFrom,
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const result = await createSong({
        title: "Amazing Grace",
        artist: "John Newton",
        original_key: "G",
        content: "[G]Amazing grace how sweet the [C]sound",
        tags: ["Hymn", " Solemn "],
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.tags).toEqual(["hymn", "solemn"]);

      expect(mockFrom).toHaveBeenCalledWith("songs");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["hymn", "solemn"],
        })
      );
    });

    it("defaults tags to empty array when tags omitted", async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "song_2",
          title: "Joyful Joyful",
          artist: "Beethoven",
          original_key: "D",
          content: "[D]Joyful joyful we a[G]dore thee",
          created_by: mockUser.id,
          singer: null,
          youtube_url: null,
          tags: [],
        },
        error: null,
      });

      mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const result = await createSong({
        title: "Joyful Joyful",
        artist: "Beethoven",
        original_key: "D",
        content: "[D]Joyful joyful we a[G]dore thee",
      });

      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
        })
      );
    });
  });

  describe("updateSong", () => {
    it("updates tags cleanly when provided", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "song_1",
          title: "Amazing Grace",
          artist: "John Newton",
          original_key: "G",
          content: "[G]Amazing grace how sweet the [C]sound",
          created_by: mockUser.id,
          singer: null,
          youtube_url: null,
          tags: ["joyful", "hymn"],
        },
        error: null,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const result = await updateSong({
        id: "song_1",
        tags: [" Joyful ", "HYMN"],
      });

      expect(result.error).toBeNull();
      expect(result.data?.tags).toEqual(["joyful", "hymn"]);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["joyful", "hymn"],
        })
      );
    });

    it("does not include tags in update payload if tags is undefined", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "song_1",
          title: "Updated Title",
          artist: "John Newton",
          original_key: "G",
          content: "[G]Content",
          created_by: mockUser.id,
          singer: null,
          youtube_url: null,
          tags: ["joyful"],
        },
        error: null,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const result = await updateSong({
        id: "song_1",
        title: "Updated Title",
      });

      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        title: "Updated Title",
      });
      // tags must not be in the update payload
      expect(mockUpdate.mock.calls[0][0].tags).toBeUndefined();
    });
  });

  describe("getAllSongs", () => {
    it("selects tags and returns them", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: "song_1",
            title: "Amazing Grace",
            artist: "John Newton",
            original_key: "G",
            tags: ["hymn", "solemn"],
          },
          {
            id: "song_2",
            title: "Joyful Joyful",
            artist: "Beethoven",
            original_key: "D",
            tags: ["joyful"],
          },
        ],
        error: null,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(
        mockSupabase as unknown as Awaited<
          ReturnType<typeof supabaseServer.createClient>
        >
      );

      const result = await getAllSongs();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].tags).toEqual(["hymn", "solemn"]);
      expect(result.data?.[1].tags).toEqual(["joyful"]);
      expect(mockSelect).toHaveBeenCalledWith(
        "id, title, artist, original_key, tags"
      );
    });
  });
});
