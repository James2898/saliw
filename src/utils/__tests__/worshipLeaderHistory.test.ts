import { describe, it, expect } from "vitest";
import {
  groupSongPerformanceHistory,
  type RawSongPerformanceRow,
} from "../worshipLeaderHistory";

describe("groupSongPerformanceHistory", () => {
  const sampleRows: RawSongPerformanceRow[] = [
    {
      song_id: "song_1",
      performance_key: "G",
      setlists: {
        id: "setlist_100",
        name: "Sunday Morning Service",
        date: "2026-05-03 09:00:00+00",
        worship_leader_id: "leader_a",
        musicians: {
          id: "leader_a",
          name: "Alice Santos",
        },
      },
    },
    {
      song_id: "song_1",
      performance_key: "G",
      setlists: {
        id: "setlist_200",
        name: "Youth Night",
        date: "2026-08-14 18:30:00+00",
        worship_leader_id: "leader_a",
        musicians: {
          id: "leader_a",
          name: "Alice Santos",
        },
      },
    },
    {
      song_id: "song_1",
      performance_key: "A",
      setlists: {
        id: "setlist_150",
        name: "Prayer & Worship",
        date: "2026-06-20 19:00:00+00",
        worship_leader_id: "leader_a",
        musicians: {
          id: "leader_a",
          name: "Alice Santos",
        },
      },
    },
    {
      song_id: "song_1",
      performance_key: "D",
      setlists: {
        id: "setlist_300",
        name: "Anniversary Service",
        date: "2026-08-14 10:00:00+00",
        worship_leader_id: "leader_b",
        musicians: {
          id: "leader_b",
          name: "Ben Cruz",
        },
      },
    },
  ];

  it("groups by unique (worship_leader_id, performance_key) tuple and tracks count and latest setlist reference (AC-6, AC-7, AC-8)", () => {
    const result = groupSongPerformanceHistory(sampleRows, {
      today: "2026-11-01",
    });

    expect(result).toHaveLength(3);

    const aliceG = result.find(
      (r) => r.worshipLeaderId === "leader_a" && r.performanceKey === "G"
    );
    expect(aliceG).toEqual({
      worshipLeaderId: "leader_a",
      worshipLeaderName: "Alice Santos",
      performanceKey: "G",
      count: 2,
      lastSungDate: "2026-08-14",
      lastSetlistId: "setlist_200",
      lastSetlistName: "Youth Night",
    });

    const aliceA = result.find(
      (r) => r.worshipLeaderId === "leader_a" && r.performanceKey === "A"
    );
    expect(aliceA).toEqual({
      worshipLeaderId: "leader_a",
      worshipLeaderName: "Alice Santos",
      performanceKey: "A",
      count: 1,
      lastSungDate: "2026-06-20",
      lastSetlistId: "setlist_150",
      lastSetlistName: "Prayer & Worship",
    });
  });

  it("sorts by lastSungDate descending, then worshipLeaderName ascending (case-insensitive), then performanceKey ascending (AC-9)", () => {
    const rows: RawSongPerformanceRow[] = [
      ...sampleRows,
      {
        song_id: "song_1",
        performance_key: "C",
        setlists: {
          id: "setlist_400",
          name: "Evening Service",
          date: "2026-08-14 17:00:00+00",
          worship_leader_id: "leader_a",
          musicians: {
            id: "leader_a",
            name: "alice santos",
          },
        },
      },
    ];

    const result = groupSongPerformanceHistory(rows, {
      today: "2026-11-01",
    });

    // On 2026-08-14:
    // - Alice Santos (C) vs Alice Santos (G) -> C before G
    // - Alice Santos vs Ben Cruz -> Alice before Ben
    // Then 2026-06-20:
    // - Alice Santos (A)
    expect(
      result.map(
        (r) => `${r.lastSungDate}:${r.worshipLeaderId}:${r.performanceKey}`
      )
    ).toEqual([
      "2026-08-14:leader_a:C",
      "2026-08-14:leader_a:G",
      "2026-08-14:leader_b:D",
      "2026-06-20:leader_a:A",
    ]);
  });

  it("excludes setlists dated today or in the future, or missing worship_leader_id (AC-2)", () => {
    const rowsWithExcluded: RawSongPerformanceRow[] = [
      ...sampleRows,
      {
        song_id: "song_1",
        performance_key: "E",
        setlists: {
          id: "setlist_today",
          name: "Today Service",
          date: "2026-11-01 09:00:00+00",
          worship_leader_id: "leader_c",
          musicians: { id: "leader_c", name: "Carla Reyes" },
        },
      },
      {
        song_id: "song_1",
        performance_key: "F",
        setlists: {
          id: "setlist_future",
          name: "Future Service",
          date: "2026-12-25 09:00:00+00",
          worship_leader_id: "leader_c",
          musicians: { id: "leader_c", name: "Carla Reyes" },
        },
      },
      {
        song_id: "song_1",
        performance_key: "Bb",
        setlists: {
          id: "setlist_no_leader",
          name: "Unassigned Service",
          date: "2026-04-10 09:00:00+00",
          worship_leader_id: null,
          musicians: null,
        },
      },
    ];

    const result = groupSongPerformanceHistory(rowsWithExcluded, {
      today: "2026-11-01",
    });

    expect(result).toHaveLength(3);
    expect(
      result.find((r) => r.worshipLeaderId === "leader_c")
    ).toBeUndefined();
  });

  it("applies deterministic tie-breaking on same date by selecting greater setlist ID (AC-8)", () => {
    const sameDateRows: RawSongPerformanceRow[] = [
      {
        song_id: "song_1",
        performance_key: "G",
        setlists: {
          id: "setlist_010",
          name: "First Service",
          date: "2026-09-01 08:00:00+00",
          worship_leader_id: "leader_a",
          musicians: { id: "leader_a", name: "Alice Santos" },
        },
      },
      {
        song_id: "song_1",
        performance_key: "G",
        setlists: {
          id: "setlist_099",
          name: "Second Service",
          date: "2026-09-01 11:00:00+00",
          worship_leader_id: "leader_a",
          musicians: { id: "leader_a", name: "Alice Santos" },
        },
      },
      {
        song_id: "song_1",
        performance_key: "G",
        setlists: {
          id: "setlist_050",
          name: "Mid Service",
          date: "2026-09-01 09:30:00+00",
          worship_leader_id: "leader_a",
          musicians: { id: "leader_a", name: "Alice Santos" },
        },
      },
    ];

    const result = groupSongPerformanceHistory(sameDateRows, {
      today: "2026-11-01",
    });

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].lastSetlistId).toBe("setlist_099");
    expect(result[0].lastSetlistName).toBe("Second Service");
  });

  it("falls back to 'Unknown Leader' and 'Untitled Setlist' when musician or setlist name is missing", () => {
    const fallbackRows: RawSongPerformanceRow[] = [
      {
        song_id: "song_1",
        performance_key: "C",
        setlists: {
          id: "setlist_fallback",
          name: "   ",
          date: "2026-03-15 09:00:00+00",
          worship_leader_id: "leader_deleted",
          musicians: null,
        },
      },
    ];

    const result = groupSongPerformanceHistory(fallbackRows, {
      today: "2026-11-01",
    });

    expect(result).toHaveLength(1);
    expect(result[0].worshipLeaderName).toBe("Unknown Leader");
    expect(result[0].lastSetlistName).toBe("Untitled Setlist");
  });
});
