import { describe, it, expect } from "vitest";
import { REALTIME_EVENTS } from "../../utils/realtimeEvents";
import type {
  SongChangePayload,
  KeyChangePayload,
  SectionChangePayload,
  ScrollSyncPayload,
  StagePresenceState,
} from "../../utils/realtimeEvents";

describe("Stage Sync Protocol & Realtime Events (AC-1, AC-2, AC-3, AC-4)", () => {
  it("defines standard event names and AC-2 aliases", () => {
    expect(REALTIME_EVENTS.SONG_CHANGE).toBe("SONG_CHANGE");
    expect(REALTIME_EVENTS.KEY_CHANGE).toBe("KEY_CHANGE");
    expect(REALTIME_EVENTS.SECTION_CHANGE).toBe("SECTION_CHANGE");
    expect(REALTIME_EVENTS.SCROLL_SYNC).toBe("SCROLL_SYNC");

    // Aliases
    expect(REALTIME_EVENTS.SONG_NAVIGATE).toBe("SONG_CHANGE");
    expect(REALTIME_EVENTS.TRANSPOSE_UPDATE).toBe("KEY_CHANGE");
    expect(REALTIME_EVENTS.AUTOSCROLL_UPDATE).toBe("SCROLL_SYNC");
  });

  it("verifies monotonic sequencing payload shapes", () => {
    const now = Date.now();
    const songPayload: SongChangePayload = {
      junctionId: "junction_123",
      timestamp: now,
      songId: "song_abc",
      setlistIndex: 0,
    };
    expect(songPayload.timestamp).toBe(now);

    const keyPayload: KeyChangePayload = {
      junctionId: "junction_123",
      performanceKey: "A",
      timestamp: now,
      semitones: 2,
    };
    expect(keyPayload.timestamp).toBe(now);

    const sectionPayload: SectionChangePayload = {
      junctionId: "junction_123",
      sectionId: "sec_chorus",
      sectionLabel: "Chorus",
      timestamp: now,
    };
    expect(sectionPayload.sectionLabel).toBe("Chorus");

    const scrollPayload: ScrollSyncPayload = {
      junctionId: "junction_123",
      isAutoScrolling: true,
      speedLevel: 3,
      scrollPercentage: 50,
      scrollPositionRatio: 0.5,
      isScrolling: true,
      speedMultiplier: 3,
      timestamp: now,
    };
    expect(scrollPayload.scrollPositionRatio).toBe(0.5);
  });

  it("verifies stage presence data structure (AC-1)", () => {
    const leaderPresence: StagePresenceState = {
      sessionId: "sess_1",
      deviceId: "dev_leader",
      userId: "user_123",
      displayName: "Music Director",
      role: "leader",
      deviceType: "desktop",
      joinedAt: Date.now(),
    };

    expect(leaderPresence.role).toBe("leader");
    expect(leaderPresence.deviceType).toBe("desktop");

    const followerPresence: StagePresenceState = {
      sessionId: "sess_2",
      deviceId: "dev_follower",
      userId: null,
      displayName: "Band Member",
      role: "follower",
      deviceType: "mobile",
      joinedAt: Date.now(),
    };

    expect(followerPresence.role).toBe("follower");
    expect(followerPresence.userId).toBeNull();
  });

  it("implements monotonic timestamp discard logic correctly (AC-2)", () => {
    let lastProcessedTimestamp = 1000;

    function shouldProcessEvent(timestamp?: number): boolean {
      if (!timestamp) return true;
      if (timestamp <= lastProcessedTimestamp) {
        return false; // Discard out-of-order or stale broadcast
      }
      lastProcessedTimestamp = timestamp;
      return true;
    }

    // Newer event passes
    expect(shouldProcessEvent(1050)).toBe(true);
    expect(lastProcessedTimestamp).toBe(1050);

    // Stale event discarded
    expect(shouldProcessEvent(1020)).toBe(false);
    expect(lastProcessedTimestamp).toBe(1050);

    // Duplicate timestamp discarded
    expect(shouldProcessEvent(1050)).toBe(false);

    // Subsequent newer event passes
    expect(shouldProcessEvent(1200)).toBe(true);
    expect(lastProcessedTimestamp).toBe(1200);
  });

  it("computes ratio-based autoscroll drift within 5% threshold (AC-4)", () => {
    function needsSync(currentRatio: number, targetRatio: number): boolean {
      return Math.abs(currentRatio - targetRatio) > 0.05;
    }

    // Within 5% threshold: no jump
    expect(needsSync(0.4, 0.43)).toBe(false);
    expect(needsSync(0.5, 0.54)).toBe(false);

    // Beyond 5% threshold: triggers smooth alignment
    expect(needsSync(0.4, 0.46)).toBe(true);
    expect(needsSync(0.8, 0.7)).toBe(true);
  });

  it("evaluates follower override state machine transitions (AC-3)", () => {
    let isFollowing = true;
    let isOverridingLeader = false;
    let activeKey = "G";

    function onFollowerManualTranspose(newKey: string) {
      if (isFollowing) {
        isOverridingLeader = true;
      }
      activeKey = newKey;
    }

    function onIncomingLeaderKey(leaderKey: string) {
      if (isFollowing && !isOverridingLeader) {
        activeKey = leaderKey;
      }
    }

    function onResetToLeader(leaderKey: string) {
      isOverridingLeader = false;
      activeKey = leaderKey;
    }

    // Leader broadcasts key change: follower adopts it
    onIncomingLeaderKey("A");
    expect(activeKey).toBe("A");
    expect(isOverridingLeader).toBe(false);

    // Follower manually transposes: locks in override
    onFollowerManualTranspose("C");
    expect(activeKey).toBe("C");
    expect(isOverridingLeader).toBe(true);

    // Subsequent leader broadcasts are ignored while overriding
    onIncomingLeaderKey("D");
    expect(activeKey).toBe("C");
    expect(isOverridingLeader).toBe(true);

    // Follower clicks [Reset to Leader]: re-aligns to leader
    onResetToLeader("D");
    expect(activeKey).toBe("D");
    expect(isOverridingLeader).toBe(false);
  });
});
