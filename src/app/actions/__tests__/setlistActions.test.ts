import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWorshipLeaderSongHistory } from "../setlistActions";
import {
  groupWorshipLeaderSongHistory,
  type RawHistorySetlistRow,
} from "@/utils/worshipLeaderHistory";
import * as supabaseServer from "@/services/supabase/server";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("groupWorshipLeaderSongHistory", () => {
  const sampleRows: RawHistorySetlistRow[] = [
    {
      id: "setlist_1",
      date: "2026-05-01 09:00:00+00",
      setlist_songs: [
        {
          song_id: "song_b",
          performance_key: "G",
          songs: {
            id: "song_b",
            title: "Blessed Assurance",
            artist: "Fanny Crosby",
            original_key: "D",
            tags: ["hymn"],
          },
        },
        {
          song_id: "song_a",
          performance_key: "C",
          songs: {
            id: "song_a",
            title: "Amazing Grace",
            artist: "John Newton",
            original_key: "G",
            tags: ["hymn", "solemn"],
          },
        },
      ],
    },
    {
      id: "setlist_2",
      date: "2026-06-15 10:30:00+00",
      setlist_songs: [
        {
          song_id: "song_b",
          performance_key: "G",
          songs: {
            id: "song_b",
            title: "Blessed Assurance",
            artist: "Fanny Crosby",
            original_key: "D",
            tags: ["hymn"],
          },
        },
        {
          song_id: "song_a",
          performance_key: "D",
          songs: {
            id: "song_a",
            title: "Amazing Grace",
            artist: "John Newton",
            original_key: "G",
            tags: ["hymn", "solemn"],
          },
        },
      ],
    },
  ];

  it("collapses repeat performances in the same key with count and latest YYYY-MM-DD date", () => {
    const result = groupWorshipLeaderSongHistory(sampleRows, {
      today: "2026-10-30",
    });

    const blessedRow = result.find(
      (r) => r.songId === "song_b" && r.performanceKey === "G"
    );
    expect(blessedRow).toBeDefined();
    expect(blessedRow?.count).toBe(2);
    expect(blessedRow?.lastSungDate).toBe("2026-06-15");
    expect(blessedRow?.originalKey).toBe("D");
    expect(blessedRow?.tags).toEqual(["hymn"]);
  });

  it("sorts titles A-Z case-insensitively and sorts multiple keys for the same song newest date first", () => {
    const result = groupWorshipLeaderSongHistory(sampleRows, {
      today: "2026-10-30",
    });

    expect(result).toHaveLength(3);
    expect(result.map((r) => `${r.title}:${r.performanceKey}`)).toEqual([
      "Amazing Grace:D", // 2026-06-15 (newer)
      "Amazing Grace:C", // 2026-05-01 (older)
      "Blessed Assurance:G",
    ]);
  });

  it("excludes setlists dated today or in the future and excludes currentSetlistId", () => {
    const rowsWithTodayAndExcluded: RawHistorySetlistRow[] = [
      ...sampleRows,
      {
        id: "setlist_today",
        date: "2026-10-30 08:00:00+00",
        setlist_songs: [
          {
            song_id: "song_today",
            performance_key: "E",
            songs: {
              id: "song_today",
              title: "Cornerstone",
              artist: "Hillsong",
              original_key: "C",
              tags: ["joyful"],
            },
          },
        ],
      },
    ];

    const result = groupWorshipLeaderSongHistory(rowsWithTodayAndExcluded, {
      today: "2026-10-30",
      excludeSetlistId: "setlist_2",
    });

    // setlist_today is excluded (date >= today) and setlist_2 is excluded (excludeSetlistId)
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.songId === "song_today")).toBeUndefined();
    expect(
      result.find((r) => r.songId === "song_a" && r.performanceKey === "D")
    ).toBeUndefined();

    const blessedRow = result.find((r) => r.songId === "song_b");
    expect(blessedRow?.count).toBe(1);
    expect(blessedRow?.lastSungDate).toBe("2026-05-01");
  });
});

describe("getWorshipLeaderSongHistory server action", () => {
  const mockUser = { id: "user_md_1" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const res = await getWorshipLeaderSongHistory("leader_1");
    expect(res.data).toBeNull();
    expect(res.error).toBe("Unauthorized");
  });

  it("queries setlists with songs(id, title, artist, original_key, tags) and excludes currentSetlistId", async () => {
    const mockNeq = vi.fn().mockResolvedValue({
      data: [
        {
          id: "setlist_past",
          date: "2025-12-01 09:00:00+00",
          setlist_songs: [
            {
              song_id: "song_1",
              performance_key: "A",
              songs: {
                id: "song_1",
                title: "Holy Forever",
                artist: "Chris Tomlin",
                original_key: "G",
                tags: ["solemn"],
              },
            },
          ],
        },
      ],
      error: null,
    });
    const mockLt = vi.fn().mockReturnValue({ neq: mockNeq });
    const mockEq = vi.fn().mockReturnValue({ lt: mockLt });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

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

    const res = await getWorshipLeaderSongHistory(
      "leader_123",
      "current_setlist_999"
    );

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]).toEqual({
      songId: "song_1",
      title: "Holy Forever",
      artist: "Chris Tomlin",
      originalKey: "G",
      tags: ["solemn"],
      performanceKey: "A",
      count: 1,
      lastSungDate: "2025-12-01",
    });

    expect(mockFrom).toHaveBeenCalledWith("setlists");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, date, setlist_songs(song_id, performance_key, songs(id, title, artist, original_key, tags))"
    );
    expect(mockEq).toHaveBeenCalledWith("worship_leader_id", "leader_123");
    expect(mockNeq).toHaveBeenCalledWith("id", "current_setlist_999");
  });

  it("returns Unable to load song history when query fails", async () => {
    const mockLt = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB failure" },
    });
    const mockEq = vi.fn().mockReturnValue({ lt: mockLt });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

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

    const res = await getWorshipLeaderSongHistory("leader_123");
    expect(res.data).toBeNull();
    expect(res.error).toBe("Unable to load song history");
  });
});
